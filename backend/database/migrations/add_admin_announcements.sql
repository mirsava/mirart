CREATE TABLE IF NOT EXISTS admin_announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT NOT NULL,
  target_type ENUM('all', 'authenticated', 'artists', 'buyers', 'admins', 'specific') NOT NULL DEFAULT 'all',
  target_user_ids JSON NULL,
  severity ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATETIME NULL,
  end_date DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_dates (is_active, start_date, end_date)
);
