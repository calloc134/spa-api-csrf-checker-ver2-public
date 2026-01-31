-- Add backend_id column to identify which backend generated the log
ALTER TABLE `security_logs` ADD COLUMN `backend_id` text;

-- Create index for faster filtering by backend_id
CREATE INDEX `idx_security_logs_backend_id` ON `security_logs` (`backend_id`);
