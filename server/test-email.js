require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

console.log('Testing email with:');
console.log('SMTP User:', process.env.BREVO_SMTP_USER);
console.log('SMTP Key:', process.env.BREVO_SMTP_KEY ? 'Set ✓' : 'Missing ✗');
console.log('Sender:', process.env.SENDER_EMAIL);

transporter.sendMail({
  from: process.env.SENDER_EMAIL,
  to: 'martintristantabirao7@gmail.com', // ← CHANGE THIS TO YOUR ACTUAL EMAIL
  subject: 'Test Email from Housekeeping Services',
  text: 'If you receive this, your Brevo setup is working!',
  html: '<h1>Success!</h1><p>If you receive this, your Brevo setup is working!</p>',
}, (error, info) => {
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Email sent!', info.messageId);
    console.log('Check your inbox at: martintristantabirao7@gmail.com'); // ← ADD THIS
  }
  process.exit();
});