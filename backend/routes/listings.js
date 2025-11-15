import express from 'express';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get all listings (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, status, userId, search } = req.query;
    
    let query = `
      SELECT l.*, 
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username,
          u.email
        ) as artist_name,
        u.cognito_username
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (category) {
      query += ' AND l.category = ?';
      params.push(category);
    }
    
    if (subcategory) {
      query += ' AND l.subcategory = ?';
      params.push(subcategory);
    }
    
    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    } else {
      query += ' AND l.status = "active"';
    }
    
    if (userId) {
      query += ' AND l.user_id = ?';
      params.push(userId);
    }
    
    if (search) {
      query += ' AND (l.title LIKE ? OR l.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY l.created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    
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
          console.error('Error parsing image_urls JSON:', parseError);
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
        price: parseFloat(listing.price),
        image_urls: parsedImageUrls
      };
    });
    
    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single listing by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT l.*, 
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username,
          u.email
        ) as artist_name,
        u.cognito_username, 
        u.email as artist_email
       FROM listings l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    // Increment views
    await pool.execute(
      'UPDATE listings SET views = views + 1 WHERE id = ?',
      [id]
    );
    
    res.json({
      ...rows[0],
      price: parseFloat(rows[0].price),
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
          console.error('Error parsing image_urls JSON:', parseError);
          const imageUrlsStr = String(rows[0].image_urls).trim();
          if (imageUrlsStr && imageUrlsStr !== 'null' && imageUrlsStr !== '' && (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/'))) {
            return [imageUrlsStr];
          }
          return null;
        }
      })()
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
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
      status = 'draft'
    } = req.body;
    
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
          `INSERT INTO users (cognito_username, email, first_name, last_name) VALUES (?, ?, NULL, NULL)`,
          [cognito_username, cognito_username] // Use username as email placeholder
        );
        user_id = result.insertId;
        
        // Initialize dashboard stats for new user
        await pool.execute(
          'INSERT INTO dashboard_stats (user_id) VALUES (?)',
          [user_id]
        );
      } catch (createError) {
        console.error('Error creating user:', createError);
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
        console.error('Error stringifying image_urls:', jsonError);
        return res.status(400).json({ error: 'Invalid image_urls format' });
      }
    }
    
    const { shipping_info, returns_info } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO listings (
        user_id, title, description, category, subcategory, 
        price, primary_image_url, image_urls, dimensions, medium, year, in_stock, status, shipping_info, returns_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, 
        title, 
        description || null, 
        category, 
        subcategory || null,
        parseFloat(price), 
        primary_image_url || null, 
        imageUrlsJson, 
        dimensions || null, 
        medium || null, 
        year && year.toString().trim() !== '' ? parseInt(year) : null, 
        in_stock !== undefined ? Boolean(in_stock) : true, 
        status || 'draft',
        (shipping_info && shipping_info.trim()) || null,
        (returns_info && returns_info.trim()) || null
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
      
      if (status === 'active') {
        await pool.execute(
          'UPDATE dashboard_stats SET active_listings = active_listings + 1 WHERE user_id = ?',
          [user_id]
        );
      }
    } catch (statsError) {
      // Log but don't fail the listing creation if stats update fails
      console.error('Error updating dashboard stats:', statsError);
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
        console.error('Error parsing image_urls JSON:', parseError);
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
      price: parseFloat(newListing[0].price),
      image_urls: parsedImageUrls
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      status
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
    
    const { shipping_info, returns_info } = req.body;
    
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
    if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }
    if (shipping_info !== undefined) { updateFields.push('shipping_info = ?'); updateValues.push((shipping_info && shipping_info.trim()) || null); }
    if (returns_info !== undefined) { updateFields.push('returns_info = ?'); updateValues.push((returns_info && returns_info.trim()) || null); }
    
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
        console.error('Error parsing image_urls JSON:', parseError);
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
      price: parseFloat(updated[0].price),
      image_urls: parsedImageUrls
    });
  } catch (error) {
    console.error('Error updating listing:', error);
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
        console.error('Error parsing image_urls JSON:', parseError);
      }
    }
    
    // Delete files from filesystem
    filesToDelete.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted image file: ${filePath}`);
        }
      } catch (fileError) {
        console.error(`Error deleting file ${filePath}:`, fileError);
        // Continue even if file deletion fails
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
    console.error('Error deleting listing:', error);
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
    console.error('Security check failed: file path outside uploads directory');
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
       WHERE u.cognito_username = ?
       ORDER BY l.created_at DESC`,
      [cognitoUsername]
    );
    
    res.json(listings.map(listing => ({
      ...listing,
      price: parseFloat(listing.price)
    })));
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

