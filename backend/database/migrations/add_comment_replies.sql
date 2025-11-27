ALTER TABLE listing_comments ADD COLUMN parent_comment_id INT NULL;
ALTER TABLE listing_comments ADD FOREIGN KEY (parent_comment_id) REFERENCES listing_comments(id) ON DELETE CASCADE;
CREATE INDEX idx_parent_comment_id ON listing_comments(parent_comment_id);


