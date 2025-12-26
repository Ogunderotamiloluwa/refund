
document.addEventListener('DOMContentLoaded', () => {
    if (!window.Auth) {
        console.error("Critical: Auth.js not found.");
        return;
    }

    let pendingUserEmail = "";
    let authMode = ""; 
    let currentStep = 1;
    let lastFocusedElement = null;

    // UI Element Mapping
    const ui = {
        authModal: document.getElementById('auth-modal'),
        loginForm: document.getElementById('login-form'),
        regForm: document.getElementById('register-form'),
        mfaForm: document.getElementById('mfa-form'),
        forgotForm: document.getElementById('forgot-form'), 
        resetForm: document.getElementById('reset-form'),   
        
        loginBtnTop: document.getElementById('btn-show-login'),
        regBtnTop: document.getElementById('btn-show-register'),
        logoutBtnTop: document.getElementById('btn-logout-top'),
        authBtnsInitial: document.getElementById('auth-buttons-initial'),
        
        refundForm: document.getElementById('refund-form'),
        progressBar: document.getElementById('progress-bar'),
        portalTitle: document.getElementById('portal-title'),
        formSections: document.querySelectorAll('.step-content'),
        progressBarSteps: document.querySelectorAll('.step'),
        nextBtn: document.getElementById('nextBtn'),
        prevBtn: document.getElementById('prevBtn'),
        submitBtn: document.getElementById('submitBtn'),
        
        forgotPasswordLink: document.getElementById('forgot-link'),
        closeModalBtns: document.querySelectorAll('#btn-cancel-auth, #btn-cancel-login, #btn-forgot-cancel, #btn-reset-cancel'),
        
        finalPage: document.getElementById('final-results-page'),

        mfaCodeInput: document.getElementById('mfa-code'),
        resetCodeInput: document.getElementById('reset-code'),
        mfaErrorMsg: document.getElementById('mfa-error-msg'),
        mfaVerifyBtn: document.getElementById('btn-verify-mfa'),

        // PIN-styled password fields
        regPass: document.getElementById('reg-password'),
        loginPass: document.getElementById('login-password'),
        resetPass: document.getElementById('reset-password')
    };

    function updateUIState() {
        const isAuth = window.Auth.isAuthenticated();
        const currentUser = sessionStorage.getItem('tax_current_user');

        const sessionDisplay = document.getElementById('user-session-display');
        const emailText = document.getElementById('session-email-text');

        if (ui.loginBtnTop) ui.loginBtnTop.style.display = isAuth ? 'none' : 'inline-block';
        if (ui.regBtnTop) ui.regBtnTop.style.display = isAuth ? 'none' : 'inline-block';
        if (ui.authBtnsInitial) ui.authBtnsInitial.style.display = isAuth ? 'none' : 'block';
        
        if (isAuth && currentUser) {
            if (sessionDisplay) sessionDisplay.style.display = 'block';
            if (emailText) emailText.textContent = currentUser;
        } else {
            if (sessionDisplay) sessionDisplay.style.display = 'none';
        }

        if (ui.portalTitle) {
            ui.portalTitle.textContent = isAuth 
                ? "Federal Refund Disbursement Application" 
                : "Authorized Portal Access Required";
        }
    }

    function showAuthForm(formElement) {
        const forms = [ui.loginForm, ui.regForm, ui.mfaForm, ui.forgotForm, ui.resetForm];
        forms.forEach(f => { if(f) f.style.display = 'none'; });
        if (formElement) {
            formElement.style.display = 'block';
            const firstInput = formElement.querySelector('input:not([readonly])');
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        }
    }

    function openModal(specificForm) {
        if (ui.authModal) {
            lastFocusedElement = document.activeElement;
            ui.authModal.style.display = 'flex';
            ui.authModal.removeAttribute('aria-hidden'); 
            showAuthForm(specificForm);
        }
    }

    function closeModal() {
        if (ui.mfaForm && ui.mfaForm.style.display === 'block' && !window.Auth.isAuthenticated()) {
            return; 
        }
        if (ui.authModal) {
            if (lastFocusedElement) lastFocusedElement.focus();
            ui.authModal.style.display = 'none';
            ui.authModal.setAttribute('aria-hidden', 'true');
        }
        const inputs = ui.authModal ? ui.authModal.querySelectorAll('input') : [];
        inputs.forEach(i => { 
            if (!i.readOnly) i.value = ""; 
            i.style.borderColor = ""; 
        });
        if (ui.mfaErrorMsg) ui.mfaErrorMsg.style.display = 'none';
    }

    function navigateToStep(stepNum) {
        if (!ui.formSections.length) return;
        ui.formSections.forEach(sec => {
            sec.style.display = (parseInt(sec.dataset.step) === stepNum) ? 'block' : 'none';
        });
        ui.progressBarSteps.forEach(step => {
            const sNum = parseInt(step.dataset.step);
            step.classList.toggle('active', sNum === stepNum);
            step.classList.toggle('completed', sNum < stepNum);
        });
        currentStep = stepNum;
        if (ui.prevBtn) ui.prevBtn.disabled = (currentStep === 1);
        if (ui.nextBtn) ui.nextBtn.style.display = (currentStep === 5) ? 'none' : 'inline-block';
        if (ui.submitBtn) ui.submitBtn.style.display = (currentStep === 5) ? 'inline-block' : 'none';
        if (currentStep === 5) updateSummary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function validateCurrentStep() {
        const currentSection = document.querySelector(`.step-content[data-step="${currentStep}"]`);
        if (!currentSection) return true;
        const requiredInputs = currentSection.querySelectorAll('input[required], select[required]');
        let isValid = true;
        requiredInputs.forEach(input => {
            let fieldValid = true;
            if (input.type === 'radio') {
                const name = input.name;
                const checked = currentSection.querySelector(`input[name="${name}"]:checked`);
                if (!checked) fieldValid = false;
            } else if (!input.value.trim()) {
                fieldValid = false;
            }
            if (!fieldValid) {
                isValid = false;
                input.classList.add('error-border');
            } else {
                input.classList.remove('error-border');
            }
        });
        if (!isValid) alert("Error: Please complete all required sections on this page before proceeding.");
        return isValid;
    }

    function updateSummary() {
        const summaryFields = { 'review-name': 'full-name', 'review-year': 'tax-year', 'review-income': 'gross-income', 'review-withheld': 'tax-withheld' };
        for (const [displayId, inputId] of Object.entries(summaryFields)) {
            const displayEl = document.getElementById(displayId);
            const inputVal = document.getElementById(inputId)?.value;
            if (displayEl) displayEl.textContent = inputVal || "---";
        }
        const hasDep = document.querySelector('input[name="dependents"]:checked')?.value || "no";
        const count = document.getElementById('dependents-count').value;
        document.getElementById('review-dependents').textContent = hasDep === 'yes' ? `${count} Dependents` : "None";
    }

    // PIN Entry restrictions for all password and code fields
    const pinFields = [ui.mfaCodeInput, ui.resetCodeInput, ui.regPass, ui.loginPass, ui.resetPass];
    pinFields.forEach(input => {
        if (input) {
            input.oninput = (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (ui.mfaErrorMsg) ui.mfaErrorMsg.style.display = 'none';
                e.target.style.borderColor = "";
            };
        }
    });

    if (ui.loginBtnTop) ui.loginBtnTop.onclick = () => openModal(ui.loginForm);
    if (ui.regBtnTop) ui.regBtnTop.onclick = () => openModal(ui.regForm);
    
    ui.closeModalBtns.forEach(btn => {
        btn.onclick = (e) => { 
            e.preventDefault(); 
            if (ui.mfaForm.style.display !== 'block' || window.Auth.isAuthenticated()) closeModal(); 
            else alert("Security Note: Identity verification is required for access.");
        };
    });

    if (ui.forgotPasswordLink) ui.forgotPasswordLink.onclick = (e) => { e.preventDefault(); showAuthForm(ui.forgotForm); };

    if (ui.nextBtn) {
        ui.nextBtn.onclick = (e) => {
            e.preventDefault();
            if (!window.Auth.isAuthenticated()) {
                alert("Identity Verification Required: Please sign in or create an account to proceed.");
                openModal(ui.loginForm);
                return;
            }
            if (validateCurrentStep()) navigateToStep(currentStep + 1);
        };
    }

    if (ui.prevBtn) ui.prevBtn.onclick = (e) => { e.preventDefault(); if (currentStep > 1) navigateToStep(currentStep - 1); };

    if (ui.authModal) {
        ui.authModal.onclick = (e) => { 
            if (e.target === ui.authModal) {
                if (ui.mfaForm.style.display !== 'block' || window.Auth.isAuthenticated()) closeModal();
            }
        };
    }

    const btnLogAction = document.getElementById('btn-login');
    if (btnLogAction) {
        btnLogAction.onclick = async () => {
            const email = document.getElementById('login-email').value;
            const pass = ui.loginPass.value;
            if (!email || !pass || pass.length !== 6) return alert("6-digit PIN required.");
            try {
                btnLogAction.disabled = true;
                btnLogAction.textContent = "Processing...";
                await window.Auth.login(email, pass);
                pendingUserEmail = email;
                authMode = "login";
                showAuthForm(ui.mfaForm);
            } catch (e) { 
                alert(e.message); 
            }
            finally { btnLogAction.disabled = false; btnLogAction.textContent = "Sign In"; }
        };
    }

    const btnRegAction = document.getElementById('btn-register');
    if (btnRegAction) {
        btnRegAction.onclick = async () => {
            const email = document.getElementById('reg-email').value;
            const pass = ui.regPass.value;
            const name = document.getElementById('reg-name').value;
            if (!email || !pass || pass.length !== 6 || !name) return alert("Required fields missing or PIN invalid.");
            try {
                btnRegAction.disabled = true;
                btnRegAction.textContent = "Creating Account...";
                await window.Auth.register(email, pass, { name });
                pendingUserEmail = email;
                authMode = "register";
                showAuthForm(ui.mfaForm);
            } catch (e) { 
                alert(e.message); 
            }
            finally { btnRegAction.disabled = false; btnRegAction.textContent = "Register ID"; }
        };
    }

    const btnForgotSend = document.getElementById('btn-forgot-send');
    if (btnForgotSend) {
        btnForgotSend.onclick = async () => {
            const email = document.getElementById('forgot-email').value;
            if (!email) return alert("Recovery email missing.");
            try {
                btnForgotSend.disabled = true;
                btnForgotSend.textContent = "Processing...";
                await window.Auth.sendCode(email, "Recovery");
                pendingUserEmail = email;
                authMode = "reset";
                document.getElementById('reset-email').value = email;
                showAuthForm(ui.resetForm);
            } catch (e) { alert(e.message); }
            finally { btnForgotSend.disabled = false; btnForgotSend.textContent = "Send Verification Code"; }
        };
    }

    const btnResetSubmit = document.getElementById('btn-reset-submit');
    if (btnResetSubmit) {
        btnResetSubmit.onclick = () => {
            const code = ui.resetCodeInput.value;
            const newPass = ui.resetPass.value;
            if (!code || code.length !== 6) return alert("Please enter the 6-digit PIN.");
            if (!newPass || newPass.length !== 6) return alert("Please enter a new 6-digit PIN password.");
            if (window.Auth.verifyMfa(pendingUserEmail, code)) {
                const data = JSON.parse(localStorage.getItem('tax_user_' + pendingUserEmail.toLowerCase()));
                if (data) {
                    data.password = newPass;
                    localStorage.setItem('tax_user_' + pendingUserEmail.toLowerCase(), JSON.stringify(data));
                    alert("Success: Password has been updated. Please Sign In.");
                    showAuthForm(ui.loginForm);
                }
            } else { 
                alert("Error: Security PIN is incorrect."); 
                ui.resetCodeInput.style.borderColor = '#d63031';
            }
        };
    }

    if (ui.mfaVerifyBtn) {
        ui.mfaVerifyBtn.onclick = () => {
            const code = ui.mfaCodeInput.value;
            if (window.Auth.verifyMfa(pendingUserEmail, code)) {
                if (authMode === "register") {
                    alert("Identity Verified! Registration complete. Please Sign In.");
                    showAuthForm(ui.loginForm);
                    ui.mfaCodeInput.value = "";
                } else {
                    window.Auth.setSession(pendingUserEmail);
                    closeModal();
                    updateUIState();
                    navigateToStep(1);
                }
            } else {
                if (ui.mfaErrorMsg) ui.mfaErrorMsg.style.display = 'block';
                ui.mfaCodeInput.style.borderColor = '#d63031';
            }
        };
    }

    if (ui.refundForm) {
        ui.refundForm.onsubmit = (e) => {
            e.preventDefault();
            if (!document.getElementById('consent').checked) return alert("Legal declaration consent is mandatory.");
            const income = parseFloat(document.getElementById('gross-income').value) || 0;
            const refund = (income * 0.12).toFixed(2);
            document.getElementById('display-refund-amount').textContent = refund;
            document.getElementById('display-app-id').textContent = 'US-T-' + Math.floor(100000 + Math.random() * 900000);
            ui.refundForm.style.display = 'none';
            if (ui.progressBar) ui.progressBar.style.display = 'none';
            if (ui.portalTitle) ui.portalTitle.style.display = 'none';
            ui.finalPage.style.display = 'block';
        };
    }

    document.querySelectorAll('input[name="dependents"]').forEach(radio => {
        radio.onchange = () => {
            const box = document.getElementById('dep-count-box');
            if (box) box.style.display = (radio.value === 'yes') ? 'block' : 'none';
        };
    });

    updateUIState();
    navigateToStep(1);
});
