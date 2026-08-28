const nodemailer = require("nodemailer");
console.log("SMTP PASS LENGTH:", process.env.SMTP_PASS?.length);


const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});


async function sendReadyEmail({
    customerEmail,
    customerName,
    jobId,
    mobileModel
})
{
   const trackingUrl =
  
 `${process.env.APP_URL}/track.html?jobId=${encodeURIComponent(jobId)}`;
 if (status === 'Ready for Pickup') {
    subject = `Your Mobile is Ready for Pickup - Job ID ${jobId}`;

    html = `
        <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 25px;">

            <h2 style="color: #1769e0;">
                Mobile Care
            </h2>

            <h3>Your mobile is ready for pickup! 🎉</h3>

            <p>Hello <b>${customerName}</b>,</p>

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

            <br>

            <a href="${trackingUrl}"
               style="
                    display: inline-block;
                    background: #1769e0;
                    color: white;
                    padding: 12px 22px;
                    text-decoration: none;
                    border-radius: 6px;
               ">
                Track Your Repair
            </a>

            <br><br>

            <p>
                Click the button above to view your repair status.
            </p>

            <p>
                Thank you for choosing Mobile Care.
            </p>

        </div>
    `;
}
}
 {

    const mailOptions = {

        from: `"Mobile Care" <${process.env.EMAIL_USER}>`,

        to: customerEmail,

        subject: `Your Mobile is Ready - Job ID ${jobId}`,

        html: `
            <div style="
                font-family: Arial;
                max-width: 600px;
                margin: auto;
                padding: 25px;
                border: 1px solid #ddd;
                border-radius: 10px;
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
                    and is ready for pickup.
                </p>

                <hr>

                <p>
                    <b>Job ID:</b> ${jobId}
                </p>

                <p>
                    <b>Mobile:</b> ${mobileModel}
                </p>

                <p>
                    Please visit our shop to collect your
                    mobile.
                </p>

                <p>
                    Thank you for choosing
                    <b>Mobile Care</b>.
                </p>

            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}


module.exports = {
    sendReadyEmail
};