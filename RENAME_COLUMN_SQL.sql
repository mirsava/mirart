-- Run this SQL command in your MySQL client
-- Make sure you're connected to the mirart database first

USE mirart;

ALTER TABLE listings CHANGE image_url primary_image_url VARCHAR(500);

-- Verify it worked:
SHOW COLUMNS FROM listings LIKE '%image%';

