const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../../.env')
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const EMAIL_FROM =
    process.env.EMAIL_FROM ||
    'Mobile Care <noreply@mobilecare.dpdns.org>';

const REPLY_TO =
    process.env.REPLY_TO ||
    'swamisamarthsshop@gmail.com';

console.log('EMAIL CONFIG');
console.log('EMAIL FROM:', EMAIL_FROM);
console.log('REPLY TO:', REPLY_TO);
console.log('RESEND API KEY:', RESEND_API_KEY ? 'SET' : 'NOT SET');


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// ==================================================
// SEND EMAIL THROUGH RESEND
// ==================================================

async function sendEmail({
    to,
    subject,
    html,
    text,
    replyTo = REPLY_TO
}) {

    if (!RESEND_API_KEY) {
        throw new Error(
            'RESEND_API_KEY is missing from Render environment.'
        );
    }

    if (!to) {
        throw new Error('Recipient email is missing.');
    }

    if (!subject) {
        throw new Error('Email subject is missing.');
    }

    console.log('Attempting to send email...');
    console.log('To:', to);
    console.log('Subject:', subject);

    try {

        const response = await fetch(
            'https://api.resend.com/emails',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },

                body: JSON.stringify({
                    from: EMAIL_FROM,
                    to: [to],

                    ...(replyTo
                        ? { reply_to: [replyTo] }
                        : {}),

                    subject,
                    html,
                    text
                })
            }
        );

        const data = await response.json();

        console.log('RESEND STATUS:', response.status);
        console.log(
            'RESEND RESPONSE:',
            JSON.stringify(data)
        );

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.error?.message ||
                `Resend API error (${response.status})`
            );
        }

        console.log('EMAIL ACCEPTED BY RESEND');
        console.log('To:', to);
        console.log('Message ID:', data.id);

        return data;

    } catch (error) {

        console.error('EMAIL SEND FAILED');
        console.error('Message:', error.message);

        throw error;
    }
}


// ==================================================
// COMMON EMAIL LAYOUT
// ==================================================

function emailLayout(content) {

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">
    <title>Swami Samarth Mobile Shop</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f7fa;
    font-family:Arial,Helvetica,sans-serif;
    color:#222222;
">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="padding:20px 10px;">

<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="
           max-width:600px;
           background:#ffffff;
           border:1px solid #dddddd;
       ">

<tr>
<td style="
    background:#1769e0;
    color:#ffffff;
    padding:22px;
    text-align:center;
">

<h2 style="
    margin:0;
    font-size:21px;
">
    Swami Samarth Mobile Shop
</h2>

</td>
</tr>

<tr>
<td style="
    padding:25px;
">

${content}

</td>
</tr>

<tr>
<td style="
    background:#f8f8f8;
    padding:20px;
    text-align:center;
    color:#666666;
    font-size:12px;
    line-height:1.6;
">

<strong style="color:#1769e0;">
    Swami Samarth Mobile Shop
</strong>

<br>

Sampanaa Homes, opposite AXIS ATM,
Shewalewadi, Pune

<br>

Phone: 9922777092

<br>

Email: swamisamarthsshop@gmail.com

<br>

Business Hours: 10:00 AM - 9:00 PM

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>
`;
}


// ==================================================
// REPAIR REGISTRATION EMAIL
// ==================================================

async function sendRepairRegistrationEmail({
    customerEmail,
    customerName,
    jobId,
    mobile,
    imei,
    status = 'Repair Request Received',
    trackingUrl,
    shopName = 'Swami Samarth Mobile Shop'
}) {

    const name = escapeHtml(customerName || 'Customer');
    const job = escapeHtml(jobId || '');
    const device = escapeHtml(mobile || 'Not provided');
    const imeiNumber = escapeHtml(imei || 'Not provided');
    const repairStatus = escapeHtml(status);
    const shop = escapeHtml(shopName);

    const safeTrackingUrl =
        trackingUrl
            ? escapeHtml(trackingUrl)
            : '';

    const html = emailLayout(`

<h2 style="
    margin-top:0;
    color:#1769e0;
">
    Repair Request Received
</h2>

<p>
    Hello ${name},
</p>

<p>
    Your repair request has been successfully registered.
</p>

<table width="100%"
       cellpadding="8"
       cellspacing="0"
       border="0"
       style="
           background:#f8fafc;
           border:1px solid #e5e7eb;
       ">

<tr>
<td>
    <strong>Job ID</strong>
</td>
<td>
    ${job}
</td>
</tr>

<tr>
<td>
    <strong>Device</strong>
</td>
<td>
    ${device}
</td>
</tr>

<tr>
<td>
    <strong>IMEI</strong>
</td>
<td>
    ${imeiNumber}
</td>
</tr>

<tr>
<td>
    <strong>Status</strong>
</td>
<td>
    ${repairStatus}
</td>
</tr>

</table>

${
    safeTrackingUrl
        ? `
<p style="margin-top:25px;">
    <a href="${safeTrackingUrl}"
       style="
           display:inline-block;
           padding:10px 18px;
           background:#1769e0;
           color:#ffffff;
           text-decoration:none;
           border-radius:5px;
       ">
        View Repair Status
    </a>
</p>
`
        : ''
}

<p>
    We will contact you when there is an update regarding your repair.
</p>

<p>
    Thank you,<br>
    ${shop}
</p>

`);

    const text = `
Hello ${customerName || 'Customer'},

Your repair request has been successfully registered.

Job ID: ${jobId || ''}
Device: ${mobile || 'Not provided'}
IMEI: ${imei || 'Not provided'}
Status: ${status}

${trackingUrl ? `Repair Status: ${trackingUrl}` : ''}

Thank you,
${shopName}

Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`;

    return sendEmail({
        to: customerEmail,
        subject: `Repair Request ${jobId}`,
        html,
        text
    });
}


// ==================================================
// REPAIR READY FOR PICKUP
// ==================================================

async function sendRepairNotification({
    customerEmail,
    customerName,
    jobId,
    status,
    trackingUrl,
    shopName = 'Swami Samarth Mobile Shop'
}) {

    if (status !== 'Ready for Pickup') {
        return;
    }

    const name = escapeHtml(customerName || 'Customer');
    const job = escapeHtml(jobId || '');
    const shop = escapeHtml(shopName);

    const safeTrackingUrl =
        trackingUrl
            ? escapeHtml(trackingUrl)
            : '';

    const html = emailLayout(`

<h2 style="
    margin-top:0;
    color:#1769e0;
">
    Repair Ready for Pickup
</h2>

<p>
    Hello ${name},
</p>

<p>
    Your repaired device is now ready for pickup.
</p>

<p>
    <strong>Job ID:</strong> ${job}
</p>

${
    safeTrackingUrl
        ? `
<p style="margin-top:25px;">
    <a href="${safeTrackingUrl}"
       style="
           display:inline-block;
           padding:10px 18px;
           background:#1769e0;
           color:#ffffff;
           text-decoration:none;
           border-radius:5px;
       ">
        View Repair Status
    </a>
</p>
`
        : ''
}

<p>
    Please contact the shop if you have any questions.
</p>

<p>
    Thank you,<br>
    ${shop}
</p>

`);

    const text = `
Hello ${customerName || 'Customer'},

Your repaired device is now ready for pickup.

Job ID: ${jobId || ''}

${trackingUrl ? `Repair Status: ${trackingUrl}` : ''}

Thank you,
${shopName}

Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`;

    return sendEmail({
        to: customerEmail,
        subject: `Repair Ready for Pickup - ${jobId}`,
        html,
        text
    });
}


// ==================================================
// ORDER CONFIRMATION
// ==================================================

async function sendOrderConfirmationEmail({
    customerEmail,
    customerName,
    orderNumber,
    items,
    subtotal,
    discount,
    total,
    deliveryAddress,
    trackingUrl,
    shopName = 'Swami Samarth Mobile Shop'
}) {

    const name = escapeHtml(customerName || 'Customer');
    const order = escapeHtml(orderNumber || '');
    const address = escapeHtml(
        deliveryAddress || 'Not provided'
    );
    const shop = escapeHtml(shopName);

    const itemRows = (items || [])
        .map(item => {

            const product = escapeHtml(
                item.productName ||
                item.product_name ||
                'Product'
            );

            const quantity =
                Number(item.quantity || 0);

            const price =
                Number(
                    item.totalPrice ??
                    item.total_price ??
                    0
                );

            return `
<tr>

<td style="
    padding:10px;
    border-bottom:1px solid #eeeeee;
">
    ${product}
</td>

<td style="
    padding:10px;
    text-align:center;
    border-bottom:1px solid #eeeeee;
">
    ${quantity}
</td>

<td style="
    padding:10px;
    text-align:right;
    border-bottom:1px solid #eeeeee;
">
    ₹${price.toFixed(2)}
</td>

</tr>
`;
        })
        .join('');

    const sub =
        Number(subtotal || 0).toFixed(2);

    const disc =
        Number(discount || 0).toFixed(2);

    const finalTotal =
        Number(total || 0).toFixed(2);

    const safeTrackingUrl =
        trackingUrl
            ? escapeHtml(trackingUrl)
            : '';

    const html = emailLayout(`

<h2 style="
    margin-top:0;
    color:#1769e0;
">
    Order Confirmation
</h2>

<p>
    Hello ${name},
</p>

<p>
    Your order has been successfully placed.
</p>

<p>
    <strong>Order Number:</strong> ${order}
</p>

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       border="0"
       style="border-collapse:collapse;">

<tr style="background:#f1f5f9;">

<th style="
    padding:10px;
    text-align:left;
">
    Product
</th>

<th style="
    padding:10px;
    text-align:center;
">
    Qty
</th>

<th style="
    padding:10px;
    text-align:right;
">
    Amount
</th>

</tr>

${itemRows}

</table>

<p style="
    margin-top:20px;
    text-align:right;
    line-height:1.8;
">

Subtotal: <strong>₹${sub}</strong>
<br>

Discount: <strong>₹${disc}</strong>
<br>

<span style="
    font-size:18px;
    color:#1769e0;
">
    <strong>Total: ₹${finalTotal}</strong>
</span>

</p>

<p>
    <strong>Delivery Address</strong><br>
    ${address}
</p>

${
    safeTrackingUrl
        ? `
<p>
    <a href="${safeTrackingUrl}"
       style="
           display:inline-block;
           padding:10px 18px;
           background:#1769e0;
           color:#ffffff;
           text-decoration:none;
           border-radius:5px;
       ">
        Track Order
    </a>
</p>
`
        : ''
}

<p>
    Thank you for your order.
</p>

<p>
    Regards,<br>
    ${shop}
</p>

`);

    const plainItems = (items || [])
        .map(item => {

            const product =
                item.productName ||
                item.product_name ||
                'Product';

            const quantity =
                Number(item.quantity || 0);

            const price =
                Number(
                    item.totalPrice ??
                    item.total_price ??
                    0
                ).toFixed(2);

            return `${product} - Qty: ${quantity} - ₹${price}`;
        })
        .join('\n');

    const text = `
Hello ${customerName || 'Customer'},

Your order has been successfully placed.

Order Number: ${orderNumber || ''}

Items:
${plainItems}

Subtotal: ₹${sub}
Discount: ₹${disc}
Total: ₹${finalTotal}

Delivery Address:
${deliveryAddress || 'Not provided'}

${trackingUrl ? `Track Order: ${trackingUrl}` : ''}

Thank you,
${shopName}

Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`;

    return sendEmail({
        to: customerEmail,
        subject: `Order Confirmation - ${orderNumber}`,
        html,
        text
    });
}


// ==================================================
// WARRANTY / INVOICE
// ==================================================

async function sendWarrantyInvoiceEmail({
    customerEmail,
    customerName,
    invoiceNumber,
    amount,
    warrantyDetails,
    shopName = 'Swami Samarth Mobile Shop'
}) {

    const name =
        escapeHtml(customerName || 'Customer');

    const invoice =
        escapeHtml(invoiceNumber || 'N/A');

    const warranty =
        escapeHtml(
            warrantyDetails ||
            'Warranty details are available from the shop.'
        );

    const total =
        Number(amount || 0).toFixed(2);

    const shop =
        escapeHtml(shopName);

    const html = emailLayout(`

<h2 style="
    margin-top:0;
    color:#1769e0;
">
    Invoice and Warranty Details
</h2>

<p>
    Hello ${name},
</p>

<p>
    Your invoice has been generated successfully.
</p>

<table width="100%"
       cellpadding="8"
       cellspacing="0"
       border="0"
       style="
           background:#f8fafc;
           border:1px solid #e5e7eb;
       ">

<tr>
<td>
    <strong>Invoice Number</strong>
</td>

<td>
    ${invoice}
</td>
</tr>

<tr>
<td>
    <strong>Amount</strong>
</td>

<td>
    ₹${total}
</td>
</tr>

<tr>
<td>
    <strong>Warranty</strong>
</td>

<td>
    ${warranty}
</td>
</tr>

</table>

<p style="margin-top:25px;">
    Please keep this email for your records and warranty reference.
</p>

<p>
    Thank you,<br>
    ${shop}
</p>

`);

    const text = `
Hello ${customerName || 'Customer'},

Your invoice has been generated successfully.

Invoice Number: ${invoiceNumber || 'N/A'}
Amount: ₹${total}

Warranty:
${warrantyDetails || 'Warranty details are available from the shop.'}

Please keep this email for your records and warranty reference.

Thank you,
${shopName}

Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`;

    return sendEmail({
        to: customerEmail,
        subject: `Invoice and Warranty - ${invoiceNumber || 'N/A'}`,
        html,
        text
    });
}


// ==================================================
// EXPORTS
// ==================================================

module.exports = {
    sendEmail,
    sendRepairRegistrationEmail,
    sendRepairNotification,
    sendOrderConfirmationEmail,
    sendWarrantyInvoiceEmail
};