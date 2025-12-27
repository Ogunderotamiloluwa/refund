
document.addEventListener('DOMContentLoaded', () => {
    if (!window.Auth) {
        console.error("Critical: Auth.js not found.");
        return;
    }

    let pendingUserEmail = "";
    let authMode = ""; 
    let currentStep = 1;

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
        mfaErrorMsg: document.getElementById('mfa-error-msg'),
        mfaVerifyBtn: document.getElementById('btn-verify-mfa'),

        regPass: document.getElementById('reg-password'),
        loginPass: document.getElementById('login-password'),
        resetPass: document.getElementById('reset-password'),
        resetCodeInput: document.getElementById('reset-code')
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
            if (sessionDisplay) {
                sessionDisplay.style.display = 'flex';
                if (emailText) emailText.textContent = currentUser;
            }
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
        [ui.loginForm, ui.regForm, ui.mfaForm, ui.forgotForm, ui.resetForm].forEach(f => {
            if(f) f.style.display = 'none';
        });
        if (formElement) formElement.style.display = 'block';
    }

    function openModal(specificForm) {
        if (ui.authModal) {
            ui.authModal.style.display = 'flex';
            ui.authModal.setAttribute('aria-hidden', 'false');
            showAuthForm(specificForm);
            // Move focus into the modal to the first focusable element
            setTimeout(() => {
                try {
                    const first = (specificForm && specificForm.querySelector) ? specificForm.querySelector('input, button, [tabindex]') : null;
                    if (first) first.focus();
                } catch (e) { /* ignore focus errors */ }
            }, 50);
        }
    }

    function closeModal() {
        if (ui.mfaForm && ui.mfaForm.style.display === 'block' && !window.Auth.isAuthenticated()) return;
        if (ui.authModal) {
            // If a descendant inside the modal currently has focus, blur it first
            try {
                if (document.activeElement && ui.authModal.contains(document.activeElement)) {
                    document.activeElement.blur();
                }
            } catch (e) { /* ignore */ }

            // Return focus to a logical control outside the modal (login or register button), if present
            try {
                const fallback = ui.loginBtnTop || ui.regBtnTop;
                if (fallback && typeof fallback.focus === 'function') fallback.focus();
            } catch (e) { /* ignore */ }

            ui.authModal.setAttribute('aria-hidden', 'true');
            ui.authModal.style.display = 'none';
        }
    }

    // Only MFA codes are restricted to numeric PIN entry
    [ui.mfaCodeInput, ui.resetCodeInput].forEach(input => {
        if (input) {
            input.oninput = (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            };
        }
    });

    if (ui.loginBtnTop) ui.loginBtnTop.onclick = () => openModal(ui.loginForm);
    if (ui.regBtnTop) ui.regBtnTop.onclick = () => openModal(ui.regForm);
    
    ui.closeModalBtns.forEach(btn => {
        btn.onclick = (e) => { 
            e.preventDefault(); 
            closeModal();
        };
    });

    if (ui.forgotPasswordLink) ui.forgotPasswordLink.onclick = (e) => { e.preventDefault(); showAuthForm(ui.forgotForm); };

    if (ui.nextBtn) {
        ui.nextBtn.onclick = (e) => {
            e.preventDefault();
            if (!window.Auth.isAuthenticated()) {
                alert("Identity Verification Required: Please sign in to proceed.");
                openModal(ui.loginForm);
                return;
            }
            if (validateCurrentStep()) navigateToStep(currentStep + 1);
        };
    }

    if (ui.prevBtn) ui.prevBtn.onclick = (e) => { e.preventDefault(); if (currentStep > 1) navigateToStep(currentStep - 1); };

    function navigateToStep(stepNum) {
        ui.formSections.forEach(sec => sec.style.display = (parseInt(sec.dataset.step) === stepNum) ? 'block' : 'none');
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
            if (!input.value.trim() && input.type !== 'radio') {
                isValid = false;
                input.classList.add('error-border');
            } else if (input.type === 'radio') {
                const name = input.name;
                if (!currentSection.querySelector(`input[name="${name}"]:checked`)) isValid = false;
            } else {
                input.classList.remove('error-border');
            }
        });
        if (!isValid) alert("Error: Required fields are missing.");
        return isValid;
    }

    function updateSummary() {
        const fields = { 'review-name': 'full-name', 'review-year': 'tax-year', 'review-income': 'gross-income', 'review-withheld': 'tax-withheld' };
        for (const [displayId, inputId] of Object.entries(fields)) {
            const el = document.getElementById(displayId);
            if (el) el.textContent = document.getElementById(inputId)?.value || "---";
        }
    }

    document.getElementById('btn-login').onclick = async () => {
        const email = document.getElementById('login-email').value;
        const pass = ui.loginPass.value;
        const alnum = /^[A-Za-z0-9]+$/;
        if (!email || pass.length < 8 || !alnum.test(pass)) return alert("Credentials required. Password must be at least 8 characters and alphanumeric.");
        try {
            await window.Auth.login(email, pass);
            pendingUserEmail = email;
            authMode = "login";
            showAuthForm(ui.mfaForm);
        } catch (e) { alert(e.message); }
    };

    document.getElementById('btn-register').onclick = async () => {
        const email = document.getElementById('reg-email').value;
        const pass = ui.regPass.value;
        const name = document.getElementById('reg-name').value;
        const alnum = /^[A-Za-z0-9]+$/;
        if (!email || pass.length < 8 || !alnum.test(pass) || !name) return alert("Please complete all registration fields. Password must be at least 8 characters and alphanumeric.");
        try {
            await window.Auth.register(email, pass, { name });
            pendingUserEmail = email;
            authMode = "register";
            showAuthForm(ui.mfaForm);
        } catch (e) { alert(e.message); }
    };

    if (ui.mfaVerifyBtn) {
        ui.mfaVerifyBtn.onclick = () => {
            const code = ui.mfaCodeInput.value;
            if (window.Auth.verifyMfa(pendingUserEmail, code)) {
                if (authMode === "register") {
                    alert("Account Verified! Please Sign In.");
                    showAuthForm(ui.loginForm);
                } else {
                    window.Auth.setSession(pendingUserEmail);
                    closeModal();
                    updateUIState();
                    navigateToStep(1);
                }
            } else {
                if (ui.mfaErrorMsg) ui.mfaErrorMsg.style.display = 'block';
            }
        };
    }

    if (ui.refundForm) {
        ui.refundForm.onsubmit = (e) => {
            e.preventDefault();
            if (!document.getElementById('consent').checked) return alert("Final consent is required.");
            const income = parseFloat(document.getElementById('gross-income').value) || 0;
            document.getElementById('display-refund-amount').textContent = (income * 0.12).toFixed(2);
            document.getElementById('display-app-id').textContent = 'TAX-' + Math.floor(100000 + Math.random() * 900000);
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
});
