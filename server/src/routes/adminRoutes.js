const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { sendEmail } = require('../config/email');
const { generateJobId } = require('../utils/jobId');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

const repairStatuses = [
  'Repair Request Received',
  'Diagnosis in Progress',
  'Waiting for Spare Parts',
  'Repair in Progress',
  'Quality Testing',
  'Ready for Pickup',
  'Delivered',
];

function buildStatusHistory(existingHistory, newStatus) {
  const history = Array.isArray(existingHistory) ? existingHistory : [];
  history.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
  });
  return history;
}

function getStatusMessage(status) {
  switch (status) {
    case 'Repair Request Received':
      return 'Your repair request has been received and is being reviewed.';
    case 'Diagnosis in Progress':
      return 'Our technician is diagnosing your device.';
    case 'Waiting for Spare Parts':
      return 'Your device is waiting for the required spare part.';
    case 'Repair in Progress':
      return 'The repair work is currently in progress.';
    case 'Quality Testing':
      return 'Your phone is under quality checks before final delivery.';
    case 'Ready for Pickup':
      return 'Your device is ready for pickup at our service center.';
    case 'Delivered':
      return 'Your repair has been delivered successfully.';
    default:
      return 'Your repair status has been updated.';
  }
}

async function sendRepairNotification({
  repair,
  status,
  customerName,
  email,
  jobId,
  model,
  technician,
  note
}) {

  // Send this notification ONLY for Ready for Pickup
  if (status !== 'Ready for Pickup') {
    return;
  }

  try {

    // Get current shop information
    const shopResult = await pool.query(
      `SELECT
        shop_name,
        address,
        contact_number,
        email,
        shop_timing
       FROM shop_info
       ORDER BY id
       LIMIT 1`
    );

    const shop = shopResult.rows[0] || {};

    const shopName =
      shop.shop_name || 'Mobile Care';

    const shopAddress =
      shop.address || '';

    const shopContact =
      shop.contact_number || '';

    const shopEmail =
      shop.email || '';

    const shopTiming =
      shop.shop_timing || '';

   const trackingUrl =
  `${process.env.SITE_URL}/track-repair.html?jobId=${encodeURIComponent(jobId)}`;

    const bodyText = `
Hello ${customerName},

Your mobile repair has been completed and is Ready for Pickup.

Job ID: ${jobId}
Mobile: ${model}
Status: Ready for Pickup
Technician: ${technician || 'Assigned team'}

Track your repair:
${trackingUrl}

${note || ''}

Thank you for choosing ${shopName}.

${shopName}
${shopAddress}
Phone: ${shopContact}
Email: ${shopEmail}
Opening Hours: ${shopTiming}
`;

    const html = `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        padding: 25px;
        background: #f6f9ff;
        border: 1px solid #dbe8ff;
        border-radius: 12px;
      ">

        <h2 style="
          color: #1769e0;
          margin-bottom: 15px;
        ">
          ${shopName}
        </h2>

        <h3>
          Your mobile is ready for pickup! 🎉
        </h3>

        <p>
          Hello <b>${customerName}</b>,
        </p>

        <p>
          Your mobile repair has been completed
          and is now <b>Ready for Pickup</b>.
        </p>

        <div style="
          background: #ffffff;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        ">
          <p><b>Job ID:</b> ${jobId}</p>
          <p><b>Mobile:</b> ${model}</p>
          <p><b>Status:</b> Ready for Pickup</p>
          <p>
            <b>Technician:</b>
            ${technician || 'Assigned team'}
          </p>
        </div>

        ${
          note
            ? `<p><b>Note:</b> ${note}</p>`
            : ''
        }

        <br>

        <a
          href="${trackingUrl}"
          style="
            display: inline-block;
            background: linear-gradient(135deg, #0052ff, #4d7cff);
            color: white;
            padding: 13px 24px;
            text-decoration: none;
            border-radius: 7px;
            font-weight: bold;
          "
        >
          Track Your Repair
        </a>

        <br><br>

        <p>
          Click the button above to view your repair status.
        </p>

        <p>
          Thank you for choosing <b>${shopName}</b>.
        </p>

        <hr style="
          border: 0;
          border-top: 1px solid #e2e8f0;
          margin: 25px 0;
        ">

        <div style="
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        ">

          <strong style="color:#0f172a;">
            ${shopName}
          </strong>
          <br>

          ${shopAddress}
          <br>

          📞 ${shopContact}
          <br>

          ✉ ${shopEmail}
          <br>

          🕐 ${shopTiming}

        </div>

      </div>
    `;

    await sendEmail({
      to: email,
      subject: `${shopName} - Your Mobile is Ready for Pickup - Job ID ${jobId}`,
      text: bodyText,
      html: html,
      repairId: repair.id
    });

    console.log(
      `Ready for Pickup email sent to ${email}`
    );

  } catch (error) {

    console.error(
      'Ready for Pickup email error:',
      error
    );

  }
}

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email/username and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)',
      [identifier]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

  if (!isMatch) {
  return res.status(401).json({
    message: 'Invalid credentials.'
  });
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not configured.');

  return res.status(500).json({
    message: 'Server authentication is not configured.'
  });
}

const token = jwt.sign(
  {
    id: admin.id,
    username: admin.username,
    email: admin.email
  },
  process.env.JWT_SECRET,
  {
    expiresIn: '8h'
  }
);

res.json({
  token,
  admin: {
    id: admin.id,
    name: admin.name,
    username: admin.username,
    email: admin.email
  }
});
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const totalRepairs = await pool.query('SELECT COUNT(*) AS total FROM repairs');
    const inProgress = await pool.query(
      `SELECT COUNT(*) AS total FROM repairs
       WHERE status NOT IN ('Ready for Pickup', 'Delivered')`
    );
    const completed = await pool.query(
      `SELECT COUNT(*) AS total FROM repairs WHERE status IN ('Ready for Pickup', 'Delivered')`
    );
    const readyPickup = await pool.query(
      `SELECT COUNT(*) AS total FROM repairs WHERE status = 'Ready for Pickup'`
    );
   const onlineSaleRevenue = await pool.query(
  `SELECT COALESCE(SUM(total_amount), 0) AS total
   FROM online_orders
   WHERE payment_status = 'Paid'`
);
    const todaySales = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM sales
       WHERE sale_date::date = CURRENT_DATE`
    );
    const monthlyRevenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM sales
       WHERE sale_date >= date_trunc('month', CURRENT_DATE)`
    );
    const lowStock = await pool.query(
      `SELECT * FROM inventory WHERE quantity <= minimum_stock_level ORDER BY quantity ASC LIMIT 10`
    );
    const repairStatusCounts = await pool.query(
      `SELECT status, COUNT(*) AS count FROM repairs GROUP BY status ORDER BY count DESC`
    );
    const salesTrend = await pool.query(
      `SELECT to_char(sale_date::date, 'YYYY-MM-DD') AS day,
              COALESCE(SUM(total_amount), 0) AS total
       FROM sales
       WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY to_char(sale_date::date, 'YYYY-MM-DD')
       ORDER BY day ASC`
    );
    const recentRepairs = await pool.query(
      `SELECT r.*, c.name AS customer_name
       FROM repairs r
       LEFT JOIN customers c ON c.id = r.customer_id
       ORDER BY r.created_at DESC
       LIMIT 6`
    );

    res.json({
      totals: {
        totalRepairs: Number(totalRepairs.rows[0].total || 0),
        inProgress: Number(inProgress.rows[0].total || 0),
        completed: Number(completed.rows[0].total || 0),
        readyForPickup: Number(readyPickup.rows[0].total || 0),
        onlineSaleRevenue: Number(onlineSaleRevenue.rows[0].total || 0),
        todaysSales: Number(todaySales.rows[0].total || 0),
        monthlyRevenue: Number(monthlyRevenue.rows[0].total || 0),
      },
      lowStock: lowStock.rows,
      repairStatusCounts: repairStatusCounts.rows,
      salesTrend: salesTrend.rows,
      recentRepairs: recentRepairs.rows,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
});

router.get('/customers', authenticateAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM customers ORDER BY created_at DESC';
    const values = [];

    if (search) {
      query = 'SELECT * FROM customers WHERE LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1) OR phone LIKE $1 ORDER BY created_at DESC';
      values.push(`%${search}%`);
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers.' });
  }
});

router.post('/customers', authenticateAdmin, async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name || !phone ) {
    return res.status(400).json({ message: 'Name, phone and email are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO customers (name, phone, email, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
       [name, phone, email || '', address || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create customer record.' });
  }
});

router.put('/customers/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;

  try {
    const result = await pool.query(
      `UPDATE customers
       SET name = $1, phone = $2, email = $3, address = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, phone, email, address || '', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update customer.' });
  }
});

router.delete('/customers/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    res.json({ message: 'Customer deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete customer.' });
  }
});

router.get('/repairs', authenticateAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT r.*, COALESCE(r.customer_name, c.name) AS customer_name
             FROM repairs r
             LEFT JOIN customers c ON c.id = r.customer_id`;
    const clauses = [];
    const values = [];

    if (search) {
      clauses.push(`(LOWER(r.customer_name) LIKE LOWER($${values.length + 1}) OR LOWER(r.email) LIKE LOWER($${values.length + 1}) OR LOWER(r.mobile_model) LIKE LOWER($${values.length + 1}) OR r.job_id LIKE $${values.length + 1})`);
      values.push(`%${search}%`);
    }

    if (status) {
      clauses.push(`r.status = $${values.length + 1}`);
      values.push(status);
    }

    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ');
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Repairs fetch error:', error);
    res.status(500).json({ message: 'Error loading repairs.' });
  }
});
router.post('/repairs', authenticateAdmin, async (req, res) => {
  const payload = req.body;

  const required = [
    'customerId',
    'mobileBrand',
    'mobileModel',
    'imei',
    'problemDescription'
  ];

  const missing = required.find((field) => !payload[field]);

  if (missing) {
    return res.status(400).json({
      message: `${missing} is required.`
    });
  }

  try {
    // Get the exact customer selected in the Repair form
    const customerId = Number(payload.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: 'Invalid customer selected.'
      });
    }

    const customerResult = await pool.query(
      `SELECT *
       FROM customers
       WHERE id = $1`,
      [customerId]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({
        message: 'Selected customer was not found.'
      });
    }

    const customer = customerResult.rows[0];

    // Use the selected customer's details
    const customerName = customer.name;
    const email = String(customer.email || '').trim();
    const phone = String(customer.phone || '').trim();

    const mobileBrand = payload.mobileBrand;
    const mobileModel = payload.mobileModel;
    const imei = payload.imei;
    const problemDescription = payload.problemDescription;

    const estimatedCost =
      Number(payload.estimatedCost || 0);

    const assignedTechnician =
      payload.assignedTechnician || 'Unassigned';

    const expectedCompletionDate =
      payload.expectedCompletionDate || null;

    const partsUsed =
      payload.partsUsed || '';

    const warrantyPeriod =
    Number(payload.warrantyPeriod || 0);

if (
    warrantyPeriod !== 0 &&
    warrantyPeriod !== 3
) {
    return res.status(400).json({
        message: 'Repair warranty can only be 0 or 3 months.'
    });
}

    const jobId = await generateJobId();

    const status = 'Repair Request Received';

    const statusHistory = JSON.stringify([
      {
        status,
        timestamp: new Date().toISOString()
      }
    ]);


    const repairResult = await pool.query(
      `INSERT INTO repairs (
        job_id, customer_id, customer_name, email, phone, mobile_brand, mobile_model, imei,
        problem_description, estimated_cost, assigned_technician, expected_completion_date,
        parts_used, warranty_period, status, status_history
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
       RETURNING *`,
      [
        jobId,
        customerResult.rows[0].id,
        customerName,
        email,
        phone,
        mobileBrand,
        mobileModel,
        imei,
        problemDescription,
        estimatedCost,
        assignedTechnician,
        expectedCompletionDate,
        partsUsed,
        warrantyPeriod,
        status,
        statusHistory,
      ]
    );

    const repair = repairResult.rows[0];

    if (payload.partsUsed && payload.partsUsed.length > 0) {
      const partNames = payload.partsUsed.split(',').map((item) => item.trim()).filter(Boolean);
      for (const part of partNames) {
        await pool.query(
          `INSERT INTO repair_parts (repair_id, part_name, quantity, unit_price) VALUES ($1, $2, 1, 0)`,
          [repair.id, part]
        );
      }
    }

    const trackingUrl =
  `${process.env.SITE_URL}/track-repair.html?jobId=${encodeURIComponent(jobId)}`;
const shopResult = await pool.query(
  `SELECT
    shop_name,
    address,
    contact_number,
    email,
    shop_timing
   FROM shop_info
   ORDER BY id
   LIMIT 1`
);

const shop = shopResult.rows[0] || {};

const shopName = shop.shop_name || 'Mobile Care';
const shopAddress = shop.address || '';
const shopContact = shop.contact_number || '';
const shopEmail = shop.email || '';
const shopTiming = shop.shop_timing || '';

try {
  await sendEmail({
    to: email,

    subject: `${shopName} - Repair Request Registered - ${jobId}`,

    text: `
Hi ${customerName},

Your repair request has been successfully registered.

Job ID: ${jobId}
Mobile: ${mobileBrand} ${mobileModel}
IMEI: ${imei}
Status: Repair Request Received

We will keep you updated about your repair.

Thank you for choosing ${shopName}.

${shopName}
${shopAddress}
Phone: ${shopContact}
Email: ${shopEmail}
Opening Hours: ${shopTiming}
`,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        padding: 25px;
        background: #f6f9ff;
        border: 1px solid #dbe8ff;
        border-radius: 12px;
      ">

        <h2 style="color:#1769e0;">
          ${shopName}
        </h2>

        <h3>
          Repair Request Registered ✅
        </h3>

        <p>
          Hi <b>${customerName}</b>,
        </p>

        <p>
          Your repair request has been successfully registered.
        </p>

        <div style="
          background:#ffffff;
          padding:15px;
          border-radius:8px;
          border:1px solid #e2e8f0;
        ">

          <p><b>Job ID:</b> ${jobId}</p>
          <p><b>Mobile:</b> ${mobileBrand} ${mobileModel}</p>
          <p><b>IMEI:</b> ${imei}</p>
          <p><b>Status:</b> Repair Request Received</p>

        </div>

        <p>
          We will keep you updated about your repair.
        </p>

        <hr style="
          border:0;
          border-top:1px solid #e2e8f0;
          margin:25px 0;
        ">

        <div style="
          color:#64748b;
          font-size:13px;
          line-height:1.7;
        ">

          <strong style="color:#0f172a;">
            ${shopName}
          </strong>
          <br>

          ${shopAddress}
          <br>

          📞 ${shopContact}
          <br>

          ✉ ${shopEmail}
          <br>

          🕐 ${shopTiming}

        </div>

      </div>

      <p style="text-align:center; margin:25px 0;">
        <a
          href="${trackingUrl}"
          style="
            display:inline-block;
            padding:13px 24px;
            background:#1769e0;
            color:#ffffff;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
          "
        >
          Track My Repair
        </a>
      </p>
    `,

    repairId: repair.id,
  });

  console.log(`✅ Repair registration email sent to ${email}`);

} catch (emailError) {
  console.error(
    '❌ Repair registration email failed:',
    emailError.message
  );
}

// IMPORTANT: repair creation succeeds even if email fails
res.status(201).json(repair);

} catch (error) {
  console.error('Repair creation error:', error);
  res.status(500).json({
    message: 'Failed to create repair record.'
  });
}
});
router.put('/repairs/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  const {
    status,
    assignedTechnician,
    expectedCompletionDate,
    warrantyPeriod
  } = req.body;

  try {
    const existing = await pool.query(
      'SELECT * FROM repairs WHERE id = $1',
      [id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({
        message: 'Repair not found.'
      });
    }

    const currentRepair = existing.rows[0];

    const nextStatus =
      status ?? currentRepair.status;

    const nextWarrantyPeriod =
      warrantyPeriod !== undefined
        ? Number(warrantyPeriod)
        : Number(currentRepair.warranty_period || 0);

    if (
      nextWarrantyPeriod !== 0 &&
      nextWarrantyPeriod !== 3
    ) {
      return res.status(400).json({
        message: 'Warranty can only be 0 or 3 months.'
      });
    }

    const nextHistory =
      buildStatusHistory(
        currentRepair.status_history || [],
        nextStatus
      );

    const result = await pool.query(
      `UPDATE repairs
       SET status = $1,
           assigned_technician = $2,
           expected_completion_date = $3,
           warranty_period = $4,
           status_history = $5::jsonb,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        nextStatus,
        assignedTechnician ??
          currentRepair.assigned_technician,
        expectedCompletionDate ??
          currentRepair.expected_completion_date,
        nextWarrantyPeriod,
        JSON.stringify(nextHistory),
        id
      ]
    );

    const updatedRepair = result.rows[0];

    /* =========================================
       WARRANTY
    ========================================= */

    if (nextWarrantyPeriod === 3) {

      const warrantyStart = new Date();

      const warrantyEnd = new Date(
        warrantyStart
      );

      warrantyEnd.setMonth(
        warrantyEnd.getMonth() + 3
      );

      await pool.query(
        `INSERT INTO warranties (
            repair_id,
            customer_id,
            warranty_start_date,
            warranty_end_date,
            duration_days,
            covered_parts,
            status
         )
         VALUES (
            $1, $2, $3, $4, $5, $6, 'Active'
         )
         ON CONFLICT (repair_id)
         DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            warranty_start_date =
              EXCLUDED.warranty_start_date,
            warranty_end_date =
              EXCLUDED.warranty_end_date,
            duration_days =
              EXCLUDED.duration_days,
            covered_parts =
              EXCLUDED.covered_parts,
            status = 'Active',
            updated_at = NOW()`,
        [
          updatedRepair.id,
          updatedRepair.customer_id,
          warrantyStart,
          warrantyEnd,
          90,
          'battery replacement,battery'
        ]
      );

    } else {

      // No Warranty selected → remove warranty record
      await pool.query(
        `DELETE FROM warranties
         WHERE repair_id = $1`,
        [updatedRepair.id]
      );
    }

    /* =========================================
       DELIVERED
    ========================================= */

    if (nextStatus === 'Delivered') {

      await pool.query(
        `UPDATE warranties
         SET status = 'Expired',
             updated_at = NOW()
         WHERE repair_id = $1`,
        [updatedRepair.id]
      );
    }

    /* =========================================
       EMAIL
    ========================================= */

    await sendRepairNotification({
      repair: updatedRepair,
      status: nextStatus,
      customerName: updatedRepair.customer_name,
      email: updatedRepair.email,
      jobId: updatedRepair.job_id,
      model:
        `${updatedRepair.mobile_brand} ${updatedRepair.mobile_model}`,
      technician:
        updatedRepair.assigned_technician,
      note:
        nextStatus === 'Ready for Pickup'
          ? `Please collect your device from ${
              process.env.SHOP_ADDRESS ||
              'our service center'
            }.`
          : ''
    });

    res.json(updatedRepair);

  } catch (error) {

    console.error(
      'Repair update error:',
      error
    );

    res.status(500).json({
      message: 'Failed to update repair status.'
    });
  }
});
// DELETE REPAIR
router.delete('/repairs/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('BEGIN');

    // Delete related repair parts first
    await pool.query(
      'DELETE FROM repair_parts WHERE repair_id = $1',
      [id]
    );

    // Delete related warranty records
    await pool.query(
      'DELETE FROM warranties WHERE repair_id = $1',
      [id]
    );

    // Delete the repair
    const result = await pool.query(
      'DELETE FROM repairs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        message: 'Repair not found.'
      });
    }

    await pool.query('COMMIT');

    res.json({
      message: 'Repair deleted successfully.'
    });

  } catch (error) {
    await pool.query('ROLLBACK');

    console.error('Delete repair error:', error);

    res.status(500).json({
      message: 'Failed to delete repair.'
    });
  }
});

router.get('/inventory', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY quantity ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory.' });
  }
});
// ================= PUBLIC STOCK AVAILABILITY =================

router.get('/products/availability', async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT
                id,
                product_name,
                category,
                brand,
                model_compatibility,
                quantity,
                selling_price
            FROM inventory
            ORDER BY product_name ASC
        `);

        res.json(result.rows);

    } catch (error) {

        console.error(
            'Stock availability error:',
            error
        );

        res.status(500).json({
            message: 'Failed to load product availability.'
        });

    }
});
router.post('/inventory', authenticateAdmin, async (req, res) => {
  const { productName, category, brand, modelCompatibility, quantity, purchasePrice, sellingPrice, minimumStockLevel, imageUrl, instagramUrl, onlineEnabled } = req.body;
  if (!productName || !category) {
    return res.status(400).json({ message: 'Product name and category are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inventory (product_name, category, brand, model_compatibility, quantity, purchase_price, selling_price, minimum_stock_level, image_url, instagram_url, online_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [productName, category, brand || '', modelCompatibility || '', Number(quantity || 0), Number(purchasePrice || 0), Number(sellingPrice || 0), Number(minimumStockLevel || 5), imageUrl || '', instagramUrl || '', Boolean(onlineEnabled)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add inventory item.' });
  }
});
// UPDATE INVENTORY
router.put('/inventory/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  const {
    productName,
    category,
    brand,
    modelCompatibility,
    quantity,
    purchasePrice,
    sellingPrice,
    minimumStockLevel,
    imageUrl,
    instagramUrl,
    onlineEnabled
  } = req.body;

  if (!productName || !category) {
    return res.status(400).json({
      message: 'Product name and category are required.'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE inventory
       SET
         product_name = $1,
         category = $2,
         brand = $3,
         model_compatibility = $4,
         quantity = $5,
         purchase_price = $6,
         selling_price = $7,
         minimum_stock_level = $8,
         image_url = $9,
         instagram_url = $10,
         online_enabled = $11,
         updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        productName,
        category,
        brand || '',
        modelCompatibility || '',
        Number(quantity || 0),
        Number(purchasePrice || 0),
        Number(sellingPrice || 0),
        Number(minimumStockLevel || 5),
        imageUrl || '',
        instagramUrl || '',
        Boolean(onlineEnabled),
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Inventory item not found.'
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update inventory error:', error);

    res.status(500).json({
      message: 'Failed to update inventory item.'
    });
  }
});
// DELETE INVENTORY
router.delete('/inventory/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM inventory WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Inventory item not found.'
      });
    }

    res.json({
      message: 'Inventory item deleted successfully.'
    });

  } catch (error) {
    console.error('Delete inventory error:', error);

    res.status(500).json({
      message: 'Failed to delete inventory item.'
    });
  }
});

router.get('/sales', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.name AS customer_name
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.sale_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales.' });
  }
});

router.post('/sales', authenticateAdmin, async (req, res) => {

  const {
    customerId,
    customerName,
    items,
    discount = 0,
    warrantyMonths = 0,
    paymentMethod = 'Cash'
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({
      message: 'At least one item is required for a sale.'
    });
  }

  const warrantyDuration = Number(warrantyMonths || 0);

  if (
    warrantyDuration !== 0 &&
    warrantyDuration !== 3 &&
    warrantyDuration !== 6
  ) {
    return res.status(400).json({
      message: 'Warranty can only be 0, 3 or 6 months.'
    });
  }

  try {

    /* =========================================
       GET CUSTOMER
    ========================================= */

    let customer = null;

    if (customerId) {

      const customerResult = await pool.query(
        `SELECT id, name, phone, email, address
         FROM customers
         WHERE id = $1`,
        [customerId]
      );

      if (customerResult.rowCount === 0) {
        return res.status(404).json({
          message: 'Selected customer was not found.'
        });
      }

      customer = customerResult.rows[0];

    }

    const customerEmail =
      String(customer?.email || '').trim();

    const finalCustomerName =
      customer?.name ||
      customerName ||
      'Customer';


    /* =========================================
       WARRANTY EMAIL VALIDATION
    ========================================= */

    if (
      (warrantyDuration === 3 ||
       warrantyDuration === 6) &&
      !customerEmail
    ) {
      return res.status(400).json({
        message:
          'Customer email is required for warranty products.'
      });
    }


    /* =========================================
       CALCULATE TOTAL
    ========================================= */

    const subtotal = items.reduce(
      (sum, item) =>
        sum + Number(item.totalPrice || 0),
      0
    );

    const discountAmount =
      Number(discount || 0);

    const saleTotal =
      Math.max(
        0,
        subtotal - discountAmount
      );


    /* =========================================
       CREATE SALE
    ========================================= */

    const saleResult = await pool.query(
      `INSERT INTO sales
       (
         customer_id,
         customer_name,
         total_amount,
         discount,
         payment_method,
         sale_date
       )
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        customerId || null,
        finalCustomerName,
        saleTotal,
        discountAmount,
        paymentMethod
      ]
    );

    const sale = saleResult.rows[0];


    /* =========================================
       CREATE WARRANTY
    ========================================= */

    let warranty = null;

    if (
      warrantyDuration === 3 ||
      warrantyDuration === 6
    ) {

      const warrantyStart =
        new Date();

      const warrantyEnd =
        new Date(warrantyStart);

      warrantyEnd.setMonth(
        warrantyEnd.getMonth() +
        warrantyDuration
      );

      const warrantyResult =
        await pool.query(
          `INSERT INTO warranties
           (
             sale_id,
             customer_id,
             warranty_start_date,
             warranty_end_date,
             duration_days,
             status
           )
           VALUES ($1, $2, $3, $4, $5, 'Active')
           RETURNING *`,
          [
            sale.id,
            customerId || null,
            warrantyStart,
            warrantyEnd,
            warrantyDuration * 30
          ]
        );

      warranty =
        warrantyResult.rows[0];
    }


    /* =========================================
       SALE ITEMS + STOCK UPDATE
    ========================================= */

    for (const item of items) {

      await pool.query(
        `INSERT INTO sale_items
         (
           sale_id,
           product_id,
           product_name,
           quantity,
           unit_price,
           total_price
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          sale.id,
          item.productId || null,
          item.productName,
          Number(item.quantity || 0),
          Number(item.unitPrice || 0),
          Number(item.totalPrice || 0)
        ]
      );


      await pool.query(
        `UPDATE inventory
         SET quantity = quantity - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [
          Number(item.quantity || 0),
          item.productId
        ]
      );

    }


    /* =========================================
       SEND WARRANTY INVOICE EMAIL
       ONLY FOR WARRANTY SALES
    ========================================= */

    if (
      warranty &&
      customerEmail
    ) {

      try {

        /* -----------------------------------------
           SHOP INFO
        ----------------------------------------- */

        const shopResult =
          await pool.query(
            `SELECT
               shop_name,
               address,
               contact_number,
               email,
               shop_timing
             FROM shop_info
             ORDER BY id
             LIMIT 1`
          );

        const shop =
          shopResult.rows[0] || {};

        const shopName =
          shop.shop_name ||
          'Mobile Care';

        const shopAddress =
          shop.address || '';

        const shopContact =
          shop.contact_number || '';

        const shopEmail =
          shop.email || '';

        const shopTiming =
          shop.shop_timing || '';


        /* -----------------------------------------
           FORMAT ITEMS
        ----------------------------------------- */

        const itemRows =
          items.map(item => {

            const quantity =
              Number(item.quantity || 0);

            const unitPrice =
              Number(item.unitPrice || 0);

            const totalPrice =
              Number(item.totalPrice || 0);

            return `
              <tr>
                <td style="
                  padding:12px;
                  border-bottom:1px solid #e5e7eb;
                ">
                  ${item.productName || 'Product'}
                </td>

                <td style="
                  padding:12px;
                  text-align:center;
                  border-bottom:1px solid #e5e7eb;
                ">
                  ${quantity}
                </td>

                <td style="
                  padding:12px;
                  text-align:right;
                  border-bottom:1px solid #e5e7eb;
                ">
                  ₹${unitPrice.toFixed(2)}
                </td>

                <td style="
                  padding:12px;
                  text-align:right;
                  border-bottom:1px solid #e5e7eb;
                ">
                  ₹${totalPrice.toFixed(2)}
                </td>
              </tr>
            `;
          }).join('');


        /* -----------------------------------------
           WARRANTY DATES
        ----------------------------------------- */

        const warrantyStart =
          new Date(
            warranty.warranty_start_date
          );

        const warrantyEnd =
          new Date(
            warranty.warranty_end_date
          );

        const formatDate =
          date =>
            date.toLocaleDateString(
              'en-IN',
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }
            );


        const invoiceNumber =
          `SALE-${sale.id}`;


        /* -----------------------------------------
           EMAIL
        ----------------------------------------- */

        await sendEmail({

          to: customerEmail,

          subject:
            `${shopName} - Invoice ${invoiceNumber} & Warranty Details`,

          text: `
${shopName}

Hello ${finalCustomerName},

Thank you for your purchase.

INVOICE
--------------------------------
Invoice Number: ${invoiceNumber}
Sale Date: ${new Date(
  sale.sale_date
).toLocaleDateString('en-IN')}

${items.map(item =>
`${item.productName}
Quantity: ${Number(item.quantity || 0)}
Unit Price: ₹${Number(item.unitPrice || 0).toFixed(2)}
Total: ₹${Number(item.totalPrice || 0).toFixed(2)}
`
).join('\n')}

Subtotal: ₹${subtotal.toFixed(2)}
Discount: ₹${discountAmount.toFixed(2)}
Grand Total: ₹${saleTotal.toFixed(2)}
Payment Method: ${paymentMethod}

WARRANTY
--------------------------------
Duration: ${warrantyDuration} months
Warranty Start: ${formatDate(warrantyStart)}
Warranty End: ${formatDate(warrantyEnd)}
Status: Active

Thank you for choosing ${shopName}.

${shopName}
${shopAddress}
Phone: ${shopContact}
Email: ${shopEmail}
Opening Hours: ${shopTiming}
`,

          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>

<body style="
  margin:0;
  padding:0;
  background:#f3f7fc;
  font-family:Arial,Helvetica,sans-serif;
  color:#0f172a;
">

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="padding:30px 10px;">

<tr>
<td align="center">

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="
         max-width:650px;
         background:#ffffff;
         border-radius:16px;
         overflow:hidden;
         border:1px solid #e2e8f0;
       ">

<!-- HEADER -->

<tr>
<td style="
  background:#1769e0;
  color:#ffffff;
  padding:25px;
  text-align:center;
">

<h2 style="margin:0;">
  ${shopName}
</h2>

<p style="
  margin:8px 0 0;
  color:#dbeafe;
">
  Invoice & Warranty Details
</p>

</td>
</tr>


<!-- CONTENT -->

<tr>
<td style="padding:30px;">

<h2>
  Thank you for your purchase! 🎉
</h2>

<p>
  Hello <strong>${finalCustomerName}</strong>,
</p>

<p style="color:#64748b;">
  Here are your purchase and warranty details.
</p>


<!-- INVOICE -->

<div style="
  margin-top:25px;
  padding:20px;
  background:#f8fbff;
  border:1px solid #dbe7f5;
  border-radius:12px;
">

<h3 style="
  margin-top:0;
  color:#1769e0;
">
  Invoice
</h3>

<p>
  <strong>Invoice Number:</strong>
  ${invoiceNumber}
</p>

<p>
  <strong>Date:</strong>
  ${new Date(
    sale.sale_date
  ).toLocaleDateString('en-IN')}
</p>

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="
         border-collapse:collapse;
         margin-top:15px;
       ">

<thead>

<tr style="
  background:#eef5ff;
">

<th style="
  padding:12px;
  text-align:left;
">
  Product
</th>

<th style="
  padding:12px;
  text-align:center;
">
  Qty
</th>

<th style="
  padding:12px;
  text-align:right;
">
  Price
</th>

<th style="
  padding:12px;
  text-align:right;
">
  Total
</th>

</tr>

</thead>

<tbody>

${itemRows}

</tbody>

</table>


<div style="
  margin-top:20px;
  text-align:right;
  line-height:1.8;
">

<div>
  Subtotal:
  <strong>
    ₹${subtotal.toFixed(2)}
  </strong>
</div>

<div>
  Discount:
  <strong>
    ₹${discountAmount.toFixed(2)}
  </strong>
</div>

<div style="
  font-size:18px;
  color:#1769e0;
">

Grand Total:
<strong>
  ₹${saleTotal.toFixed(2)}
</strong>

</div>

<div>
  Payment:
  <strong>
    ${paymentMethod}
  </strong>
</div>

</div>

</div>


<!-- WARRANTY -->

<div style="
  margin-top:20px;
  padding:20px;
  background:#f0fdf4;
  border:1px solid #bbf7d0;
  border-radius:12px;
">

<h3 style="
  margin-top:0;
  color:#15803d;
">
  Warranty Details 🛡️
</h3>

<p>
  <strong>Duration:</strong>
  ${warrantyDuration} months
</p>

<p>
  <strong>Start Date:</strong>
  ${formatDate(warrantyStart)}
</p>

<p>
  <strong>End Date:</strong>
  ${formatDate(warrantyEnd)}
</p>

<p>
  <strong>Status:</strong>
  Active
</p>

</div>


<p style="
  margin-top:25px;
  color:#64748b;
">

Please keep this email for your records
and warranty reference.

</p>

</td>
</tr>


<!-- FOOTER -->

<tr>
<td style="
  background:#f8fafc;
  padding:22px;
  text-align:center;
  color:#64748b;
  font-size:12px;
">

<strong style="color:#1769e0;">
  ${shopName}
</strong>

<br><br>

${shopAddress}

<br>

📞 ${shopContact}

<br>

✉ ${shopEmail}

<br>

🕐 ${shopTiming}

<br><br>

Thank you for choosing ${shopName} ❤️

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>
`

        });

        console.log(
          `Warranty invoice email sent to ${customerEmail}`
        );

      } catch (emailError) {

        console.error(
          'Warranty invoice email failed:',
          emailError
        );

        // IMPORTANT:
        // Sale remains successful even if email fails.
      }
    }


    /* =========================================
       RETURN SALE
    ========================================= */

    res.status(201).json({
      ...sale,
      warranty
    });


  } catch (error) {

    console.error(
      'Sale creation error:',
      error
    );

    res.status(500).json({
      message:
        'Failed to create sale record.'
    });

  }

});
router.delete('/sales/:id', authenticateAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    const saleId = Number(req.params.id);

    if (!Number.isInteger(saleId) || saleId <= 0) {
      return res.status(400).json({
        message: 'Invalid sale ID.'
      });
    }

    await client.query('BEGIN');

    // Get sold items so their quantities can be returned to inventory
    const itemsResult = await client.query(
      `SELECT product_id, quantity
       FROM sale_items
       WHERE sale_id = $1`,
      [saleId]
    );

    // Check that the sale exists
    const saleResult = await client.query(
      `SELECT id
       FROM sales
       WHERE id = $1`,
      [saleId]
    );

    if (saleResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Sale not found.'
      });
    }

    // Return sold quantities to inventory
    for (const item of itemsResult.rows) {
      if (item.product_id) {
        await client.query(
          `UPDATE inventory
           SET quantity = quantity + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }
    }

    // Delete the sale
    // sale_items and warranties are configured with ON DELETE CASCADE
    await client.query(
      `DELETE FROM sales
       WHERE id = $1`,
      [saleId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Sale deleted successfully.'
    });

  } catch (error) {

    await client.query('ROLLBACK');

    console.error('Delete sale error:', error);

    res.status(500).json({
      message: 'Failed to delete sale.'
    });

  } finally {
    client.release();
  }
});

router.get('/online-orders', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, COALESCE(json_agg(json_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'quantity', i.quantity,
        'unitPrice', i.unit_price,
        'totalPrice', i.total_price
      ) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
      FROM online_orders o
      LEFT JOIN online_order_items i ON i.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Online orders fetch error:', error);
    res.status(500).json({ message: 'Failed to load online orders.' });
  }
});

router.put('/online-orders/:id/status', authenticateAdmin, async (req, res) => {
  const allowed = [
    'Placed',
    'Confirmed',
    'Packed',
    'Shipped',
    'Delivered',
    'Cancelled'
  ];

  const { status } = req.body;

  if (!allowed.includes(status)) {
    return res.status(400).json({
      message: 'Invalid order status.'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE online_orders
       SET order_status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    const order = result.rows[0];

    // ==========================================
    // SEND ORDER STATUS EMAIL
    // ==========================================

    if (order.customer_email) {

      try {

        const trackingUrl =
          `${process.env.APP_URL}/order-track.html`;
          const shopResult = await pool.query(
  `SELECT shop_name, contact_number
   FROM shop_info
   ORDER BY id
   LIMIT 1`
);

const shop = shopResult.rows[0] || {};

const shopName = shop.shop_name || 'Mobile Care';
const shopContact = shop.contact_number || '';

        await sendEmail({
          to: order.customer_email,

          subject:
            `Order Update - ${order.order_number}`,

          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0">
  <title>Mobile Care Order Update</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f3f7fc;
  font-family:Arial,Helvetica,sans-serif;
  color:#0f172a;
">

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="padding:30px 10px;background:#f3f7fc;">

<tr>
<td align="center">

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="
         max-width:620px;
         background:#ffffff;
         border-radius:18px;
         overflow:hidden;
         box-shadow:0 10px 35px rgba(15,23,42,.08);
       ">

<!-- HEADER -->

<tr>
<td style="
  background:#1769e0;
  padding:28px 30px;
  text-align:center;
">

<div style="
  color:#ffffff;
  font-size:24px;
  font-weight:800;
">
  <h2>${shopName}</h2>
</div>

<div style="
  color:#dbeafe;
  font-size:13px;
  margin-top:7px;
">
  Order Status Update
</div>

</td>
</tr>


<!-- CONTENT -->

<tr>
<td style="padding:30px;">

<h2 style="
  margin:0 0 12px;
  font-size:24px;
">
  Your order has been updated 📦
</h2>

<p style="
  color:#475569;
  font-size:15px;
  line-height:1.6;
">
  Hello
  <strong>
    ${order.customer_name || 'Customer'}
  </strong>
  👋
</p>

<p style="
  color:#64748b;
  font-size:14px;
  line-height:1.6;
">
  There is an update regarding your
  Mobile Care order.
</p>


<!-- ORDER CARD -->

<div style="
  margin:22px 0;
  padding:20px;
  background:#f8fbff;
  border:1px solid #dce7f7;
  border-radius:14px;
">

<div style="
  color:#64748b;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.6px;
">
  Order Number
</div>

<div style="
  margin-top:6px;
  color:#1769e0;
  font-size:17px;
  font-weight:800;
">
  ${order.order_number}
</div>

<hr style="
  border:0;
  border-top:1px solid #e5eaf2;
  margin:18px 0;
">

<div style="
  color:#64748b;
  font-size:11px;
  text-transform:uppercase;
">
  Current Status
</div>

<div style="
  margin-top:8px;
  color:#1769e0;
  font-size:20px;
  font-weight:800;
">
  ${status}
</div>

</div>


<!-- TRACK BUTTON -->

<div style="
  text-align:center;
  margin:30px 0;
">

<a href="${trackingUrl}"
   style="
     display:inline-block;
     background:#1769e0;
     color:#ffffff;
     text-decoration:none;
     padding:14px 28px;
     border-radius:11px;
     font-size:15px;
     font-weight:800;
   ">
  📦 TRACK YOUR ORDER
</a>

</div>

<p style="text-align:center; margin-top:15px;">
  📞 ${shopContact}
</p>
<p style="
  color:#94a3b8;
  font-size:12px;
  text-align:center;
  line-height:1.5;
">
  Click the button above to view your
  latest order status.
</p>

</td>
</tr>


<!-- FOOTER -->

<tr>
<td style="
  background:#f8fafc;
  border-top:1px solid #e8edf5;
  padding:24px 30px;
  text-align:center;
">

<div style="
  color:#1769e0;
  font-size:15px;
  font-weight:800;
">
  Mobile Care
</div>

<p style="
  margin:7px 0;
  color:#64748b;
  font-size:12px;
">
  Thank you for choosing Mobile Care ❤️
</p>

<p style="
  margin:0;
  color:#94a3b8;
  font-size:11px;
">
  This is an automated order status email.
</p>

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>
`,

          text: `
MOBILE CARE - ORDER UPDATE

Hello ${order.customer_name || 'Customer'},

Your Mobile Care order has been updated.

Order Number: ${order.order_number}

Current Status: ${status}

Track your order:
${trackingUrl}

Thank you for choosing Mobile Care.
`
        });

      } catch (emailError) {

        console.error(
          'Order status email failed:',
          emailError.message
        );

      }
    }

    // ==========================================
    // RETURN SUCCESS
    // ==========================================

    res.json(order);

  } catch (error) {

    console.error(
      'Online order status error:',
      error
    );

    res.status(500).json({
      message: 'Failed to update order status.'
    });
  }
});

router.get('/warranties', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
    w.*,
    r.job_id,
    r.mobile_model,
    c.name AS customer_name,
c.phone AS customer_phone,
si.product_name AS sale_product_name
FROM warranties w
LEFT JOIN repairs r
    ON r.id = w.repair_id
LEFT JOIN customers c
    ON c.id = w.customer_id
LEFT JOIN sale_items si
    ON si.sale_id = w.sale_id
ORDER BY w.warranty_end_date ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching warranty data.' });
  }
});

router.get('/employees', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees.' });
  }
});

router.post('/employees', authenticateAdmin, async (req, res) => {
  const { name, role, phone, email, status } = req.body;
  if (!name || !role) {
    return res.status(400).json({ message: 'Name and role are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO employees (name, role, phone, email, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, role, phone || '', email || '', status || 'Available']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add employee.' });
  }
});

router.get('/email-logs', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 25`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch email logs.' });
  }
});

router.get('/reports', authenticateAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || '2024-01-01';
    const toDate = to || new Date().toISOString().slice(0, 10);

    const dailySales = await pool.query(
      `SELECT to_char(sale_date::date, 'YYYY-MM-DD') AS date, COALESCE(SUM(total_amount),0) AS total
       FROM sales
       WHERE sale_date::date BETWEEN $1::date AND $2::date
       GROUP BY to_char(sale_date::date, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      [fromDate, toDate]
    );

    const monthlySales = await pool.query(
      `SELECT to_char(sale_date::date, 'YYYY-MM') AS month, COALESCE(SUM(total_amount),0) AS total
       FROM sales
       WHERE sale_date::date BETWEEN $1::date AND $2::date
       GROUP BY to_char(sale_date::date, 'YYYY-MM')
       ORDER BY month ASC`,
      [fromDate, toDate]
    );

    const repairStats = await pool.query(
      `SELECT status, COUNT(*) AS count FROM repairs WHERE created_at::date BETWEEN $1::date AND $2::date GROUP BY status`,
      [fromDate, toDate]
    );

    const models = await pool.query(
      `SELECT mobile_model, COUNT(*) AS count FROM repairs WHERE created_at::date BETWEEN $1::date AND $2::date GROUP BY mobile_model ORDER BY count DESC LIMIT 10`,
      [fromDate, toDate]
    );

    const problems = await pool.query(
      `SELECT problem_description AS problem, COUNT(*) AS count FROM repairs WHERE created_at::date BETWEEN $1::date AND $2::date GROUP BY problem_description ORDER BY count DESC LIMIT 10`,
      [fromDate, toDate]
    );

    const accessories = await pool.query(
      `SELECT product_name, SUM(quantity) AS total_units FROM sale_items WHERE created_at::date BETWEEN $1::date AND $2::date GROUP BY product_name ORDER BY total_units DESC LIMIT 10`,
      [fromDate, toDate]
    );

    const inventory = await pool.query('SELECT * FROM inventory ORDER BY quantity ASC');
    const warrantyClaims = await pool.query(
      `SELECT COUNT(*) AS total FROM warranties WHERE created_at::date BETWEEN $1::date AND $2::date`,
      [fromDate, toDate]
    );

    const revenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS total FROM sales WHERE sale_date::date BETWEEN $1::date AND $2::date`,
      [fromDate, toDate]
    );

    res.json({
      dailySales: dailySales.rows,
      monthlySales: monthlySales.rows,
      repairStats: repairStats.rows,
      models: models.rows,
      problems: problems.rows,
      accessories: accessories.rows,
      inventory: inventory.rows,
      warrantyClaims: warrantyClaims.rows[0],
      revenue: revenue.rows[0],
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ message: 'Failed to generate reports.' });
  }
});

/* =====================================================
   SHOP INFORMATION
===================================================== */

router.get('/shop-info', authenticateAdmin, async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT *
       FROM shop_info
       ORDER BY id
       LIMIT 1`
    );

    res.json(
      result.rows[0] || null
    );

  } catch (error) {

    console.error(
      'Shop info fetch error:',
      error
    );

    res.status(500).json({
      message: 'Failed to load shop information.'
    });

  }
});


router.put('/shop-info', authenticateAdmin, async (req, res) => {

  const {
    shopName,
    address,
    contactNumber,
    email,
    shopTiming,
    photoUrl
  } = req.body;


  if (
    !shopName ||
    !address ||
    !contactNumber ||
    !email ||
    !shopTiming
  ) {

    return res.status(400).json({
      message:
        'Shop name, address, contact number, email and timing are required.'
    });

  }


  try {

    const existing =
      await pool.query(
        `SELECT id
         FROM shop_info
         ORDER BY id
         LIMIT 1`
      );


    let result;


    if (existing.rowCount > 0) {

      result =
        await pool.query(
          `UPDATE shop_info
           SET
             shop_name = $1,
             address = $2,
             contact_number = $3,
             email = $4,
             shop_timing = $5,
             photo_url = $6,
             updated_at = NOW()
           WHERE id = $7
           RETURNING *`,
          [
            shopName,
            address,
            contactNumber,
            email,
            shopTiming,
            photoUrl || null,
            existing.rows[0].id
          ]
        );

    } else {

      result =
        await pool.query(
          `INSERT INTO shop_info
           (
             shop_name,
             address,
             contact_number,
             email,
             shop_timing,
             photo_url
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            shopName,
            address,
            contactNumber,
            email,
            shopTiming,
            photoUrl || null
          ]
        );

    }


    res.json(result.rows[0]);

  } catch (error) {

    console.error(
      'Shop info save error:',
      error
    );

    res.status(500).json({
      message:
        'Failed to save shop information.'
    });

  }

});

module.exports = router;
