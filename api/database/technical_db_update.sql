CREATE TABLE `tbl_progress_charts` (
  `chart_id` int(11) NOT NULL AUTO_INCREMENT,
  `trainer_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `chart_content` longtext DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`chart_id`),
  KEY `trainer_id` (`trainer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;