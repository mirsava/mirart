ALTER TABLE listings 
ADD COLUMN listing_type ENUM('fixed_price', 'auction') DEFAULT 'fixed_price' AFTER price,
ADD COLUMN starting_bid DECIMAL(10, 2) NULL AFTER listing_type,
ADD COLUMN current_bid DECIMAL(10, 2) NULL AFTER starting_bid,
ADD COLUMN reserve_price DECIMAL(10, 2) NULL AFTER current_bid,
ADD COLUMN auction_end_date DATETIME NULL AFTER reserve_price,
ADD COLUMN bid_count INT DEFAULT 0 AFTER auction_end_date;

