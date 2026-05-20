-- =====================================================
-- USERS TABLOSU
-- Bu tablo ne tutuyor?
-- - Uygulamaya kayit olan kullanicilari tutar.
-- Hangi bilgiler var?
-- - Sirket adi
-- - Ad soyad
-- - Telefon
-- - 4 haneli PIN
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  pin VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
