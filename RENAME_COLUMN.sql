-- Run this SQL command directly in your MySQL client or phpMyAdmin
-- to rename image_url to primary_image_url

USE mirart;

ALTER TABLE listings 
CHANGE COLUMN image_url primary_image_url VARCHAR(500);

-- Verify the change
SHOW COLUMNS FROM listings LIKE '%image%';

