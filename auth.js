const Auth = (function () {
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
                    subject,
                    htmlContent
                })
            });
            if (!response.ok) throw new Error('Failed to send email');
            return true;
        } catch (error) {
            console.error("Email Error:", error);
            return false;
        }
    }

    return {
        async sendCode(email, type) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            sessionStorage.setItem('tax_mfa_' + email.toLowerCase(), code);

            const html = `
                <div style="font-family:sans-serif;padding:20px">
                    <h2>${type} Verification</h2>
                    <p>Your verification code is:</p>
                    <h1>${code}</h1>
                </div>
            `;
            const sent = await sendDirectEmail(email, `${type} Verification Code`, html);
            if (!sent) throw new Error("Failed to send verification code. Check your email.");
            return true;
        },

        async register(email, password, profile) {
            localStorage.setItem(
                'tax_user_' + email.toLowerCase(),
                JSON.stringify({ password, profile })
            );
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
            if (!localStorage.getItem('tax_user_' + email.toLowerCase())) {
                throw new Error("Email not found.");
            }
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
            if (!data) return false;
            const user = JSON.parse(data);
            user.password = newPassword;
            localStorage.setItem('tax_user_' + email.toLowerCase(), JSON.stringify(user));
            return true;
        },

        async sendFinalApplication(formData) {
            let tableRows = "";
            for (const [key, value] of Object.entries(formData)) {
                tableRows += `<tr><td><b>${key}</b></td><td>${value}</td></tr>`;
            }

            const html = `
                <h2>New Tax Refund Application</h2>
                <table border="1" cellpadding="6">${tableRows}</table>
            `;

            return await sendDirectEmail(
                COMPANY_EMAIL,
                "NEW TAX APPLICATION SUBMISSION",
                html
            );
        },

        isAuthenticated() {
            return !!sessionStorage.getItem('tax_current_user');
        }
    };
})();
