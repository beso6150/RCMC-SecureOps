-- Add equipment notes to shift handovers
ALTER TABLE "shift_handovers" ADD COLUMN IF NOT EXISTS "equipmentNotes" TEXT;
