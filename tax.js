
document.addEventListener('DOMContentLoaded', () => {
    if (!window.Auth) {
        console.error("Critical: Auth.js missing.");
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
        authBtnsInitial: document.getElementById('auth-buttons-initial'),
        
        refundForm: document.getElementById('refund-form'),
        progressBar: document.getElementById('progress-bar'),
        progressFill: document.getElementById('progress-fill'),
        portalTitle: document.getElementById('portal-title'),
        formSections: document.querySelectorAll('.step-content'),
        nextBtn: document.getElementById('nextBtn'),
        prevBtn: document.getElementById('prevBtn'),
        submitBtn: document.getElementById('submitBtn'),
        currentStepSpan: document.getElementById('current-step-num'),
        
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

        // Error elements for on-page display (no alerts)
        loginError: document.getElementById('login-error'),
        registerError: document.getElementById('register-error'),
        forgotError: document.getElementById('forgot-error'),
        resetError: document.getElementById('reset-error'),
        refundError: document.getElementById('refund-error')
    };

    function clearErrors() {
        [ui.loginError, ui.registerError, ui.forgotError, ui.resetError, ui.mfaErrorMsg, ui.refundError].forEach(el => {
            if (el) { el.style.display = 'none'; el.textContent = ''; }
        });
    }

    function showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            // Smooth scroll to the error on mobile for visibility
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
        if (ui.authBtnsInitial) ui.authBtnsInitial.style.display = isAuth ? 'none' : 'flex';
        
        if (isAuth && currentUser) {
            if (sessionDisplay) {
                sessionDisplay.style.display = 'flex';
                if (emailText) emailText.textContent = currentUser;
            }
        } else if (sessionDisplay) {
            sessionDisplay.style.display = 'none';
        }

        if (ui.portalTitle) {
            ui.portalTitle.textContent = isAuth ? "Refund Disbursement Application" : "Access Authorization Required";
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

    // PIN restricted to numbers - optimized for mobile inputmode
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
        btn.onclick = (e) => { e.preventDefault(); closeModal(); };
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
        currentStep = stepNum;
        if (ui.currentStepSpan) ui.currentStepSpan.textContent = currentStep;
        if (ui.progressFill) ui.progressFill.style.width = (currentStep * 20) + '%';
        
        if (ui.prevBtn) ui.prevBtn.disabled = (currentStep === 1);
        if (ui.nextBtn) ui.nextBtn.style.display = (currentStep === 5) ? 'none' : 'inline-block';
        if (ui.submitBtn) ui.submitBtn.style.display = (currentStep === 5) ? 'inline-block' : 'none';
        
        if (currentStep === 5) populateSummary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function validateCurrentStep() {
        const currentSection = document.querySelector(`.step-content[data-step="${currentStep}"]`);
        if (!currentSection) return true;
        const inputs = currentSection.querySelectorAll('input[required], select[required]');
        let valid = true;
        
        inputs.forEach(i => {
            if (!i.value.trim() && i.type !== 'radio') {
                valid = false; i.classList.add('error-border');
            } else if (i.type === 'radio') {
                const group = document.getElementsByName(i.name);
                let checked = false;
                for(let r of group) if(r.checked) checked = true;
                if(!checked) valid = false;
            } else {
                i.classList.remove('error-border');
            }
        });
        
        if (!valid) showError(ui.refundError, "Error: Required application fields are missing. Please complete the section.");
        return valid;
    }

    function populateSummary() {
        const summary = document.getElementById('review-summary');
        if (summary) {
            const name = document.getElementById('full-name').value || "---";
            const agi = document.getElementById('gross-income').value || "0.00";
            const bank = document.getElementById('bank-name').value || "---";
            const year = document.getElementById('tax-year').value || "---";
            
            summary.innerHTML = `
                <div style="display: grid; gap: 8px;">
                    <p><strong>Reporting Taxpayer:</strong> ${name}</p>
                    <p><strong>Filing Period:</strong> ${year}</p>
                    <p><strong>Self-Reported AGI:</strong> $${parseFloat(agi).toLocaleString()}</p>
                    <p><strong>Disbursement Bank:</strong> ${bank}</p>
                </div>
            `;
        }
    }

    document.getElementById('btn-login').onclick = async () => {
        clearErrors();
        const email = document.getElementById('login-email').value;
        const pass = ui.loginPass.value.trim();
        const btn = document.getElementById('btn-login');

        // Enforcement of min 8 character password as requested
        if (!email || pass.length < 8) {
            showError(ui.loginError, "Access Denied: Valid email and password (minimum 8 characters) required.");
            return;
        }

        const oldText = btn.textContent;
        btn.textContent = "Verifying Credentials...";
        btn.disabled = true;

        try {
            await window.Auth.login(email, pass);
            pendingUserEmail = email;
            authMode = "login";
            showAuthForm(ui.mfaForm);
        } catch (e) { 
            showError(ui.loginError, "Security Error: " + e.message); 
        } finally {
            btn.textContent = oldText;
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

        // Enforcement of min 8 character password as requested
        if (!email || pass.length < 8 || !name || !dob) {
            showError(ui.registerError, "Registration Incomplete: All fields are required. Password must be 8+ characters.");
            return;
        }

        const oldText = btn.textContent;
        btn.textContent = "Creating Secure ID...";
        btn.disabled = true;

        try {
            await window.Auth.register(email, pass, { name, dob });
            pendingUserEmail = email;
            authMode = "register";
            showAuthForm(ui.mfaForm);
        } catch (e) { 
            showError(ui.registerError, "Enrollment Error: " + e.message); 
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    };

    if (ui.mfaVerifyBtn) {
        ui.mfaVerifyBtn.onclick = () => {
            const code = ui.mfaCodeInput.value;
            if (window.Auth.verifyMfa(pendingUserEmail, code)) {
                if (authMode === "register") {
                    showAuthForm(ui.loginForm);
                    showError(ui.loginError, "ID Successfully Verified. Please sign in with your new credentials.");
                } else {
                    window.Auth.setSession(pendingUserEmail);
                    closeModal();
                    updateUIState();
                    navigateToStep(1);
                }
            } else {
                showError(ui.mfaErrorMsg, "Validation Failed: The entered 6-digit PIN is incorrect.");
            }
        };
    }

    const btnForgot = document.getElementById('btn-forgot-send');
    if (btnForgot) {
        btnForgot.onclick = async () => {
            const email = document.getElementById('forgot-email').value;
            if (!email) return showError(ui.forgotError, "Required: Enter your registered recovery email.");
            
            btnForgot.textContent = "Dispatched...";
            btnForgot.disabled = true;
            try {
                const ok = await window.Auth.sendCode(email, 'Reset');
                if (ok) {
                    pendingUserEmail = email;
                    showAuthForm(ui.resetForm);
                }
            } catch (e) { 
                showError(ui.forgotError, "Recovery Error: " + e.message); 
            } finally { 
                btnForgot.textContent = "Send Recovery Code"; 
                btnForgot.disabled = false; 
            }
        };
    }

    const btnResetSubmit = document.getElementById('btn-reset-submit');
    if (btnResetSubmit) {
        btnResetSubmit.onclick = async () => {
            const code = ui.resetCodeInput.value;
            const pass = ui.resetPass.value.trim();
            if (code.length < 6 || pass.length < 8) {
                showError(ui.resetError, "Input Error: 6-digit code and 8-character password required.");
                return;
            }
            if (window.Auth.verifyMfa(pendingUserEmail, code)) {
                // In a real localstorage app, we'd update the stored password here
                const userStr = localStorage.getItem('tax_user_' + pendingUserEmail);
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.password = pass;
                    localStorage.setItem('tax_user_' + pendingUserEmail, JSON.stringify(user));
                    showAuthForm(ui.loginForm);
                    showError(ui.loginError, "Credentials Updated: Please sign in with your new password.");
                }
            } else {
                showError(ui.resetError, "Verification Error: PIN code is invalid.");
            }
        };
    }

    if (ui.refundForm) {
        ui.refundForm.onsubmit = (e) => {
            e.preventDefault();
            if (!document.getElementById('consent').checked) {
                showError(ui.refundError, "Application Error: Consent declaration is required to file."); 
                return;
            }

            // Calculation fix: (Income * 0.12) + $125
            const income = parseFloat(document.getElementById('gross-income').value) || 0;
            const calculatedRefund = (income * 0.12) + 125;
            
            document.getElementById('display-refund-amount').textContent = calculatedRefund.toFixed(2);
            document.getElementById('display-app-id').textContent = 'TAX-' + Math.floor(100000 + Math.random() * 900000);

            ui.refundForm.style.display = 'none';
            if (ui.progressBar) ui.progressBar.style.display = 'none';
            if (ui.portalTitle) ui.portalTitle.style.display = 'none';
            ui.finalPage.style.display = 'block';
        };
    }

    updateUIState();
});
