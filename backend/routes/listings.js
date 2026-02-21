import express from 'express';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import UserRole from '../constants/userRoles.js';

const router = express.Router();

// Check if requester can modify listing (owner or admin)
const canModifyListing = async (listingId, cognitoUsername, groups) => {
  if (!cognitoUsername) return { allowed: false, reason: 'Authentication required' };
  const [listing] = await pool.execute('SELECT user_id FROM listings WHERE id = ?', [listingId]);
  if (listing.length === 0) return { allowed: false, reason: 'Listing not found' };
  const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognitoUsername]);
  if (users.length === 0) return { allowed: false, reason: 'User not found' };
  const userId = users[0].id;
  if (listing[0].user_id === userId) return { allowed: true };
  let userGroups = [];
  if (groups) {
    try {
      userGroups = typeof groups === 'string' ? JSON.parse(groups) : (Array.isArray(groups) ? groups : [groups]);
    } catch {
      userGroups = Array.isArray(groups) ? groups : [groups];
    }
  }
  const isAdmin = userGroups.includes(UserRole.SITE_ADMIN) || userGroups.includes('site_admin') || userGroups.includes('admin');
  if (isAdmin) return { allowed: true };
  return { allowed: false, reason: 'You do not have permission to modify this listing' };
};

// Get all listings (with optional filters and pagination)
router.get('/', async (req, res) => {
  try {
    try {
      await pool.execute('SELECT business_name FROM users LIMIT 1');
    } catch (colError) {
      if (colError.code === 'ER_BAD_FIELD_ERROR' && colError.message && colError.message.includes('business_name')) {
        try {
          await pool.execute('ALTER TABLE users ADD COLUMN business_name VARCHAR(255) NULL');
        } catch (alterError) {
          if (alterError.code !== 'ER_DUP_FIELDNAME') {
            console.error('Failed to add business_name column:', alterError.message);
          }
        }
      } else if (colError.code !== 'ER_BAD_FIELD_ERROR') {
        throw colError;
      }
    }
    
    const { category, subcategory, status, userId, search, page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC', cognitoUsername, requestingUser, minPrice, maxPrice, minYear, maxYear, medium, inStock } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const offset = (pageNum - 1) * limitNum;
    
    // Check if user is fetching their own listings (by cognitoUsername)
    // Gallery page should always show all listings, regardless of login status
    // Only treat as "own listings" if cognitoUsername is provided, no userId, AND explicitly requesting own listings
    const hasUserId = userId && userId !== 'undefined' && userId !== 'null' && userId !== '';
    
    // Check for filters - these indicate a public gallery search
    const hasCategoryOrStatus = (category && category !== '') || (status && status !== '');
    const hasPriceFilter = (minPrice && minPrice !== '' && minPrice !== 'undefined') || (maxPrice && maxPrice !== '' && maxPrice !== 'undefined');
    const hasYearFilter = (minYear && minYear !== '' && minYear !== 'undefined') || (maxYear && maxYear !== '' && maxYear !== 'undefined');
    const hasMediumFilter = (medium && medium !== '' && medium !== 'undefined');
    const hasStockFilter = (inStock === 'true' || inStock === true || inStock === '1');
    const hasFilters = hasCategoryOrStatus || hasPriceFilter || hasYearFilter || hasMediumFilter || hasStockFilter;
    
    // Only treat as "own listings" if cognitoUsername is provided, no userId, AND no filters
    // If filters are present, it's a public gallery search - ignore cognitoUsername
    const isFetchingOwnListings = Boolean(cognitoUsername && !hasUserId && !hasFilters);
    
    let baseQuery = `
      SELECT l.*, 
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username,
          u.cognito_username
        ) as artist_name,
        u.cognito_username,
        u.signature_url,
        (SELECT COUNT(*) FROM likes WHERE listing_id = l.id) as like_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1 AND (COALESCE(u.blocked, 0) = 0)
    `;
    const params = [];
    
    if (category) {
      baseQuery += ' AND l.category = ?';
      params.push(String(category));
    }
    
    if (subcategory) {
      baseQuery += ' AND l.subcategory = ?';
      params.push(String(subcategory));
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
      baseQuery += ' AND u.cognito_username = ?';
      params.push(String(cognitoUsername));
    } else if (cognitoUsername && !hasUserId) {
      // Filter by artist for public gallery search
      baseQuery += ' AND u.cognito_username = ?';
      params.push(String(cognitoUsername));
    }
    
    if (search) {
      baseQuery += ' AND (l.title LIKE ? OR l.description LIKE ? OR u.business_name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
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
          baseQuery += 'LOWER(l.medium) LIKE LOWER(?)';
          params.push(`%${m}%`);
        });
        baseQuery += ')';
      }
    }
    
    if (inStock === 'true' || inStock === true || inStock === '1') {
      baseQuery += ' AND l.in_stock = 1';
    }
    
    // Get total count (before adding ORDER BY, LIMIT, OFFSET)
    // Build count query with same WHERE conditions but COUNT instead of SELECT
    let countQuery = `
      SELECT COUNT(*) as total
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1 AND (COALESCE(u.blocked, 0) = 0)
    `;
    const countParams = [];
    
    if (category) {
      countQuery += ' AND l.category = ?';
      countParams.push(String(category));
    }
    
    if (subcategory) {
      countQuery += ' AND l.subcategory = ?';
      countParams.push(String(subcategory));
    }
    
    // Only apply default "active" filter if not fetching own listings
    // When fetching own listings without status filter, show all statuses
    if (status) {
      countQuery += ' AND l.status = ?';
      countParams.push(String(status));
    } else if (!isFetchingOwnListings) {
      // Default: only show active listings for public views
      countQuery += ' AND l.status = "active"';
    }
    // If isFetchingOwnListings is true and status is not provided, no status filter is applied (shows all)
    
    if (hasUserId) {
      countQuery += ' AND l.user_id = ?';
      countParams.push(String(userId));
    } else if (isFetchingOwnListings) {
      // Add filter to only show listings owned by this user
      countQuery += ' AND u.cognito_username = ?';
      countParams.push(String(cognitoUsername));
    }
    
    if (search) {
      countQuery += ' AND (l.title LIKE ? OR l.description LIKE ? OR u.business_name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
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
          countQuery += 'l.medium LIKE ?';
          countParams.push(`%${m}%`);
        });
        countQuery += ')';
      }
    }
    
    if (inStock === 'true' || inStock === true || inStock === '1') {
      countQuery += ' AND l.in_stock = 1';
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
    
    // Use requestingUser (viewer) for is_liked - NOT cognitoUsername (artist filter)
    let userLikedListings = [];
    const viewerForLikes = requestingUser || (isFetchingOwnListings ? cognitoUsername : null);
    if (viewerForLikes) {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE cognito_username = ?',
        [viewerForLikes]
      );
      if (users.length > 0) {
        const userId = users[0].id;
        const listingIds = rows.map(r => r.id);
        if (listingIds.length > 0) {
          const placeholders = listingIds.map(() => '?').join(',');
          const [likes] = await pool.execute(
            `SELECT listing_id FROM likes WHERE user_id = ? AND listing_id IN (${placeholders})`,
            [userId, ...listingIds]
          );
          userLikedListings = likes.map(like => like.listing_id);
        }
      }
    }
    
    // Parse JSON fields
    const listings = rows.map(listing => {
      let parsedImageUrls = null;
      if (listing.image_urls && listing.image_urls !== 'null' && listing.image_urls !== '') {
        try {
          const imageUrlsStr = String(listing.image_urls).trim();
          if (!imageUrlsStr || imageUrlsStr === 'null' || imageUrlsStr === '') {
            parsedImageUrls = null;
          } else if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
            parsedImageUrls = JSON.parse(imageUrlsStr);
          } else if (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/')) {
            parsedImageUrls = [imageUrlsStr];
          } else {
            parsedImageUrls = JSON.parse(imageUrlsStr);
          }
        } catch (parseError) {
          const imageUrlsStr = String(listing.image_urls).trim();
          if (imageUrlsStr && imageUrlsStr !== 'null' && imageUrlsStr !== '' && (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/'))) {
            parsedImageUrls = [imageUrlsStr];
          } else {
            parsedImageUrls = null;
          }
        }
      }
      
      return {
        ...listing,
        price: listing.price ? parseFloat(listing.price) : null,
        image_urls: parsedImageUrls,
        like_count: listing.like_count || 0,
        is_liked: userLikedListings.includes(listing.id)
      };
    });
    
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
    console.error('Error code:', error.code);
    console.error('SQL:', error.sql);
    res.status(500).json({ error: 'Internal server error', details: error.sqlMessage || error.message });
  }
});

// Get single listing by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cognitoUsername } = req.query;
    
    const [rows] = await pool.execute(
      `SELECT l.*, 
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username,
          u.cognito_username
        ) as artist_name,
        u.cognito_username,
        u.signature_url,
        (SELECT COUNT(*) FROM likes WHERE listing_id = l.id) as like_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ? AND (COALESCE(u.blocked, 0) = 0)`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    let isLiked = false;
    if (cognitoUsername) {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE cognito_username = ?',
        [cognitoUsername]
      );
      if (users.length > 0) {
        const userId = users[0].id;
        const [likes] = await pool.execute(
          'SELECT id FROM likes WHERE user_id = ? AND listing_id = ?',
          [userId, id]
        );
        isLiked = likes.length > 0;
      }
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
      image_urls: (() => {
        if (!rows[0].image_urls || rows[0].image_urls === 'null' || rows[0].image_urls === '') return null;
        try {
          const imageUrlsStr = String(rows[0].image_urls).trim();
          if (!imageUrlsStr || imageUrlsStr === 'null' || imageUrlsStr === '') {
            return null;
          } else if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
            let parsed = JSON.parse(imageUrlsStr);
            // Fix: If the parsed result is an array with a single comma-separated string, split it
            if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].includes(',')) {
              parsed = parsed[0].split(',').map(url => url.trim()).filter(url => url);
            }
            return parsed;
          } else if (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/')) {
            return [imageUrlsStr];
          } else {
            let parsed = JSON.parse(imageUrlsStr);
            // Fix: If the parsed result is an array with a single comma-separated string, split it
            if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].includes(',')) {
              parsed = parsed[0].split(',').map(url => url.trim()).filter(url => url);
            }
            return parsed;
          }
        } catch (parseError) {
          const imageUrlsStr = String(rows[0].image_urls).trim();
          if (imageUrlsStr && imageUrlsStr !== 'null' && imageUrlsStr !== '' && (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/'))) {
            return [imageUrlsStr];
          }
          return null;
        }
      })()
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
router.post('/', async (req, res) => {
  try {
    const {
      cognito_username,
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
    
    // Force status to 'draft' - listings must be activated after payment
    const listingStatus = 'draft';
    
    // Validate required fields
    if (!cognito_username) {
      return res.status(400).json({ error: 'cognito_username is required' });
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
    
    // Get user_id from cognito_username, create user if doesn't exist
    let [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognito_username]
    );
    
    let user_id;
    if (users.length === 0) {
      // User doesn't exist in database, create a basic user record
      // We'll use the cognito_username as email if email is not provided
      // This allows users to create listings even if they haven't completed full signup
      // Note: first_name and last_name will be NULL initially and can be updated later
      try {
        const [result] = await pool.execute(
          'INSERT INTO users (cognito_username, email, first_name, last_name) VALUES (?, ?, NULL, NULL)',
          [cognito_username, cognito_username] // Use username as email placeholder
        );
        user_id = result.insertId;
        
        // Initialize dashboard stats for new user
        await pool.execute(
          'INSERT INTO dashboard_stats (user_id) VALUES (?)',
          [user_id]
        );
      } catch (createError) {
        return res.status(500).json({ error: 'Failed to create user record' });
      }
    } else {
      user_id = users[0].id;
    }
    
    // Prepare image_urls for database (JSON string or null)
    let imageUrlsJson = null;
    if (imageUrlsArray && imageUrlsArray.length > 0) {
      try {
        imageUrlsJson = JSON.stringify(imageUrlsArray);
      } catch (jsonError) {
        return res.status(400).json({ error: 'Invalid image_urls format' });
      }
    }
    
    const { shipping_info, returns_info, special_instructions, shipping_preference, shipping_carrier, return_days } = req.body;
    
    const qty = quantity_available !== undefined && quantity_available !== null && quantity_available !== ''
      ? Math.max(0, parseInt(quantity_available))
      : 1;
    const stock = in_stock !== undefined ? Boolean(in_stock) : (qty > 0);

    const shipPref = (shipping_preference === 'free' || shipping_preference === 'buyer') ? shipping_preference : null;
    const shipCarrier = (shipping_carrier === 'shippo' || shipping_carrier === 'own') ? shipping_carrier : null;
    const retDaysNum = return_days != null ? parseInt(String(return_days), 10) : null;
    const retDays = retDaysNum != null && !isNaN(retDaysNum) && retDaysNum > 0 && retDaysNum <= 365 ? retDaysNum : null;

    let result;
    try {
      [result] = await pool.execute(
        `INSERT INTO listings (
          user_id, title, description, category, subcategory,
          price, primary_image_url, image_urls, dimensions, medium, year,
          weight_oz, length_in, width_in, height_in,
          in_stock, quantity_available, status, shipping_info, returns_info, special_instructions, allow_comments,
          shipping_preference, shipping_carrier, return_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          retDays
        ]
      );
    } catch (insertError) {
      console.error('Create listing INSERT error:', insertError.code, insertError.sqlMessage || insertError.message);
      const isBadField = insertError.code === 'ER_BAD_FIELD_ERROR';
      const msg = insertError.message || '';
      const missingShipping = isBadField && (msg.includes('return_days') || msg.includes('shipping_preference') || msg.includes('shipping_carrier'));
      const missingParcel = isBadField && (msg.includes('weight_oz') || msg.includes('length_in') || msg.includes('width_in') || msg.includes('height_in'));
      if (missingShipping) {
        [result] = await pool.execute(
          `INSERT INTO listings (
            user_id, title, description, category, subcategory,
            price, primary_image_url, image_urls, dimensions, medium, year,
            weight_oz, length_in, width_in, height_in,
            in_stock, quantity_available, status, shipping_info, returns_info, special_instructions, allow_comments
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            allow_comments !== undefined ? Boolean(allow_comments) : true
          ]
        );
      } else if (missingParcel) {
        [result] = await pool.execute(
          `INSERT INTO listings (
            user_id, title, description, category, subcategory,
            price, primary_image_url, image_urls, dimensions, medium, year,
            in_stock, quantity_available, status, shipping_info, returns_info, special_instructions, allow_comments,
            shipping_preference, shipping_carrier, return_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            stock,
            qty,
            listingStatus,
            (shipping_info && shipping_info.trim()) || null,
            (returns_info && returns_info.trim()) || null,
            (special_instructions && special_instructions.trim()) || null,
            allow_comments !== undefined ? Boolean(allow_comments) : true,
            shipPref,
            shipCarrier,
            retDays
          ]
        );
      } else {
        throw insertError;
      }
    }
      
      // Update dashboard stats (ensure record exists first)
      try {
        const [statsCheck] = await pool.execute(
          'SELECT id FROM dashboard_stats WHERE user_id = ?',
          [user_id]
        );
        
        if (statsCheck.length === 0) {
          // Create dashboard stats record if it doesn't exist
          await pool.execute(
            'INSERT INTO dashboard_stats (user_id, total_listings, active_listings) VALUES (?, 0, 0)',
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
      
      // Parse image_urls JSON safely
      let parsedImageUrls = null;
      if (newListing[0].image_urls) {
        try {
          const imageUrlsStr = String(newListing[0].image_urls).trim();
          if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
            parsedImageUrls = JSON.parse(imageUrlsStr);
          } else if (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/')) {
            parsedImageUrls = [imageUrlsStr];
          } else {
            parsedImageUrls = JSON.parse(imageUrlsStr);
          }
        } catch (parseError) {
          const imageUrlsStr = String(newListing[0].image_urls).trim();
          if (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/')) {
            parsedImageUrls = [imageUrlsStr];
          } else {
            parsedImageUrls = null;
          }
        }
      }
      
      res.status(201).json({
        ...newListing[0],
        price: newListing[0].price ? parseFloat(newListing[0].price) : null,
        image_urls: parsedImageUrls
      });
  } catch (error) {
    console.error('Create listing error:', error.code, error.sqlMessage || error.message);
    if (error.code === 'ER_BAD_NULL_ERROR' || (error.sqlMessage && error.sqlMessage.includes('cannot be null'))) {
      return res.status(400).json({
        error: 'Database constraint error. Please ensure the price column allows NULL values. Run the migration: npm run migrate-price-nullable',
        details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
      });
    }
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error.sqlMessage || error.message) : undefined
    });
  }
});

// Activate listing (check subscription limits)
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { cognito_username } = req.body;

    if (!cognito_username) {
      return res.status(400).json({ error: 'cognito_username is required' });
    }

    // Get listing and verify ownership
    const [listings] = await pool.execute(
      `SELECT l.*, u.id as user_id, u.cognito_username 
      FROM listings l
      JOIN users u ON l.user_id = u.id
       WHERE l.id = ? AND u.cognito_username = ?`,
      [id, cognito_username]
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

    // Check subscription limits
    const [subscriptions] = await pool.execute(
      `SELECT us.*, sp.max_listings
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = ? AND us.status = 'active' AND us.end_date >= CURDATE()
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [listing.user_id]
    );

    if (subscriptions.length === 0) {
      return res.status(403).json({ 
        error: 'No active subscription found',
        message: 'You need an active subscription to activate listings. Please subscribe to a plan first.'
      });
    }

    const subscription = subscriptions[0];

    // Count current active listings
    const [activeCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM listings WHERE user_id = ? AND status = "active"',
      [listing.user_id]
    );

    const currentActive = activeCount[0].count;

    if (currentActive >= subscription.max_listings) {
      return res.status(403).json({ 
        error: 'Listing limit reached',
        message: `You have reached your subscription limit of ${subscription.max_listings} active listings. Please upgrade your plan or deactivate existing listings.`
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cognito_username, groups } = req.body;
    const check = await canModifyListing(id, cognito_username, groups);
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
      'SELECT user_id, status FROM listings WHERE id = ?',
      [id]
    );
    
    if (current.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    const { shipping_info, returns_info, special_instructions, shipping_preference, shipping_carrier, return_days } = req.body;
    
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
    if (return_days !== undefined) {
      const rd = return_days == null || return_days === 'none' ? null : (parseInt(String(return_days), 10) || null);
      updateFields.push('return_days = ?');
      updateValues.push(rd != null && rd > 0 && rd <= 365 ? rd : null);
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
    
    let parsedImageUrls = null;
    if (updated[0].image_urls && updated[0].image_urls !== 'null' && updated[0].image_urls !== '') {
      try {
        const imageUrlsStr = String(updated[0].image_urls).trim();
        if (!imageUrlsStr || imageUrlsStr === 'null' || imageUrlsStr === '') {
          parsedImageUrls = null;
        } else if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
          parsedImageUrls = JSON.parse(imageUrlsStr);
          // Fix: If the parsed result is an array with a single comma-separated string, split it
          if (Array.isArray(parsedImageUrls) && parsedImageUrls.length === 1 && typeof parsedImageUrls[0] === 'string' && parsedImageUrls[0].includes(',')) {
            parsedImageUrls = parsedImageUrls[0].split(',').map(url => url.trim()).filter(url => url);
          }
        } else if (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/')) {
          parsedImageUrls = [imageUrlsStr];
        } else {
          parsedImageUrls = JSON.parse(imageUrlsStr);
          // Fix: If the parsed result is an array with a single comma-separated string, split it
          if (Array.isArray(parsedImageUrls) && parsedImageUrls.length === 1 && typeof parsedImageUrls[0] === 'string' && parsedImageUrls[0].includes(',')) {
            parsedImageUrls = parsedImageUrls[0].split(',').map(url => url.trim()).filter(url => url);
          }
        }
      } catch (parseError) {
        const imageUrlsStr = String(updated[0].image_urls).trim();
        if (imageUrlsStr && imageUrlsStr !== 'null' && imageUrlsStr !== '' && (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/'))) {
          parsedImageUrls = [imageUrlsStr];
        } else {
          parsedImageUrls = null;
        }
      }
    }
    
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cognitoUsername, groups } = req.query;
    const check = await canModifyListing(id, cognitoUsername, groups);
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
    if (listing[0].image_urls && listing[0].image_urls !== 'null' && listing[0].image_urls !== '') {
      try {
        const imageUrlsStr = String(listing[0].image_urls).trim();
        if (imageUrlsStr && imageUrlsStr !== 'null' && imageUrlsStr !== '') {
          const imageUrls = JSON.parse(imageUrlsStr);
          if (Array.isArray(imageUrls)) {
            imageUrls.forEach(url => {
              const imagePath = extractFilePath(url, uploadsDir);
              if (imagePath) {
                filesToDelete.push(imagePath);
              }
            });
          }
        }
      } catch (parseError) {
      }
    }
    
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
router.get('/user/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    
    const [listings] = await pool.execute(
      `SELECT l.* FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE u.cognito_username = ? AND (COALESCE(u.blocked, 0) = 0)
      ORDER BY l.created_at DESC`,
      [cognitoUsername]
    );
    
    res.json(listings.map(listing => ({
      ...listing,
      price: parseFloat(listing.price)
    })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

