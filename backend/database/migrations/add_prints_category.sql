-- Add Prints category for prints from artwork
ALTER TABLE listings 
MODIFY COLUMN category ENUM('Painting', 'Woodworking', 'Prints', 'Sculpture', 'Photography', 'Digital Art', 'Ceramics', 'Textiles', 'Jewelry', 'Mixed Media', 'Other') NOT NULL;
