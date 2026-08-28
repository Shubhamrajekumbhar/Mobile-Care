# Mobile Care Online Store

This update adds an online accessories store to the existing Mobile Care repair system.

## 1. Database

Run the migration once in the existing `mobile_care` PostgreSQL database:

```sql
\i database/online_store.sql
```

Or copy/paste the contents of `database/online_store.sql` into psql.

## 2. Razorpay test keys

Add these to your local `.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

Use Razorpay **Test Mode** keys while developing. Never put `RAZORPAY_KEY_SECRET` in frontend JavaScript.

## 3. Start

```bash
npm install
npm start
```

Open:

- `http://localhost:5000/store.html` — customer store
- `http://localhost:5000/product.html?id=PRODUCT_ID` — direct product page for Instagram links
- `http://localhost:5000/order-track.html` — customer order tracking
- `http://localhost:5000/admin.html` — admin dashboard

## 4. Add products to the online store

In Admin → Inventory → Add/Edit Item:

- Product Image URL
- Instagram Post URL
- Show in Online Store

Only products with **Show in Online Store** enabled and stock greater than zero are visible to customers.

## 5. Payment flow

The backend creates a Razorpay order, the customer pays in Razorpay Checkout, and the backend verifies the Razorpay signature before marking the order as Paid and reducing stock.

COD is intentionally not implemented.
