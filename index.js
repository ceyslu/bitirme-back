// =====================================================
// SANTIYEM BACKEND API
// Bu dosya ne tutuyor?
// - Express sunucusunu
// - PostgreSQL veritabani baglantisini
// - Tum API endpointlerini
// Bu dosya ne ise yariyor?
// - Web uygulamasi ve Swift uygulamasi ayni backend'e buradan baglanir.
// - Kullanici, musteri, makine, is kaydi, yakit gideri ve dashboard verileri burada yonetilir.
// =====================================================

// Express: HTTP sunucusu kurmak icin kullanilir.
const express = require("express");

// CORS: Farkli uygulamalarin backend'e baglanmasina izin verir.
const cors = require("cors");

// Pool: PostgreSQL veritabanina baglanmak ve sorgu calistirmak icin kullanilir.
const { Pool } = require("pg");

// Express uygulamasini baslatiyoruz.
const app = express();

// Sunucunun calisacagi port numarasi.
const PORT = Number(process.env.PORT || 5001);

// PostgreSQL veritabani baglantisi.
// Buradaki bilgiler .env dosyasindan da gelebilir.
const pool = new Pool({
  user: process.env.DB_USER || "ceydauslu",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "myapp",
  password: process.env.DB_PASSWORD || "",
  port: Number(process.env.DB_PORT || 5432),
});

// CORS ayari.
// Boylece web ve iOS uygulamasi bu backend'e istek atabilir.
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// JSON formatindaki verileri okuyabilmek icin gerekli middleware.
app.use(express.json());

// -----------------------------------------------------
// YARDIMCI FONKSIYONLAR
// -----------------------------------------------------

// Girilen PIN'in 4 haneli olup olmadigini kontrol eder.
function isValidPin(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

// Telefon numarasini temizler.
// Bosluk, parantez ve tire gibi karakterleri kaldirir.
function normalizePhone(phone) {
  return String(phone || "")
    .replace(/\s+/g, "")
    .replace(/[()-]/g, "");
}

// Sunucu hatalarini tek yerden yonetmek icin kullanilir.
function handleServerError(res, error, fallbackMessage) {
  console.error(error);
  res.status(500).json({ error: fallbackMessage });
}

// Jobs tablosunda kismi / tam odeme tutarini saklamak icin paid_amount alanini hazirlar.
// Kolon yoksa ekler, eski kayitlar icin de temel bir baslangic degeri olusturur.
async function ensureJobsPaidAmountColumn() {
  await pool.query(`
    ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `);

  await pool.query(`
    UPDATE jobs
    SET paid_amount = CASE
      WHEN payment_status = 'odendi' THEN total_price
      ELSE 0
    END
    WHERE paid_amount IS NULL
  `);
}

// Bakim giderlerini ayri tutabilmek icin maintenance_expenses tablosunu hazirlar.
async function ensureMaintenanceExpensesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_expenses (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      operation_name TEXT NOT NULL,
      cost NUMERIC(12, 2) NOT NULL,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

// Musterileri kullaniciya baglamak icin user_id alanini hazirlar.
// Eski kayitlar varsa ilk kullaniciya baglanir.
async function ensureCustomersUserIdColumn() {
  await pool.query(`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS user_id INTEGER
  `);

  await pool.query(`
    ALTER TABLE customers
    DROP CONSTRAINT IF EXISTS customers_user_id_fkey
  `);

  await pool.query(`
    ALTER TABLE customers
    ADD CONSTRAINT customers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  `);

  const firstUserResult = await pool.query(
    `SELECT id
     FROM users
     ORDER BY id ASC
     LIMIT 1`
  );

  if (firstUserResult.rowCount > 0) {
    const firstUserId = firstUserResult.rows[0].id;

    await pool.query(
      `UPDATE customers
       SET user_id = $1
       WHERE user_id IS NULL`,
      [firstUserId]
    );
  }
}

// Makineleri kullaniciya baglamak icin user_id alanini hazirlar.
// Eski kayitlar varsa ilk kullaniciya baglanir.
async function ensureMachinesUserIdColumn() {
  await pool.query(`
    ALTER TABLE machines
    ADD COLUMN IF NOT EXISTS user_id INTEGER
  `);

  await pool.query(`
    ALTER TABLE machines
    DROP CONSTRAINT IF EXISTS machines_user_id_fkey
  `);

  await pool.query(`
    ALTER TABLE machines
    ADD CONSTRAINT machines_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  `);

  const firstUserResult = await pool.query(
    `SELECT id
     FROM users
     ORDER BY id ASC
     LIMIT 1`
  );

  if (firstUserResult.rowCount > 0) {
    const firstUserId = firstUserResult.rows[0].id;

    await pool.query(
      `UPDATE machines
       SET user_id = $1
       WHERE user_id IS NULL`,
      [firstUserId]
    );
  }
}

// Is turlerini kullaniciya baglamak icin user_id alanini hazirlar.
// Eski kayitlar varsa ilk kullaniciya baglanir.
async function ensureJobTypesUserIdColumn() {
  await pool.query(`
    ALTER TABLE job_types
    ADD COLUMN IF NOT EXISTS user_id INTEGER
  `);

  await pool.query(`
    ALTER TABLE job_types
    DROP CONSTRAINT IF EXISTS job_types_user_id_fkey
  `);

  await pool.query(`
    ALTER TABLE job_types
    ADD CONSTRAINT job_types_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  `);

  const firstUserResult = await pool.query(
    `SELECT id
     FROM users
     ORDER BY id ASC
     LIMIT 1`
  );

  if (firstUserResult.rowCount > 0) {
    const firstUserId = firstUserResult.rows[0].id;

    await pool.query(
      `UPDATE job_types
       SET user_id = $1
       WHERE user_id IS NULL`,
      [firstUserId]
    );
  }
}

// Is kayitlarini kullaniciya baglamak icin user_id alanini hazirlar.
// Eski kayitlar varsa ilk kullaniciya baglanir.
async function ensureJobsUserIdColumn() {
  await pool.query(`
    ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS user_id INTEGER
  `);

  await pool.query(`
    ALTER TABLE jobs
    DROP CONSTRAINT IF EXISTS jobs_user_id_fkey
  `);

  await pool.query(`
    ALTER TABLE jobs
    ADD CONSTRAINT jobs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  `);

  const firstUserResult = await pool.query(
    `SELECT id
     FROM users
     ORDER BY id ASC
     LIMIT 1`
  );

  if (firstUserResult.rowCount > 0) {
    const firstUserId = firstUserResult.rows[0].id;

    await pool.query(
      `UPDATE jobs
       SET user_id = $1
       WHERE user_id IS NULL`,
      [firstUserId]
    );
  }
}

// -----------------------------------------------------
// TEST ENDPOINT'I
// -----------------------------------------------------

// Backend ve veritabani ayakta mi diye kontrol eder.
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, message: "Backend calisiyor" });
  } catch (error) {
    handleServerError(res, error, "Veritabani baglantisi kurulamadi");
  }
});

// -----------------------------------------------------
// AUTH ENDPOINTLERI
// Bu alan kullanici kayit, giris ve PIN sifirlama islemlerini tutar.
// -----------------------------------------------------

// Yeni kullanici kaydi olusturur.
// Ayni telefon numarasiyla ikinci kez kayit olunmasini engeller.
app.post("/api/auth/register", async (req, res) => {
  const { companyName, fullName, phone, pin } = req.body;
  const normalizedPhone = normalizePhone(phone);

  if (!companyName || !fullName || !normalizedPhone || !isValidPin(pin)) {
    return res.status(400).json({
      error: "Sirket adi, ad soyad, telefon ve 4 haneli PIN zorunludur",
    });
  }

  try {
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [normalizedPhone]
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: "Bu telefon numarasi ile kayit var" });
    }

    const result = await pool.query(
      `INSERT INTO users (company_name, full_name, phone, pin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, company_name, full_name, phone, created_at`,
      [companyName, fullName, normalizedPhone, pin]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Kayit olusturulamadi");
  }
});

// Kullanici girisi yapar.
// Telefon ve PIN dogruysa kullanici bilgileri geri doner.
app.post("/api/auth/login", async (req, res) => {
  const { phone, pin } = req.body;
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone || !isValidPin(pin)) {
    return res
      .status(400)
      .json({ error: "Telefon ve 4 haneli PIN gonderilmelidir" });
  }

  try {
    const result = await pool.query(
      `SELECT id, company_name, full_name, phone, created_at
       FROM users
       WHERE phone = $1 AND pin = $2`,
      [normalizedPhone, pin]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Telefon veya PIN hatali" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Giris yapilamadi");
  }
});

// Kullanici sifresini unuttugunda yeni PIN belirler.
app.post("/api/auth/reset-pin", async (req, res) => {
  const { phone, newPin } = req.body;
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone || !isValidPin(newPin)) {
    return res
      .status(400)
      .json({ error: "Telefon ve yeni 4 haneli PIN gereklidir" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET pin = $1
       WHERE phone = $2
       RETURNING id, company_name, full_name, phone, created_at`,
      [newPin, normalizedPhone]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Bu telefonla kayitli kullanici bulunamadi" });
    }

    res.json({ message: "PIN guncellendi", user: result.rows[0] });
  } catch (error) {
    handleServerError(res, error, "PIN guncellenemedi");
  }
});

// Kullanici profil bilgisini id ile getirir.
app.get("/api/auth/profile/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, company_name, full_name, phone, created_at
       FROM users
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Kullanici bulunamadi" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Profil bilgisi alinamadi");
  }
});

// Kullanici profil bilgilerini gunceller.
app.put("/api/auth/profile/:id", async (req, res) => {
  const { companyName, fullName, phone } = req.body;
  const normalizedPhone = normalizePhone(phone);

  if (!companyName || !fullName || !normalizedPhone) {
    return res.status(400).json({
      error: "Sirket adi, ad soyad ve telefon zorunludur",
    });
  }

  try {
    const existingUser = await pool.query(
      `SELECT id
       FROM users
       WHERE phone = $1 AND id <> $2`,
      [normalizedPhone, req.params.id]
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: "Bu telefon numarasi baska bir kullanicida kayitli" });
    }

    const result = await pool.query(
      `UPDATE users
       SET company_name = $1,
           full_name = $2,
           phone = $3
       WHERE id = $4
       RETURNING id, company_name, full_name, phone, created_at`,
      [companyName, fullName, normalizedPhone, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Kullanici bulunamadi" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Profil guncellenemedi");
  }
});

// Giris yapan kullanici mevcut PIN ile yeni PIN belirler.
app.patch("/api/auth/change-pin/:id", async (req, res) => {
  const { currentPin, newPin } = req.body;

  if (!isValidPin(currentPin) || !isValidPin(newPin)) {
    return res.status(400).json({
      error: "Mevcut PIN ve yeni PIN 4 haneli olmalidir",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET pin = $1
       WHERE id = $2 AND pin = $3
       RETURNING id, company_name, full_name, phone, created_at`,
      [newPin, req.params.id, currentPin]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Mevcut PIN hatali veya kullanici bulunamadi" });
    }

    res.json({
      message: "PIN guncellendi",
      user: result.rows[0],
    });
  } catch (error) {
    handleServerError(res, error, "PIN degistirilemedi");
  }
});

// -----------------------------------------------------
// CUSTOMER ENDPOINTLERI
// Bu alan musterileri listeler, ekler ve detay getirir.
// -----------------------------------------------------

// Tum musterileri getirir.
app.get("/api/customers", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureCustomersUserIdColumn();

    const result = await pool.query(
      `SELECT id, name, phone, note, created_at
       FROM customers
       WHERE user_id = $1
       ORDER BY id ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, "Musteriler alinamadi");
  }
});

// Tek bir musterinin detayini ve ona ait is kayitlarini getirir.
app.get("/api/customers/:id", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureJobsPaidAmountColumn();
    await ensureCustomersUserIdColumn();

    const customerResult = await pool.query(
      `SELECT id, name, phone, note, created_at
       FROM customers
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({ error: "Musteri bulunamadi" });
    }

    const jobsResult = await pool.query(
      `SELECT j.id,
              j.job_date,
              j.duration_hours::float8 AS duration_hours,
              j.hourly_price::float8 AS hourly_price,
              j.road_fee::float8 AS road_fee,
              j.total_price::float8 AS total_price,
              j.paid_amount::float8 AS paid_amount,
              j.payment_status, j.notes, m.name AS machine_name, jt.name AS job_type_name
       FROM jobs j
       LEFT JOIN machines m ON m.id = j.machine_id
       LEFT JOIN job_types jt ON jt.id = j.job_type_id
       WHERE j.customer_id = $1
         AND j.user_id = $2
       ORDER BY j.job_date DESC, j.id DESC`,
      [req.params.id, userId]
    );

    res.json({
      ...customerResult.rows[0],
      jobs: jobsResult.rows,
    });
  } catch (error) {
    handleServerError(res, error, "Musteri detayi alinamadi");
  }
});

// Yeni musteri ekler.
app.post("/api/customers", async (req, res) => {
  const { userId, name, phone, note } = req.body;
  const normalizedPhone = normalizePhone(phone);

  if (!userId || !name) {
    return res.status(400).json({ error: "userId ve musteri adi zorunludur" });
  }

  try {
    await ensureCustomersUserIdColumn();

    const result = await pool.query(
      `INSERT INTO customers (user_id, name, phone, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, note, created_at`,
      [userId, name, normalizedPhone || null, note || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Musteri eklenemedi");
  }
});

// -----------------------------------------------------
// MACHINE ENDPOINTLERI
// Bu alan makineleri listeler, ekler ve durum degistirir.
// -----------------------------------------------------

// Tum makineleri getirir.
app.get("/api/machines", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureMachinesUserIdColumn();

    const result = await pool.query(
      `SELECT id,
              name,
              hourly_price::float8 AS hourly_price,
              is_active,
              created_at
       FROM machines
       WHERE user_id = $1
       ORDER BY id ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, "Makineler alinamadi");
  }
});

// Yeni makine ekler.
app.post("/api/machines", async (req, res) => {
  const { userId, name, hourlyPrice, isActive } = req.body;

  if (!userId || !name || hourlyPrice == null) {
    return res.status(400).json({ error: "userId, makine adi ve saatlik ucret zorunludur" });
  }

  try {
    await ensureMachinesUserIdColumn();

    const result = await pool.query(
      `INSERT INTO machines (user_id, name, hourly_price, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id,
                 name,
                 hourly_price::float8 AS hourly_price,
                 is_active,
                 created_at`,
      [userId, name, hourlyPrice, isActive ?? true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Makine eklenemedi");
  }
});

// Makinenin aktif veya pasif olma durumunu gunceller.
app.patch("/api/machines/:id/status", async (req, res) => {
  const { userId, isActive } = req.body;

  if (!userId || typeof isActive !== "boolean") {
    return res.status(400).json({ error: "userId ve isActive zorunludur" });
  }

  try {
    await ensureMachinesUserIdColumn();

    const result = await pool.query(
      `UPDATE machines
       SET is_active = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id,
                 name,
                 hourly_price::float8 AS hourly_price,
                 is_active,
                 created_at`,
      [isActive, req.params.id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Makine bulunamadi" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Makine durumu guncellenemedi");
  }
});

// Mevcut bir makinenin bilgilerini gunceller.
// Makine adi, saatlik ucret ve aktiflik durumu burada degistirilebilir.
app.put("/api/machines/:id", async (req, res) => {
  const { userId, name, hourlyPrice, isActive } = req.body;

  if (!userId || !name || hourlyPrice == null) {
    return res.status(400).json({
      error: "userId, makine adi ve saatlik ucret zorunludur",
    });
  }

  if (isActive != null && typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive boolean olmalidir" });
  }

  try {
    await ensureMachinesUserIdColumn();

    const result = await pool.query(
      `UPDATE machines
       SET name = $1,
           hourly_price = $2,
           is_active = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id,
                 name,
                 hourly_price::float8 AS hourly_price,
                 is_active,
                 created_at`,
      [name, hourlyPrice, isActive ?? true, req.params.id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Makine bulunamadi" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Makine guncellenemedi");
  }
});

// Bir makineyi siler.
app.delete("/api/machines/:id", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureMachinesUserIdColumn();

    const result = await pool.query(
      `DELETE FROM machines
       WHERE id = $1 AND user_id = $2
       RETURNING id,
                 name,
                 hourly_price::float8 AS hourly_price,
                 is_active,
                 created_at`,
      [req.params.id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Makine bulunamadi" });
    }

    res.json({
      message: "Makine silindi",
      machine: result.rows[0],
    });
  } catch (error) {
    handleServerError(res, error, "Makine silinemedi");
  }
});

// -----------------------------------------------------
// JOB TYPE ENDPOINTLERI
// Bu alan yapilan is turlerini tutar.
// Ornek: temel kazi, dolgu, yukleme.
// -----------------------------------------------------

// Tum is turlerini getirir.
app.get("/api/job-types", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureJobTypesUserIdColumn();

    const result = await pool.query(
      `SELECT id, name, created_at
       FROM job_types
       WHERE user_id = $1
       ORDER BY id ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, "Is turleri alinamadi");
  }
});

// Yeni is turu ekler.
app.post("/api/job-types", async (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({ error: "userId ve is turu adi zorunludur" });
  }

  try {
    await ensureJobTypesUserIdColumn();

    const result = await pool.query(
      `INSERT INTO job_types (user_id, name)
       VALUES ($1, $2)
       RETURNING id, name, created_at`,
      [userId, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Is turu eklenemedi");
  }
});

// Mevcut bir is turunu gunceller.
app.put("/api/job-types/:id", async (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({ error: "userId ve is turu adi zorunludur" });
  }

  try {
    await ensureJobTypesUserIdColumn();

    const result = await pool.query(
      `UPDATE job_types
       SET name = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, created_at`,
      [name, req.params.id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Is turu bulunamadi" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Is turu guncellenemedi");
  }
});

// Bir is turunu siler.
app.delete("/api/job-types/:id", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureJobTypesUserIdColumn();

    const result = await pool.query(
      `DELETE FROM job_types
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, created_at`,
      [req.params.id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Is turu bulunamadi" });
    }

    res.json({
      message: "Is turu silindi",
      jobType: result.rows[0],
    });
  } catch (error) {
    handleServerError(res, error, "Is turu silinemedi");
  }
});

// -----------------------------------------------------
// FUEL EXPENSE ENDPOINTLERI
// Bu alan yakit giderlerini listeler ve ekler.
// -----------------------------------------------------

// Tum yakit giderlerini getirir.
app.get("/api/fuel-expenses", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureMachinesUserIdColumn();

    const result = await pool.query(
      `SELECT fe.id, fe.machine_id, fe.cost, fe.liters, fe.expense_date, fe.created_at,
              m.name AS machine_name
       FROM fuel_expenses fe
       LEFT JOIN machines m ON m.id = fe.machine_id
       WHERE m.user_id = $1
       ORDER BY fe.expense_date DESC, fe.id DESC`
      ,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, "Yakit giderleri alinamadi");
  }
});

// Yeni yakit gideri ekler.
app.post("/api/fuel-expenses", async (req, res) => {
  const { userId, machineId, cost, liters, expenseDate } = req.body;

  if (!userId || !machineId || cost == null || liters == null) {
    return res.status(400).json({
      error: "userId, machineId, cost ve liters alanlari zorunludur",
    });
  }

  try {
    await ensureMachinesUserIdColumn();

    const machineResult = await pool.query(
      `SELECT id
       FROM machines
       WHERE id = $1 AND user_id = $2`,
      [machineId, userId]
    );

    if (machineResult.rowCount === 0) {
      return res.status(404).json({ error: "Makine bulunamadi veya bu kullaniciya ait degil" });
    }

    const result = await pool.query(
      `INSERT INTO fuel_expenses (machine_id, cost, liters, expense_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, machine_id, cost, liters, expense_date, created_at`,
      [machineId, cost, liters, expenseDate || new Date()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Yakit gideri eklenemedi");
  }
});

// -----------------------------------------------------
// MAINTENANCE EXPENSE ENDPOINTLERI
// Bu alan bakim / onarim giderlerini listeler ve ekler.
// -----------------------------------------------------

// Tum bakim giderlerini getirir.
app.get("/api/maintenance-expenses", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureMaintenanceExpensesTable();
    await ensureMachinesUserIdColumn();

    const result = await pool.query(
      `SELECT me.id,
              me.machine_id,
              me.operation_name,
              me.cost,
              me.expense_date,
              me.created_at,
              m.name AS machine_name
       FROM maintenance_expenses me
       LEFT JOIN machines m ON m.id = me.machine_id
       WHERE m.user_id = $1
       ORDER BY me.expense_date DESC, me.id DESC`
      ,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, "Bakim giderleri alinamadi");
  }
});

// Yeni bakim gideri ekler.
app.post("/api/maintenance-expenses", async (req, res) => {
  const { userId, machineId, operationName, cost, expenseDate } = req.body;

  if (!userId || !machineId || !operationName || cost == null) {
    return res.status(400).json({
      error: "userId, machineId, operationName ve cost alanlari zorunludur",
    });
  }

  try {
    await ensureMaintenanceExpensesTable();
    await ensureMachinesUserIdColumn();

    const machineResult = await pool.query(
      `SELECT id
       FROM machines
       WHERE id = $1 AND user_id = $2`,
      [machineId, userId]
    );

    if (machineResult.rowCount === 0) {
      return res.status(404).json({ error: "Makine bulunamadi veya bu kullaniciya ait degil" });
    }

    const result = await pool.query(
      `INSERT INTO maintenance_expenses (machine_id, operation_name, cost, expense_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id,
                 machine_id,
                 operation_name,
                 cost,
                 expense_date,
                 created_at`,
      [machineId, operationName, cost, expenseDate || new Date()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Bakim gideri eklenemedi");
  }
});

// -----------------------------------------------------
// JOB ENDPOINTLERI
// Bu alan is kayitlarini listeler ve yeni is kaydi ekler.
// -----------------------------------------------------

// Tum is kayitlarini getirir.
app.get("/api/jobs", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureJobsPaidAmountColumn();
    await ensureJobsUserIdColumn();

    const result = await pool.query(
      `SELECT j.id, j.customer_id, j.machine_id, j.job_type_id, j.job_date,
              j.duration_hours::float8 AS duration_hours,
              j.hourly_price::float8 AS hourly_price,
              j.road_fee::float8 AS road_fee,
              j.total_price::float8 AS total_price,
              j.paid_amount::float8 AS paid_amount,
              j.payment_status, j.notes, j.created_at,
              c.name AS customer_name,
              m.name AS machine_name,
              jt.name AS job_type_name
       FROM jobs j
       LEFT JOIN customers c ON c.id = j.customer_id
       LEFT JOIN machines m ON m.id = j.machine_id
       LEFT JOIN job_types jt ON jt.id = j.job_type_id
       WHERE j.user_id = $1
       ORDER BY j.job_date DESC, j.id DESC`
      ,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, "Is kayitlari alinamadi");
  }
});

// Yeni is kaydi ekler.
// Toplam tutar gelmezse otomatik hesaplanir.
app.post("/api/jobs", async (req, res) => {
  const {
    userId,
    customerId,
    machineId,
    jobTypeId,
    jobDate,
    durationHours,
    hourlyPrice,
    roadFee,
    totalPrice,
    paymentStatus,
    paidAmount,
    notes,
  } = req.body;

  if (!userId || !customerId || !machineId || !jobTypeId || durationHours == null || hourlyPrice == null) {
    return res.status(400).json({
      error: "userId, customerId, machineId, jobTypeId, durationHours ve hourlyPrice zorunludur",
    });
  }

  // Yol ucreti yoksa 0 kabul edilir.
  const computedRoadFee = Number(roadFee || 0);

  // Toplam fiyat gonderilmezse otomatik hesaplama yapilir.
  const computedTotalPrice =
    totalPrice != null
      ? Number(totalPrice)
      : Number(durationHours) * Number(hourlyPrice) + computedRoadFee;

  // Odeme durumu ilk kayitta genelde "bekliyor" gelir; yine de backend tutarini guvenli hesaplar.
  const normalizedPaymentStatus = paymentStatus || "bekliyor";
  const computedPaidAmount =
    normalizedPaymentStatus === "odendi"
      ? computedTotalPrice
      : normalizedPaymentStatus === "kismi"
        ? Math.min(Math.max(Number(paidAmount || 0), 0), computedTotalPrice)
        : 0;

  try {
    await ensureJobsPaidAmountColumn();
    await ensureCustomersUserIdColumn();
    await ensureMachinesUserIdColumn();
    await ensureJobTypesUserIdColumn();
    await ensureJobsUserIdColumn();

    const [customerResult, machineResult, jobTypeResult] = await Promise.all([
      pool.query(
        `SELECT id
         FROM customers
         WHERE id = $1 AND user_id = $2`,
        [customerId, userId]
      ),
      pool.query(
        `SELECT id
         FROM machines
         WHERE id = $1 AND user_id = $2`,
        [machineId, userId]
      ),
      pool.query(
        `SELECT id
         FROM job_types
         WHERE id = $1 AND user_id = $2`,
        [jobTypeId, userId]
      ),
    ]);

    if (customerResult.rowCount === 0) {
      return res.status(404).json({ error: "Musteri bulunamadi veya bu kullaniciya ait degil" });
    }

    if (machineResult.rowCount === 0) {
      return res.status(404).json({ error: "Makine bulunamadi veya bu kullaniciya ait degil" });
    }

    if (jobTypeResult.rowCount === 0) {
      return res.status(404).json({ error: "Is turu bulunamadi veya bu kullaniciya ait degil" });
    }

    const result = await pool.query(
      `INSERT INTO jobs (
         user_id,
         customer_id,
         machine_id,
         job_type_id,
         job_date,
         duration_hours,
         hourly_price,
         road_fee,
         total_price,
         paid_amount,
         payment_status,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, customer_id, machine_id, job_type_id, job_date,
                 duration_hours::float8 AS duration_hours,
                 hourly_price::float8 AS hourly_price,
                 road_fee::float8 AS road_fee,
                 total_price::float8 AS total_price,
                 paid_amount::float8 AS paid_amount,
                 payment_status, notes, created_at`,
      [
        userId,
        customerId,
        machineId,
        jobTypeId,
        jobDate || new Date(),
        durationHours,
        hourlyPrice,
        computedRoadFee,
        computedTotalPrice,
        computedPaidAmount,
        normalizedPaymentStatus,
        notes || ""
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Is kaydi eklenemedi");
  }
});

// Bir is kaydinin odeme durumunu gunceller.
app.patch("/api/jobs/:id/payment-status", async (req, res) => {
  const { userId, paymentStatus, paidAmount } = req.body;

  if (!userId || !paymentStatus) {
    return res.status(400).json({ error: "userId ve paymentStatus zorunludur" });
  }

  try {
    await ensureJobsPaidAmountColumn();
    await ensureJobsUserIdColumn();

    const currentJobResult = await pool.query(
      `SELECT id, total_price
       FROM jobs
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );

    if (currentJobResult.rowCount === 0) {
      return res.status(404).json({ error: "Is kaydi bulunamadi" });
    }

    const currentJob = currentJobResult.rows[0];
    const totalPrice = Number(currentJob.total_price || 0);

    let normalizedPaidAmount = 0;

    if (paymentStatus === "odendi") {
      normalizedPaidAmount = totalPrice;
    } else if (paymentStatus === "kismi") {
      if (paidAmount == null || Number.isNaN(Number(paidAmount))) {
        return res.status(400).json({ error: "Kismi odemede paidAmount zorunludur" });
      }

      normalizedPaidAmount = Number(paidAmount);

      if (normalizedPaidAmount < 0 || normalizedPaidAmount > totalPrice) {
        return res.status(400).json({
          error: "paidAmount 0 ile toplam tutar arasinda olmalidir",
        });
      }
    }

    const result = await pool.query(
      `UPDATE jobs
       SET payment_status = $1,
           paid_amount = $2
       WHERE id = $3 AND user_id = $4
       RETURNING id,
                 customer_id,
                 machine_id,
                 job_type_id,
                 job_date,
                 duration_hours::float8 AS duration_hours,
                 hourly_price::float8 AS hourly_price,
                 road_fee::float8 AS road_fee,
                 total_price::float8 AS total_price,
                 paid_amount::float8 AS paid_amount,
                 payment_status,
                 notes,
                 created_at`,
      [paymentStatus, normalizedPaidAmount, req.params.id, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, "Odeme durumu guncellenemedi");
  }
});

// -----------------------------------------------------
// DASHBOARD ENDPOINT'I
// Bu alan ozet rapor verilerini uretir.
// -----------------------------------------------------

// Toplam ciro, tahsil edilen tutar, yakit gideri ve net kar hesaplar.
app.get("/api/dashboard", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ error: "userId zorunludur" });
  }

  try {
    await ensureJobsPaidAmountColumn();
    await ensureMaintenanceExpensesTable();
    await ensureCustomersUserIdColumn();
    await ensureMachinesUserIdColumn();
    await ensureJobsUserIdColumn();

    const [summaryResult, unpaidResult, countsResult, gelirDetaylariResult, giderDetaylariResult] =
      await Promise.all([
        pool.query(
          `SELECT
             COALESCE(SUM(total_price), 0) AS total_revenue,
             COALESCE(SUM(paid_amount), 0) AS collected_revenue
           FROM jobs
           WHERE user_id = $1`,
          [userId]
        ),
        pool.query(
          `SELECT COALESCE(SUM(total_price - paid_amount), 0) AS unpaid_total
           FROM jobs
           WHERE user_id = $1`,
          [userId]
        ),
        pool.query(
          `SELECT
             (SELECT COUNT(*) FROM customers WHERE user_id = $1) AS customers_count,
             (SELECT COUNT(*) FROM machines WHERE user_id = $1) AS machines_count,
             (SELECT COUNT(*) FROM jobs WHERE user_id = $1) AS jobs_count,
             (SELECT COUNT(*)
              FROM fuel_expenses fe
              INNER JOIN machines m ON m.id = fe.machine_id
              WHERE m.user_id = $1) AS fuel_count,
             (SELECT COUNT(*)
              FROM maintenance_expenses me
              INNER JOIN machines m ON m.id = me.machine_id
              WHERE m.user_id = $1) AS maintenance_count`,
          [userId]
        ),
        pool.query(
          `SELECT j.id, c.name AS title, jt.name AS subtitle, j.total_price AS amount
           FROM jobs j
           LEFT JOIN customers c ON c.id = j.customer_id
           LEFT JOIN job_types jt ON jt.id = j.job_type_id
           WHERE j.user_id = $1
           ORDER BY j.job_date DESC, j.id DESC
           LIMIT 5`,
          [userId]
        ),
        pool.query(
          `SELECT CONCAT('fuel-', fe.id) AS id,
                  m.name AS title,
                  'Yakit gideri' AS subtitle,
                  fe.cost AS amount,
                  fe.expense_date AS sort_date
           FROM fuel_expenses fe
           INNER JOIN machines m ON m.id = fe.machine_id
           WHERE m.user_id = $1
           UNION ALL
           SELECT CONCAT('maintenance-', me.id) AS id,
                  m.name AS title,
                  me.operation_name AS subtitle,
                  me.cost AS amount,
                  me.expense_date AS sort_date
           FROM maintenance_expenses me
           INNER JOIN machines m ON m.id = me.machine_id
           WHERE m.user_id = $1
           ORDER BY sort_date DESC
           LIMIT 5`,
          [userId]
        ),
      ]);

    // Toplam ciro.
    const totalRevenue = Number(summaryResult.rows[0].total_revenue || 0);

    // Tahsil edilmis ciro.
    const collectedRevenue = Number(summaryResult.rows[0].collected_revenue || 0);

    // Henuz alinmamis odemeler.
    const unpaidTotal = Number(unpaidResult.rows[0].unpaid_total || 0);

    // Toplam yakit gideri.
    const fuelCostResult = await pool.query(
      `SELECT COALESCE(SUM(fe.cost), 0) AS total_fuel_cost
       FROM fuel_expenses fe
       INNER JOIN machines m ON m.id = fe.machine_id
       WHERE m.user_id = $1`,
      [userId]
    );
    const totalFuelCost = Number(fuelCostResult.rows[0].total_fuel_cost || 0);

    // Toplam bakim gideri.
    const maintenanceCostResult = await pool.query(
      `SELECT COALESCE(SUM(me.cost), 0) AS total_maintenance_cost
       FROM maintenance_expenses me
       INNER JOIN machines m ON m.id = me.machine_id
       WHERE m.user_id = $1`,
      [userId]
    );
    const totalMaintenanceCost = Number(
      maintenanceCostResult.rows[0].total_maintenance_cost || 0
    );

    const totalExpenseCost = totalFuelCost + totalMaintenanceCost;

    res.json({
      totalRevenue,
      collectedRevenue,
      unpaidTotal,
      totalFuelCost,
      totalMaintenanceCost,
      totalExpenseCost,
      netProfit: totalRevenue - totalExpenseCost,
      counts: countsResult.rows[0],
      recentIncome: gelirDetaylariResult.rows,
      recentExpenses: giderDetaylariResult.rows.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        amount: Number(item.amount || 0),
      })),
    });
  } catch (error) {
    handleServerError(res, error, "Dashboard verisi alinamadi");
  }
});

// -----------------------------------------------------
// 404 VE SERVER BASLATMA
// -----------------------------------------------------

// Tanimli olmayan endpoint'ler icin standart cevap.
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint bulunamadi" });
});

// Sunucuyu baslatir.
// Server referansini saklayarak surecin beklenmedik sekilde kapanmasini izleyebiliyoruz.
async function startServer() {
  try {
    await ensureJobsPaidAmountColumn();
    await ensureMaintenanceExpensesTable();

    const server = app.listen(PORT, () => {
      console.log(`Backend ${PORT} portunda calisiyor`);
    });

    // Server kapanirsa terminale bilgi basar.
    server.on("close", () => {
      console.log("Backend sunucusu kapandi");
    });

    // Gelistirme ortaminda surecin acik kalmasini garanti eder.
    // Bazi yerel ortamlarda server handle'i beklenmedik sekilde dusurse bile backend kapanmaz.
    setInterval(() => {
      // Bu blok bilerek bos birakildi.
    }, 60_000);
  } catch (error) {
    console.error("Backend baslatilamadi:", error);
    process.exit(1);
  }
}

startServer();
