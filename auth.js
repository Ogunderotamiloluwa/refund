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

    // Simulate MFA: store single code in sessionStorage
    function sendMfaCode(email){
        const code = Math.floor(100000 + Math.random()*900000).toString();
        sessionStorage.setItem('tax_mfa_' + email.toLowerCase(), code);
        // In real world, send via SMS/email. Here we log to console for demo.
        console.info('Simulated MFA code for', email, code);
        return code;
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
