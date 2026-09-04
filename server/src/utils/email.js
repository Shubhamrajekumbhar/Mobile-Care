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


console.log('📧 EMAIL CONFIG');
console.log('EMAIL FROM:', EMAIL_FROM);
console.log('REPLY TO:', REPLY_TO);
console.log(
    'RESEND API KEY:',
    RESEND_API_KEY ? 'SET' : 'NOT SET'
);


// --------------------------------------------------
// Escape HTML
// --------------------------------------------------

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


// --------------------------------------------------
// Send Email
// --------------------------------------------------

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

    try {

        console.log('📧 Attempting to send email...');
        console.log('To:', to);
        console.log('Subject:', subject);

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

                    reply_to: replyTo
                        ? [replyTo]
                        : undefined,

                    subject,

                    html,

                    text:
                        text ||
                        'Please view this email in an HTML-compatible email client.'
                })
            }
        );

        const data = await response.json();

        console.log('📨 RESEND STATUS:', response.status);
        console.log(
            '📨 RESEND RESPONSE:',
            JSON.stringify(data)
        );

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

        return data;

    } catch (error) {

        console.error('❌ EMAIL SEND FAILED');
        console.error('Message:', error.message);

        throw error;
    }
}


// --------------------------------------------------
// Common Email Layout
// --------------------------------------------------

function emailLayout(content) {

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,Helvetica,sans-serif;
    color:#222;
">

<div style="
    max-width:600px;
    margin:20px auto;
    background:#ffffff;
    border:1px solid #dddddd;
    border-radius:8px;
    padding:25px;
">

    ${content}

    <div style="
        margin-top:30px;
        padding-top:15px;
        border-top:1px solid #eeeeee;
        font-size:13px;
        color:#666;
        line-height:1.6;
    ">

        <strong>Swami Samarth Mobile Shop</strong><br>

        Shewalewadi, Pune<br>

        Phone: 9922777092<br>

        Email: swamisamarthsshop@gmail.com<br>

        Business Hours: 10:00 AM - 9:00 PM

    </div>

</div>

</body>
</html>
`;
}


// --------------------------------------------------
// Repair Registration Email
// --------------------------------------------------

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
    const job = escapeHtml(jobId);
    const phone = escapeHtml(mobile || 'Not provided');
    const imeiNumber = escapeHtml(imei || 'Not provided');
    const repairStatus = escapeHtml(status);
    const shop = escapeHtml(shopName);

    const html = emailLayout(`

        <h2 style="margin-top:0;">
            ${shop}
        </h2>

        <h3>
            Repair Request Received
        </h3>

        <p>
            Hello ${name},
        </p>

        <p>
            Your repair request has been successfully registered.
        </p>

        <p>
            <strong>Job ID:</strong> ${job}<br>
            <strong>Device:</strong> ${phone}<br>
            <strong>IMEI:</strong> ${imeiNumber}<br>
            <strong>Status:</strong> ${repairStatus}
        </p>

        ${
            trackingUrl
                ? `
                <p>
                    <a href="${escapeHtml(trackingUrl)}"
                       style="
                       display:inline-block;
                       padding:10px 18px;
                       background:#1769e0;
                       color:#ffffff;
                       text-decoration:none;
                       border-radius:5px;">
                        View Repair Status
                    </a>
                </p>
                `
                : ''
        }

        <p>
            We will contact you when there is an update
            regarding your repair.
        </p>

        <p>
            Thank you,<br>
            ${shop}
        </p>

    `);

    const text = `
Hello ${customerName || 'Customer'},

Your repair request has been successfully registered.

Job ID: ${jobId}
Device: ${mobile || 'Not provided'}
IMEI: ${imei || 'Not provided'}
Status: ${status}

${trackingUrl ? `Repair Status: ${trackingUrl}` : ''}

Thank you,
${shopName}

Swami Samarth Mobile Shop
Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`;

    return sendEmail({

        to: customerEmail,

        subject:
            `Repair Request ${jobId}`,

        html,

        text

    });
}


// --------------------------------------------------
// Repair Ready For Pickup Email
// --------------------------------------------------

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
    const job = escapeHtml(jobId);
    const shop = escapeHtml(shopName);

    const html = emailLayout(`

        <h2>
            ${shop}
        </h2>

        <h3>
            Repair Update
        </h3>

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
            trackingUrl
                ? `
                <p>
                    <a href="${escapeHtml(trackingUrl)}"
                       style="
                       display:inline-block;
                       padding:10px 18px;
                       background:#1769e0;
                       color:#ffffff;
                       text-decoration:none;
                       border-radius:5px;">
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

Job ID: ${jobId}

${trackingUrl ? `Repair Status: ${trackingUrl}` : ''}

Thank you,
${shopName}

Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`;

    return sendEmail({

        to: customerEmail,

        subject:
            `Repair Update ${jobId}`,

        html,

        text

    });
}


// --------------------------------------------------
// Order Confirmation Email
// --------------------------------------------------

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
    const order = escapeHtml(orderNumber);
    const address = escapeHtml(deliveryAddress || 'Not provided');
    const shop = escapeHtml(shopName);

    const itemRows = (items || [])
        .map(item => {

            const product =
                escapeHtml(
                    item.productName ||
                    item.product_name ||
                    'Product'
                );

            const quantity =
                Number(item.quantity || 0);

            const price =
                Number(
                    item.totalPrice ||
                    item.total_price ||
                    0
                );

            return `
                <tr>

                    <td style="
                        padding:8px;
                        border-bottom:1px solid #eeeeee;">
                        ${product}
                    </td>

                    <td style="
                        padding:8px;
                        border-bottom:1px solid #eeeeee;">
                        ${quantity}
                    </td>

                    <td style="
                        padding:8px;
                        border-bottom:1px solid #eeeeee;">
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

    const html = emailLayout(`

        <h2>
            ${shop}
        </h2>

        <h3>
            Order Confirmation
        </h3>

        <p>
            Hello ${name},
        </p>

        <p>
            Your order has been successfully placed.
        </p>

        <p>
            <strong>Order Number:</strong> ${order}
        </p>

        <table style="
            width:100%;
            border-collapse:collapse;
            margin-top:15px;
        ">

            <thead>

                <tr>

                    <th style="
                        text-align:left;
                        padding:8px;
                        border-bottom:1px solid #cccccc;">
                        Product
                    </th>

                    <th style="
                        text-align:left;
                        padding:8px;
                        border-bottom:1px solid #cccccc;">
                        Qty
                    </th>

                    <th style="
                        text-align:left;
                        padding:8px;
                        border-bottom:1px solid #cccccc;">
                        Amount
                    </th>

                </tr>

            </thead>

            <tbody>

                ${itemRows}

            </tbody>

        </table>

        <p>
            Subtotal: ₹${sub}<br>
            Discount: ₹${disc}
        </p>

        <h3>
            Total: ₹${finalTotal}
        </h3>

        <p>
            <strong>Delivery Address</strong><br>
            ${address}
        </p>

        ${
            trackingUrl
                ? `
                <p>
                    <a href="${escapeHtml(trackingUrl)}"
                       style="
                       display:inline-block;
                       padding:10px 18px;
                       background:#1769e0;
                       color:#ffffff;
                       text-decoration:none;
                       border-radius:5px;">
                        Track Order
                    </a>
                </p>
                `
                : ''
        }

        <p>
            Thank you for your order.
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
                    item.totalPrice ||
                    item.total_price ||
                    0
                ).toFixed(2);

            return `${product} - Qty: ${quantity} - ₹${price}`;
        })
        .join('\n');

    const text = `
Hello ${customerName || 'Customer'},

Your order has been successfully placed.

Order Number: ${orderNumber}

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

        subject:
            `Order Confirmation ${orderNumber}`,

        html,

        text

    });
}


// --------------------------------------------------
// Generic Warranty / Invoice Email
// --------------------------------------------------

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
        escapeHtml(warrantyDetails || 'Warranty details are available from the shop.');

    const total =
        Number(amount || 0).toFixed(2);

    const shop =
        escapeHtml(shopName);

    const html = emailLayout(`

        <h2>
            ${shop}
        </h2>

        <h3>
            Invoice and Warranty Details
        </h3>

        <p>
            Hello ${name},
        </p>

        <p>
            Your invoice has been generated successfully.
        </p>

        <p>
            <strong>Invoice Number:</strong> ${invoice}<br>
            <strong>Amount:</strong> ₹${total}
        </p>

        <p>
            <strong>Warranty:</strong><br>
            ${warranty}
        </p>

        <p>
            Please keep this email for your records.
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

Please keep this email for your records.

Thank you,
${shopName}

Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`;

    return sendEmail({

        to: customerEmail,

        subject:
            `Invoice ${invoiceNumber || ''}`.trim(),

        html,

        text

    });
}


// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {

    sendEmail,

    sendRepairRegistrationEmail,

    sendRepairNotification,

    sendOrderConfirmationEmail,

    sendWarrantyInvoiceEmail

};