-- Migration: Add is_archived column to tbl_rooms
ALTER TABLE tbl_rooms ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0;