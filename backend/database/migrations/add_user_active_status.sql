ALTER TABLE users 
ADD COLUMN active BOOLEAN DEFAULT TRUE,
ADD INDEX idx_active (active);


