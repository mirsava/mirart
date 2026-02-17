-- Blocked users cannot sign in or self-reactivate. Only admin can unblock.
ALTER TABLE users 
ADD COLUMN blocked TINYINT(1) DEFAULT 0,
ADD INDEX idx_blocked (blocked);
