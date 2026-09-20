import express from 'express';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, isUuid } from '../middleware/auth.js';
import { parseImageUrls } from '../utils/json.js';
import { getListingAccess } from '../services/billing.js';

const router = express.Router();

// Owner or admin may modify a listing (identity comes from the verified token)
const canModifyListing = async (listingId, auth) => {
  const [listing] = await pool.execute('SELECT user_id FROM listings WHERE id = ?', [listingId]);
  if (listing.length === 0) return { allowed: false, reason: 'Listing not found' };
  if (auth.isAdmin || listing[0].user_id === auth.userId) return { allowed: true };
  return { allowed: false, reason: 'You do not have permission to modify this listing' };
};

// Get all listings (with optional filters and pagination)
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, status, userId, search, page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC', authUserId, minPrice, maxPrice, minYear, maxYear, medium, inStock } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const offset = (pageNum - 1) * limitNum;
    
    // Check if user is fetching their own listings (by authUserId)
    // Gallery page should always show all listings, regardless of login status
    // Only treat as "own listings" if authUserId is provided, no userId, AND explicitly requesting own listings
    const hasUserId = Boolean(userId) && /^\d+$/.test(String(userId));
    const artistFilter = isUuid(authUserId) ? authUserId : null;
    const viewerAuthId = req.auth?.authUserId || null;
    
    // Check for filters - these indicate a public gallery search
    const hasCategoryOrStatus = (category && category !== '') || (status && status !== '');
    const hasPriceFilter = (minPrice && minPrice !== '' && minPrice !== 'undefined') || (maxPrice && maxPrice !== '' && maxPrice !== 'undefined');
    const hasYearFilter = (minYear && minYear !== '' && minYear !== 'undefined') || (maxYear && maxYear !== '' && maxYear !== 'undefined');
    const hasMediumFilter = (medium && medium !== '' && medium !== 'undefined');
    const hasStockFilter = (inStock === 'true' || inStock === true || inStock === '1');
    const hasFilters = hasCategoryOrStatus || hasPriceFilter || hasYearFilter || hasMediumFilter || hasStockFilter;
    
    // Only treat as "own listings" if authUserId is provided, no userId, AND no filters
    // If filters are present, it's a public gallery search - ignore authUserId
    const isFetchingOwnListings = Boolean(artistFilter && !hasUserId && !hasFilters && (artistFilter === viewerAuthId || req.auth?.isAdmin));
    
    let baseQuery = `
      SELECT l.*, 
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.username,
          u.username
        ) as artist_name,
        u.auth_user_id,
        u.signature_url,
        (SELECT COUNT(*) FROM likes WHERE listing_id = l.id) as like_count,
        (SELECT AVG(rating) FROM listing_comments WHERE listing_id = l.id AND rating IS NOT NULL) as avg_rating,
        (SELECT COUNT(*) FROM listing_comments WHERE listing_id = l.id AND rating IS NOT NULL) as review_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1 AND (COALESCE(u.blocked, FALSE) = FALSE)
    `;
    const params = [];
    
    if (category) {
      const cats = String(category).split(',').map(c => c.trim()).filter(Boolean);
      if (cats.length === 1) {
        baseQuery += ' AND l.category = ?';
        params.push(cats[0]);
      } else if (cats.length > 1) {
        baseQuery += ` AND l.category IN (${cats.map(() => '?').join(',')})`;
        params.push(...cats);
      }
    }
    
    if (subcategory) {
      const subs = String(subcategory).split(',').map(s => s.trim()).filter(Boolean);
      if (subs.length === 1) {
        baseQuery += ' AND l.subcategory = ?';
        params.push(subs[0]);
      } else if (subs.length > 1) {
        baseQuery += ` AND l.subcategory IN (${subs.map(() => '?').join(',')})`;
        params.push(...subs);
      }
    }
    
    // Only apply default "active" filter if not fetching own listings
    // When fetching own listings without status filter, show all statuses
    if (status) {
      baseQuery += ' AND l.status = ?';
      params.push(String(status));
    } else if (!isFetchingOwnListings) {
      // Default: only show active listings for public views
      // Use parameterized query for consistency
      baseQuery += ' AND l.status = ?';
      params.push('active');
    }
    // If isFetchingOwnListings is true and status is not provided, no status filter is applied (shows all)
    
    if (hasUserId) {
      baseQuery += ' AND l.user_id = ?';
      params.push(String(userId));
    } else if (isFetchingOwnListings) {
      // Add filter to only show listings owned by this user
      baseQuery += ' AND u.auth_user_id = ?';
      params.push(artistFilter);
    } else if (artistFilter) {
      // Filter by artist for public gallery search
      baseQuery += ' AND u.auth_user_id = ?';
      params.push(artistFilter);
    }
    
    if (search) {
      baseQuery += ' AND (l.title ILIKE ? OR l.description ILIKE ? OR u.business_name ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ?)';
      const searchTerm = `%${String(search)}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (minPrice !== undefined && minPrice !== null && minPrice !== '' && minPrice !== 'undefined') {
      const minPriceNum = parseFloat(String(minPrice));
      if (!isNaN(minPriceNum) && minPriceNum > 0) {
        baseQuery += ' AND l.price IS NOT NULL AND l.price >= ?';
        params.push(minPriceNum);
      }
    }
    
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '' && maxPrice !== 'undefined') {
      const maxPriceNum = parseFloat(String(maxPrice));
      if (!isNaN(maxPriceNum) && maxPriceNum > 0) {
        baseQuery += ' AND l.price IS NOT NULL AND l.price <= ?';
        params.push(maxPriceNum);
      }
    }
    
    if (minYear !== undefined && minYear !== null && minYear !== '') {
      const minYearNum = parseInt(String(minYear));
      if (!isNaN(minYearNum)) {
        baseQuery += ' AND l.year >= ?';
        params.push(minYearNum);
      }
    }
    
    if (maxYear !== undefined && maxYear !== null && maxYear !== '') {
      const maxYearNum = parseInt(String(maxYear));
      if (!isNaN(maxYearNum)) {
        baseQuery += ' AND l.year <= ?';
        params.push(maxYearNum);
      }
    }
    
    if (medium && medium !== '') {
      const mediums = String(medium).split(',').map(m => m.trim()).filter(m => m !== '');
      if (mediums.length > 0) {
        baseQuery += ' AND l.medium IS NOT NULL AND (';
        mediums.forEach((m, index) => {
          if (index > 0) baseQuery += ' OR ';
          baseQuery += 'LOWER(l.medium) ILIKE LOWER(?)';
          params.push(`%${m}%`);
        });
        baseQuery += ')';
      }
    }
    
    if (inStock === 'true' || inStock === true || inStock === '1') {
      baseQuery += ' AND l.in_stock = TRUE';
    }
    
    // Get total count (before adding ORDER BY, LIMIT, OFFSET)
    // Build count query with same WHERE conditions but COUNT instead of SELECT
    let countQuery = `
      SELECT COUNT(*) as total
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1 AND (COALESCE(u.blocked, FALSE) = FALSE)
    `;
    const countParams = [];
    
    if (category) {
      const cats = String(category).split(',').map(c => c.trim()).filter(Boolean);
      if (cats.length === 1) {
        countQuery += ' AND l.category = ?';
        countParams.push(cats[0]);
      } else if (cats.length > 1) {
        countQuery += ` AND l.category IN (${cats.map(() => '?').join(',')})`;
        countParams.push(...cats);
      }
    }
    
    if (subcategory) {
      const subs = String(subcategory).split(',').map(s => s.trim()).filter(Boolean);
      if (subs.length === 1) {
        countQuery += ' AND l.subcategory = ?';
        countParams.push(subs[0]);
      } else if (subs.length > 1) {
        countQuery += ` AND l.subcategory IN (${subs.map(() => '?').join(',')})`;
        countParams.push(...subs);
      }
    }
    
    // Only apply default "active" filter if not fetching own listings
    // When fetching own listings without status filter, show all statuses
    if (status) {
      countQuery += ' AND l.status = ?';
      countParams.push(String(status));
    } else if (!isFetchingOwnListings) {
      // Default: only show active listings for public views
      countQuery += " AND l.status = 'active'";
    }
    // If isFetchingOwnListings is true and status is not provided, no status filter is applied (shows all)
    
    if (hasUserId) {
      countQuery += ' AND l.user_id = ?';
      countParams.push(String(userId));
    } else if (isFetchingOwnListings || artistFilter) {
      countQuery += ' AND u.auth_user_id = ?';
      countParams.push(artistFilter);
    }
    
    if (search) {
      countQuery += ' AND (l.title ILIKE ? OR l.description ILIKE ? OR u.business_name ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ?)';
      const searchTerm = `%${String(search)}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      const minPriceNum = parseFloat(String(minPrice));
      if (!isNaN(minPriceNum)) {
        countQuery += ' AND l.price IS NOT NULL AND l.price >= ?';
        countParams.push(minPriceNum);
      }
    }
    
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
      const maxPriceNum = parseFloat(String(maxPrice));
      if (!isNaN(maxPriceNum)) {
        countQuery += ' AND l.price IS NOT NULL AND l.price <= ?';
        countParams.push(maxPriceNum);
      }
    }
    
    if (minYear !== undefined && minYear !== null && minYear !== '') {
      const minYearNum = parseInt(String(minYear));
      if (!isNaN(minYearNum)) {
        countQuery += ' AND l.year >= ?';
        countParams.push(minYearNum);
      }
    }
    
    if (maxYear !== undefined && maxYear !== null && maxYear !== '') {
      const maxYearNum = parseInt(String(maxYear));
      if (!isNaN(maxYearNum)) {
        countQuery += ' AND l.year <= ?';
        countParams.push(maxYearNum);
      }
    }
    
    if (medium && medium !== '') {
      const mediums = String(medium).split(',').map(m => m.trim()).filter(m => m !== '');
      if (mediums.length > 0) {
        countQuery += ' AND l.medium IS NOT NULL AND (';
        mediums.forEach((m, index) => {
          if (index > 0) countQuery += ' OR ';
          countQuery += 'l.medium ILIKE ?';
          countParams.push(`%${m}%`);
        });
        countQuery += ')';
      }
    }
    
    if (inStock === 'true' || inStock === true || inStock === '1') {
      countQuery += ' AND l.in_stock = TRUE';
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = Number(countResult[0].total);
    
    // Add sorting
    let orderBy = 'l.created_at DESC';
    const validSortFields = ['created_at', 'title', 'price', 'year', 'views'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (validSortFields.includes(sortBy)) {
      const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
      if (sortBy === 'title') {
        orderBy = `l.title ${order}`;
      } else if (sortBy === 'price') {
        orderBy = `l.price ${order}`;
      } else if (sortBy === 'year') {
        orderBy = `l.year ${order}`;
      } else if (sortBy === 'views') {
        orderBy = `l.views ${order}`;
      } else {
        orderBy = `l.created_at ${order}`;
      }
    }
    
    // Add pagination to main query - rebuild query cleanly
    const trimmedQuery = baseQuery.trim();
    
    const limitValue = Math.floor(Number(limitNum));
    const offsetValue = Math.floor(Number(offset));
    
    if (isNaN(limitValue) || isNaN(offsetValue) || limitValue < 0 || offsetValue < 0) {
      throw new Error(`Invalid pagination parameters: limit=${limitNum} (${typeof limitNum}), offset=${offset} (${typeof offset})`);
    }
    
    const queryParams = [];
    params.forEach(p => {
      if (p !== undefined && p !== null) {
        queryParams.push(p);
      }
    });
    
    const finalQuery = trimmedQuery + ' ORDER BY ' + orderBy + ` LIMIT ${limitValue} OFFSET ${offsetValue}`;
    
    const placeholderCount = (finalQuery.match(/\?/g) || []).length;
    
    if (queryParams.length !== placeholderCount) {
      throw new Error(`Parameter count mismatch: expected ${placeholderCount}, got ${queryParams.length}`);
    }
    
    const [rows] = await pool.execute(finalQuery, queryParams);
    
    // Use requestingUser (viewer) for is_liked - NOT authUserId (artist filter)
    let userLikedListings = [];
    if (req.auth?.userId && rows.length > 0) {
      const [likes] = await pool.execute(
        'SELECT listing_id FROM likes WHERE user_id = ? AND listing_id = ANY(?::int[])',
        [req.auth.userId, rows.map(r => r.id)]
      );
      userLikedListings = likes.map(like => like.listing_id);
    }
    
    // Parse JSON fields
    const listings = rows.map(listing => ({
      ...listing,
      price: listing.price ? parseFloat(listing.price) : null,
      image_urls: parseImageUrls(listing.image_urls),
      like_count: listing.like_count || 0,
      is_liked: userLikedListings.includes(listing.id)
    }));

    const totalPages = Math.ceil(total / limitNum);
    
    res.json({
      listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching listings:', error.message || error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get single listing by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const [rows] = await pool.execute(
      `SELECT l.*,  
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.username,
          u.username
        ) as artist_name,
        u.auth_user_id,
        u.signature_url,
        u.default_special_instructions as artist_default_special_instructions,
        (SELECT COUNT(*) FROM likes WHERE listing_id = l.id) as like_count,
        (SELECT AVG(rating) FROM listing_comments WHERE listing_id = l.id AND rating IS NOT NULL) as avg_rating,
        (SELECT COUNT(*) FROM listing_comments WHERE listing_id = l.id AND rating IS NOT NULL) as review_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ? AND (COALESCE(u.blocked, FALSE) = FALSE)`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    let isLiked = false;
    if (req.auth?.userId) {
      const [likes] = await pool.execute(
        'SELECT id FROM likes WHERE user_id = ? AND listing_id = ?',
        [req.auth.userId, id]
      );
      isLiked = likes.length > 0;
    }

    // Increment views
    await pool.execute(
      'UPDATE listings SET views = views + 1 WHERE id = ?',
      [id]
    );
    
    const responseData = {
      ...rows[0],
      price: rows[0].price ? parseFloat(rows[0].price) : null,
      like_count: rows[0].like_count || 0,
      is_liked: isLiked,
      image_urls: parseImageUrls(rows[0].image_urls)
    };
    
    // Ensure special_instructions is always included
    if ('special_instructions' in rows[0]) {
      responseData.special_instructions = rows[0].special_instructions !== null && rows[0].special_instructions !== undefined
        ? String(rows[0].special_instructions)
        : null;
    } else {
      responseData.special_instructions = null;
    }
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new listing
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      price,
      primary_image_url,
      image_urls,
      dimensions,
      medium,
      year,
      weight_oz,
      length_in,
      width_in,
      height_in,
      in_stock,
      quantity_available,
      allow_comments
    } = req.body;

    // Force status to 'draft' - listings must be activated after payment
    const listingStatus = 'draft';
    
    // Validate required fields
    if (!req.auth.userId) {
      return res.status(400).json({ error: 'User profile not found' });
    }
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }
    if (price === undefined || price === null) {
      return res.status(400).json({ error: 'price is required' });
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'price must be a valid non-negative number' });
    }
    
    // Validate image_urls (max 10 images)
    let imageUrlsArray = null;
    if (image_urls) {
      if (Array.isArray(image_urls)) {
        if (image_urls.length > 10) {
          return res.status(400).json({ error: 'Maximum 10 images allowed' });
        }
        // Filter out empty strings
        imageUrlsArray = image_urls.filter(url => url && url.trim() !== '');
      } else {
        return res.status(400).json({ error: 'image_urls must be an array' });
      }
    }
    
    const user_id = req.auth.userId;
    
    // Prepare image_urls for database (JSON string or null)
    let imageUrlsJson = null;
    if (imageUrlsArray && imageUrlsArray.length > 0) {
      try {
        imageUrlsJson = JSON.stringify(imageUrlsArray);
      } catch (jsonError) {
        return res.status(400).json({ error: 'Invalid image_urls format' });
      }
    }
    
    const { shipping_info, returns_info, special_instructions, shipping_preference, shipping_carrier, return_days, fixed_shipping_fee } = req.body;
    
    const qty = quantity_available !== undefined && quantity_available !== null && quantity_available !== ''
      ? Math.max(0, parseInt(quantity_available))
      : 1;
    const stock = in_stock !== undefined ? Boolean(in_stock) : (qty > 0);

    const shipPref = (shipping_preference === 'free' || shipping_preference === 'buyer') ? shipping_preference : null;
    const shipCarrier = (shipping_carrier === 'shippo' || shipping_carrier === 'own') ? shipping_carrier : null;
    const retDaysNum = return_days != null ? parseInt(String(return_days), 10) : null;
    const retDays = retDaysNum != null && !isNaN(retDaysNum) && retDaysNum > 0 && retDaysNum <= 365 ? retDaysNum : null;
    const rawShippingFee = Number.parseFloat(String(fixed_shipping_fee ?? '0'));
    const normalizedShippingFee = Number.isFinite(rawShippingFee) && rawShippingFee >= 0 ? rawShippingFee : 0;
    const fixedShippingFee = shipPref === 'buyer' ? normalizedShippingFee : 0;

    if (shipPref === 'buyer' && !(Number.isFinite(rawShippingFee) && rawShippingFee >= 0)) {
      return res.status(400).json({ error: 'Buyer-paid listings require a valid shipping cost' });
    }

  const [result] = await pool.execute(
      `INSERT INTO listings (
        user_id, title, description, category, subcategory,
        price, primary_image_url, image_urls, dimensions, medium, year,
        weight_oz, length_in, width_in, height_in,
        in_stock, quantity_available, status, shipping_info, returns_info, special_instructions, allow_comments,
        shipping_preference, shipping_carrier, return_days, fixed_shipping_fee
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        title,
        description || null,
        category,
        subcategory || null,
        priceNum,
        primary_image_url || null,
        imageUrlsJson,
        dimensions || null,
        medium || null,
        year && year.toString().trim() !== '' ? parseInt(year) : null,
        weight_oz !== undefined && weight_oz !== null && weight_oz !== '' ? parseFloat(weight_oz) : 24,
        length_in !== undefined && length_in !== null && length_in !== '' ? parseFloat(length_in) : 24,
        width_in !== undefined && width_in !== null && width_in !== '' ? parseFloat(width_in) : 18,
        height_in !== undefined && height_in !== null && height_in !== '' ? parseFloat(height_in) : 3,
        stock,
        qty,
        listingStatus,
        (shipping_info && shipping_info.trim()) || null,
        (returns_info && returns_info.trim()) || null,
        (special_instructions && special_instructions.trim()) || null,
        allow_comments !== undefined ? Boolean(allow_comments) : true,
        shipPref,
        shipCarrier,
        retDays,
        fixedShippingFee
      ]
    );
    
      // Update dashboard stats (ensure record exists first)
      try {
        const [statsCheck] = await pool.execute(
          'SELECT id FROM dashboard_stats WHERE user_id = ?',
          [user_id]
        );
        
        if (statsCheck.length === 0) {
          await pool.execute(
            'INSERT INTO dashboard_stats (user_id, total_listings, active_listings) VALUES (?, 0, 0) ON CONFLICT (user_id) DO NOTHING',
            [user_id]
          );
        }
        
        await pool.execute(
          'UPDATE dashboard_stats SET total_listings = total_listings + 1 WHERE user_id = ?',
          [user_id]
        );
      } catch (statsError) {
      }
      
      const [newListing] = await pool.execute(
        'SELECT * FROM listings WHERE id = ?',
        [result.insertId]
      );
      
      const parsedImageUrls = parseImageUrls(newListing[0].image_urls);
      
      res.status(201).json({
        ...newListing[0],
        price: newListing[0].price ? parseFloat(newListing[0].price) : null,
        image_urls: parsedImageUrls
      });
  } catch (error) {
    console.error('Create listing error:', error.code, error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Activate listing (check subscription limits)
router.post('/:id/activate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get listing and verify ownership
    const [listings] = await pool.execute(
      `SELECT l.*, u.auth_user_id
      FROM listings l
      JOIN users u ON l.user_id = u.id
       WHERE l.id = ? AND u.id = ?`,
      [id, req.auth.userId]
    );

    if (listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found or you do not have permission' });
    }

    const listing = listings[0];

    if (listing.status === 'active') {
      return res.status(400).json({ error: 'Listing is already active' });
    }

    if (listing.status === 'sold') {
      return res.status(400).json({ error: 'Cannot activate a sold listing' });
    }

    // Check plan limits (or the free-launch limit while billing is off / in its grace period)
    const access = await getListingAccess(listing.user_id);

    if (!access.allowed) {
      return res.status(403).json({
        error: 'No active subscription found',
        message: 'You need an active subscription to activate listings. Please subscribe to a plan first.'
      });
    }

    const [activeCount] = await pool.execute(
      "SELECT COUNT(*) as count FROM listings WHERE user_id = ? AND status = 'active'",
      [listing.user_id]
    );

    if (activeCount[0].count >= access.maxListings) {
      return res.status(403).json({
        error: 'Listing limit reached',
        message: access.source === 'free'
          ? `You have reached the launch limit of ${access.maxListings} active listings. Please deactivate an existing listing to activate another.`
          : `You have reached your subscription limit of ${access.maxListings} active listings. Please upgrade your plan or deactivate existing listings.`
      });
    }

    // Update listing status to active
    await pool.execute(
      'UPDATE listings SET status = ? WHERE id = ?',
      ['active', id]
    );

    // Update dashboard stats
    await pool.execute(
      'UPDATE dashboard_stats SET active_listings = active_listings + 1 WHERE user_id = ?',
      [listing.user_id]
    );

    // Get updated listing
    const [updated] = await pool.execute(
      'SELECT * FROM listings WHERE id = ?',
      [id]
    );

    res.json({
      ...updated[0],
      price: updated[0].price ? parseFloat(updated[0].price) : null,
      message: 'Listing activated successfully'
    });
  } catch (error) {
    console.error('Error activating listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update listing
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await canModifyListing(id, req.auth);
    if (!check.allowed) {
      return res.status(check.reason === 'Listing not found' ? 404 : 403).json({ error: check.reason });
    }
    const {
      title,
      description,
      category,
      subcategory,
      price,
      primary_image_url,
      image_urls,
      dimensions,
      medium,
      year,
      weight_oz,
      length_in,
      width_in,
      height_in,
      in_stock,
      quantity_available,
      status,
      allow_comments
    } = req.body;
    
    // Validate image_urls (max 10 images)
    let imageUrlsArray = null;
    if (image_urls !== undefined) {
      if (Array.isArray(image_urls)) {
        if (image_urls.length > 10) {
          return res.status(400).json({ error: 'Maximum 10 images allowed' });
        }
        // Filter out empty strings
        imageUrlsArray = image_urls.filter(url => url && url.trim() !== '');
      } else if (image_urls !== null) {
        return res.status(400).json({ error: 'image_urls must be an array' });
      }
    }
    
    // Get current listing to check status change
    const [current] = await pool.execute(
      'SELECT user_id, status, shipping_preference, fixed_shipping_fee FROM listings WHERE id = ?',
      [id]
    );
    
    if (current.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    const { shipping_info, returns_info, special_instructions, shipping_preference, shipping_carrier, return_days, fixed_shipping_fee } = req.body;
    
    if (title !== undefined) { updateFields.push('title = ?'); updateValues.push(title); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (category !== undefined) { updateFields.push('category = ?'); updateValues.push(category); }
    if (subcategory !== undefined) { updateFields.push('subcategory = ?'); updateValues.push(subcategory); }
    if (price !== undefined) { updateFields.push('price = ?'); updateValues.push(price); }
    if (primary_image_url !== undefined) { updateFields.push('primary_image_url = ?'); updateValues.push(primary_image_url); }
    if (image_urls !== undefined) { updateFields.push('image_urls = ?'); updateValues.push(imageUrlsArray ? JSON.stringify(imageUrlsArray) : null); }
    if (dimensions !== undefined) { updateFields.push('dimensions = ?'); updateValues.push(dimensions); }
    if (medium !== undefined) { updateFields.push('medium = ?'); updateValues.push(medium); }
    if (year !== undefined) { updateFields.push('year = ?'); updateValues.push(year); }
    if (weight_oz !== undefined) { updateFields.push('weight_oz = ?'); updateValues.push(parseFloat(weight_oz) || 24); }
    if (length_in !== undefined) { updateFields.push('length_in = ?'); updateValues.push(parseFloat(length_in) || 24); }
    if (width_in !== undefined) { updateFields.push('width_in = ?'); updateValues.push(parseFloat(width_in) || 18); }
    if (height_in !== undefined) { updateFields.push('height_in = ?'); updateValues.push(parseFloat(height_in) || 3); }
    if (in_stock !== undefined) { updateFields.push('in_stock = ?'); updateValues.push(in_stock); }
    if (quantity_available !== undefined) {
      const qty = Math.max(0, parseInt(quantity_available));
      updateFields.push('quantity_available = ?');
      updateValues.push(qty);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (shipping_info !== undefined) { updateFields.push('shipping_info = ?'); updateValues.push((shipping_info && shipping_info.trim()) || null); }
    if (returns_info !== undefined) { updateFields.push('returns_info = ?'); updateValues.push((returns_info && returns_info.trim()) || null); }
    if (special_instructions !== undefined) { updateFields.push('special_instructions = ?'); updateValues.push((special_instructions && special_instructions.trim()) || null); }
    if (allow_comments !== undefined) { updateFields.push('allow_comments = ?'); updateValues.push(Boolean(allow_comments)); }
    if (shipping_preference !== undefined) { updateFields.push('shipping_preference = ?'); updateValues.push((shipping_preference === 'free' || shipping_preference === 'buyer') ? shipping_preference : null); }
    if (shipping_carrier !== undefined) { updateFields.push('shipping_carrier = ?'); updateValues.push((shipping_carrier === 'shippo' || shipping_carrier === 'own') ? shipping_carrier : null); }
    if (fixed_shipping_fee !== undefined) {
      const parsedFee = Number.parseFloat(String(fixed_shipping_fee));
      if (!Number.isFinite(parsedFee) || parsedFee < 0) {
        return res.status(400).json({ error: 'Shipping cost must be a non-negative number' });
      }
      updateFields.push('fixed_shipping_fee = ?');
      updateValues.push(parsedFee);
    }
    if (return_days !== undefined) {
      const rd = return_days == null || return_days === 'none' ? null : (parseInt(String(return_days), 10) || null);
      updateFields.push('return_days = ?');
      updateValues.push(rd != null && rd > 0 && rd <= 365 ? rd : null);
    }

    const effectiveShippingPreference = shipping_preference !== undefined
      ? ((shipping_preference === 'free' || shipping_preference === 'buyer') ? shipping_preference : null)
      : current[0].shipping_preference;
    const effectiveShippingFee = fixed_shipping_fee !== undefined
      ? Number.parseFloat(String(fixed_shipping_fee))
      : Number.parseFloat(String(current[0].fixed_shipping_fee ?? 0));
    if (effectiveShippingPreference === 'buyer' && (!Number.isFinite(effectiveShippingFee) || effectiveShippingFee < 0)) {
      return res.status(400).json({ error: 'Buyer-paid listings require a valid shipping cost' });
    }
    if (effectiveShippingPreference !== 'buyer') {
      updateFields.push('fixed_shipping_fee = ?');
      updateValues.push(0);
    }
    
    updateValues.push(id);
    
    await pool.execute(
      `UPDATE listings SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // Update dashboard stats if status changed
    if (status && status !== current[0].status) {
      if (status === 'active' && current[0].status !== 'active') {
        await pool.execute(
          'UPDATE dashboard_stats SET active_listings = active_listings + 1 WHERE user_id = ?',
          [current[0].user_id]
        );
      } else if (current[0].status === 'active' && status !== 'active') {
        await pool.execute(
          'UPDATE dashboard_stats SET active_listings = GREATEST(active_listings - 1, 0) WHERE user_id = ?',
          [current[0].user_id]
        );
      }
    }
    
    const [updated] = await pool.execute(
      'SELECT * FROM listings WHERE id = ?',
      [id]
    );
    
    const parsedImageUrls = parseImageUrls(updated[0].image_urls);
    
    res.json({
      ...updated[0],
      price: updated[0].price ? parseFloat(updated[0].price) : null,
      image_urls: parsedImageUrls
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete listing
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await canModifyListing(id, req.auth);
    if (!check.allowed) {
      return res.status(check.reason === 'Listing not found' ? 404 : 403).json({ error: check.reason });
    }
    
    // Get listing info including image URLs before deletion
    const [listing] = await pool.execute(
      'SELECT user_id, status, primary_image_url, image_urls FROM listings WHERE id = ?',
      [id]
    );
    
    if (listing.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    // Delete image files from filesystem
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const uploadsDir = path.join(__dirname, '../uploads');
    
    const filesToDelete = [];
    
    // Add primary image
    if (listing[0].primary_image_url) {
      const primaryImagePath = extractFilePath(listing[0].primary_image_url, uploadsDir);
      if (primaryImagePath) {
        filesToDelete.push(primaryImagePath);
      }
    }
    
    // Add additional images
    (parseImageUrls(listing[0].image_urls) || []).forEach(url => {
      const imagePath = extractFilePath(url, uploadsDir);
      if (imagePath) {
        filesToDelete.push(imagePath);
      }
    });

    // Delete files from filesystem
    filesToDelete.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
      }
    });
    
    // Delete listing from database
    await pool.execute('DELETE FROM listings WHERE id = ?', [id]);
    
    // Update dashboard stats
    await pool.execute(
      'UPDATE dashboard_stats SET total_listings = GREATEST(total_listings - 1, 0) WHERE user_id = ?',
      [listing[0].user_id]
    );
    
    if (listing[0].status === 'active') {
      await pool.execute(
        'UPDATE dashboard_stats SET active_listings = GREATEST(active_listings - 1, 0) WHERE user_id = ?',
        [listing[0].user_id]
      );
    }
    
    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to extract file path from URL
function extractFilePath(url, uploadsDir) {
  if (!url) return null;
  
  // Handle both absolute URLs (http://localhost:3001/uploads/filename.jpg) 
  // and relative URLs (/uploads/filename.jpg)
  let filename = null;
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Extract filename from absolute URL
    const urlParts = url.split('/uploads/');
    if (urlParts.length > 1) {
      filename = urlParts[1].split('?')[0]; // Remove query params if any
    }
  } else if (url.startsWith('/uploads/')) {
    // Extract filename from relative URL
    filename = url.replace('/uploads/', '');
  }
  
  if (!filename) return null;
  
  const filePath = path.join(uploadsDir, filename);
  
  // Security check: ensure the file is within the uploads directory
  const resolvedPath = path.resolve(filePath);
  const resolvedUploadsDir = path.resolve(uploadsDir);
  
  if (!resolvedPath.startsWith(resolvedUploadsDir)) {
    return null;
  }
  
  return resolvedPath;
}

// Get user's listings
router.get('/user/:authUserId', async (req, res) => {
  try {
    const { authUserId } = req.params;
    if (!isUuid(authUserId)) {
      return res.json([]);
    }

    const [listings] = await pool.execute(
      `SELECT l.* FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE u.auth_user_id = ? AND (COALESCE(u.blocked, FALSE) = FALSE)
      ORDER BY l.created_at DESC`,
      [authUserId]
    );
    
    res.json(listings.map(listing => ({
      ...listing,
      price: listing.price ? parseFloat(listing.price) : null
    })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

