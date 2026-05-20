-- =====================================================
-- CUSTOMERS TABLOSU
-- Bu tablo ne tutuyor?
-- - Musteri bilgilerini tutar.
-- Hangi bilgiler var?
-- - Musteri adi
-- - Telefon numarasi
-- - Not bilgisi
-- =====================================================

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ornek demo musteri verisi.
INSERT INTO customers (name, phone, note)
VALUES ('Ahmet Yilmaz', '05320000000', 'Ilk demo musteri')
ON CONFLICT DO NOTHING;
