require("dotenv").config();

console.log("SMTP USER:", process.env.SMTP_USER);
console.log("SMTP PASS LENGTH:", process.env.SMTP_PASS?.length);
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
const { sendEmail } = require('./config/email');

sendEmail({
    to: process.env.SMTP_USER,
    subject: 'Render SMTP Test',
    html: '<h2>Render email test is working ✅</h2>'
})
.then(() => console.log('✅ RENDER EMAIL TEST SENT'))
.catch(err => console.error('❌ RENDER EMAIL TEST FAILED:', err));