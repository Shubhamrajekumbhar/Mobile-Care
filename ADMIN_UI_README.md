# Mobile Care Admin UI

This update adds a complete Admin Dashboard to the existing project.

Included:
- Dashboard
- Customers: add/edit/delete/search
- Repairs: create, search/filter, update status
- Sales: record accessory sales and reduce inventory
- Inventory: add and view stock
- Warranty Tracker: active/expiring/expired
- Responsive sidebar
- Existing JWT/PostgreSQL APIs are reused

Run:
1. Ensure PostgreSQL and the `mobile_care` database are running.
2. Start the server: `npm start`
3. Open: `http://localhost:5000/admin-login.html`
4. Log in using the admin account created by the existing seed script.

Note: Currency is currently shown as INR (₹). Email sending uses the existing backend email configuration.
