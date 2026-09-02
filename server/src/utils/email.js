const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE).toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

console.log('📧 EMAIL CONFIG');
console.log('SMTP HOST:', SMTP_HOST);
console.log('SMTP PORT:', SMTP_PORT);
console.log('SMTP SECURE:', SMTP_SECURE);
console.log('SMTP USER:', SMTP_USER);
console.log('SMTP PASS LENGTH:', SMTP_PASS ? SMTP_PASS.length : 0);

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

async function sendEmail({ to, subject, html, text }) {

    if (!SMTP_USER || !SMTP_PASS) {
        throw new Error(
            'SMTP_USER or SMTP_PASS is missing from the Render environment.'
        );
    }

    try {

        const info = await transporter.sendMail({
            from: `"Mobile Care" <${SMTP_USER}>`,
            to,
            subject,
            text,
            html
        });

        console.log('✅ EMAIL SENT');
        console.log('To:', to);
        console.log('Message ID:', info.messageId);
        console.log('Accepted:', info.accepted);
        console.log('Rejected:', info.rejected);

        return info;

    } catch (error) {

        console.error('❌ EMAIL SEND FAILED');
        console.error('Code:', error.code);
        console.error('Command:', error.command);
        console.error('Response:', error.response);
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