import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all listings (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, status, userId, search } = req.query;
    
    let query = `
      SELECT l.*, u.business_name as artist_name, u.cognito_username
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
    
    // Parse specialties if needed
    const listings = rows.map(listing => ({
      ...listing,
      price: parseFloat(listing.price)
    }));
    
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
      `SELECT l.*, u.business_name as artist_name, u.cognito_username, u.email as artist_email
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
      price: parseFloat(rows[0].price)
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
      image_url,
      dimensions,
      medium,
      year,
      in_stock,
      status = 'draft'
    } = req.body;
    
    // Get user_id from cognito_username
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognito_username]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user_id = users[0].id;
    
    const [result] = await pool.execute(
      `INSERT INTO listings (
        user_id, title, description, category, subcategory, 
        price, image_url, dimensions, medium, year, in_stock, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, title, description, category, subcategory,
        price, image_url, dimensions, medium, year, in_stock || true, status
      ]
    );
    
    // Update dashboard stats
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
    
    const [newListing] = await pool.execute(
      'SELECT * FROM listings WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      ...newListing[0],
      price: parseFloat(newListing[0].price)
    });
  } catch (error) {
    console.error('Error creating listing:', error);
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
      image_url,
      dimensions,
      medium,
      year,
      in_stock,
      status
    } = req.body;
    
    // Get current listing to check status change
    const [current] = await pool.execute(
      'SELECT user_id, status FROM listings WHERE id = ?',
      [id]
    );
    
    if (current.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    await pool.execute(
      `UPDATE listings SET 
        title = ?, description = ?, category = ?, subcategory = ?,
        price = ?, image_url = ?, dimensions = ?, medium = ?,
        year = ?, in_stock = ?, status = ?
      WHERE id = ?`,
      [
        title, description, category, subcategory,
        price, image_url, dimensions, medium,
        year, in_stock, status, id
      ]
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
    
    res.json({
      ...updated[0],
      price: parseFloat(updated[0].price)
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
    
    // Get listing info before deletion
    const [listing] = await pool.execute(
      'SELECT user_id, status FROM listings WHERE id = ?',
      [id]
    );
    
    if (listing.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
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

