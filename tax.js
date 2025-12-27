
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
        resetCodeInput: document.getElementById('reset-code'),

        // Error message elements
        loginError: document.getElementById('login-error'),
        registerError: document.getElementById('register-error'),
        forgotError: document.getElementById('forgot-error'),
        resetError: document.getElementById('reset-error'),
        refundError: document.getElementById('refund-error')
    };

    function clearErrors() {
        [ui.loginError, ui.registerError, ui.forgotError, ui.resetError, ui.mfaErrorMsg, ui.refundError].forEach(el => {
            if (el) {
                el.style.display = 'none';
                el.textContent = '';
            }
        });
    }

    function showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

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
        clearErrors();
        [ui.loginForm, ui.regForm, ui.mfaForm, ui.forgotForm, ui.resetForm].forEach(f => {
            if(f) f.style.display = 'none';
        });
        if (formElement) formElement.style.display = 'block';
    }

    function openModal(specificForm) {
        if (ui.authModal) {
            ui.authModal.style.display = 'flex';
            showAuthForm(specificForm);
        }
    }

    function closeModal() {
        if (ui.mfaForm && ui.mfaForm.style.display === 'block' && !window.Auth.isAuthenticated()) return;
        if (ui.authModal) ui.authModal.style.display = 'none';
        clearErrors();
    }

    // PIN inputs numeric entry
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
                showError(ui.refundError, "Identity Verification Required: Please sign in to proceed.");
                openModal(ui.loginForm);
                return;
            }
            if (validateCurrentStep()) navigateToStep(currentStep + 1);
        };
    }

    if (ui.prevBtn) ui.prevBtn.onclick = (e) => { e.preventDefault(); if (currentStep > 1) navigateToStep(currentStep - 1); };

    function navigateToStep(stepNum) {
        clearErrors();
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
        if (!isValid) showError(ui.refundError, "Form Incomplete: Please fill all required fields highlighted in red.");
        return isValid;
    }

    function updateSummary() {
        const fields = { 
            'review-name': 'full-name', 
            'review-year': 'tax-year', 
            'review-income': 'gross-income', 
            'review-withheld': 'tax-withheld' 
        };
        for (const [displayId, inputId] of Object.entries(fields)) {
            const el = document.getElementById(displayId);
            if (el) el.textContent = document.getElementById(inputId)?.value || "---";
        }
        const depCount = document.getElementById('dependents-count')?.value || "0";
        const hasDeps = document.querySelector('input[name="dependents"]:checked')?.value;
        const reviewDeps = document.getElementById('review-dependents');
        if (reviewDeps) reviewDeps.textContent = hasDeps === 'yes' ? depCount : "0";
    }

    document.getElementById('btn-login').onclick = async () => {
        clearErrors();
        const email = document.getElementById('login-email').value;
        const pass = ui.loginPass.value.trim(); 
        const btn = document.getElementById('btn-login');

        if (!email || pass.length < 8) {
            showError(ui.loginError, "Access Denied: Email and Password (8+ characters) are required.");
            return;
        }

        const originalText = btn.textContent;
        btn.textContent = "Verifying Credentials...";
        btn.disabled = true;

        try {
            await window.Auth.login(email, pass);
            pendingUserEmail = email;
            authMode = "login";
            showAuthForm(ui.mfaForm);
        } catch (e) { 
            showError(ui.loginError, e.message); 
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    };

    document.getElementById('btn-register').onclick = async () => {
        clearErrors();
        const email = document.getElementById('reg-email').value;
        const pass = ui.regPass.value.trim();
        const name = document.getElementById('reg-name').value;
        const dob = document.getElementById('reg-dob').value;
        const btn = document.getElementById('btn-register');

        if (!email || pass.length < 8 || !name || !dob) {
            showError(ui.registerError, "Registration Incomplete: All fields are mandatory. Password must be 8+ characters.");
            return;
        }

        const originalText = btn.textContent;
        btn.textContent = "Creating Secure ID...";
        btn.disabled = true;

        try {
            await window.Auth.register(email, pass, { name, dob });
            pendingUserEmail = email;
            authMode = "register";
            showAuthForm(ui.mfaForm);
        } catch (e) { 
            showError(ui.registerError, e.message); 
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    };

    if (ui.mfaVerifyBtn) {
        ui.mfaVerifyBtn.onclick = () => {
            const code = ui.mfaCodeInput.value;
            if (window.Auth.verifyMfa(pendingUserEmail, code)) {
                if (authMode === "register") {
                    showAuthForm(ui.loginForm);
                    showError(ui.loginError, "Identity Verified! You can now sign in to your new portal account.");
                } else {
                    window.Auth.setSession(pendingUserEmail);
                    closeModal();
                    updateUIState();
                    navigateToStep(1);
                }
            } else {
                showError(ui.mfaErrorMsg, "Verification Failed: The PIN entered is incorrect. Please check your email inbox.");
            }
        };
    }

    const btnForgotSend = document.getElementById('btn-forgot-send');
    if (btnForgotSend) {
        btnForgotSend.onclick = async () => {
            clearErrors();
            const email = document.getElementById('forgot-email').value;
            if (!email) return showError(ui.forgotError, "Required: Please enter your registered email address.");
            
            btnForgotSend.textContent = "Dispatching Code...";
            btnForgotSend.disabled = true;
            try {
                const success = await window.Auth.sendCode(email, 'Reset');
                if (success) {
                    pendingUserEmail = email;
                    document.getElementById('reset-email').value = email;
                    showAuthForm(ui.resetForm);
                }
            } catch (e) {
                showError(ui.forgotError, e.message);
            } finally {
                btnForgotSend.textContent = "Send Code";
                btnForgotSend.disabled = false;
            }
        };
    }

    const btnResetSubmit = document.getElementById('btn-reset-submit');
    if (btnResetSubmit) {
        btnResetSubmit.onclick = async () => {
            clearErrors();
            const code = ui.resetCodeInput.value;
            const newPass = ui.resetPass.value.trim();
            if (!code || newPass.length < 8) return showError(ui.resetError, "Invalid Input: Enter the 6-digit code and a new password (8+ chars).");
            
            if (window.Auth.verifyMfa(pendingUserEmail, code)) {
                const data = JSON.parse(localStorage.getItem('tax_user_' + pendingUserEmail.toLowerCase().trim()) || '{}');
                data.password = newPass;
                localStorage.setItem('tax_user_' + pendingUserEmail.toLowerCase().trim(), JSON.stringify(data));
                showAuthForm(ui.loginForm);
                showError(ui.loginError, "Security Update: Your password has been successfully reset. Please log in.");
            } else {
                showError(ui.resetError, "Invalid Reset Code: The PIN entered does not match our records.");
            }
        };
    }

    if (ui.refundForm) {
        ui.refundForm.onsubmit = (e) => {
            e.preventDefault();
            clearErrors();
            if (!document.getElementById('consent').checked) {
                showError(ui.refundError, "Legal Requirement: You must accept the declaration to submit.");
                return;
            }
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
