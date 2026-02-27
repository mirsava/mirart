/**
 * Shippo API service for shipping rates and labels
 * Docs: https://docs.goshippo.com/
 */
import { shippoConfig } from '../config/shippo.js';

const SHIPPO_BASE = 'https://api.goshippo.com';

async function shippoRequest(method, path, body = null) {
  if (!shippoConfig.isConfigured) {
    throw new Error('Shippo is not configured. Set SHIPPO_API_KEY in .env');
  }

  const opts = {
    method,
    headers: {
      Authorization: `ShippoToken ${shippoConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${SHIPPO_BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || data.detail || data.error || res.statusText;
    throw new Error(`Shippo API error: ${msg}`);
  }

  return data;
}

/**
 * Create a shipment to get rates
 * @param {Object} addressFrom - Origin address (seller)
 * @param {Object} addressTo - Destination address (buyer)
 * @param {Object[]} parcels - Parcel dimensions
 * @returns {Promise<{rates: Array}>}
 */
export async function createShipmentAndGetRates(addressFrom, addressTo, parcels) {
  const body = {
    address_from: addressFrom,
    address_to: addressTo,
    parcels,
    async: false,
  };

  const shipment = await shippoRequest('POST', '/shipments', body);
  return {
    shipmentId: shipment.object_id,
    rates: shipment.rates || [],
  };
}

/**
 * Purchase a label from a rate
 * @param {string} rateId - Shippo rate object_id
 * @returns {Promise<{label_url, tracking_number, tracking_url}>}
 */
export async function purchaseLabel(rateId) {
  const transaction = await shippoRequest('POST', '/transactions', {
    rate: rateId,
    async: false,
  });
  const txStatus = String(transaction.status || '').toUpperCase();
  if (txStatus && txStatus !== 'SUCCESS') {
    const txMessage = Array.isArray(transaction.messages) && transaction.messages.length > 0
      ? transaction.messages.map((m) => m?.text || m?.message || '').filter(Boolean).join('; ')
      : (transaction.object_state || transaction.status || 'Unknown transaction status');
    throw new Error(`Shippo transaction failed: ${txMessage}`);
  }
  if (!transaction.label_url) {
    throw new Error('Shippo did not return a label URL for this rate. Please refresh rates and try again.');
  }
  if (!transaction.tracking_number) {
    throw new Error('Shippo did not return a tracking number for this label.');
  }

  return {
    transactionId: transaction.object_id,
    labelUrl: transaction.label_url,
    trackingNumber: transaction.tracking_number,
    trackingUrl: transaction.tracking_url_provider || transaction.tracking_url,
  };
}

/**
 * Get tracking status
 * @param {string} carrier - Carrier code (usps, ups, fedex, etc.)
 * @param {string} trackingNumber - Tracking number
 * @returns {Promise<Object>}
 */
export async function getTrackingStatus(carrier, trackingNumber) {
  const body = {
    carrier,
    tracking_number: trackingNumber,
  };
  const track = await shippoRequest('POST', '/tracks', body);
  return {
    status: track.tracking_status?.status || 'UNKNOWN',
    statusDate: track.tracking_status?.status_date,
    location: track.tracking_status?.location,
    eta: track.tracking_status?.eta,
    url: track.tracking_url_provider,
  };
}
