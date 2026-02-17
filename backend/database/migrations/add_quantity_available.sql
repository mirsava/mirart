-- Add quantity_available for number of artwork in stock
ALTER TABLE listings ADD COLUMN quantity_available INT DEFAULT 1;
