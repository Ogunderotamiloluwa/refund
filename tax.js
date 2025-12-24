
document.addEventListener('DOMContentLoaded', () => {
    // Check if Auth is loaded
    if (!window.Auth) {
        console.error("Auth.js failed to load. Please check the file path.");
        return;
    }

    let currentStep = 1;
    let pendingUserEmail = "";
    let authMode = ""; 

    const ui = {
        authModal: document.getElementById('auth-modal'),
        loginForm: document.getElementById('login-form'),
        regForm: document.getElementById('register-form'),
        mfaForm: document.getElementById('mfa-form'),
        nextBtn: document.getElementById('nextBtn'),
        prevBtn: document.getElementById('prevBtn'),
        submitBtn: document.getElementById('submitBtn'),
        loginBtnTop: document.getElementById('btn-show-login'),
        regBtnTop: document.getElementById('btn-show-register'),
        logoutBtnTop: document.getElementById('btn-logout'),
        userDisplay: document.getElementById('user-info-display'),
    };

    function updateUIState() {
        const isAuth = window.Auth.isAuthenticated();
        if (ui.loginBtnTop) ui.loginBtnTop.style.display = isAuth ? 'none' : 'inline-block';
        if (ui.regBtnTop) ui.regBtnTop.style.display = isAuth ? 'none' : 'inline-block';
        if (ui.logoutBtnTop) ui.logoutBtnTop.style.display = isAuth ? 'inline-block' : 'none';
        if (ui.userDisplay) ui.userDisplay.textContent = isAuth ? sessionStorage.getItem('tax_current_user') : "";
    }

    function showForm(view) {
        [ui.loginForm, ui.regForm, ui.mfaForm].forEach(f => { if(f) f.style.display = 'none'; });
        if (view) view.style.display = 'block';
    }

    // --- Buttons ---
    if (ui.loginBtnTop) ui.loginBtnTop.onclick = () => { ui.authModal.style.display = 'flex'; showForm(ui.loginForm); };
    if (ui.regBtnTop) ui.regBtnTop.onclick = () => { ui.authModal.style.display = 'flex'; showForm(ui.regForm); };
    if (ui.logoutBtnTop) ui.logoutBtnTop.onclick = () => window.Auth.logout();

    // --- Actions ---
    const btnRegAction = document.getElementById('btn-register');
    if (btnRegAction) {
        btnRegAction.onclick = async () => {
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            const name = document.getElementById('reg-name').value;
            
            if (!email || !pass || !name) return alert("All fields are required.");
            
            try {
                btnRegAction.disabled = true;
                btnRegAction.textContent = "Sending Code...";
                await window.Auth.register(email, pass, { name });
                pendingUserEmail = email;
                authMode = "register";
                showForm(ui.mfaForm);
            } catch (e) { 
                alert(e.message); 
            } finally {
                btnRegAction.disabled = false;
                btnRegAction.textContent = "Register";
            }
        };
    }

    const btnLogAction = document.getElementById('btn-login');
    if (btnLogAction) {
        btnLogAction.onclick = async () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            try {
                btnLogAction.disabled = true;
                btnLogAction.textContent = "Sending Code...";
                await window.Auth.login(email, pass);
                pendingUserEmail = email;
                authMode = "login";
                showForm(ui.mfaForm);
            } catch (e) { 
                alert(e.message); 
            } finally {
                btnLogAction.disabled = false;
                btnLogAction.textContent = "Login";
            }
        };
    }

    const btnVerifyAction = document.getElementById('btn-verify-mfa');
    if (btnVerifyAction) {
        btnVerifyAction.onclick = () => {
            const code = document.getElementById('mfa-code').value;
            if (window.Auth.verifyMfa(pendingUserEmail, code)) {
                if (authMode === "register") {
                    alert("Account verified! You can now log in.");
                    showForm(ui.loginForm);
                } else {
                    window.Auth.setSession(pendingUserEmail);
                    ui.authModal.style.display = 'none';
                    updateUIState();
                    alert("Welcome back!");
                }
            } else {
                alert("Incorrect code. Please check your email.");
            }
        };
    }

    updateUIState();
});
