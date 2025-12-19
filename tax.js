document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    let pendingUserEmail = "";
    let loggedIn = false;

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
        revName: document.getElementById('review-name'),
        revYear: document.getElementById('review-year'),
        revInc: document.getElementById('review-income'),
        revWth: document.getElementById('review-withheld'),
        revDep: document.getElementById('review-dependents')
    };

    function applyDateMask(e) {
        let v = e.target.value.replace(/\D/g, '').substring(0, 8);
        if (v.length > 4) e.target.value = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
        else if (v.length > 2) e.target.value = `${v.slice(0, 2)}/${v.slice(2)}`;
        else e.target.value = v;
    }

    document.getElementById('dob-main')?.addEventListener('input', applyDateMask);
    document.getElementById('reg-dob')?.addEventListener('input', applyDateMask);

    function showForm(view) {
        [ui.loginForm, ui.regForm, ui.forgotForm, ui.resetForm, ui.mfaForm].forEach(f => f && (f.style.display = 'none'));
        view.style.display = 'block';
    }

    document.getElementById('btn-show-login').onclick = () => {
        ui.authModal.style.display = 'flex';
        showForm(ui.loginForm);
    };

    document.getElementById('btn-show-register').onclick = () => {
        ui.authModal.style.display = 'flex';
        showForm(ui.regForm);
    };

    document.getElementById('forgot-link').onclick = e => {
        e.preventDefault();
        showForm(ui.forgotForm);
    };

    // Registration with password check
    document.getElementById('btn-register').onclick = async () => {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        const name = document.getElementById('reg-name').value;
        const dob = document.getElementById('reg-dob').value;

        if (pass.length < 7) {
            alert("Password must be at least 7 characters for security.");
            return;
        }

        try {
            await Auth.register(email, pass, { name, dob });
            pendingUserEmail = email;
            showForm(ui.mfaForm);
        } catch (e) { alert(e.message); }
    };

    // Login
    document.getElementById('btn-login').onclick = async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        try {
            await Auth.login(email, pass);
            pendingUserEmail = email;
            showForm(ui.mfaForm);
        } catch (e) { alert(e.message); }
    };

    // Password reset
    document.getElementById('btn-forgot-send').onclick = async () => {
        const email = document.getElementById('forgot-email').value;
        try {
            await Auth.requestReset(email);
            pendingUserEmail = email;
            document.getElementById('reset-email').value = email;
            showForm(ui.resetForm);
        } catch (e) { alert(e.message); }
    };

    document.getElementById('btn-reset-submit').onclick = () => {
        const email = document.getElementById('reset-email').value;
        const code = document.getElementById('reset-code').value;
        const pass = document.getElementById('reset-password').value;

        if (pass.length < 7) {
            alert("Password must be at least 7 characters for security.");
            return;
        }

        if (Auth.verifyMfa(email, code)) {
            Auth.updatePassword(email, pass);
            alert("Password reset successful.");
            showForm(ui.loginForm);
        } else alert("Invalid verification code.");
    };

    // Cancel buttons
    ['btn-cancel-auth','btn-cancel-login','btn-forgot-cancel','btn-reset-cancel'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => ui.authModal.style.display = 'none');
    });

    // MFA verification
    document.getElementById('btn-verify-mfa').onclick = () => {
        const code = document.getElementById('mfa-code').value;
        if (Auth.verifyMfa(pendingUserEmail, code)) {
            ui.authModal.style.display = 'none';
            loggedIn = true;
            advanceStep(1);
        } else alert("Invalid code.");
    };

    // Multi-step form navigation
    function advanceStep(step) {
        if(!loggedIn){
            alert("You must login or register before continuing.");
            return;
        }
        if(!validateStep(currentStep)) return;

        const steps = document.querySelectorAll('.step-content');
        steps.forEach(d => d.style.display = 'none');
        const current = document.querySelector(`.step-content[data-step="${step}"]`);
        if (current) current.style.display = 'block';
        currentStep = step;

        ui.prevBtn.disabled = step === 1;
        ui.nextBtn.style.display = step < 5 ? 'inline-block' : 'none';
        ui.submitBtn.style.display = step === 5 ? 'inline-block' : 'none';

        if (step === 5) populateReview();
    }

    ui.nextBtn.onclick = () => advanceStep(currentStep + 1);
    ui.prevBtn.onclick = () => advanceStep(currentStep - 1);

    function populateReview() {
        ui.revName.textContent = document.getElementById('full-name')?.value || "";
        ui.revYear.textContent = document.getElementById('tax-year')?.value || "";
        ui.revInc.textContent = document.getElementById('gross-income')?.value || "0";
        ui.revWth.textContent = document.getElementById('tax-withheld')?.value || "0";
        ui.revDep.textContent = document.getElementById('dependents-count')?.value || "0";
    }

    // Validate current step
    function validateStep(step){
        const stepEl = document.querySelector(`.step-content[data-step="${step}"]`);
        if(!stepEl) return true;
        const requiredFields = stepEl.querySelectorAll('input[required], select[required]');
        for(let field of requiredFields){
            if(!field.value){
                alert("Please complete all required fields before continuing.");
                field.focus();
                return false;
            }
        }
        return true;
    }

    // Submit final application
    ui.refundForm.onsubmit = async e => {
        e.preventDefault();
        if(!validateStep(currentStep)) return;

        const data = Object.fromEntries(new FormData(ui.refundForm).entries());
        data.calculatedRefund = 120; // Example calculation
        await Auth.sendFinalApplication(data);

        // Show confirmation / submission page
        ui.refundForm.style.display = 'none';
        ui.resultsPage.style.display = 'block';
        document.getElementById('display-refund-amount').textContent = data.calculatedRefund.toFixed(2);
        document.getElementById('display-app-id').textContent = Math.floor(Math.random() * 1000000000);

        // Friendly message
        const msg = document.createElement('p');
        msg.style.fontSize = '1.1rem';
        msg.style.color = '#002868';
        msg.style.marginTop = '20px';
        msg.textContent = "Thank you! We have received your application. Your refund will be processed shortly.";
        ui.resultsPage.appendChild(msg);
    };

    // Dependent count toggle
    const depYes = document.getElementById('dep-yes');
    const depNo = document.getElementById('dep-no');
    const depBox = document.getElementById('dep-count-box');
    if(depYes && depNo && depBox){
        depYes.addEventListener('change', () => depBox.style.display = 'block');
        depNo.addEventListener('change', () => depBox.style.display = 'none');
    }
});
