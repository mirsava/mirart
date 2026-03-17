ALTER TABLE listings
ADD COLUMN fixed_shipping_fee DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE orders
ADD COLUMN shipping_fee_charged DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN shipping_label_cost DECIMAL(10, 2) DEFAULT 0;
