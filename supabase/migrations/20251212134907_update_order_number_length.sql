-- Migration: increase orders.order_number length to 8 characters

-- Increase the length of orders.order_number from 6 to 8 characters
ALTER TABLE orders
	ALTER COLUMN order_number TYPE varchar(8);

