
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env')
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const EMAIL_FROM =
  process.env.EMAIL_FROM || 'Mobile Care <onboarding@resend.dev>';

console.log('📧 EMAIL CONFIG');
console.log('EMAIL FROM:', EMAIL_FROM);
console.log(
  'RESEND API KEY:',
  RESEND_API_KEY ? 'SET' : 'NOT SET'
);

// =====================================================
// GENERAL EMAIL FUNCTION
// =====================================================

const sendEmail = async ({
  to,
  subject,
  html,
  text,
  repairId
}) => {

  console.log('📧 Attempting to send email...');
  console.log('To:', to);
  console.log(
    'RESEND API KEY:',
    RESEND_API_KEY ? 'SET' : 'NOT SET'
  );

  if (!RESEND_API_KEY) {
    throw new Error(
      'RESEND_API_KEY is missing from Render environment variables.'
    );
  }

  try {

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },

      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
        text
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
        data?.error?.message ||
        `Resend API error (${response.status})`
      );
    }

    console.log('✅ EMAIL SENT THROUGH RESEND');
    console.log('To:', to);
    console.log('Message ID:', data.id);

    if (repairId) {
      const { pool } = require('./db');

      await pool.query(
        `INSERT INTO email_logs
        (repair_id, recipient, subject, message, status)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          repairId,
          to,
          subject,
          text || html,
          'sent'
        ]
      );
    }

    return {
      success: true,
      id: data.id
    };

  } catch (error) {

    console.error('❌ RESEND EMAIL FAILED');
    console.error('Message:', error.message);

    throw error;
  }
};


// =====================================================
// ONLINE ORDER CONFIRMATION EMAIL
// =====================================================

const sendOrderConfirmationEmail = async ({
  customerName,
  customerEmail,
  orderNumber,
  items,
  totalAmount,
  deliveryAddress
}) => {

  const trackUrl =
    `${process.env.APP_URL}/track-order.html?orderNumber=${encodeURIComponent(orderNumber)}`;

  const itemRows = items.map(item => `
    <tr>
      <td style="
        padding:14px 10px;
        border-bottom:1px solid #e8edf5;
        color:#0f172a;
        font-size:14px;
      ">
        <strong>${escapeHtml(item.product_name)}</strong>
      </td>

      <td style="
        padding:14px 10px;
        border-bottom:1px solid #e8edf5;
        text-align:center;
        color:#475569;
        font-size:14px;
      ">
        ${item.quantity}
      </td>

      <td style="
        padding:14px 10px;
        border-bottom:1px solid #e8edf5;
        text-align:right;
        color:#0f172a;
        font-weight:700;
        font-size:14px;
      ">
        ₹${formatMoney(item.total_price)}
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>Mobile Care - Order Confirmed</title>
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
       style="background:#f3f7fc;padding:30px 10px;">

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
    📱 MOBILE CARE
</div>

<div style="
    color:#dbeafe;
    font-size:13px;
    margin-top:7px;
">
    Your trusted mobile care store
</div>

</td>
</tr>


<!-- SUCCESS -->

<tr>
<td style="padding:32px 30px 15px;text-align:center;">

<div style="
    display:inline-block;
    background:#dcfce7;
    color:#15803d;
    border-radius:50px;
    padding:9px 17px;
    font-size:13px;
    font-weight:700;
">
    ✓ PAYMENT SUCCESSFUL
</div>

<h1 style="
    margin:18px 0 8px;
    font-size:27px;
    color:#0f172a;
">
    Order Confirmed!
</h1>

<p style="
    margin:0;
    color:#64748b;
    font-size:15px;
    line-height:1.6;
">
    Thank you for shopping with Mobile Care.
    Your payment has been successfully received.
</p>

</td>
</tr>


<!-- CUSTOMER -->

<tr>
<td style="padding:10px 30px 20px;">

<p style="
    margin:0;
    font-size:16px;
    color:#0f172a;
">
    Hi <strong>${escapeHtml(customerName)}</strong> 👋
</p>

<p style="
    margin:8px 0 0;
    color:#64748b;
    font-size:14px;
">
    We're preparing your order and will keep you updated.
</p>

</td>
</tr>


<!-- ORDER INFO -->

<tr>
<td style="padding:0 30px 22px;">

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="
          background:#f8fbff;
          border:1px solid #e1eaf7;
          border-radius:13px;
       ">

<tr>

<td style="padding:16px;">

<div style="
    color:#64748b;
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:.6px;
">
    Order Number
</div>

<div style="
    margin-top:5px;
    font-size:16px;
    font-weight:800;
    color:#1769e0;
">
    ${escapeHtml(orderNumber)}
</div>

</td>

<td style="
    padding:16px;
    text-align:right;
">

<div style="
    color:#64748b;
    font-size:11px;
    text-transform:uppercase;
">
    Payment
</div>

<div style="
    margin-top:5px;
    color:#15803d;
    font-size:14px;
    font-weight:800;
">
    ✓ Paid
</div>

</td>

</tr>

</table>

</td>
</tr>


<!-- PRODUCTS -->

<tr>
<td style="padding:0 30px 25px;">

<h2 style="
    margin:0 0 12px;
    font-size:18px;
">
    Order Summary
</h2>

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="
          border:1px solid #e5eaf2;
          border-radius:12px;
          overflow:hidden;
       ">

<tr style="background:#f8fafc;">

<th style="
    padding:12px 10px;
    text-align:left;
    font-size:12px;
    color:#64748b;
">
    PRODUCT
</th>

<th style="
    padding:12px 10px;
    text-align:center;
    font-size:12px;
    color:#64748b;
">
    QTY
</th>

<th style="
    padding:12px 10px;
    text-align:right;
    font-size:12px;
    color:#64748b;
">
    PRICE
</th>

</tr>

${itemRows}

<tr>

<td colspan="2"
    style="
      padding:18px 10px;
      font-size:16px;
      font-weight:800;
    ">
    Total Paid
</td>

<td style="
    padding:18px 10px;
    text-align:right;
    font-size:20px;
    font-weight:800;
    color:#1769e0;
">
    ₹${formatMoney(totalAmount)}
</td>

</tr>

</table>

</td>
</tr>


<!-- DELIVERY -->

<tr>
<td style="padding:0 30px 25px;">

<h2 style="
    margin:0 0 12px;
    font-size:18px;
">
    📍 Delivery Address
</h2>

<div style="
    background:#f8fafc;
    border:1px solid #e5eaf2;
    border-radius:12px;
    padding:16px;
    color:#475569;
    font-size:14px;
    line-height:1.6;
">
    ${escapeHtml(deliveryAddress)}
</div>

</td>
</tr>


<!-- TRACK BUTTON -->

<tr>
<td style="
    padding:5px 30px 32px;
    text-align:center;
">

<a href="${trackUrl}"
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

<p style="
    margin:14px 0 0;
    color:#94a3b8;
    font-size:12px;
">
    You can use the button above to check your order status.
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
    font-size:15px;
    font-weight:800;
    color:#1769e0;
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
    This is an automated order confirmation email.
    Please do not reply directly to this email.
</p>

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>
`;

  const text = `
MOBILE CARE
Order Confirmed!

Hi ${customerName},

Thank you for shopping with Mobile Care.
Your payment has been successfully received.

Order Number: ${orderNumber}
Payment Status: Paid

ORDER SUMMARY
${items.map(item =>
  `${item.product_name} x ${item.quantity} - ₹${formatMoney(item.total_price)}`
).join('\n')}

Total Paid: ₹${formatMoney(totalAmount)}

Delivery Address:
${deliveryAddress}

Track your order:
${trackUrl}

Thank you for choosing Mobile Care.
`;

  return sendEmail({
    to: customerEmail,
    subject: `Order Confirmed ✓ - ${orderNumber}`,
    html,
    text
  });
};


// =====================================================
// HELPERS
// =====================================================

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// =====================================================
// READY FOR PICKUP EMAIL
// =====================================================

const sendRepairNotification = async ({
  repair,
  status,
  customerName,
  email,
  jobId,
  model,
  technician,
  note
}) => {

  if (status !== 'Ready for Pickup') {
    return {
      success: true,
      skipped: true
    };
  }

  const trackingUrl =
    `${process.env.APP_URL}/track.html?jobId=${encodeURIComponent(jobId)}`;

  const subject =
    `Your Mobile is Ready for Pickup - Job ID ${jobId}`;

  const html = `
    <div style="
      font-family:Arial,sans-serif;
      max-width:600px;
      margin:auto;
      padding:25px;
      border:1px solid #ddd;
      border-radius:10px;
    ">

      <h2 style="color:#1769e0;">
        Mobile Care
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

      <p>
        <b>Job ID:</b> ${jobId}
      </p>

      <p>
        <b>Mobile:</b> ${model}
      </p>

      ${
        note
          ? `<p><b>Note:</b> ${note}</p>`
          : ''
      }

      <br>

      <a href="${trackingUrl}"
         style="
           display:inline-block;
           background:#1769e0;
           color:white;
           padding:12px 22px;
           text-decoration:none;
           border-radius:6px;
           font-weight:bold;
         ">
        Track Your Repair
      </a>

      <br><br>

      <p>
        Thank you for choosing <b>Mobile Care</b>.
      </p>

    </div>
  `;

  const text = `
Your mobile is ready for pickup!

Hello ${customerName},

Your mobile repair has been completed and is Ready for Pickup.

Job ID: ${jobId}
Mobile: ${model}

Track your repair:
${trackingUrl}

Thank you for choosing Mobile Care.
`;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
    repairId: repair?.id
  });
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

  sendEmail,
  sendRepairNotification,
  sendOrderConfirmationEmail
};