/* ─────────────────────────────
 * Main Page Route
 * ───────────────────────────── */
const express = require('express');
const router  = express.Router();

/* ─────────────────────────────
 * GET /
 * ─────────────────────────────
 * If a session exists, explicitly set
 * organiserLoggedIn to false, then render
 * the main homepage.
 * ───────────────────────────── */
router.get('/', (req, res) => {
  if (req.session) {
    req.session.organiserLoggedIn = false;
  }
  res.render('main-home');
});

/* ─────────────────────────────
 * Export Router
 * ───────────────────────────── */
module.exports = router;
