ALTER TABLE listings ADD COLUMN allow_comments BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS listing_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_listing_id (listing_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);




