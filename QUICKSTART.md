# ⚡ QUICK START - 5 MINUTES

## Installation (2 minutes)

### 1. Open PowerShell

Press `Win + R`, type `powershell`, press Enter

### 2. Install Dependencies

Copy and paste:
```powershell
cd "c:\Users\godwin bobby\Desktop\Tax Refund web"
npm install
```

Wait for it to complete (may take 1-2 minutes)

## Configuration (2 minutes)

### 3. Create `.env` File

1. Open Notepad
2. Paste this (replace `your-email@gmail.com` with your Gmail):
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
PORT=3001
```

3. File → Save As
4. Filename: `.env`
5. Save in: `c:\Users\godwin bobby\Desktop\Tax Refund web`

**Note:** For EMAIL_PASSWORD, go to: https://support.google.com/accounts/answer/185833 to get your Gmail App Password

## Start (1 minute)

### 4. Start Backend

In PowerShell:
```powershell
node backend.js
```

You should see:
```
✅ Server running on http://localhost:3001
```

**Leave this running!**

### 5. Open Website

Double-click: `c:\Users\godwin bobby\Desktop\Tax Refund web\index.html`

## Test (No extra time!)

1. Click "Create Account"
2. Fill in details and click "Create Account"
3. **Check your Gmail** for verification code
4. Enter code and fill the form
5. Submit and check admin email

## Done! 🎉

Your full-stack tax portal is running!

---

## What Each File Does

| File | Purpose |
|------|---------|
| `backend.js` | Email server (must be running) |
| `index.html` | Landing page |
| `tax.html` | Form page |
| `auth.js` | Login/signup logic |
| `tax.js` | Form logic + email sending |
| `.env` | Your email configuration |

## If Something Goes Wrong

**Backend won't start?**
```powershell
# Make sure you're in the right folder
cd "c:\Users\godwin bobby\Desktop\Tax Refund web"
npm install
node backend.js
```

**Email not sending?**
1. Check `.env` file exists with EMAIL_USER and EMAIL_PASSWORD
2. Gmail App Password must be 16 characters (with spaces)
3. Backend must be running (should show "✅ Server running")

**Can't find index.html?**
1. Open File Explorer
2. Navigate to: `c:\Users\godwin bobby\Desktop\Tax Refund web`
3. Right-click `index.html`
4. Click "Open with" → Choose browser

## Features Overview

✅ **Full-Stack App**
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express, Nodemailer
- Email: Via Gmail SMTP

✅ **User Authentication**
- Secure login with encryption
- 6-digit verification code sent to email
- MFA prevents unauthorized access

✅ **Tax Form**
- 5-step form with validation
- All data sent to admin email
- User gets confirmation email

✅ **Mobile-Friendly**
- Works on phone and desktop
- Easy date picker (no scrolling!)
- Touch-optimized buttons

## Next Steps

1. ✅ Follow Quick Start above
2. ✅ Test with your Gmail
3. ✅ Create an account and submit a form
4. ✅ Check both user and admin emails
5. ✅ Customize admin email in `backend.js` if needed

---

**Questions?** Check `SETUP.md` for detailed troubleshooting
