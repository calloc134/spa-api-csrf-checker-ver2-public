CREATE TABLE `security_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`alert_type` text NOT NULL,
	`severity` text NOT NULL,
	`endpoint` text NOT NULL,
	`method` text NOT NULL,
	`expected_origin` text,
	`received_origin` text,
	`referer` text,
	`sec_fetch_site` text,
	`content_type` text,
	`cookie_present` integer,
	`description` text NOT NULL
);
