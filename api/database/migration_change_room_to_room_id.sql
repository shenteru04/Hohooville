-- Migration: Change tbl_schedule.room to tbl_schedule.room_id
-- 1. Remove old room column
ALTER TABLE tbl_schedule DROP COLUMN room;
-- 2. Add room_id column as foreign key
ALTER TABLE tbl_schedule ADD COLUMN room_id INT(11) NULL;
ALTER TABLE tbl_schedule ADD CONSTRAINT fk_room_id FOREIGN KEY (room_id) REFERENCES tbl_rooms(room_id);