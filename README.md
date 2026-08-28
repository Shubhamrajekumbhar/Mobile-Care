# Mobile Care – Mobile Repair & Accessories Management System

A full-stack web application for a mobile repair shop with separate Admin and Customer portals. The system includes repair management, inventory, sales, warranty tracking, repair tracking, and automated email notifications.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express.js
- Database: PostgreSQL
- Authentication: JWT + bcrypt
- Email: Nodemailer
- API: RESTful

## Project Structure

- `server/src` – Express API and business logic
- `public` – Static frontend pages and assets
- `database/schema.sql` – PostgreSQL database schema

## Prerequisites

- VS Code
- Node.js 18+
- PostgreSQL 14+
- A mail provider account or SMTP service

## Setup Instructions

### Option A: Local PostgreSQL

1. Install Node.js from https://nodejs.org/
2. Install PostgreSQL and create a database named `mobile_care`
3. In VS Code, open the project folder `d:\MOBITracker`
4. Copy `.env.example` to `.env` and update the values
5. Run the following commands in the terminal:

```bash
npm install
createdb mobile_care
psql -d mobile_care -f database/schema.sql
npm run seed
npm start
```

For Windows PowerShell:

```powershell
npm install
createdb mobile_care
psql -d mobile_care -f .\database\schema.sql
npm run seed
npm start
```

### Option B: Docker PostgreSQL

This project includes a ready-to-use PostgreSQL container.

```bash
docker compose up -d postgres
npm install
npm run seed
npm start
```

The Docker setup uses:

- Host: `localhost`
- Port: `5432`
- Database: `mobile_care`
- User: `postgres`
- Password: `postgres`

Then open:

- http://localhost:5000/
- http://localhost:5000/admin-login.html

## Default Admin Login

- Email: `admin@mobilecare.com`
- Username: `admin`
- Password: `admin123`

## API Endpoints

### Admin

- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `GET /api/admin/customers`
- `POST /api/admin/customers`
- `PUT /api/admin/customers/:id`
- `DELETE /api/admin/customers/:id`
- `GET /api/admin/repairs`
- `POST /api/admin/repairs`
- `PUT /api/admin/repairs/:id`
- `GET /api/admin/inventory`
- `POST /api/admin/inventory`
- `GET /api/admin/sales`
- `POST /api/admin/sales`
- `GET /api/admin/warranties`
- `GET /api/admin/reports`

### Public

- `POST /api/public/track`
- `GET /api/public/invoice/:jobId`
- `POST /api/public/contact`

## Notes

- The system masks IMEI values publicly for privacy.
- The Job ID pattern is `MRYYYYNNNNN`.
- Email notifications are sent using environment values from `.env`.
- The frontend is connected to the same REST API used by the backend.

## Production Considerations

- Use strong database credentials.
- Store encrypted environment secrets in a secure secret manager.
- Configure a real SMTP provider for production email delivery.
- Add HTTPS in production and restrict admin access.
