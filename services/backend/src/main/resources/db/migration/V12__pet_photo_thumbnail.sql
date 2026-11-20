-- ponytail: bounded profile thumbnails share the pet record; use object storage
-- if original photos or larger galleries become a requirement.
ALTER TABLE pets ALTER COLUMN photo_url TYPE TEXT;
