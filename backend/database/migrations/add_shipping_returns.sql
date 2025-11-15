ALTER TABLE listings 
ADD COLUMN shipping_info TEXT DEFAULT NULL AFTER in_stock,
ADD COLUMN returns_info TEXT DEFAULT NULL AFTER shipping_info;

