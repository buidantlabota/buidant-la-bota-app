-- Add talla_samarreta and tipus to musics table
ALTER TABLE musics ADD COLUMN IF NOT EXISTS talla_samarreta text;
ALTER TABLE musics ADD COLUMN IF NOT EXISTS tipus text CHECK (tipus IN ('titular', 'substitut'));
