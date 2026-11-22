-- Bounded avatar thumbnails use the same durable storage as pet profile photos.
ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
