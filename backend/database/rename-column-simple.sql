-- Simple SQL to rename the column
-- Run this in your MySQL client

USE mirart;

ALTER TABLE listings 
CHANGE image_url primary_image_url VARCHAR(500);

