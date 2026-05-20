-- =====================================================
-- JOB_TYPES TABLOSU
-- Bu tablo ne tutuyor?
-- - Yapilan is turlerini tutar.
-- Ornek:
-- - Temel kazi
-- - Dolgu
-- - Yukleme
-- =====================================================

CREATE TABLE IF NOT EXISTS job_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- JOBS TABLOSU
-- Bu tablo ne tutuyor?
-- - Her yapilan isi kaydeder.
-- Hangi bilgiler var?
-- - Musteri
-- - Makine
-- - Is turu
-- - Tarih
-- - Sure
-- - Saatlik ucret
-- - Yol ucreti
-- - Toplam ucret
-- - Odeme durumu
-- - Not
-- =====================================================

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  job_type_id INTEGER NOT NULL REFERENCES job_types(id) ON DELETE RESTRICT,
  job_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_hours NUMERIC(10, 2) NOT NULL,
  hourly_price NUMERIC(10, 2) NOT NULL,
  road_fee NUMERIC(10, 2) DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'bekliyor',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ornek is turu verisi.
INSERT INTO job_types (name)
VALUES ('Temel kazi')
ON CONFLICT (name) DO NOTHING;
