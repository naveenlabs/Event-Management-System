# Event Manager Web Application

This is a full-stack web application for managing and booking events, with organiser and attendee portals. It uses **Node.js**, **Express**, **EJS**, and **SQLite3**, and supports full CRUD functionality for events, ticketing, bookings, and promo codes.

---

## Quick Start Guide

### 1. Install Node Modules

Make sure you're in the project root directory, then run:

```bash
npm install
```

### 2. Set Up the Database

Create and initialise the database from the schema file using the SQLite CLI:

```bash
sqlite3 database.db < db_schema.sql
```

This command will:
- Create all necessary tables (`events`, `bookings`, `payments`, etc.)
- Insert a default site setting (name & description)

If you don't have SQLite installed, visit: [https://www.sqlite.org/download.html](https://www.sqlite.org/download.html)

### 3. Start the Application

Once dependencies are installed and the database is set up, run:

```bash
npm start run
```

### 4. Open in Browser

Go to:

```
http://localhost:3000/
```

You should see the homepage for the event platform.

---

## Organiser Login (For Admin Dashboard)

Use any of the below credentials to log in as an organiser at `/organiser-login`:

| Email                  | Password      |
|------------------------|---------------|
| organiser1@gmail.com   | Organiser@1   |
| organiser2@gmail.com   | Organiser@2   |
| organiser3@gmail.com   | Organiser@3   |

These are stored in `routes/login.js` for demonstration purposes.

---

## Libraries Used

These libraries are used in the project:

- **express** – Web framework
- **ejs** – Template rendering
- **body-parser** – Parses form requests
- **express-session** – Session management for login authentication
- **sqlite3** – Embedded SQL database

Install all via:

```bash
npm install express ejs body-parser express-session sqlite3
```

---

## Key Features & Extensions Implemented

### Standard Functionality

- Attendees can view, book, and confirm event tickets.
- Organisers can create/edit/publish/delete events with:
  - Full and concession ticket types
  - Custom concessions
  - Promo codes
  - Payment tracking and guest info

### Custom Extensions Implemented

1. **Remaining Ticket Counts**
   - Organisers and attendees see live ticket stock levels.
   - Organiser stats page shows remaining seats per category.

2. **Organiser Booking Overview**
   - Full breakdown of bookings and revenue per event.
   - Guest names, phone numbers, and applied promo codes are visible.

3. **Password Protection for Organisers**
   - Login required to access organiser dashboard.
   - Routes are protected via session middleware (`requireOrganiserLogin`).
   - Sessions expire after 24 hours.

---

## Project Structure Overview

```
.
├── index.js             # Main server file
├── db_schema.sql        # SQL schema file to set up the database
├── /routes              # Express routers for main, login, organiser, attendee
│   ├── main.js
│   ├── login.js
│   ├── organiser.js
│   └── attendee.js
├── /views               # EJS templates (rendered HTML)
├── /public              # Static assets (CSS, JS)
```

---

## Final Notes

- Site settings like title and description are editable from organiser dashboard.
- Data is stored in `database.db` using SQLite. No external database is required.
- All event-related logic is transactional and includes validation.

---

Made with using Node.js and Express.
