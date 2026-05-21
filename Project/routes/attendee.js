/* ─────────────────────────────
 * Attendee-Side Routes
 * Handles:
 *   • Homepage (list events)
 *   • Event detail page
 *   • Booking flow
 *   • Booking confirmation
 * ───────────────────────────── */

const express = require('express');
const router  = express.Router();

/* ─────────────────────────────
 * GET /attendee/
 * Public home – fetch site settings,
 * published events, attach concessions,
 * then render attendee-home.
 * ───────────────────────────── */
router.get('/', (req, res) => {
  const sqlSettings   = 'SELECT * FROM site_settings WHERE id = 1';
  const sqlEvents     = 'SELECT * FROM events WHERE status="published" ORDER BY date ASC';
  const sqlConcession = 'SELECT * FROM custom_concessions WHERE event_id = ?';

  global.db.get(sqlSettings, (eSet, settings) => {
    if (eSet) return res.status(500).send('Error loading settings');

    global.db.all(sqlEvents, async (eEv, events) => {
      if (eEv) return res.status(500).send('Error loading events');

      try {
        const now = new Date();

        /* attach custom concessions + derived flags */
        const populated = await Promise.all(
          events.map(ev => new Promise((resolve, reject) => {
            global.db.all(sqlConcession, [ev.id], (eC, cons) => {
              if (eC) return reject(eC);

              ev.customConcessions = cons || [];

              /* remaining stock snapshot */
              ev.left = {
                standard : Number(ev.full_price_count)  || 0,
                student  : Number(ev.student_count)     || 0,
                senior   : Number(ev.senior_count)      || 0,
                child    : Number(ev.child_count)       || 0,
                earlyBird: Number(ev.early_bird_count)  || 0
              };
              ev.customConcessions.forEach(c => {
                ev.left[`custom_${c.id}`] = Number(c.count) || 0;
              });

              /* total tickets left */
              ev.ticketsLeft =
                ev.left.standard +
                ev.left.student  +
                ev.left.senior   +
                ev.left.child    +
                Object.entries(ev.left)
                      .filter(([k]) => k.startsWith('custom_'))
                      .reduce((s,[,n]) => s + n, 0);

              /* early-bird helpers */
              ev.earlyBirdStartsSoon =
                ev.early_bird_start &&
                new Date(ev.early_bird_start) > now;

              ev.earlyBirdActive =
                !ev.earlyBirdStartsSoon &&
                ev.early_bird_end &&
                new Date(ev.early_bird_end) > now;

              ev.showEarlyBirdFewLeft = ev.early_bird_count > 0;

              resolve(ev);
            });
          }))
        );

        /* render home */
        res.render('attendee-home', {
          siteName       : settings.name,
          siteDescription: settings.description,
          publishedEvents: populated
        });
      } catch (err) {
        res.status(500).send('Error loading concessions');
      }
    });
  });
});

/* ─────────────────────────────
 * GET /attendee/event/:id
 * Show event detail, concessions & promos.
 * ───────────────────────────── */
router.get('/event/:id', (req, res) => {
  const eventId = req.params.id;

  const sqlEvent    = 'SELECT * FROM events WHERE id = ? AND status="published"';
  const sqlConcess  = 'SELECT * FROM custom_concessions WHERE event_id = ?';
  const sqlPromo    = 'SELECT * FROM promo_codes WHERE event_id = ?';
  const sqlSettings = 'SELECT * FROM site_settings WHERE id = 1';

  global.db.get(sqlEvent, [eventId], (eEv, event) => {
    if (eEv || !event) return res.status(404).send('Event not found');

    global.db.all(sqlConcess, [eventId], (eC, concessions) => {
      if (eC) return res.status(500).send('Error loading concessions');

      global.db.all(sqlPromo, [eventId], (eP, promos) => {
        if (eP) return res.status(500).send('Error loading promo codes');

        global.db.get(sqlSettings, (eS, settings) => {
          if (eS) return res.status(500).send('Error loading settings');

          const now = new Date();
          event.earlyBirdNotStarted =
            event.early_bird_start &&
            new Date(event.early_bird_start) > now;

          event.showEarlyBirdFewLeft = event.early_bird_count > 0;

          /* render detail page */
          res.render('attendee-event', {
            siteName         : settings.name,
            siteDescription  : settings.description,
            event,
            customConcessions: concessions || [],
            promoCodes       : promos      || []
          });
        });
      });
    });
  });
});

/* ─────────────────────────────
 * POST /attendee/event/:id/book
 * Booking handler – validates stock,
 * guest details, promo codes, saves
 * booking + payment, then redirects to
 * confirmation page.
 * ───────────────────────────── */
router.post('/event/:id/book', (req, res) => {
  const eventId = req.params.id;
  const b       = req.body;

  /* ---------- quantities ---------- */
  const qty = {
    full   : +b.full_price_tickets || 0,
    student: +b.student_tickets    || 0,
    senior : +b.senior_tickets     || 0,
    child  : +b.child_tickets      || 0,
    eb     : +b.early_bird_tickets || 0
  };
  const customQtys = Object.keys(b)
    .filter(k => k.startsWith('custom_') && k.endsWith('_tickets'))
    .map(k => ({ id: k.split('_')[1], qty: +b[k] || 0 }));

  const sqlEvent   = 'SELECT * FROM events WHERE id = ? AND status="published"';
  const sqlConcess = 'SELECT * FROM custom_concessions WHERE event_id = ?';

  global.db.get(sqlEvent, [eventId], (eEv, ev) => {
    if (eEv || !ev) return res.status(404).send('Event not found');

    /* early-bird gate */
    if (
      qty.eb > 0 &&
      ev.early_bird_start &&
      new Date(ev.early_bird_start) > new Date()
    ) {
      return res.status(400).send('Early-bird ticket sales have not started yet');
    }

    global.db.all(sqlConcess, [eventId], (eC, consRows) => {
      if (eC) return res.status(500).send('Error loading concessions');

      const consMap = Object.fromEntries(consRows.map(c => [String(c.id), c]));

      /* ---------- stock checks ---------- */
      const stockOk = () => {
        if (qty.full    > ev.full_price_count ) return false;
        if (qty.student > ev.student_count    ) return false;
        if (qty.senior  > ev.senior_count     ) return false;
        if (qty.child   > ev.child_count      ) return false;
        if (qty.eb      > ev.early_bird_count ) return false;
        for (const c of customQtys) {
          if (!consMap[c.id] || c.qty > consMap[c.id].count) return false;
        }
        return true;
      };
      if (!stockOk()) {
        return res.status(400).send('Selected ticket quantities exceed availability');
      }

      /* ---------- quantity & guest data ---------- */
      const totalTickets =
        qty.full + qty.student + qty.senior + qty.child + qty.eb +
        customQtys.reduce((s,c) => s + c.qty, 0);

      const maxPerUser = +ev.max_per_user || 1;
      if (totalTickets === 0 || totalTickets > maxPerUser) {
        return res
          .status(400)
          .send(`You must select between 1 and ${maxPerUser} tickets`);
      }

      const names  = Array.isArray(b.guest_name)  ? b.guest_name  : [b.guest_name];
      const phones = Array.isArray(b.guest_phone) ? b.guest_phone : [b.guest_phone];
      if (
        names.length !== totalTickets ||
        phones.length !== totalTickets ||
        names.some(n => !n.trim()) ||
        phones.some(p => !/^\d{8}$/.test(p))
      ) {
        return res.status(400).send('Fill valid guest names & phones');
      }

      /* ---------- contact & payment ---------- */
      const payment_method = b.payment_method || b.selected_method;
      const { contact_name, contact_email, contact_phone } = b;
      if (!contact_name || !contact_email || !contact_phone || !payment_method) {
        return res.status(400).send('Contact & payment are required');
      }

      /* ---------- cost calc (before promos) ---------- */
      let totalCost =
        qty.full    * ev.full_price_amount +
        qty.student * ev.student_price    +
        qty.senior  * ev.senior_price     +
        qty.child   * ev.child_price      +
        qty.eb      * ev.early_bird_price +
        customQtys.reduce((s,c)=>s + c.qty*(consMap[c.id]?.price||0), 0);

      const concessionDetail = {
        student   : qty.student,
        senior    : qty.senior,
        child     : qty.child,
        early_bird: qty.eb
      };
      customQtys.forEach(c => {
        concessionDetail[`custom_${c.id}`] = c.qty;
      });

      /* ---------- promo-code logic ---------- */
      const promoInput  = (b.promo_code || '').trim().toUpperCase();
      let   promoId     = null;
      let   discountAmt = 0;
      const standardTotal = qty.full * ev.full_price_amount;

      /* inner fn to wrap DB writes in a transaction */
      const finishBooking = () => {
        totalCost = Math.max(0, totalCost - discountAmt);

        global.db.serialize(() => {
          global.db.run('BEGIN TRANSACTION');

          /* save booking */
          const sqlBook = `
            INSERT INTO bookings (
              event_id, full_price_tickets, concession_tickets,
              concession_detail, promo_code_id,
              guest_names, guest_phones,
              contact_name, contact_email, contact_phone,
              total_paid, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
          `;
          global.db.run(sqlBook, [
            eventId,
            qty.full,
            totalTickets - qty.full,
            JSON.stringify(concessionDetail),
            promoId,
            JSON.stringify(names),
            JSON.stringify(phones),
            contact_name, contact_email, contact_phone,
            totalCost.toFixed(2)
          ], function (eB) {
            if (eB) {
              global.db.run('ROLLBACK');
              return res.status(500).send('Error saving booking');
            }
            const bookingId = this.lastID;

            /* decrement ticket stock */
            const upd = [];
            if (qty.full   ) upd.push(`full_price_count = full_price_count - ${qty.full}`);
            if (qty.student) upd.push(`student_count    = student_count    - ${qty.student}`);
            if (qty.senior ) upd.push(`senior_count     = senior_count     - ${qty.senior}`);
            if (qty.child  ) upd.push(`child_count      = child_count      - ${qty.child}`);
            if (qty.eb     ) upd.push(`early_bird_count = early_bird_count - ${qty.eb}`);
            if (upd.length) {
              global.db.run(`UPDATE events SET ${upd.join(',')} WHERE id = ?`, [eventId]);
            }

            /* decrement custom concessions */
            customQtys.forEach(c => {
              if (c.qty > 0) {
                global.db.run(
                  'UPDATE custom_concessions SET count = count - ? WHERE id = ?',
                  [c.qty, c.id]
                );
              }
            });

            /* record payment */
            global.db.run(
              'INSERT INTO payments (booking_id, method, transaction_id, details) VALUES (?,?,?,?)',
              [bookingId, payment_method, 'TXN' + Date.now(), JSON.stringify({})],
              ePay => {
                if (ePay) {
                  global.db.run('ROLLBACK');
                  return res.status(500).send('Error saving payment');
                }
                global.db.run('COMMIT', () => res.redirect(`/attendee/confirm/${bookingId}`));
              }
            );
          });
        });
      };

      /* if no promo or no standard tickets – skip promo logic */
      if (!promoInput || standardTotal === 0) return finishBooking();

      /* validate promo */
      global.db.get(
        'SELECT * FROM promo_codes WHERE event_id = ? AND UPPER(code) = ?',
        [eventId, promoInput],
        (eP, promo) => {
          if (eP || !promo) return finishBooking();

          const now       = new Date();
          const unlimited = promo.usage_limit === null;
          const exhausted = !unlimited && promo.usage_limit <= 0;
          const expired   = promo.expires_at && new Date(promo.expires_at) <= now;

          if (expired || exhausted) return finishBooking();

          promoId = promo.id;
          discountAmt = promo.discount_type === 'fixed'
            ? Math.min(promo.discount_amount, standardTotal)
            : standardTotal * (promo.discount_amount / 100);

          /* decrement usage limit if needed */
          if (!unlimited) {
            global.db.run(
              'UPDATE promo_codes SET usage_limit = usage_limit - 1 WHERE id = ?',
              [promo.id],
              () => finishBooking()
            );
          } else {
            finishBooking();
          }
        }
      );
    });
  });
});

/* ─────────────────────────────
 * GET /attendee/confirm/:bid
 * Booking confirmation page.
 * ───────────────────────────── */
router.get('/confirm/:bid', (req, res) => {
  const sql = `
    SELECT
      b.*, e.title, e.location, e.date,
      e.full_price_amount, e.student_price, e.senior_price,
      e.child_price, e.early_bird_price,
      pc.code AS promo_code, pc.discount_type, pc.discount_amount,
      p.method AS payment_method
    FROM bookings  b
    JOIN events    e ON e.id = b.event_id
    JOIN payments  p ON p.booking_id = b.id
    LEFT JOIN promo_codes pc ON pc.id = b.promo_code_id
    WHERE b.id = ?
  `;
  global.db.get(sql, [req.params.bid], (err, booking) => {
    if (err || !booking) return res.status(404).send('Booking not found');

    booking.guest_names       = JSON.parse(booking.guest_names);
    booking.guest_phones      = JSON.parse(booking.guest_phones);
    booking.concession_detail = JSON.parse(booking.concession_detail || '{}');

    global.db.all(
      'SELECT id, name, price FROM custom_concessions WHERE event_id = ?',
      [booking.event_id],
      (eC, customConcessions) => {
        if (eC) return res.status(500).send('Error loading concessions');
        res.render('booking-confirmation', { booking, customConcessions });
      }
    );
  });
});

/* ─────────────────────────────
 * Export Router
 * ───────────────────────────── */
module.exports = router;
