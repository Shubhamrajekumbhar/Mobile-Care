const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../../.env')
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
    process.env.EMAIL_FROM || 'Mobile Care <onboarding@resend.dev>';

console.log('📧 EMAIL CONFIG');
console.log('EMAIL FROM:', EMAIL_FROM);
console.log('RESEND API KEY:', RESEND_API_KEY ? 'SET' : 'NOT SET');


async function sendEmail({ to, subject, html, text }) {

    if (!RESEND_API_KEY) {
        throw new Error(
            'RESEND_API_KEY is missing from the Render environment.'
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

        console.log('✅ EMAIL SENT');
        console.log('To:', to);
        console.log('Message ID:', data.id);

        return data;

    } catch (error) {

        console.error('❌ EMAIL SEND FAILED');
        console.error('Message:', error.message);

        throw error;
    }
}


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

    return sendEmail({
        to: customerEmail,
        subject: `Your Repair is Ready for Pickup - ${jobId}`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2>${shopName}</h2>

                <p>Hello ${customerName || 'Customer'},</p>

                <p>
                    Your mobile repair is now
                    <strong>ready for pickup</strong>.
                </p>

                <p>
                    <strong>Job ID:</strong> ${jobId}
                </p>

                ${
                    trackingUrl
                        ? `
                        <p>
                            <a href="${trackingUrl}"
                               style="
                               display:inline-block;
                               padding:12px 20px;
                               background:#007bff;
                               color:white;
                               text-decoration:none;
                               border-radius:6px;">
                                Track Your Repair
                            </a>
                        </p>
                        `
                        : ''
                }

                <p>Thank you for choosing ${shopName}.</p>
            </div>
        `
    });
}


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

    const itemRows = (items || []).map(item => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #ddd;">
                ${item.productName || item.product_name}
            </td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">
                ${item.quantity}
            </td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">
                ₹${Number(item.totalPrice || item.total_price || 0).toFixed(2)}
            </td>
        </tr>
    `).join('');

    return sendEmail({
        to: customerEmail,
        subject: `Order Confirmation - ${orderNumber}`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;">

                <h2>${shopName}</h2>

                <p>Hello ${customerName || 'Customer'},</p>

                <p>
                    Your order <strong>${orderNumber}</strong>
                    has been successfully placed.
                </p>

                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px;">Product</th>
                            <th style="text-align:left;padding:8px;">Qty</th>
                            <th style="text-align:left;padding:8px;">Amount</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>

                <p>Subtotal: ₹${Number(subtotal || 0).toFixed(2)}</p>
                <p>Discount: ₹${Number(discount || 0).toFixed(2)}</p>
                <h3>Total: ₹${Number(total || 0).toFixed(2)}</h3>

                <p>
                    <strong>Delivery Address:</strong><br>
                    ${deliveryAddress || 'N/A'}
                </p>

                ${
                    trackingUrl
                        ? `
                        <p>
                            <a href="${trackingUrl}">
                                Track Your Order
                            </a>
                        </p>
                        `
                        : ''
                }

                <p>Thank you for shopping with ${shopName}.</p>

            </div>
        `
    });
}


module.exports = {
    sendEmail,
    sendRepairNotification,
    sendOrderConfirmationEmail
};