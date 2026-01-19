import express from 'express';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

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
    
    const { category, subcategory, status, userId, search, page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC', cognitoUsername } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const offset = (pageNum - 1) * limitNum;
    
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
      WHERE 1=1
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
    
    if (status) {
      baseQuery += ' AND l.status = ?';
      params.push(String(status));
    } else {
      baseQuery += ' AND l.status = "active"';
    }
    
    if (userId) {
      baseQuery += ' AND l.user_id = ?';
      params.push(String(userId));
    }
    
    if (search) {
      baseQuery += ' AND (l.title LIKE ? OR l.description LIKE ? OR u.business_name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchTerm = `%${String(search)}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Get total count (before adding ORDER BY, LIMIT, OFFSET)
    // Build count query with same WHERE conditions but COUNT instead of SELECT
    let countQuery = `
      SELECT COUNT(*) as total
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
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
    
    if (status) {
      countQuery += ' AND l.status = ?';
      countParams.push(String(status));
    } else {
      countQuery += ' AND l.status = "active"';
    }
    
    if (userId) {
      countQuery += ' AND l.user_id = ?';
      countParams.push(String(userId));
    }
    
    if (search) {
      countQuery += ' AND (l.title LIKE ? OR l.description LIKE ? OR u.business_name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchTerm = `%${String(search)}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
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
    
    let userLikedListings = [];
    if (cognitoUsername) {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE cognito_username = ?',
        [cognitoUsername]
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
       WHERE l.id = ?`,
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
      in_stock,
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
    
    const { shipping_info, returns_info, special_instructions } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO listings (
        user_id, title, description, category, subcategory,
        price, primary_image_url, image_urls, dimensions, medium, year,
        in_stock, status, shipping_info, returns_info, special_instructions, allow_comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        title,
        description || null,
        category,
        subcategory || null,
        price !== undefined && price !== null ? parseFloat(price) : null,
        primary_image_url || null,
        imageUrlsJson,
        dimensions || null,
        medium || null,
        year && year.toString().trim() !== '' ? parseInt(year) : null,
        in_stock !== undefined ? Boolean(in_stock) : true,
        listingStatus,
        (shipping_info && shipping_info.trim()) || null,
        (returns_info && returns_info.trim()) || null,
        (special_instructions && special_instructions.trim()) || null,
        allow_comments !== undefined ? Boolean(allow_comments) : true
      ]
    );
      
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
      
      // Check for specific database errors
      if (error.code === 'ER_BAD_NULL_ERROR' || (error.sqlMessage && error.sqlMessage.includes('cannot be null'))) {
        return res.status(400).json({ 
          error: 'Database constraint error. Please ensure the price column allows NULL values. Run the migration: npm run migrate-price-nullable',
          details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
        });
      }
      
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
});

// Activate listing (after payment of $10 fee)
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { cognito_username, payment_intent_id } = req.body;

    if (!cognito_username) {
      return res.status(400).json({ error: 'cognito_username is required' });
    }

    if (!payment_intent_id) {
      return res.status(400).json({ error: 'payment_intent_id is required. Payment must be completed before activation.' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update listing
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      in_stock,
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
    
    const { shipping_info, returns_info, special_instructions } = req.body;
    
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
    if (in_stock !== undefined) { updateFields.push('in_stock = ?'); updateValues.push(in_stock); }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (shipping_info !== undefined) { updateFields.push('shipping_info = ?'); updateValues.push((shipping_info && shipping_info.trim()) || null); }
    if (returns_info !== undefined) { updateFields.push('returns_info = ?'); updateValues.push((returns_info && returns_info.trim()) || null); }
    if (special_instructions !== undefined) { updateFields.push('special_instructions = ?'); updateValues.push((special_instructions && special_instructions.trim()) || null); }
    if (allow_comments !== undefined) { updateFields.push('allow_comments = ?'); updateValues.push(Boolean(allow_comments)); }
    
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
      `SELECT l.*       FROM listings l
      JOIN users u ON l.user_id = u.id
       WHERE u.cognito_username = ?
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

