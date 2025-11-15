-- Migration: Rename image_url to primary_image_url
-- This makes it clearer that this is the main/featured image

ALTER TABLE listings 
CHANGE COLUMN image_url primary_image_url VARCHAR(500);

