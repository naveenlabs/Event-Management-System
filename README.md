# Event Management System

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green)]() [![Express](https://img.shields.io/badge/Express-4.18+-blue)]() [![SQLite](https://img.shields.io/badge/SQLite-3-lightgrey)]() [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Status: Complete](https://img.shields.io/badge/Status-Complete-green)]() 

A full-stack event booking platform with organiser dashboards, dynamic ticketing, promo codes, and real-time analytics. Built for scalability and user experience.

## Overview

Event Management System is a complete web application enabling event organisers to manage events, pricing, promotions, and attendee data, while providing attendees with a seamless booking experience. The system supports multi-tier ticketing (standard, student, senior, child, early-bird), custom concessions, promo code management with usage limits and expiry, and comprehensive organiser analytics.

## Key Results

| Metric | Details |
|--------|---------|
| **Events** | Full CRUD with draft/published states |
| **Ticketing** | 5 built-in types + unlimited custom concessions |
| **Promo Codes** | Per-event discounts, fixed/percent, usage limits & expiry |
| **Bookings** | Guest detail capture, transaction tracking, payment methods |
| **Analytics** | Real-time revenue, ticket breakdown, promo usage per event |
| **Authentication** | Session-based organiser login with 24-hour expiry |

## What's Inside

**Backend:** Express.js server orchestrating routing, validation, session management, and database queries across 4 route modules.

**Database:** SQLite schema with 6 normalized tables (site_settings, events, custom_concessions, promo_codes, bookings, payments) enforcing referential integrity and cascading deletes.

**Frontend:** EJS templating with 10+ views covering organiser dashboard, event editor, attendee home, booking flow, and confirmation pages.

**Validation:** Server-side checks for ticket availability, capacity matching, promo limits, guest details, and payment methods.

## Quick Start

**1. Install dependencies:**
```bash
npm install
```

**2. Set up database:**
```bash
sqlite3 database.db < db_schema.sql
```

**3. Start server:**
```bash
npm start
```

**4. Open browser:**
```
http://localhost:3000/
```

## Organiser Login

Test credentials (stored in `routes/login.js`):

| Email | Password |
|-------|----------|
| organiser1@gmail.com | Organiser@1 |
| organiser2@gmail.com | Organiser@2 |
| organiser3@gmail.com | Organiser@3 |

## Tech Stack

- **Runtime:** Node.js (v16+)
- **Framework:** Express.js (4.18)
- **Templating:** EJS
- **Database:** SQLite3
- **Session Management:** express-session
- **Body Parsing:** body-parser

## Key Features

**For Organisers:**
- Create, edit, publish, and manage events
- Define custom ticket types and pricing tiers
- Set promo codes with usage limits and expiry dates
- View real-time booking analytics, revenue, and ticket breakdown
- Monitor guest details and payment methods per booking

**For Attendees:**
- Browse published events with live ticket availability
- Select ticket types and quantities with per-user booking limits
- Add custom guest details (names, phone numbers)
- Apply promo codes during checkout
- Receive booking confirmation with full receipt

**System-Wide:**
- Atomic transactions for booking flow (prevents overbooking)
- JSON storage for flexible guest and concession data
- Cascading deletes for data consistency
- Early-bird pricing windows with live countdown
- Payment method selection per event

## Documentation

Complete project documentation is available in the `/Documentation` folder:

- **Report:** [DNW - Report.pdf](Documentation/DNW%20-%20Report.pdf) – Comprehensive system design, architecture, database schema, and implementation details.
- **Diagrams:** Entity-relationship diagram and three-tier architecture visualizations.
- **Demo Video:** [Event Management System Demo](https://drive.google.com/file/d/1sfkzP9Uhb1UV0eQnJH3RZVeXG_BS4iMZ/view?usp=sharing) – Full walkthrough of organiser and attendee workflows.

## Author

**Dhanarasu Naveen**  
Computer Science (AI & Machine Learning Specialisation)  
University of London via SIM Singapore  

## License

MIT License – see [LICENSE](LICENSE) file for details.
