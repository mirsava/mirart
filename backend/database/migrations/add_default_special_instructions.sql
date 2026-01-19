ALTER TABLE users 
ADD COLUMN default_special_instructions TEXT DEFAULT NULL AFTER comment_notifications;
