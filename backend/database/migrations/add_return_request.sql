ALTER TABLE orders ADD COLUMN return_status VARCHAR(30) DEFAULT NULL AFTER status;
ALTER TABLE orders ADD COLUMN return_reason TEXT DEFAULT NULL AFTER return_status;
ALTER TABLE orders ADD COLUMN return_requested_at TIMESTAMP NULL DEFAULT NULL AFTER return_reason;
