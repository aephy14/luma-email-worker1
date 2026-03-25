-- Ensure the base sheet record exists for email-ingested rows
INSERT OR IGNORE INTO sheet (id, columns_json)
VALUES (1, '["Date","Description","Amount (NZD)","GST","Notes"]');
