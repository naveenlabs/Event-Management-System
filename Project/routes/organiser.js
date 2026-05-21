/* ─────────────────────────────
 * Organiser-Side Routes (Part 1)
 * Handles:
 *   • Dashboard (home)
 *   • Site settings (view & update)
 *   • Create new draft event
 * ───────────────────────────── */
const express = require('express');
const router = express.Router();

/* ─────────────────────────────
 * Middleware – Require organiser login
 * Redirects to login if not logged in
 * ───────────────────────────── */
function requireOrganiserLogin(req, res, next) {
  if (req.session && req.session.organiserLoggedIn) {
    return next();
  }
  res.redirect('/organiser-login');
}

/* ─────────────────────────────
 * Round up datetime to next 15 minutes
 * Used when generating default event time
 * ───────────────────────────── */
function roundUpToNext15Min(date) {
  const ms = 1000 * 60 * 15;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/* ─────────────────────────────
 * Capacity Check Helper
 * Confirms total concession tickets match declared capacity
 * ───────────────────────────── */
function ticketsMatchCapacity(body) {
  const num = x => parseInt(x || 0, 10);
  let total = 0;

  total += num(body.full_price_count);
  total += num(body.student_count);
  total += num(body.senior_count);
  total += num(body.child_count);
  total += num(body.early_bird_count);

  const cc = body.custom_concessions || [];
  const list = Array.isArray(cc) ? cc : Object.values(cc);
  for (const c of list) total += num(c.count);

  return total === num(body.capacity);
}

/* ─────────────────────────────
 * Constants & Utility Functions
 * ───────────────────────────── */
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const PRICE_MIN = 1;
const PRICE_MAX = 20000;

const arr = v => Array.isArray(v) ? v : v ? [v] : [];
const num = (x, f = parseFloat) => (x === '' || x == null ? 0 : f(x));

/* ─────────────────────────────
 * GET /organiser
 * Home dashboard – loads site settings,
 * published & draft events, with enrichment
 * ───────────────────────────── */
router.get('/', requireOrganiserLogin, (req, res) => {
  const settingsQ = 'SELECT * FROM site_settings WHERE id = 1';
  const publishedQ = `SELECT * FROM events WHERE status = 'published' ORDER BY date ASC`;
  const draftQ = `SELECT * FROM events WHERE status = 'draft'     ORDER BY date ASC`;

  global.db.get(settingsQ, (err, settings) => {
    if (err) return res.status(500).send('DB error loading settings');

    global.db.all(publishedQ, (e1, published) => {
      if (e1) return res.status(500).send('DB error loading published events');
      let todoPub = published.length;
      if (todoPub === 0) return loadDrafts(published);

      published.forEach(ev => enrichEvent(ev, () => {
        if (--todoPub === 0) loadDrafts(published);
      }));
    });

    /* ───────────────
     * Load drafts next
     * ─────────────── */

    function loadDrafts(publishedEvents) {
      global.db.all(draftQ, (e2, drafts) => {
        if (e2) return res.status(500).send('DB error loading drafts');
        let todoDraft = drafts.length;
        if (todoDraft === 0) return renderHome(publishedEvents, drafts);

        drafts.forEach(ev => enrichEvent(ev, () => {
          if (--todoDraft === 0) renderHome(publishedEvents, drafts);
        }));
      });
    }

    /* ───────────────
     * Enrich event with concessions and promo codes
     * ─────────────── */
    function enrichEvent(ev, done) {
      let parts = 2;
      global.db.all('SELECT name,count,price FROM custom_concessions WHERE event_id = ?', [ev.id], (_, cc) => {
        ev.customConcessions = cc || [];
        if (--parts === 0) done();
      });
      global.db.all('SELECT * FROM promo_codes WHERE event_id = ?', [ev.id], (_, pc) => {
        ev.promoCodes = pc || [];
        if (--parts === 0) done();
      });
    }

    /* ───────────────
     * Render organiser dashboard
     * ─────────────── */
    function renderHome(publishedEvents, draftEvents) {
      res.render('organiser-home', {
        siteName: settings.name,
        siteDescription: settings.description,
        publishedEvents,
        draftEvents
      });
    }
  });
});

/* ─────────────────────────────
 * POST /organiser/settings
 * Update site-wide organiser settings
 * ───────────────────────────── */
router.get('/settings', requireOrganiserLogin, (req, res) => {
  global.db.get('SELECT * FROM site_settings WHERE id = 1', (err, row) => {
    if (err) return res.status(500).send('DB error loading settings');
    res.render('organiser-site-settings', {
      settings: row
    });
  });
});

router.post('/settings', requireOrganiserLogin, (req, res) => {
  const {
    name = '', description = ''
  } = req.body;
  if (!name.trim() || !description.trim()) {
    return res.status(400).send('Both fields required');
  }

  global.db.run(
    `UPDATE site_settings
       SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [name.trim(), description.trim()],
    err => err ? res.status(500).send('Error updating settings') :
    res.redirect('/organiser')
  );
});

/* ─────────────────────────────
 * GET /organiser/new
 * Create a new draft event and redirect
 * ───────────────────────────── */
router.get('/new', requireOrganiserLogin, (req, res) => {
  const nowISO = new Date().toISOString();
  const start = roundUpToNext15Min(new Date()).toISOString().slice(0, 16);

  global.db.run(
    `INSERT INTO events (
       title, description, date, end_date,
       created_at, published_at, updated_at,
       location, organiser_info, category, capacity,
       full_price_count, full_price_amount,
       student_count, student_price,
       senior_count, senior_price,
       child_count, child_price,
       early_bird_count, early_bird_price, early_bird_start, early_bird_end,
       rules, max_per_user, payment_methods, status
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      '', '', start, '',
      nowISO, null, nowISO,
      '', '', '', 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, null, null,
      '', 1, '', 'draft'
    ],
    function (err) {
      if (err) return res.status(500).send('DB error creating draft');
      res.redirect(`/organiser/edit/${this.lastID}`);
    }
  );
});

/* ─────────────────────────────
 * validateEventFields(body, isEdit = false)
 * Validates all organiser event fields before saving.
 * Ensures correctness of text, ticket data, dates,
 * early-bird fields, promo codes, concessions, and payment methods.
 * Returns error string or null if valid.
 * ───────────────────────────── */
function validateEventFields(body, isEdit = false) {
  if (!body.title.trim() || body.title.length > 80)
    return 'Title required (≤80 chars)';
  if (!body.description.trim() || body.description.length > 500)
    return 'Description required (≤500 chars)';
  if (!body.rules.trim() || body.rules.length > 500)
    return 'Rules/notes required (≤500 chars)';

  if (!/^[A-Za-z\s]+$/.test(body.organiser_info))
    return 'Organiser info letters/spaces only';
  if (!/^[A-Za-z,\s]+$/.test(body.category))
    return 'Category letters/commas only';
  if (!/^(?=.*[A-Za-z])[A-Za-z0-9\s,]+$/.test(body.location))
    return 'Invalid venue';


  const startDt = new Date(body.date);
  const endDt = new Date(body.end_date);
  if (isNaN(startDt) || isNaN(endDt))
    return 'Invalid start or end date';
  if (startDt < new Date())
    return 'Start date must be in the future';
  if (endDt <= startDt)
    return 'End date must be after start';


  const ints = k => num(body[k], Number);
  const dec = k => num(body[k]);

  /* ───────────────
   * Validate standard ticket groups
   * ─────────────── */
  const built = [
    ['full_price_count', 'full_price_amount'],
    ['student_count', 'student_price'],
    ['senior_count', 'senior_price'],
    ['child_count', 'child_price']
  ];

  for (const [cntKey, priceKey] of built) {
    const cnt = ints(cntKey);
    const pr = dec(priceKey);
    if (cnt < 0) return 'Negative ticket counts not allowed';
    if (cnt === 0 && pr !== 0) return 'Price set without tickets';
    if (cnt > 0 && (pr < PRICE_MIN || pr > PRICE_MAX))
      return `Prices ${PRICE_MIN}–${PRICE_MAX}`;
  }

  /* ───────────────
   * Validate early-bird ticket group
   * ─────────────── */
  const ebCount = ints('early_bird_count');
  const ebPrice = dec('early_bird_price');
  const ebStart = body.early_bird_start || null;
  const ebEnd = body.early_bird_end || null;

  if (ebCount > 0) {
    if (ebPrice < PRICE_MIN || ebPrice > PRICE_MAX)
      return `Early-bird price ${PRICE_MIN}–${PRICE_MAX}`;
    if (!ebStart || !ebEnd)
      return 'Provide early-bird start & end dates';
    const s = new Date(ebStart);
    const e = new Date(ebEnd);
    if (s < new Date(startDt.getTime() - ONE_MONTH_MS))
      return 'Early-bird start ≥1 month before event';
    if (e >= startDt) return 'Early-bird end < event start';
    if (e <= s) return 'Early-bird end after start';
  } else if (ebPrice !== 0) {
    return 'Early-bird price without tickets';
  }

  /* ───────────────
   * Validate promo codes
   * ─────────────── */
  const promoArr = arr(body.promo_codes);
  const seenCodes = new Set();
  const totalCapacity = parseInt(body.capacity || 0, 10);

  for (const pc of promoArr) {
    if (!pc.code || !pc.code.trim()) return 'Promo code missing';
    const code = pc.code.trim().toUpperCase();
    if (seenCodes.has(code)) return 'Duplicate promo codes not allowed';
    seenCodes.add(code);

    const amt = num(pc.amount);
    if (amt < 1 || amt > 90) return 'Promo discount 1–90 only';

    const limit = parseInt(pc.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > totalCapacity)
      return `Promo code usage limit must be between 1 and total capacity (${totalCapacity})`;
  }

  /* ───────────────
   * Validate custom concessions
   * ─────────────── */
  const customArr = arr(body.custom_concessions);
  const seenNames = new Set();
  for (const cc of customArr) {
    if (!cc.name || !/^[A-Za-z\s]+$/.test(cc.name))
      return 'Concession names letters/spaces only';
    const norm = cc.name.trim().toLowerCase();
    if (seenNames.has(norm)) return 'Duplicate concession names not allowed';
    seenNames.add(norm);

    const cnt = parseInt(cc.count, 10);
    const pr = parseFloat(cc.price);
    if (isNaN(cnt) || isNaN(pr)) return 'Invalid concession data';
    if (cnt === 0 && pr !== 0) return 'Concession price without tickets';
    if (cnt > 0 && (pr < PRICE_MIN || pr > PRICE_MAX))
      return `Concession prices ${PRICE_MIN}–${PRICE_MAX}`;
  }

  /* ───────────────
   * Final validations
   * ─────────────── */
  if (!ticketsMatchCapacity(body))
    return 'Sum of ticket counts must equal capacity';

  if (!arr(body.payment_methods).length)
    return 'Select at least one payment method';

  return null;
}

/* ─────────────────────────────
 * savePromoCodes(eventId, promoCodes)
 * Clears existing promo codes and inserts updated ones.
 * ───────────────────────────── */
function savePromoCodes(eventId, promoCodes) {
  return new Promise(res => {
    global.db.run('DELETE FROM promo_codes WHERE event_id = ?', [eventId], () => {
      for (const pc of arr(promoCodes)) {
        global.db.run(
          `INSERT INTO promo_codes (
             event_id, code, discount_type, discount_amount, usage_limit, expires_at
           ) VALUES (?,?,?,?,?,?)`,
          [
            eventId,
            pc.code.trim().toUpperCase(),
            pc.type,
            parseFloat(pc.amount),
            pc.limit ? parseInt(pc.limit, 10) : 0,
            pc.expires || null
          ]
        );
      }
      res();
    });
  });
}

/* ─────────────────────────────
 * saveCustomConcessions(eventId, concessions)
 * Clears old concessions and saves new custom ones,
 * ignoring reserved names like "early bird".
 * ───────────────────────────── */
function saveCustomConcessions(eventId, concessions) {
  return new Promise(res => {
    global.db.run('DELETE FROM custom_concessions WHERE event_id = ?', [eventId], () => {
      for (const cc of arr(concessions)) {
        const norm = cc.name.trim().toLowerCase().replace(/_/g, ' ');
        if (norm === 'early bird') continue; // skip duplicate EB
        global.db.run(
          `INSERT INTO custom_concessions (event_id, name, count, price)
             VALUES (?,?,?,?)`,
          [
            eventId,
            cc.name.trim(),
            parseInt(cc.count, 10),
            parseFloat(cc.price)
          ]
        );
      }
      res();
    });
  });
}

/* ─────────────────────────────
 * POST /organiser/new
 * Form submission handler for creating a new draft event
 * Validates fields and saves event, promo codes, concessions
 * ───────────────────────────── */
router.post('/new', requireOrganiserLogin, (req, res) => {
  const body = req.body;
  const err = validateEventFields(body);
  if (err) return renderNewWithError(err);

  const nowISO = new Date().toISOString();
  global.db.run(
    `INSERT INTO events (
       title, description, date, end_date,
       created_at, published_at, updated_at,
       location, organiser_info, category, capacity,
       full_price_count, full_price_amount,
       student_count, student_price,
       senior_count, senior_price,
       child_count, child_price,
       early_bird_count, early_bird_price, early_bird_start, early_bird_end,
       rules, max_per_user, payment_methods, status
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      body.title.trim(), body.description.trim(),
      body.date, body.end_date,
      nowISO, null, nowISO,
      body.location.trim(), body.organiser_info.trim(), body.category.trim(),
      num(body.capacity, Number),

      num(body.full_price_count, Number), num(body.full_price_amount),
      num(body.student_count, Number), num(body.student_price),
      num(body.senior_count, Number), num(body.senior_price),
      num(body.child_count, Number), num(body.child_price),

      num(body.early_bird_count, Number), num(body.early_bird_price),
      body.early_bird_start || null, body.early_bird_end || null,

      body.rules.trim(),
      parseInt(body.max_per_user, 10),
      arr(body.payment_methods).join(','),
      'draft'
    ],
    async function (err) {
      if (err) return res.status(500).send('Error creating event');

      await savePromoCodes(this.lastID, body.promo_codes);
      await saveCustomConcessions(this.lastID, body.custom_concessions);
      res.redirect('/organiser');
    }
  );

  /* ─────────────────────────────
   * Error Rendering Helper
   * Used when validation fails during creation
   * Re-renders form with old data and error message
   * ───────────────────────────── */
  function renderNewWithError(msg) {
    const now = roundUpToNext15Min(new Date()).toISOString().slice(0, 16);
    const earliest = new Date(Date.now() - 10 * 864e5).toISOString().split('T')[0];
    res.status(400).render('organiser-edit-event', {
      event: {
        ...body,
        id: null,
        status: 'draft'
      },
      error: msg,
      submitted: body,
      minDate: now,
      earliestExpiry: earliest,
      promoCodes: arr(body.promo_codes),
      customConcessions: arr(body.custom_concessions)
    });
  }
});

/* ─────────────────────────────
 * POST /organiser/delete/:id
 * Deletes the selected event from database
 * ───────────────────────────── */
router.post('/delete/:id', requireOrganiserLogin, (req, res) => {
  global.db.run('DELETE FROM events WHERE id = ?', [req.params.id],
    err => err ? res.status(500).send('Error deleting') : res.redirect('/organiser'));
});

/* ─────────────────────────────
 * POST /organiser/publish/:id
 * Marks event as published and sets published_at timestamp
 * ───────────────────────────── */
router.post('/publish/:id', (req, res) => {
  global.db.run(
    `UPDATE events
        SET status = 'published', published_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [req.params.id],
    err => err ? res.status(500).send('Error publishing') : res.redirect('/organiser')
  );
});

/* ─────────────────────────────
 * GET /organiser/edit/:id
 * Loads event by ID for editing
 * Loads associated promo codes & concessions
 * ───────────────────────────── */
router.get('/edit/:id', requireOrganiserLogin, (req, res) => {
  global.db.get('SELECT * FROM events WHERE id = ?', [req.params.id], (err, ev) => {
    if (err || !ev) return res.status(404).send('Event not found');

    const now = roundUpToNext15Min(new Date()).toISOString().slice(0, 16);
    const earliest = new Date(new Date(ev.date).getTime() - 10 * 864e5)
      .toISOString().split('T')[0];

    global.db.all('SELECT * FROM promo_codes WHERE event_id = ?', [ev.id], (_, promos) => {
      global.db.all('SELECT * FROM custom_concessions WHERE event_id = ?', [ev.id], (_, concs) => {
        res.render('organiser-edit-event', {
          event: ev,
          error: null,
          submitted: {},
          minDate: now,
          earliestExpiry: earliest,
          promoCodes: promos,
          customConcessions: concs
        });
      });
    });
  });
});

/* ─────────────────────────────
 * POST /organiser/edit/:id
 * Handles form submission for updating an event
 * Validates and saves updates to the database
 * ───────────────────────────── */
router.post('/edit/:id', requireOrganiserLogin, (req, res) => {
  const body = req.body;
  const err = validateEventFields(body, true);
  if (err) return renderEditError(err);

  global.db.run(
    `UPDATE events SET
       title=?, description=?, date=?, end_date=?,
       location=?, organiser_info=?, category=?, capacity=?,
       full_price_count=?, full_price_amount=?,
       student_count=?, student_price=?,
       senior_count=?, senior_price=?,
       child_count=?, child_price=?,
       early_bird_count=?, early_bird_price=?, early_bird_start=?, early_bird_end=?,
       rules=?, max_per_user=?, payment_methods=?, updated_at=CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      body.title.trim(), body.description.trim(),
      body.date, body.end_date,
      body.location.trim(), body.organiser_info.trim(), body.category.trim(),
      num(body.capacity, Number),

      num(body.full_price_count, Number), num(body.full_price_amount),
      num(body.student_count, Number), num(body.student_price),
      num(body.senior_count, Number), num(body.senior_price),
      num(body.child_count, Number), num(body.child_price),

      num(body.early_bird_count, Number), num(body.early_bird_price),
      body.early_bird_start || null, body.early_bird_end || null,

      body.rules.trim(),
      parseInt(body.max_per_user, 10),
      arr(body.payment_methods).join(','),
      req.params.id
    ],
    async err => {
      if (err) return res.status(500).send('Error updating event');

      await savePromoCodes(req.params.id, body.promo_codes);
      await saveCustomConcessions(req.params.id, body.custom_concessions);
      res.redirect('/organiser');
    }
  );

  /* ─────────────────────────────
   * Error rendering helper for edit page
   * ───────────────────────────── */
  function renderEditError(msg) {
    global.db.get('SELECT * FROM events WHERE id = ?', [req.params.id], (e, ev) => {
      if (e || !ev) return res.status(500).send('Unexpected error');

      const now = roundUpToNext15Min(new Date()).toISOString().slice(0, 16);
      const earliest = new Date(new Date(ev.date).getTime() - 10 * 864e5)
        .toISOString().split('T')[0];

      res.status(400).render('organiser-edit-event', {
        event: ev,
        error: msg,
        submitted: body,
        minDate: now,
        earliestExpiry: earliest,
        promoCodes: arr(body.promo_codes),
        customConcessions: arr(body.custom_concessions)
      });
    });
  }
});

/* ─────────────────────────────
 * GET /organiser/stats/:id
 * Displays detailed statistics for a specific event:
 *   • Booking breakdowns
 *   • Promo code usage
 *   • Total revenue
 *   • Remaining tickets
 * ───────────────────────────── */
router.get('/stats/:id', requireOrganiserLogin, (req, res) => {
  const eventId = req.params.id;

  /* ───────────────
   * SQL Queries
   * ─────────────── */

  const eventQ = 'SELECT * FROM events WHERE id = ?';
  const bookingQ = `
    SELECT b.*, pc.code AS promo_code_used
      FROM bookings b
      LEFT JOIN promo_codes pc ON b.promo_code_id = pc.id
     WHERE b.event_id = ?`;
  const promoQ = `
    SELECT id, code, discount_type, discount_amount, usage_limit, expires_at
      FROM promo_codes WHERE event_id = ?`;
  const customQ = `
    SELECT id, name, price, count
      FROM custom_concessions WHERE event_id = ?`;
  const paymentQ = `
    SELECT method, transaction_id
      FROM payments WHERE booking_id = ?`;

  /* ───────────────
   * Load main event info
   * ─────────────── */

  global.db.get(eventQ, [eventId], (e1, event) => {
    if (e1 || !event) return res.status(404).send('Event not found');

    global.db.all(bookingQ, [eventId], (e2, bookings) => {
      if (e2) return res.status(500).send('Error loading bookings');

      global.db.all(promoQ, [eventId], (e3, promoList) => {
        global.db.all(customQ, [eventId], (e4, customConcs) => {
          if (e3 || e4) return res.status(500).send('Error loading stats');

          const toNum = x => (x == null || isNaN(+x)) ? 0 : +x;

          /* ───────────────
           * Promo code usage mapping
           * ─────────────── */
          const usage = {};
          bookings.forEach(b => {
            if (b.promo_code_used)
              usage[b.promo_code_used] = (usage[b.promo_code_used] || 0) + 1;
          });

          promoList.forEach(pc => {
            const used = usage[pc.code] || 0;
            const left = toNum(pc.usage_limit);
            pc.used = used;
            pc.left = left;
            pc.limit = used + left;
          });

          /* ───────────────
           * Initialize stats
           * ─────────────── */
          const totals = {
            full: 0,
            student: 0,
            senior: 0,
            child: 0,
            early: 0,
            custom: {},
            promoUsage: usage,
            totalBookings: bookings.length,
            totalRevenue: 0
          };

          const priceMap = {};
          customConcs.forEach(cc => {
            priceMap[`custom_${cc.id}`] = toNum(cc.price);
          });

          /* ───────────────
           * Helper: attach payment info to booking
           * ─────────────── */
          const fetchPayment = b => new Promise(done => {
            global.db.get(paymentQ, [b.id], (_, p) => {
              b.payment = p || {};
              done();
            });
          });

          /* ───────────────
           * Compute totals from bookings
           * ─────────────── */
          Promise.all(bookings.map(async b => {
            totals.full += toNum(b.full_price_tickets);
            totals.totalRevenue += toNum(b.total_paid || b.amount_paid);

            const cd = (() => {
              try {
                return JSON.parse(b.concession_detail || '{}');
              } catch {
                return {};
              }
            })();

            totals.student += toNum(cd.student);
            totals.senior += toNum(cd.senior);
            totals.child += toNum(cd.child);
            totals.early += toNum(cd.early_bird);

            Object.entries(cd).forEach(([k, v]) => {
              if (k.startsWith('custom_'))
                totals.custom[k] = (totals.custom[k] || 0) + toNum(v);
            });

            b.guestNames = JSON.parse(b.guest_names || '[]');
            b.guestPhones = JSON.parse(b.guest_phones || '[]');

            await fetchPayment(b);
          })).then(() => {
            /* ───────────────
             * Compute total capacity (booked + left)
             * ─────────────── */
            const capacities = {
              full: toNum(event.full_price_count) + totals.full,
              student: toNum(event.student_count) + totals.student,
              senior: toNum(event.senior_count) + totals.senior,
              child: toNum(event.child_count) + totals.child,
              early: toNum(event.early_bird_count) + totals.early
            };
            customConcs.forEach(cc => {
              const k = `custom_${cc.id}`;
              capacities[k] = toNum(cc.count) + (totals.custom[k] || 0);
            });

            /* ───────────────
             * Remaining tickets (left)
             * ─────────────── */
            const left = {
              full: toNum(event.full_price_count),
              student: toNum(event.student_count),
              senior: toNum(event.senior_count),
              child: toNum(event.child_count),
              early: toNum(event.early_bird_count)
            };
            customConcs.forEach(cc => {
              left[`custom_${cc.id}`] = toNum(cc.count);
            });

            /* ───────────────
             * Total seats sold
             * ─────────────── */
            const sold = totals.full + totals.student + totals.senior +
              totals.child + totals.early +
              Object.values(totals.custom).reduce((a, b) => a + b, 0);

            /* ───────────────
             * Render stats page
             * ─────────────── */
            res.render('organiser-stats', {
              event,
              bookings,
              totals,
              capacities,
              left,
              seatsLeft: event.capacity - sold,
              promoList,
              customConcs
            });
          });
        });
      });
    });
  });
});

/* ─────────────────────────────
 * Export router
 * ───────────────────────────── */
module.exports = router;