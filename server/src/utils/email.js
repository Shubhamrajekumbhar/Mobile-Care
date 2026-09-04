const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../../.env')
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const EMAIL_FROM =
    process.env.EMAIL_FROM ||
    'Mobile Care <noreply@mobilecare.dpdns.org>';

const EMAIL_REPLY_TO =
    process.env.EMAIL_REPLY_TO ||
    'swamisamarthsshop@gmail.com';


console.log('EMAIL CONFIG');
console.log('EMAIL FROM:', EMAIL_FROM);
console.log('EMAIL REPLY TO:', EMAIL_REPLY_TO);
console.log('RESEND API KEY:', RESEND_API_KEY ? 'SET' : 'NOT SET');


// --------------------------------------------------
// Escape HTML
// --------------------------------------------------

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// --------------------------------------------------
// Base Email Sender
// --------------------------------------------------

async function sendEmail({
    to,
    subject,
    html,
    text
}) {

    if (!RESEND_API_KEY) {
        throw new Error(
            'RESEND_API_KEY is missing from the Render environment.'
        );
    }

    if (!to) {
        throw new Error('Recipient email is missing.');
    }

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
                    reply_to: EMAIL_REPLY_TO,
                    subject,
                    html,
                    text
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.error?.message ||
                `Resend API error (${response.status})`
            );
        }

        console.log('EMAIL SENT THROUGH RESEND');
        console.log('To:', to);
        console.log('Message ID:', data.id);

        return data;

    } catch (error) {

        console.error('EMAIL SEND FAILED');
        console.error('Message:', error.message);

        throw error;
    }
}


// --------------------------------------------------
// Simple Email Layout
// --------------------------------------------------

function emailLayout({
    shopName,
    title,
    content
}) {

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
</head>

<body style="
    margin:0;
    padding:20px;
    background:#f5f5f5;
    font-family:Arial,Helvetica,sans-serif;
    color:#222;
">

<div style="
    max-width:600px;
    margin:0 auto;
    background:#ffffff;
    border:1px solid #dddddd;
    padding:25px;
">

    <h2 style="
        margin-top:0;
        color:#1769e0;
    ">
        ${escapeHtml(shopName)}
    </h2>

    <h3 style="
        color:#222;
        margin-bottom:20px;
    ">
        ${escapeHtml(title)}
    </h3>

    ${content}

    <hr style="
        border:0;
        border-top:1px solid #dddddd;
        margin:25px 0;
    ">

    <p style="
        font-size:13px;
        color:#666;
        line-height:1.6;
    ">
        ${escapeHtml(shopName)}<br>
        Swami Samarth Mobile Shop<br>
        Shewalewadi, Pune<br>
        Phone: 9922777092<br>
        Email: swamisamarthsshop@gmail.com
    </p>

</div>

</body>
</html>
`;
}


// --------------------------------------------------
// Repair Ready Notification
// --------------------------------------------------

async function sendRepairNotification({
    customerEmail,
    customerName,
    jobId,
    status,
    trackingUrl,
    shopName = 'Mobile Care'
}) {

    if (status !== 'Ready for Pickup') {
        return;
    }

    const safeName =
        escapeHtml(customerName || 'Customer');

    const safeJobId =
        escapeHtml(jobId);

    const trackingSection = trackingUrl
        ? `
            <p style="margin-top:20px;">
                <a
                    href="${escapeHtml(trackingUrl)}"
                    style="
                        display:inline-block;
                        padding:10px 18px;
                        background:#1769e0;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:5px;
                    "
                >
                    Track Your Repair
                </a>
            </p>
        `
        : '';

    const html = emailLayout({
        shopName,
        title: 'Repair Ready for Pickup',
        content: `
            <p>Hello ${safeName},</p>

            <p>
                Your mobile repair is ready for pickup.
            </p>

            <p>
                <strong>Job ID:</strong> ${safeJobId}
            </p>

            ${trackingSection}

            <p>
                Thank you for choosing ${escapeHtml(shopName)}.
            </p>
        `
    });

    const text = `
Hello ${customerName || 'Customer'},

Your mobile repair is ready for pickup.

Job ID: ${jobId}

${trackingUrl ? `Track your repair: ${trackingUrl}` : ''}

Thank you for choosing ${shopName}.

${shopName}
Swami Samarth Mobile Shop
Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`.trim();

    return sendEmail({
        to: customerEmail,
        subject: `Repair Ready for Pickup - ${jobId}`,
        html,
        text
    });
}


// --------------------------------------------------
// Order Confirmation
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
    shopName = 'Mobile Care'
}) {

    const safeName =
        escapeHtml(customerName || 'Customer');

    const safeOrder =
        escapeHtml(orderNumber);

    const itemRows = (items || [])
        .map(item => {

            const productName =
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
                        border-bottom:1px solid #dddddd;
                    ">
                        ${productName}
                    </td>

                    <td style="
                        padding:8px;
                        border-bottom:1px solid #dddddd;
                    ">
                        ${quantity}
                    </td>

                    <td style="
                        padding:8px;
                        border-bottom:1px solid #dddddd;
                    ">
                        ₹${price.toFixed(2)}
                    </td>
                </tr>
            `;
        })
        .join('');

    const safeAddress =
        escapeHtml(deliveryAddress || 'Not provided');

    const trackingSection = trackingUrl
        ? `
            <p style="margin-top:20px;">
                <a
                    href="${escapeHtml(trackingUrl)}"
                    style="
                        display:inline-block;
                        padding:10px 18px;
                        background:#1769e0;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:5px;
                    "
                >
                    Track Your Order
                </a>
            </p>
        `
        : '';

    const html = emailLayout({
        shopName,
        title: 'Order Confirmation',
        content: `
            <p>Hello ${safeName},</p>

            <p>
                Your order has been successfully placed.
            </p>

            <p>
                <strong>Order Number:</strong> ${safeOrder}
            </p>

            <table style="
                width:100%;
                border-collapse:collapse;
                margin-top:20px;
            ">

                <thead>
                    <tr>
                        <th style="
                            text-align:left;
                            padding:8px;
                            border-bottom:1px solid #dddddd;
                        ">
                            Product
                        </th>

                        <th style="
                            text-align:left;
                            padding:8px;
                            border-bottom:1px solid #dddddd;
                        ">
                            Qty
                        </th>

                        <th style="
                            text-align:left;
                            padding:8px;
                            border-bottom:1px solid #dddddd;
                        ">
                            Amount
                        </th>
                    </tr>
                </thead>

                <tbody>
                    ${itemRows}
                </tbody>

            </table>

            <p>
                Subtotal: ₹${Number(subtotal || 0).toFixed(2)}
            </p>

            <p>
                Discount: ₹${Number(discount || 0).toFixed(2)}
            </p>

            <p style="font-size:18px;">
                <strong>
                    Total: ₹${Number(total || 0).toFixed(2)}
                </strong>
            </p>

            <p>
                <strong>Delivery Address:</strong><br>
                ${safeAddress}
            </p>

            ${trackingSection}

            <p>
                Thank you for shopping with ${escapeHtml(shopName)}.
            </p>
        `
    });

    const itemText = (items || [])
        .map(item => {
            const name =
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
                );

            return `${name} - Qty: ${quantity} - ₹${price.toFixed(2)}`;
        })
        .join('\n');

    const text = `
Hello ${customerName || 'Customer'},

Your order has been successfully placed.

Order Number: ${orderNumber}

Items:
${itemText}

Subtotal: ₹${Number(subtotal || 0).toFixed(2)}
Discount: ₹${Number(discount || 0).toFixed(2)}
Total: ₹${Number(total || 0).toFixed(2)}

Delivery Address:
${deliveryAddress || 'Not provided'}

${trackingUrl ? `Track your order: ${trackingUrl}` : ''}

Thank you for shopping with ${shopName}.

${shopName}
Swami Samarth Mobile Shop
Phone: 9922777092
Email: swamisamarthsshop@gmail.com
`.trim();

    return sendEmail({
        to: customerEmail,
        subject: `Order Confirmation - ${orderNumber}`,
        html,
        text
    });
}


module.exports = {
    sendEmail,
    sendRepairNotification,
    sendOrderConfirmationEmail
};