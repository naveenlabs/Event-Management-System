/* ─────────────────────────────
 * Required Modules
 * ───────────────────────────── */
const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const sqlite3    = require('sqlite3').verbose();
const session    = require('express-session');

/* ─────────────────────────────
 * App Setup
 * ───────────────────────────── */
const app  = express();
const port = 3000;

/* ─────────────────────────────
 * Middleware
 * ───────────────────────────── */

// Parse form data (URL-encoded)
app.use(bodyParser.urlencoded({ extended: true }));

// Session handling
app.use(session({
  secret: 'keyboard cat',            // Replace with secure secret in production
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000      // 1 day session expiry
  }
}));

/* ─────────────────────────────
 * View Engine and Static Files
 * ───────────────────────────── */

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

/* ─────────────────────────────
 * Database Initialization
 * ───────────────────────────── */
global.db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Database connected");
    global.db.run("PRAGMA foreign_keys = ON");  // Enforce foreign key constraints
  }
});

/* ─────────────────────────────
 * Route Imports
 * ───────────────────────────── */
const mainRoutes      = require('./routes/main');
const loginRoutes     = require('./routes/login');
const organiserRoutes = require('./routes/organiser');
const attendeeRoutes  = require('./routes/attendee');

/* ─────────────────────────────
 * Route Mounting
 * ───────────────────────────── */
app.use('/', mainRoutes);
app.use('/', loginRoutes);
app.use('/organiser', organiserRoutes);
app.use('/attendee', attendeeRoutes);

// Direct render test route
app.get('/main', (req, res) => {
  res.render('main-home');
});

/* ─────────────────────────────
 * Start Server
 * ───────────────────────────── */
app.listen(port, () => {
  console.log(`🚀 Event Manager app running at http://localhost:${port}`);
});
