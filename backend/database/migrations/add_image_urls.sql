-- Migration: Add image_urls JSON column to listings table
-- This allows storing up to 10 images per listing

ALTER TABLE listings 
ADD COLUMN image_urls JSON DEFAULT NULL 
AFTER primary_image_url;

-- The image_urls column will store a JSON array of image URLs
-- Example: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"]
-- primary_image_url is the primary/featured image

