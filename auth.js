// auth.js — Client-side account simulation with Web Crypto encryption and MFA simulation
// WARNING: This is a client-side simulation for demo only. DO NOT use this for storing real SSNs or sensitive PII in production.

const Auth = (function(){
    const encoder = new TextEncoder();

    async function deriveKey(password, salt) {
        const pw = encoder.encode(password);
        const keyMaterial = await crypto.subtle.importKey('raw', pw, {name:'PBKDF2'}, false, ['deriveKey']);
        return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations: 100000, hash: 'SHA-256'}, keyMaterial, {name:'AES-GCM', length: 256}, true, ['encrypt','decrypt']);
    }

    function randomSalt() { return crypto.getRandomValues(new Uint8Array(16)); }
    function toB64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
    function fromB64(str){ const s = atob(str); const arr = new Uint8Array(s.length); for(let i=0;i<s.length;i++) arr[i]=s.charCodeAt(i); return arr; }

    async function encryptProfile(password, profileObj){
        const salt = randomSalt();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);
        const data = encoder.encode(JSON.stringify(profileObj));
        const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, data);
        return { salt: toB64(salt), iv: toB64(iv), cipher: toB64(cipher) };
    }

    async function decryptProfile(password, stored){
        try{
            const salt = fromB64(stored.salt);
            const iv = fromB64(stored.iv);
            const key = await deriveKey(password, salt);
            const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, fromB64(stored.cipher));
            const dec = new TextDecoder().decode(plain);
            return JSON.parse(dec);
        }catch(e){ return null; }
    }

    function storeEncrypted(email, payload){
        localStorage.setItem('tax_user_' + email.toLowerCase(), JSON.stringify(payload));
    }

    function getStored(email){
        const raw = localStorage.getItem('tax_user_' + email.toLowerCase());
        return raw ? JSON.parse(raw) : null;
    }

    function setSession(email){
        sessionStorage.setItem('tax_current_user', email.toLowerCase());
    }

    function clearSession(){ sessionStorage.removeItem('tax_current_user'); }

    function getSession(){ return sessionStorage.getItem('tax_current_user'); }

    // Send MFA code via backend email
    async function sendMfaCode(email){
        const code = Math.floor(100000 + Math.random()*900000).toString();
        sessionStorage.setItem('tax_mfa_' + email.toLowerCase(), code);
        
        try {
            // Send to backend to email user
            const response = await fetch('http://localhost:3001/api/send-mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, mfaCode: code })
            });
            
            const result = await response.json();
            if (result.success) {
                alert(`✅ Verification code sent to:\n${email}\n\nCheck your email for the 6-digit code.`);
            } else {
                alert(`⚠️ Verification code generated but email send failed.\n\nCode: ${code}\n\n(Backend may not be running)`);
            }
        } catch (error) {
            console.warn('Backend not available, showing code in alert:', error);
            alert(`✅ Verification Code:\n\n${code}\n\n(Backend not configured)\n\nEnter this code to verify your account.`);
        }
        
        return code;
    }

    // Exposed helper: request a password reset code via backend email
    async function requestPasswordReset(email){
        // Reuse sendMfaCode which stores the code locally and attempts to email via backend
        return sendMfaCode(email);
    }

    function verifyMfa(email, code){
        const stored = sessionStorage.getItem('tax_mfa_' + email.toLowerCase());
        return stored && stored === code;
    }

    return {
        async register(email, password, profile){
            if(getStored(email)) throw new Error('Account already exists');
            const enc = await encryptProfile(password, profile);
            storeEncrypted(email, enc);
            return true;
        },
        async login(email, password){
            const stored = getStored(email);
            if(!stored) throw new Error('No account');
            const profile = await decryptProfile(password, stored);
            if(!profile) throw new Error('Invalid credentials');
            // send MFA
            sendMfaCode(email);
            // hold decrypted profile in session (temporary) — in production use server-side session
            sessionStorage.setItem('tax_profile_' + email.toLowerCase(), JSON.stringify(profile));
            sessionStorage.setItem('tax_pending_auth', email.toLowerCase());
            return true;
        },
        verifyMfaCode(email, code){
            if(verifyMfa(email, code)){
                setSession(email);
                sessionStorage.removeItem('tax_pending_auth');
                sessionStorage.removeItem('tax_mfa_' + email.toLowerCase());
                return true;
            }
            return false;
        },
        // Reset password: overwrite encrypted profile for `email` using newPassword and provided profile data
        async resetPassword(email, newPassword, profileObj){
            // This flow will create a new encrypted profile using the provided profileObj and newPassword.
            // NOTE: If you do not provide profileObj that matches the previous account, previous data cannot be recovered from the encrypted blob.
            const enc = await encryptProfile(newPassword, profileObj || {});
            storeEncrypted(email, enc);
            return true;
        },
        logout(){ clearSession(); },
        isAuthenticated(){ return !!getSession(); },
        getCurrentUserProfile(){
            const email = getSession(); if(!email) return null;
            const raw = sessionStorage.getItem('tax_profile_' + email);
            return raw ? JSON.parse(raw) : null;
        },
        // For demo/testing: pre-seed a user
        async seedTestUser(){
            const email = 'demo@example.com';
            if(getStored(email)) return;
            const pw = 'Test@1234';
            const profile = { name: 'Demo User', dob: '1990-01-01', ssn_last4: '0000', agi_lastyear: 25000, ip_pin: '000000' };
            const enc = await encryptProfile(pw, profile);
            storeEncrypted(email, enc);
            console.info('Seeded demo user: demo@example.com / Test@1234');
        }
    };
})();

// Expose Auth globally
window.Auth = Auth;
