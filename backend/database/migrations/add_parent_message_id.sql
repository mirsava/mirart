ALTER TABLE messages 
ADD COLUMN parent_message_id INT NULL,
ADD FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE CASCADE,
ADD INDEX idx_parent_message_id (parent_message_id);


