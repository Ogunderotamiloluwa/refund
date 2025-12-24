
const Auth = (function () {
    // Note: API keys are now handled by the backend scripts (server.js / send-email.js)
    // to ensure they work everywhere without CORS issues.
    const COMPANY_EMAIL = 'ogunderotamiloluwa@gmail.com';

    async function sendDirectEmail(toEmail, subject, htmlContent) {
        try {
            console.log(`[Auth] Sending request to internal API for: ${toEmail}`);
            
            // This path works locally (node server.js) and on Netlify
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toEmail: toEmail.toLowerCase().trim(),
                    subject,
                    htmlContent
                })
            });

            const data = await response.json();
            if (!response.ok) {
                console.error("[Auth] API Error:", data.error || data.details);
                return false;
            }

            console.log("[Auth] Email delivery triggered successfully.");
            return true;
        } catch (error) {
            console.error("[Auth] Network Error:", error);
            return false;
        }
    }

    return {
        async sendCode(email, type) {
            if (!email) throw new Error("Email is required.");
            const cleanEmail = email.toLowerCase().trim();
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            
            sessionStorage.setItem('tax_mfa_' + cleanEmail, code);

            const html = `
                <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #eee; border-radius: 10px; max-width: 450px; margin: auto;">
                    <h2 style="color: #002868; text-align: center;">${type} Verification</h2>
                    <p style="text-align: center;">Your verification code is:</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                        <h1 style="letter-spacing: 10px; color: #d35400; margin: 0; font-size: 32px;">${code}</h1>
                    </div>
                    <p style="font-size: 12px; color: #777; text-align: center;">If you didn't request this, please ignore this email.</p>
                </div>
            `;

            const success = await sendDirectEmail(cleanEmail, `${type} Code`, html);
            if (!success) throw new Error("Failed to send code. Ensure your local server is running (node server.js).");
            return true;
        },

        async register(email, password, profile) {
            localStorage.setItem('tax_user_' + email.toLowerCase().trim(), JSON.stringify({ password, profile }));
            return await this.sendCode(email, 'Registration');
        },

        async login(email, password) {
            const data = localStorage.getItem('tax_user_' + email.toLowerCase().trim());
            if (!data) throw new Error("Account not found.");
            const user = JSON.parse(data);
            if (user.password !== password) throw new Error("Incorrect password.");
            return await this.sendCode(email, 'Login');
        },

        verifyMfa(email, code) {
            const cleanEmail = email.toLowerCase().trim();
            const stored = sessionStorage.getItem('tax_mfa_' + cleanEmail);
            if (stored && stored === code.trim()) {
                sessionStorage.removeItem('tax_mfa_' + cleanEmail);
                return true;
            }
            return false;
        },

        setSession(email) {
            sessionStorage.setItem('tax_current_user', email.toLowerCase().trim());
        },

        logout() {
            sessionStorage.removeItem('tax_current_user');
            window.location.reload();
        },

        isAuthenticated() {
            return !!sessionStorage.getItem('tax_current_user');
        },

        async sendFinalApplication(formData) {
            let rows = "";
            for (const [key, value] of Object.entries(formData)) {
                rows += `<tr><td style="padding:8px; border:1px solid #ddd;"><b>${key}</b></td><td style="padding:8px; border:1px solid #ddd;">${value}</td></tr>`;
            }
            const html = `<h2>New Tax Application</h2><table style="width:100%; border-collapse:collapse;">${rows}</table>`;
            return await sendDirectEmail(COMPANY_EMAIL, "NEW TAX APPLICATION", html);
        }
    };
})();
window.Auth = Auth;
