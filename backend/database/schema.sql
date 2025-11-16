-- ArtZyla Marketplace Database Schema

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS mirart;
USE mirart;

-- Users table (stores additional user data beyond Cognito)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cognito_username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  business_name VARCHAR(255),
  phone VARCHAR(20),
  country VARCHAR(100),
  website VARCHAR(255),
  specialties TEXT, -- JSON array of specialties
  experience_level VARCHAR(50),
  bio TEXT,
  profile_image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cognito_username (cognito_username),
  INDEX idx_email (email)
);

-- Artwork listings table
CREATE TABLE IF NOT EXISTS listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('Painting', 'Woodworking', 'Sculpture', 'Photography', 'Digital Art', 'Ceramics', 'Textiles', 'Jewelry', 'Mixed Media', 'Other') NOT NULL,
  subcategory VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL,
  primary_image_url VARCHAR(500),
  image_urls JSON DEFAULT NULL,
  dimensions VARCHAR(100),
  medium VARCHAR(100),
  year INT,
  in_stock BOOLEAN DEFAULT TRUE,
  status ENUM('draft', 'active', 'sold', 'archived') DEFAULT 'draft',
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  listing_id INT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  artist_earnings DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  shipping_address TEXT,
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  INDEX idx_buyer_id (buyer_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Dashboard statistics (cached stats for performance)
CREATE TABLE IF NOT EXISTS dashboard_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  total_listings INT DEFAULT 0,
  active_listings INT DEFAULT 0,
  total_sales INT DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0.00,
  pending_orders INT DEFAULT 0,
  total_views INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

