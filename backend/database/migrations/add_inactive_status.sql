ALTER TABLE listings MODIFY COLUMN status ENUM('draft', 'active', 'inactive', 'sold', 'archived') DEFAULT 'draft';


