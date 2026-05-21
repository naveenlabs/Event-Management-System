EVENT MANAGER WEB APPLICATION
================================================================================

A full-stack web application for managing and booking events, with organiser 
and attendee portals. Built with Node.js, Express, EJS, and SQLite3.

================================================================================
QUICK START GUIDE
================================================================================

1. INSTALL NODE MODULES

Make sure you're in the project root directory, then run:

    npm install

2. SET UP THE DATABASE

Create and initialise the database from the schema file using SQLite CLI:

    sqlite3 database.db < db_schema.sql

This command will:
  • Create all necessary tables (events, bookings, payments, etc.)
  • Insert a default site setting (name & description)

If you don't have SQLite installed, visit:
https://www.sqlite.org/download.html

3. START THE APPLICATION

Once dependencies are installed and the database is set up, run:

    npm start

4. OPEN IN BROWSER

Go to:

    http://localhost:3000/

You should see the homepage for the event platform.

================================================================================
ORGANISER LOGIN (FOR ADMIN DASHBOARD)
================================================================================

Use any of the below credentials to log in as an organiser at /organiser-login:

Email                    Password
organiser1@gmail.com     Organiser@1
organiser2@gmail.com     Organiser@2
organiser3@gmail.com     Organiser@3
organiser4@gmail.com     Organiser@4
organiser5@gmail.com     Organiser@5

These are stored in routes/login.js for demonstration purposes.

================================================================================
LIBRARIES USED
================================================================================

The following libraries are used in the project:

  • express — Web framework
  • ejs — Template rendering
  • body-parser — Parses form requests
  • express-session — Session management for login authentication
  • sqlite3 — Embedded SQL database

Install all via:

    npm install express ejs body-parser express-session sqlite3

================================================================================
KEY FEATURES & EXTENSIONS IMPLEMENTED
================================================================================

STANDARD FUNCTIONALITY

  • Attendees can view, book, and confirm event tickets
  • Organisers can create, edit, publish, and delete events with:
    - Full and concession ticket types
    - Custom concessions
    - Promo codes
    - Payment tracking and guest info

CUSTOM EXTENSIONS IMPLEMENTED

1. REMAINING TICKET COUNTS
   
   Organisers and attendees see live ticket stock levels. The organiser stats 
   page shows remaining seats per category.

2. ORGANISER BOOKING OVERVIEW
   
   Full breakdown of bookings and revenue per event. Guest names, phone 
   numbers, and applied promo codes are visible.

3. PASSWORD PROTECTION FOR ORGANISERS
   
   Login required to access organiser dashboard. Routes are protected via 
   session middleware (requireOrganiserLogin). Sessions expire after 24 hours.

================================================================================
PROJECT STRUCTURE OVERVIEW
================================================================================

.
├── index.js             Main server file
├── db_schema.sql        SQL schema file to set up the database
├── package.json         Project dependencies
├── /routes              Express routers for main, login, organiser, attendee
│   ├── main.js
│   ├── login.js
│   ├── organiser.js
│   └── attendee.js
├── /views               EJS templates (rendered HTML)
└── /public              Static assets (CSS, JS)

================================================================================
FINAL NOTES
================================================================================

  • Site settings like title and description are editable from organiser 
    dashboard.
  
  • Data is stored in database.db using SQLite. No external database is 
    required.
  
  • All event-related logic is transactional and includes validation.

================================================================================

Made with Node.js and Express.
