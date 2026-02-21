-- Shippo shipping integration
-- 1. Seller origin address (users table)
ALTER TABLE users
ADD COLUMN address_line1 VARCHAR(255) NULL,
ADD COLUMN address_line2 VARCHAR(255) NULL,
ADD COLUMN address_city VARCHAR(100) NULL,
ADD COLUMN address_state VARCHAR(50) NULL,
ADD COLUMN address_zip VARCHAR(20) NULL,
ADD COLUMN address_country VARCHAR(2) DEFAULT 'US';

-- 2. Listing parcel dimensions for rate calculation
ALTER TABLE listings
ADD COLUMN weight_oz DECIMAL(10, 2) DEFAULT 24,
ADD COLUMN length_in DECIMAL(10, 2) DEFAULT 24,
ADD COLUMN width_in DECIMAL(10, 2) DEFAULT 18,
ADD COLUMN height_in DECIMAL(10, 2) DEFAULT 3;

-- 3. Order shipping fields
ALTER TABLE orders
ADD COLUMN shipping_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN shippo_rate_id VARCHAR(100) NULL,
ADD COLUMN tracking_number VARCHAR(100) NULL,
ADD COLUMN tracking_url VARCHAR(500) NULL,
ADD COLUMN label_url VARCHAR(500) NULL,
ADD COLUMN shippo_transaction_id VARCHAR(100) NULL;
