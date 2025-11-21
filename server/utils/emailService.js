require('dotenv').config();
const SibApiV3Sdk = require('@getbrevo/brevo');

// Initialize Brevo API client
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

console.log('✅ Brevo API client initialized');
console.log('📧 Sender Email:', process.env.SENDER_EMAIL);
console.log('📧 API Key present:', process.env.BREVO_API_KEY ? 'Yes' : 'No');

// Send verification email using Brevo API
async function sendVerificationEmail(email, token, firstName) {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  
  console.log('📤 Attempting to send verification email via Brevo API...');
  console.log('   To:', email);
  console.log('   From:', process.env.SENDER_EMAIL);
  console.log('   Token:', token.substring(0, 10) + '...');
  
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
  sendSmtpEmail.sender = {
    name: "DLSU-D Housekeeping Services",
    email: process.env.SENDER_EMAIL
  };
  
  sendSmtpEmail.to = [{ email: email, name: firstName }];
  
  sendSmtpEmail.subject = "Verify Your Email Address - Housekeeping Services";
  
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #087830; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { 
          display: inline-block; 
          padding: 12px 30px; 
          background-color: #087830; 
          color: white !important; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0;
          font-weight: bold;
        }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; padding: 20px; }
        .link-text { 
          word-break: break-all; 
          color: #4F46E5; 
          font-size: 12px;
          background: #e5e7eb;
          padding: 10px;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🏠 DLSU-D Housekeeping Services</h1>
        </div>
        <div class="content">
          <h2>Hello ${firstName}! 👋</h2>
          <p>Thank you for registering with Housekeeping Services. We're excited to have you!</p>
          <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button" style="color: white !important; text-decoration: none;">✓ Verify Email Address</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <div class="link-text">${verificationUrl}</div>
          
          <p style="margin-top: 20px;"><strong>⏰ This link will expire in 24 hours.</strong></p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account with Housekeeping Services, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Housekeeping Services. All rights reserved.</p>
          <p style="font-size: 11px; color: #999;">This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  sendSmtpEmail.textContent = `
    Welcome to Housekeeping Services!
    
    Hello ${firstName}!
    
    Thank you for registering. Please verify your email address by clicking the link below:
    
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you didn't create an account, please ignore this email.
    
    ---
    DLSU-D Housekeeping Services
  `;

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Verification email sent successfully via Brevo API!');
    console.log('   Message ID:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('❌ Error sending verification email via Brevo API:');
    console.error('   Error:', error.message);
    console.error('   Response:', error.response?.body);
    console.error('   API Key present:', process.env.BREVO_API_KEY ? 'Yes' : 'No');
    throw error;
  }
}

module.exports = { sendVerificationEmail };