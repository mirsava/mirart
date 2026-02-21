ALTER TABLE notifications ADD COLUMN severity VARCHAR(20) DEFAULT 'info' AFTER type;
