const express = require('express');
const crypto = require('crypto');
const https = require('https');
const { pool } = require('../config/db');
const {
  sendEmail,
  sendOrderConfirmationEmail
} = require('../config/email');

const router = express.Router();
const statusSequence = [
  'Repair Request Received',
  'Diagnosis in Progress',
  'Waiting for Spare Parts',
  'Repair in Progress',
  'Quality Testing',
  'Ready for Pickup',
  'Delivered',
];

function maskImei(imei) {
  if (!imei) return 'N/A';
  const clean = String(imei).replace(/\s+/g, '');
  if (clean.length <= 6) return `${'*'.repeat(clean.length)}`;
  const visibleStart = clean.slice(0, 4);
  const visibleEnd = clean.slice(-2);
  const maskedMiddle = '*'.repeat(Math.max(clean.length - 6, 3));
  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}

function getTimeline(status) {
  const index = statusSequence.indexOf(status);
  return statusSequence.map((item, idx) => ({
    step: item,
    active: idx <= index,
    current: idx === index,
  }));
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.post('/track', async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({
      message: 'Job ID is required.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT
          r.*,
          c.name AS customer_name,
          c.address AS customer_address
       FROM repairs r
       LEFT JOIN customers c
         ON c.id = r.customer_id
       WHERE LOWER(r.job_id) = LOWER($1)`,
      [String(jobId).trim()]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'No repair found for this Job ID.'
      });
    }

    const repair = result.rows[0];

    const warranty = await pool.query(
      `SELECT *
       FROM warranties
       WHERE repair_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [repair.id]
    );

    const data = {
      jobId: repair.job_id,
      customerName: repair.customer_name || 'Customer',
      mobileBrand: repair.mobile_brand,
      mobileModel: repair.mobile_model,
      imei: maskImei(repair.imei),
      problem: repair.problem_description,
      status: repair.status,
      expectedCompletionDate:
        repair.expected_completion_date,
      repairCost: repair.estimated_cost,
      warranty: warranty.rows[0] || null,
      timeline: getTimeline(repair.status)
    };

    res.json(data);

  } catch (error) {

    console.error('Tracking error:', error);

    res.status(500).json({
      message:
        'Unable to track repair at the moment.'
    });
  }
});
router.get('/invoice/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.*, c.name AS customer_name, c.address AS customer_address
       FROM repairs r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE LOWER(r.job_id) = LOWER($1)`,
      [jobId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    const repair = result.rows[0];
    const invoice = {
      shopName: process.env.SHOP_NAME || 'Mobile Care',
      shopAddress: process.env.SHOP_ADDRESS || '123 Tech Avenue',
      shopPhone: process.env.SHOP_PHONE || '+1 (555) 123-4567',
      customer: repair.customer_name,
      email: repair.email,
      jobId: repair.job_id,
      mobile: `${repair.mobile_brand} ${repair.mobile_model}`,
      problem: repair.problem_description,
      repairCost: Number(repair.estimated_cost || 0),
      laborCost: Number(repair.estimated_cost || 0),
      tax: 0,
      total: Number(repair.estimated_cost || 0),
      warranty: repair.warranty_period || 0,
      date: new Date(repair.created_at).toLocaleDateString(),
    };

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate invoice.' });
  }
});

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email and message are required.' });
  }

  try {
    await sendEmail({
      to: process.env.SHOP_EMAIL || 'hello@mobilecare.com',
      subject: `New contact message from ${name}`,
      text: `${message}\n\nFrom: ${name}\nEmail: ${email}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong> ${message}</p>`,
    });

    res.json({ message: 'Your message has been sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to send message right now.' });
  }
});

// ================= SHOP INFORMATION =================

router.get('/shop-info', async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                shop_name,
                address,
                contact_number,
                email,
                shop_timing,
                photo_url
             FROM shop_info
             ORDER BY id
             LIMIT 1`
        );

        if (result.rows.length === 0) {
            return res.json(null);
        }

        res.json(result.rows[0]);

    } catch (error) {

        console.error(
            'Public shop info error:',
            error
        );

        res.status(500).json({
            message: 'Failed to load shop information.'
        });

    }

});


// ================= ONLINE STORE =================

router.get('/store/products', async (req, res) => {
  try {
    const { search, category } = req.query;
    const values = [];
    const clauses = ['online_enabled = TRUE'];

    if (search) {
      values.push(`%${String(search).trim()}%`);
      clauses.push(`(product_name ILIKE $${values.length} OR brand ILIKE $${values.length} OR category ILIKE $${values.length})`);
    }
    if (category) {
      values.push(String(category).trim());
      clauses.push(`category = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT id, product_name, category, brand, model_compatibility, quantity,
              selling_price, image_url, instagram_url
       FROM inventory WHERE ${clauses.join(' AND ')}
       ORDER BY created_at DESC`, values
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Store products error:', error);
    res.status(500).json({ message: 'Unable to load products.' });
  }
});

router.get('/store/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, product_name, category, brand, model_compatibility, quantity,
              selling_price, image_url, instagram_url
       FROM inventory WHERE id = $1 AND online_enabled = TRUE`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load product.' });
  }
});


function razorpayRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return reject(new Error('Razorpay keys are not configured.'));

    const payload = body ? JSON.stringify(body) : '';
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const request = https.request({
      hostname: 'api.razorpay.com',
      path,
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data || '{}'); } catch { parsed = { raw: data }; }
        if (response.statusCode >= 200 && response.statusCode < 300) return resolve(parsed);
        const message = parsed?.error?.description || parsed?.message || 'Razorpay request failed.';
        reject(new Error(message));
      });
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function makeOrderNumber() {
  return `MC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

router.post('/store/create-order', async (req, res) => {
  const { customerName, customerPhone, customerEmail, deliveryAddress, items } = req.body;
  if (!customerName || !customerPhone || !customerEmail || !deliveryAddress || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Customer details, delivery address and at least one item are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = items.map(item => Number(item.productId)).filter(Number.isInteger);
    if (!ids.length || ids.length !== items.length) throw new Error('Invalid product selection.');

    const products = await client.query(
      `SELECT id, product_name, selling_price, quantity, online_enabled
       FROM inventory WHERE id = ANY($1::int[]) FOR UPDATE`, [ids]
    );
    const byId = new Map(products.rows.map(row => [Number(row.id), row]));

    let subtotal = 0;
    const normalizedItems = [];
    for (const item of items) {
      const product = byId.get(Number(item.productId));
      const qty = Number(item.quantity);
      if (!product || !product.online_enabled) throw new Error('One or more products are no longer available.');
      if (!Number.isInteger(qty) || qty < 1) throw new Error('Invalid product quantity.');
      if (qty > Number(product.quantity)) throw new Error(`${product.product_name} has only ${product.quantity} item(s) in stock.`);
      const unitPrice = Number(product.selling_price);
      const totalPrice = unitPrice * qty;
      subtotal += totalPrice;
      normalizedItems.push({ productId: product.id, productName: product.product_name, quantity: qty, unitPrice, totalPrice });
    }

    const orderNumber = makeOrderNumber();
    const orderResult = await client.query(
      `INSERT INTO online_orders
       (order_number, customer_name, customer_phone, customer_email, delivery_address, subtotal, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [orderNumber, String(customerName).trim(), String(customerPhone).trim(), String(customerEmail).trim(), String(deliveryAddress).trim(), subtotal]
    );
    const order = orderResult.rows[0];

    for (const item of normalizedItems) {
      await client.query(
        `INSERT INTO online_order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice]
      );
    }

    const razorpayOrder = await razorpayRequest('/v1/orders', 'POST', {
      amount: Math.round(subtotal * 100),
      currency: 'INR',
      receipt: orderNumber,
      notes: { mobile_care_order: orderNumber },
    });

    await client.query(
      `UPDATE online_orders SET razorpay_order_id = $1, updated_at = NOW() WHERE id = $2`,
      [razorpayOrder.id, order.id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      orderNumber,
      amount: subtotal,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      customer: { name: customerName, email: customerEmail, phone: customerPhone },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create online order error:', error);
    res.status(500).json({ message: error.message || 'Unable to create online order.' });
  } finally {
    client.release();
  }
});

router.post('/store/verify-payment', async (req, res) => {
  const { orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  if (!orderNumber || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Payment verification details are incomplete.' });
  }

  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const receivedSignature = Buffer.from(String(razorpaySignature));
  if (receivedSignature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), receivedSignature)) {
    return res.status(400).json({ message: 'Payment signature verification failed.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT * FROM online_orders WHERE order_number = $1 AND razorpay_order_id = $2 FOR UPDATE`,
      [orderNumber, razorpayOrderId]
    );
    if (!orderResult.rowCount) throw new Error('Order not found.');
    const order = orderResult.rows[0];
    if (order.payment_status === 'Paid') {
      await client.query('COMMIT');
      return res.json({ success: true, orderNumber, message: 'Payment already verified.' });
    }

    const items = await client.query(`SELECT * FROM online_order_items WHERE order_id = $1`, [order.id]);
    for (const item of items.rows) {
      const stock = await client.query(`SELECT quantity, product_name FROM inventory WHERE id = $1 FOR UPDATE`, [item.product_id]);
      if (!stock.rowCount || Number(stock.rows[0].quantity) < Number(item.quantity)) {
        throw new Error(`${item.product_name} is no longer available in the requested quantity.`);
      }
    }
    for (const item of items.rows) {
      await client.query(
        `UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    await client.query(
      `UPDATE online_orders
       SET payment_status = 'Paid', order_status = 'Confirmed', razorpay_payment_id = $1,
           razorpay_signature = $2, updated_at = NOW()
       WHERE id = $3`,
      [razorpayPaymentId, razorpaySignature, order.id]
    );

    await client.query('COMMIT');

// Send order confirmation email AFTER successful payment
try {
  await sendOrderConfirmationEmail({
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    orderNumber: order.order_number,
    items: items.rows,
    totalAmount: order.total_amount,
    deliveryAddress: order.delivery_address
  });
} catch (emailError) {
  console.error(
    'Order confirmation email failed:',
    emailError.message
  );
}

// Payment/order remains successful even if email fails
res.json({
  success: true,
  orderNumber,
  message: 'Payment verified and order confirmed.'
});
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment verification error:', error);
    res.status(500).json({ message: error.message || 'Payment verification failed.' });
  } finally {
    client.release();
  }
});

router.get('/store/orders/:orderNumber', async (req, res) => {
    const { phone } = req.query;

    if (!phone) {
        return res.status(400).json({
            message: 'Phone number is required.'
        });
    }

    try {
        const order = await pool.query(
            `SELECT
                order_number,
                customer_name,
                total_amount,
                payment_status,
                order_status,
                created_at
             FROM online_orders
             WHERE order_number = $1
               AND customer_phone = $2`,
            [
                req.params.orderNumber,
                String(phone).trim()
            ]
        );

        if (!order.rowCount) {
            return res.status(404).json({
                message: 'Order not found. Check your order number and phone number.'
            });
        }

        const items = await pool.query(
            `SELECT
                product_name,
                quantity,
                unit_price,
                total_price
             FROM online_order_items
             WHERE order_id = (
                SELECT id
                FROM online_orders
                WHERE order_number = $1
             )`,
            [req.params.orderNumber]
        );

        res.json({
            ...order.rows[0],
            items: items.rows
        });

    } catch (error) {
        console.error('Order tracking error:', error);

        res.status(500).json({
            message: 'Unable to track order.'
        });
    }
});

module.exports = router;
