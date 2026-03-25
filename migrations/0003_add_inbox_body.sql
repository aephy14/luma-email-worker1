-- Add body column to inbox table (was missing from initial schema)
ALTER TABLE inbox ADD COLUMN body TEXT NOT NULL DEFAULT '';
