-- =====================================================
-- MACHINES TABLOSU
-- Bu tablo ne tutuyor?
-- - Makine bilgilerini tutar.
-- Hangi bilgiler var?
-- - Makine adi
-- - Saatlik ucret
-- - Aktiflik durumu
-- =====================================================

CREATE TABLE IF NOT EXISTS machines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  hourly_price NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ornek demo makine verisi.
INSERT INTO machines (name, hourly_price, is_active)
VALUES ('Ekskavator', 1500, TRUE)
ON CONFLICT DO NOTHING;
