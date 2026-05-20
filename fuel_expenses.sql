-- =====================================================
-- FUEL_EXPENSES TABLOSU
-- Bu tablo ne tutuyor?
-- - Makinelere ait yakit giderlerini tutar.
-- Hangi bilgiler var?
-- - Hangi makineye ait oldugu
-- - Yakit maliyeti
-- - Litre miktari
-- - Tarih
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_expenses (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  cost NUMERIC(10, 2) NOT NULL,
  liters NUMERIC(10, 2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
