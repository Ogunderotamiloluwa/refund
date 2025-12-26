var Auth = (function () {
    const COMPANY_EMAIL = 'ogunderotamiloluwa@gmail.com';

    /**
     * Calls the backend API (/api/send-email) to send the verification email.
     */
    async function sendDirectEmail(toEmail, subject, htmlContent) {
        try {
            console.log(`[Auth] Requesting email for: ${toEmail}`);
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toEmail: toEmail.toLowerCase().trim(),
                    subject,
                    htmlContent
                })
            });

            const data = await response.json().catch(() => ({ error: "Server response was not JSON" }));
            
            if (!response.ok || !data.success) {
                const msg = data.error || data.details || "Could not send email.";
                console.error("[Auth] Backend Error:", msg);
                alert(`Email Error: ${msg}`);
                return false;
            }

            console.log("[Auth] Email successfully dispatched by backend.");
            return true;
        } catch (error) {
            console.error("[Auth] Connection Error:", error);
            alert("Network error: Make sure your local server is running (node server.js).");
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
                <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; max-width: 450px; margin: auto; background-color: #ffffff;">
                    <h2 style="color: #002868; text-align: center;">Verification Required</h2>
                    <p>Please use the code to verify your <b>${type}</b>:</p>
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 36px; letter-spacing: 10px; font-weight: bold; color: #e67e22; border: 1px dashed #cbd5e0; margin: 20px 0;">
                        ${code}
                    </div>
                    <p style="font-size: 12px; color: #a0aec0; text-align: center;">Tax Portal System.</p>
                </div>
            `;

            return await sendDirectEmail(cleanEmail, `Tax Portal: ${type} Verification`, html);
        },

        async register(email, password, profile) {
            const cleanEmail = email.toLowerCase().trim();
            localStorage.setItem('tax_user_' + cleanEmail, JSON.stringify({ password, profile }));
            return await this.sendCode(cleanEmail, 'Registration');
        },

        async login(email, password) {
            const cleanEmail = email.toLowerCase().trim();
            const data = localStorage.getItem('tax_user_' + cleanEmail);
            if (!data) throw new Error("Account not found. Please register first.");
            
            const user = JSON.parse(data);
            if (user.password !== password) throw new Error("Incorrect password.");
            
            return await this.sendCode(cleanEmail, 'Login');
        },

        verifyMfa(email, code) {
            if (!email || !code) return false;
            const cleanEmail = email.toLowerCase().trim();
            const storedCode = sessionStorage.getItem('tax_mfa_' + cleanEmail);
            
            if (storedCode && storedCode === code.trim()) {
                sessionStorage.removeItem('tax_mfa_' + cleanEmail);
                return true;
            }
            return false;
        },

        setSession(email) {
            sessionStorage.setItem('tax_current_user', email.toLowerCase().trim());
        },

        logout() {
            sessionStorage.clear();
            window.location.reload();
        },

        isAuthenticated() {
            return !!sessionStorage.getItem('tax_current_user');
        }
    };
})();
window.Auth = Auth;