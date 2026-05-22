-- ============================================
-- ADD WAITING_FOR_APPROVAL STATUS TO INVOICES
-- ============================================

-- Drop the existing check constraint on invoices.status
ALTER TABLE invoices 
  DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add the new check constraint including WAITING_FOR_APPROVAL
ALTER TABLE invoices 
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('DRAFT', 'SENT', 'PROCESSING', 'PACKING', 'DELIVERED', 'PAID', 'OVERDUE', 'WAITING_FOR_APPROVAL'));
