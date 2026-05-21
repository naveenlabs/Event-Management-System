/* ─────────────────────────────
 * Global Options & Transaction
 * ───────────────────────────── */
PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

/* ─────────────────────────────
 * Cleanup (drop existing tables)
 * ───────────────────────────── */
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS custom_concessions;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS site_settings;

/* ─────────────────────────────
 * 1. Site-wide Settings
 * ───────────────────────────── */
CREATE TABLE site_settings (
    id           INTEGER PRIMARY KEY,
    name         TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    updated_at   TEXT
);

/* ─────────────────────────────
 * 2. Events Master Table
 * ───────────────────────────── */
CREATE TABLE events (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    title              TEXT    NOT NULL,
    description        TEXT    NOT NULL,
    date               TEXT    NOT NULL,
    end_date           TEXT,
    created_at         TEXT    NOT NULL,
    published_at       TEXT,
    updated_at         TEXT,

    location           TEXT,
    organiser_info     TEXT,
    category           TEXT,

    capacity           INTEGER NOT NULL DEFAULT 0,

    full_price_count   INTEGER NOT NULL DEFAULT 0,
    full_price_amount  INTEGER NOT NULL DEFAULT 0,

    student_count      INTEGER NOT NULL DEFAULT 0,
    student_price      INTEGER NOT NULL DEFAULT 0,

    senior_count       INTEGER NOT NULL DEFAULT 0,
    senior_price       INTEGER NOT NULL DEFAULT 0,

    child_count        INTEGER NOT NULL DEFAULT 0,
    child_price        INTEGER NOT NULL DEFAULT 0,

    early_bird_count   INTEGER NOT NULL DEFAULT 0,
    early_bird_price   REAL    NOT NULL DEFAULT 0,
    early_bird_start   TEXT,
    early_bird_end     TEXT,

    rules              TEXT,
    max_per_user       INTEGER DEFAULT 1 CHECK (max_per_user BETWEEN 1 AND 10),
    payment_methods    TEXT    DEFAULT '',
    status             TEXT    NOT NULL CHECK (status IN ('draft','published'))
);

/* ─────────────────────────────
 * 3. Promo Codes
 * ───────────────────────────── */
CREATE TABLE promo_codes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        INTEGER NOT NULL,
    code            TEXT    NOT NULL,
    discount_type   TEXT    NOT NULL CHECK (discount_type IN ('fixed','percent')),
    discount_amount REAL    NOT NULL,
    usage_limit     INTEGER DEFAULT 0,
    expires_at      TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

/* ─────────────────────────────
 * 4. Custom Concessions
 * ───────────────────────────── */
CREATE TABLE custom_concessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    count      INTEGER NOT NULL DEFAULT 0,
    price      REAL    NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

/* ─────────────────────────────
 * 5. Bookings
 * ───────────────────────────── */
CREATE TABLE bookings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id            INTEGER NOT NULL,
    full_price_tickets  INTEGER DEFAULT 0,
    concession_tickets  INTEGER DEFAULT 0,
    concession_detail   TEXT,            -- JSON blob of breakdown
    promo_code_id       INTEGER,
    guest_names         TEXT    NOT NULL, -- JSON array
    guest_phones        TEXT    NOT NULL, -- JSON array
    contact_name        TEXT    NOT NULL,
    contact_email       TEXT    NOT NULL,
    contact_phone       TEXT    NOT NULL,
    total_paid          REAL    NOT NULL,
    created_at          TEXT    NOT NULL,
    FOREIGN KEY (event_id)      REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id)
);

/* ─────────────────────────────
 * 6. Payments
 * ───────────────────────────── */
CREATE TABLE payments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id     INTEGER NOT NULL,
    method         TEXT    NOT NULL,     -- e.g. PayNow / Card / Bank
    transaction_id TEXT    NOT NULL,     -- external reference
    details        TEXT    NOT NULL,     -- JSON metadata
    paid_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

/* ─────────────────────────────
 * Seed Data
 * ───────────────────────────── */
INSERT INTO site_settings (id, name, description, updated_at)
VALUES (1, 'Stretch Yoga', 'Yoga classes for all ages and abilities', datetime('now'));

/* ─────────────────────────────
 * Commit Transaction
 * ───────────────────────────── */
COMMIT;
