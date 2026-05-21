/* ─────────────────────────────
 * Organiser Login Routes
 * ───────────────────────────── */
const express = require('express');
const router  = express.Router();

/* ─────────────────────────────
 * Hardcoded Organiser Credentials
 * ───────────────────────────── */
const ORGANISERS = [
  { email: 'organiser1@gmail.com', password: 'Organiser@1' },
  { email: 'organiser2@gmail.com',   password: 'Organiser@2'   },
  { email: 'organiser3@gmail.com', password: 'Organiser@3' },
  { email: 'organiser4@gmail.com',  password: 'Organiser@4'  },
  { email: 'organiser5@gmail.com',   password: 'Organiser@5'   }
];

/* ─────────────────────────────
 * GET /organiser-login
 * Show login form with no error
 * ───────────────────────────── */
router.get('/organiser-login', (req, res) => {
  res.render('organiser-login', { error: null });
});

/* ─────────────────────────────
 * POST /organiser-login
 * Validate credentials and redirect
 * ───────────────────────────── */
router.post('/organiser-login', (req, res) => {
  const { email, password } = req.body;

  const user = ORGANISERS.find(u =>
    u.email.toLowerCase() === email.toLowerCase() &&
    u.password === password
  );

  if (user) {
    req.session.organiserLoggedIn = true;
    return res.redirect('/organiser');
  }

  return res.render('organiser-login', {
    error: 'Invalid email or password'
  });
});

/* ─────────────────────────────
 * GET /organiser-logout
 * Destroys session and redirects home
 * ───────────────────────────── */
router.get('/organiser-logout', (req, res) => {
  req.session.destroy(err => {
    res.redirect('/');
  });
});

/* ─────────────────────────────
 * Export Router
 * ───────────────────────────── */
module.exports = router;
