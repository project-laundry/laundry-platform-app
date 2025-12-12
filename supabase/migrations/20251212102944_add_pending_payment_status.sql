-- Add pending_payment status to order_status enum
-- This status indicates an order is awaiting payment capture

-- Add the new value to the enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment' BEFORE 'pending_assignment';

-- Add comment explaining the status
COMMENT ON TYPE order_status IS 'Order lifecycle statuses: pending_payment (awaiting payment), pending_assignment (awaiting cleaner), pickup_scheduled, picked_up, in_cleaning, ready_for_delivery, out_for_delivery, completed, cancelled';
