ALTER TABLE listings 
ADD COLUMN special_instructions TEXT DEFAULT NULL AFTER returns_info;
