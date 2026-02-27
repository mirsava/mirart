/**
 * Shippo shipping API routes
 * - Get rates for checkout
 * - Purchase label for order fulfillment
 * - Get tracking status
 */
import express from 'express';
import pool from '../config/database.js';
import * as shippoService from '../services/shippoService.js';
import { shippoConfig } from '../config/shippo.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();

const hasCarrierRegistrationIssue = (rate) => {
  const messages = Array.isArray(rate?.messages) ? rate.messages : [];
  return messages.some((msg) => {
    const code = String(msg?.code || '').toLowerCase();
    const text = String(msg?.text || msg?.message || '').toLowerCase();
    return code.includes('registration_error') || text.includes('activate account') || text.includes('not yet registered');
  });
};

const normalizeRatesForFrontend = (rates) => {
  const sourceRates = Array.isArray(rates) ? rates : [];
  const filtered = sourceRates.filter((rate) => !hasCarrierRegistrationIssue(rate));
  const usableRates = filtered.length > 0 ? filtered : sourceRates;
  return usableRates.map((r) => ({
    object_id: r.object_id,
    provider: r.provider,
    servicelevel: r.servicelevel?.name || r.provider,
    amount: r.amount_local,
    currency: r.currency_local || 'USD',
    estimated_days: r.estimated_days,
  }));
};

/**
 * POST /shipping/rates
 * Get shipping rates for a destination address and cart items
 * Body: { address: {...}, items: [{ listing_id, quantity }] }
 */
router.post('/rates', async (req, res) => {
  try {
    if (!shippoConfig.isConfigured) {
      return res.status(503).json({
        error: 'Shipping is not configured',
        message: 'Contact support or use manual shipping.',
      });
    }

    const { address, items } = req.body;
    if (!address || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'address and items are required' });
    }

    const { street1, city, state, zip, country = 'US', name } = address;
    if (!street1 || !city || !state || !zip) {
      return res.status(400).json({ error: 'address must include street1, city, state, zip' });
    }

    const addressTo = {
      name: name || 'Recipient',
      street1,
      street2: address.street2 || '',
      city,
      state,
      zip,
      country,
    };

    // Fetch listings to get seller addresses and parcel dimensions
    const listingIds = [...new Set(items.map((i) => i.listing_id))];
    const placeholders = listingIds.map(() => '?').join(',');
    const [listings] = await pool.execute(
      `SELECT l.*, u.address_line1, u.address_line2, u.address_city, u.address_state, u.address_zip, u.address_country, u.first_name, u.last_name, u.business_name, u.email, u.phone
       FROM listings l
       JOIN users u ON l.user_id = u.id
       WHERE l.id IN (${placeholders})`,
      listingIds
    );

    if (listings.length === 0) {
      return res.status(404).json({ error: 'No valid listings found' });
    }

    // Build parcels from items (combine same listing, use first seller as origin)
    const firstListing = listings[0];
    const addressFrom = {
      name: firstListing.business_name || `${firstListing.first_name || ''} ${firstListing.last_name || ''}`.trim() || 'Seller',
      street1: firstListing.address_line1 || '123 Art Street',
      street2: firstListing.address_line2 || '',
      city: firstListing.address_city || 'San Francisco',
      state: firstListing.address_state || 'CA',
      zip: firstListing.address_zip || '94102',
      country: firstListing.address_country || 'US',
      email: firstListing.email || undefined,
      phone: firstListing.phone || undefined,
    };

    // If seller has no address set, return empty rates with message
    if (!firstListing.address_line1 || !firstListing.address_zip) {
      return res.json({
        rates: [],
        message: 'Seller has not set up shipping address. Contact seller for shipping options.',
      });
    }

    const parcels = [];
    for (const item of items) {
      const listing = listings.find((l) => l.id === item.listing_id);
      if (!listing) continue;

      const weight = parseFloat(listing.weight_oz) || 24;
      const length = parseFloat(listing.length_in) || 24;
      const width = parseFloat(listing.width_in) || 18;
      const height = parseFloat(listing.height_in) || 3;

      for (let i = 0; i < (item.quantity || 1); i++) {
        parcels.push({
          length: String(length),
          width: String(width),
          height: String(height),
          weight: String(weight),
          distance_unit: 'in',
          mass_unit: 'oz',
        });
      }
    }

    if (parcels.length === 0) {
      return res.status(400).json({ error: 'No valid parcels to ship' });
    }

    const { rates } = await shippoService.createShipmentAndGetRates(addressFrom, addressTo, parcels);

    const formattedRates = normalizeRatesForFrontend(rates);

    res.json({ rates: formattedRates });
  } catch (error) {
    console.error('Shipping rates error:', error);
    res.status(500).json({
      error: 'Failed to get shipping rates',
      message: error.message,
    });
  }
});

/**
 * POST /shipping/rates-for-order
 * Get fresh shipping rates for an order (seller only, when ready to ship)
 * Rates expire ~24h so we fetch fresh when seller buys label
 */
router.post('/rates-for-order', async (req, res) => {
  try {
    if (!shippoConfig.isConfigured) {
      return res.status(503).json({ error: 'Shipping is not configured' });
    }

    const { order_id, cognito_username } = req.body;
    if (!order_id || !cognito_username) {
      return res.status(400).json({ error: 'order_id and cognito_username are required' });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = users[0].id;

    const [orders] = await pool.execute(
      `SELECT o.*, l.weight_oz, l.length_in, l.width_in, l.height_in,
              u.address_line1, u.address_line2, u.address_city, u.address_state, u.address_zip, u.address_country,
              u.business_name, u.first_name, u.last_name, u.email, u.phone,
              b.email as buyer_email
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       JOIN users u ON o.seller_id = u.id
       LEFT JOIN users b ON o.buyer_id = b.id
       WHERE o.id = ? AND o.seller_id = ?`,
      [order_id, userId]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found or you are not the seller' });
    }

    const order = orders[0];
    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'Order must be paid before getting shipping rates' });
    }
    if (order.tracking_number) {
      return res.status(400).json({ error: 'Label already purchased for this order' });
    }

    if (!order.address_line1 || !order.address_zip) {
      return res.status(400).json({
        error: 'Please set your shipping address in Profile Settings before purchasing labels',
      });
    }

    // Parse shipping_address (format: "Name\nStreet\nCity, State Zip\nCountry")
    const addrLines = (order.shipping_address || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const addressTo = {
      name: addrLines[0] || 'Recipient',
      street1: addrLines[1] || '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      email: order.buyer_email || undefined,
    };
    const cityStateZip = addrLines[2] || '';
    const usMatch = cityStateZip.match(/^(.+),\s*([A-Za-z]{2})\s+([A-Za-z0-9\- ]+)$/);
    if (usMatch) {
      addressTo.city = usMatch[1].trim();
      addressTo.state = usMatch[2].trim();
      addressTo.zip = usMatch[3].trim();
    } else {
      const parts = cityStateZip.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        addressTo.city = parts[0];
        const regionAndPostal = parts.slice(1).join(' ');
        const tokens = regionAndPostal.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
          addressTo.zip = tokens[tokens.length - 1];
          addressTo.state = tokens.slice(0, -1).join(' ');
        } else if (tokens.length === 1) {
          addressTo.state = tokens[0];
        }
      }
    }
    addressTo.country = addrLines[3] || 'US';

    if (!addressTo.street1 || !addressTo.city || !addressTo.zip) {
      return res.status(400).json({ error: 'Invalid shipping address on order' });
    }

    const addressFrom = {
      name: order.business_name || `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Seller',
      street1: order.address_line1,
      street2: order.address_line2 || '',
      city: order.address_city,
      state: order.address_state,
      zip: order.address_zip,
      country: order.address_country || 'US',
      email: order.email || undefined,
      phone: order.phone || undefined,
    };

    const parcels = [{
      length: String(parseFloat(order.length_in) || 24),
      width: String(parseFloat(order.width_in) || 18),
      height: String(parseFloat(order.height_in) || 3),
      weight: String(parseFloat(order.weight_oz) * (order.quantity || 1) || 24),
      distance_unit: 'in',
      mass_unit: 'oz',
    }];

    const { rates } = await shippoService.createShipmentAndGetRates(addressFrom, addressTo, parcels);
    const formattedRates = normalizeRatesForFrontend(rates);

    res.json({ rates: formattedRates });
  } catch (error) {
    console.error('Rates for order error:', error);
    res.status(500).json({ error: error.message || 'Failed to get rates', message: error.message });
  }
});

/**
 * POST /shipping/label
 * Purchase a shipping label for an order (seller only)
 * Body: { order_id, rate_id, cognito_username }
 */
router.post('/label', async (req, res) => {
  try {
    if (!shippoConfig.isConfigured) {
      return res.status(503).json({ error: 'Shipping is not configured' });
    }

    const { order_id, rate_id, cognito_username, rate_amount, carrier } = req.body;
    if (!order_id || !rate_id || !cognito_username) {
      return res.status(400).json({ error: 'order_id, rate_id, and cognito_username are required' });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = users[0].id;

    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND seller_id = ?',
      [order_id, userId]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found or you are not the seller' });
    }

    const order = orders[0];
    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'Order must be paid before purchasing a label' });
    }
    if (order.tracking_number) {
      return res.status(400).json({ error: 'Label already purchased for this order' });
    }

    const result = await shippoService.purchaseLabel(rate_id);

    await pool.execute(
      `UPDATE orders SET 
        status = 'shipped',
        tracking_number = ?,
        tracking_url = ?,
        label_url = ?,
        shippo_transaction_id = ?,
        shipping_cost = COALESCE(?, shipping_cost),
        shipping_carrier = ?,
        shipped_at = NOW()
       WHERE id = ?`,
      [result.trackingNumber, result.trackingUrl, result.labelUrl, result.transactionId, rate_amount || null, carrier || null, order_id]
    );

    if (order.buyer_id) {
      try {
        const body = result.trackingNumber
          ? `Order ${order.order_number} has been shipped. Track: ${result.trackingNumber}`
          : `Order ${order.order_number} has been shipped.`;
        await createNotification({
          userId: order.buyer_id,
          type: 'order',
          title: 'Order shipped',
          body,
          link: `/orders?order=${order_id}`,
          referenceId: parseInt(order_id, 10),
          severity: 'success',
        });
      } catch (nErr) {
        console.warn('Could not create notification:', nErr.message);
      }
    }

    res.json({
      label_url: result.labelUrl,
      tracking_number: result.trackingNumber,
      tracking_url: result.trackingUrl,
    });
  } catch (error) {
    console.error('Purchase label error:', error);
    res.status(500).json({
      error: error.message || 'Failed to purchase label',
      message: error.message,
    });
  }
});

/**
 * GET /shipping/track/:trackingNumber
 * Get tracking status (optional: ?carrier=usps)
 */
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { carrier = 'usps' } = req.query;

    if (!trackingNumber) {
      return res.status(400).json({ error: 'trackingNumber is required' });
    }

    const status = await shippoService.getTrackingStatus(carrier, trackingNumber);
    res.json(status);
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({
      error: 'Failed to get tracking status',
      message: error.message,
    });
  }
});

/**
 * GET /shipping/track-order/:orderId
 * Detailed tracking for an order — returns full Shippo tracking history
 */
router.get('/track-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const [orders] = await pool.execute(
      'SELECT tracking_number, shipping_carrier, tracking_status, tracking_last_updated, shipped_at, delivered_at, status FROM orders WHERE id = ?',
      [orderId]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];
    if (!order.tracking_number) {
      return res.json({ tracking: null, message: 'No tracking information available' });
    }

    const carrier = order.shipping_carrier || 'usps';
    let trackingData = null;

    if (shippoConfig.isConfigured) {
      try {
        const body = { carrier, tracking_number: order.tracking_number };
        const opts = {
          method: 'POST',
          headers: {
            Authorization: `ShippoToken ${shippoConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        };
        const response = await fetch('https://api.goshippo.com/tracks', opts);
        const data = await response.json();

        trackingData = {
          status: data.tracking_status?.status || order.tracking_status || 'UNKNOWN',
          statusDetails: data.tracking_status?.status_details || '',
          statusDate: data.tracking_status?.status_date || null,
          location: data.tracking_status?.location || null,
          eta: data.eta || null,
          trackingUrl: data.tracking_url_provider || order.tracking_url || null,
          carrier: carrier,
          trackingNumber: order.tracking_number,
          history: (data.tracking_history || []).map(event => ({
            status: event.status,
            statusDetails: event.status_details || '',
            statusDate: event.status_date,
            location: event.location,
          })),
        };

        if (trackingData.status !== order.tracking_status) {
          await pool.execute(
            'UPDATE orders SET tracking_status = ?, tracking_last_updated = NOW() WHERE id = ?',
            [trackingData.status, orderId]
          );
        }
      } catch (trackErr) {
        console.warn('Shippo tracking fetch failed:', trackErr.message);
      }
    }

    if (!trackingData) {
      trackingData = {
        status: order.tracking_status || 'UNKNOWN',
        statusDetails: '',
        statusDate: order.tracking_last_updated || order.shipped_at,
        location: null,
        eta: null,
        trackingUrl: null,
        carrier: carrier,
        trackingNumber: order.tracking_number,
        history: [],
      };
    }

    trackingData.shippedAt = order.shipped_at;
    trackingData.deliveredAt = order.delivered_at;
    trackingData.orderStatus = order.status;

    res.json({ tracking: trackingData });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ error: 'Failed to get tracking', message: error.message });
  }
});

/**
 * GET /shipping/configured
 * Check if Shippo is configured (for frontend to show/hide shipping features)
 */
router.get('/configured', (_req, res) => {
  res.json({ configured: shippoConfig.isConfigured });
});

export default router;
