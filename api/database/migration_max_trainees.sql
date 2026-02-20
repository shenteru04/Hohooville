ALTER TABLE `tbl_batch` 
ADD COLUMN `max_trainees` INT NOT NULL DEFAULT 25 COMMENT 'Maximum number of trainees allowed in this batch';