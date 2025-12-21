-- Query untuk cleanup manual streams yang stuck
-- Run ini di database untuk hapus stream yang gagal di-stop

-- Cek stream yang stuck (status = active tapi seharusnya sudah selesai)
SELECT id, title, type, status, actual_start, created_at 
FROM streams 
WHERE status = 'active';

-- Force cleanup: Ubah semua active streams jadi 'completed'
UPDATE streams 
SET status = 'completed', 
    actual_end = datetime('now'),
    updated_at = datetime('now')
WHERE status = 'active';

-- Atau hapus total jika memang "sampah"
DELETE FROM streams 
WHERE status = 'active' 
  AND id IN (12345, 67890); -- Ganti dengan ID stream yang stuck

-- Verify cleanup
SELECT id, title, status FROM streams ORDER BY created_at DESC LIMIT 10;
