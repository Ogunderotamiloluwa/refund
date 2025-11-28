document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    const TOTAL_STEPS = 5;

    const form = document.getElementById('refund-form');
    const stepContents = Array.from(document.querySelectorAll('.step-content'));
    const steps = Array.from(document.querySelectorAll('.step'));
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    const dependentsYes = document.getElementById('dep-yes');
    const dependentsNo = document.getElementById('dep-no');
    const dependentsCountInput = document.getElementById('dependents-count');
    const dependentsCountLabel = document.getElementById('dependents-count-label');

    const ssnInput = document.getElementById('ssn');
    const phoneInput = document.getElementById('phone');
    const uploadInput = document.getElementById('document-upload');
    const routingInput = document.getElementById('routing-number');
    const accountInput = document.getElementById('account-number');

    const resultModal = document.getElementById('result-modal');

    // Utility: show a step
    function showStep(step) {
        stepContents.forEach(sc => sc.classList.remove('active'));
        stepContents.forEach(sc => sc.setAttribute('aria-hidden', 'true'));
        const target = document.querySelector(`.step-content[data-step="${step}"]`);
        if (target) {
            target.classList.add('active');
            target.setAttribute('aria-hidden', 'false');
        }

        steps.forEach(s => s.classList.toggle('active', parseInt(s.getAttribute('data-step')) === step));
        prevBtn.disabled = step === 1;

        if (step === TOTAL_STEPS) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'block';
            updateReviewSummary();
        } else {
            nextBtn.style.display = 'block';
            submitBtn.style.display = 'none';
        }

        currentStep = step;
        if (step === 3) handleDependentsInput();
    }

    // --- Authentication UI bindings ---
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnLogout = document.getElementById('btn-logout');
    const authModal = document.getElementById('auth-modal');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const mfaForm = document.getElementById('mfa-form');
    const registerMsg = document.getElementById('register-msg');
    const loginMsg = document.getElementById('login-msg');
    const mfaMsg = document.getElementById('mfa-msg');

    let pendingCreds = null; // temporarily hold creds between login/register and MFA

    async function showAuthModal(mode){
        // mode: 'login' | 'register' | 'mfa'
        authModal.style.display = 'flex';
        authModal.setAttribute('aria-hidden','false');
        registerForm.style.display = 'none';
        loginForm.style.display = 'none';
        mfaForm.style.display = 'none';
        registerMsg.style.display = 'none';
        loginMsg.style.display = 'none';
        mfaMsg.style.display = 'none';
        if(mode === 'login') loginForm.style.display = 'block';
        if(mode === 'register') registerForm.style.display = 'block';
        if(mode === 'mfa') mfaForm.style.display = 'block';
    }

    function hideAuthModal(){ authModal.style.display = 'none'; authModal.setAttribute('aria-hidden','true'); }

    // Buttons
    if(btnShowRegister) btnShowRegister.addEventListener('click', () => showAuthModal('register'));
    if(btnShowLogin) btnShowLogin.addEventListener('click', () => showAuthModal('login'));
    if(btnLogout) btnLogout.addEventListener('click', (e)=>{ e.preventDefault(); Auth.logout(); updateAuthUI(); });

    // Cancel buttons inside modal
    const btnCancelAuth = document.getElementById('btn-cancel-auth');
    const btnCancelLogin = document.getElementById('btn-cancel-login');
    if(btnCancelAuth) btnCancelAuth.addEventListener('click', hideAuthModal);
    if(btnCancelLogin) btnCancelLogin.addEventListener('click', hideAuthModal);

    // Register flow
    const btnRegister = document.getElementById('btn-register');
    if(btnRegister) btnRegister.addEventListener('click', async () => {
        registerMsg.style.display = 'none';
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const name = document.getElementById('reg-name').value.trim();
        const dob = document.getElementById('reg-dob').value;
        if(!email || !password || !name || !dob){ registerMsg.textContent = 'Please complete all registration fields.'; registerMsg.style.display = 'block'; return; }
        try{
            await Auth.register(email, password, { name, dob });
            // auto-login to send MFA
            pendingCreds = { email, password };
            await Auth.login(email, password);
            showAuthModal('mfa');
        }catch(err){ registerMsg.textContent = err.message || 'Registration failed'; registerMsg.style.display = 'block'; }
    });

    // Login flow
    const btnLogin = document.getElementById('btn-login');
    if(btnLogin) btnLogin.addEventListener('click', async () => {
        loginMsg.style.display = 'none';
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        if(!email || !password){ loginMsg.textContent = 'Enter email and password.'; loginMsg.style.display = 'block'; return; }
        try{
            pendingCreds = { email, password };
            await Auth.login(email, password);
            showAuthModal('mfa');
        }catch(err){ loginMsg.textContent = err.message || 'Login failed'; loginMsg.style.display = 'block'; }
    });

    // MFA verify
    const btnVerifyMfa = document.getElementById('btn-verify-mfa');
    if(btnVerifyMfa) btnVerifyMfa.addEventListener('click', async () => {
        mfaMsg.style.display = 'none';
        const code = document.getElementById('mfa-code').value.trim();
        if(!pendingCreds || !code){ mfaMsg.textContent = 'Enter code.'; mfaMsg.style.display = 'block'; return; }
        const ok = Auth.verifyMfaCode(pendingCreds.email, code);
        if(ok){ hideAuthModal(); updateAuthUI(); pendingCreds = null; }
        else { mfaMsg.textContent = 'Invalid code.'; mfaMsg.style.display = 'block'; }
    });

    const btnResendMfa = document.getElementById('btn-resend-mfa');
    if(btnResendMfa) btnResendMfa.addEventListener('click', async ()=>{
        if(!pendingCreds){ mfaMsg.textContent = 'No pending authentication.'; mfaMsg.style.display='block'; return; }
        try{ await Auth.login(pendingCreds.email, pendingCreds.password); mfaMsg.textContent = 'Code resent (simulated).'; mfaMsg.style.display='block'; }catch(e){ mfaMsg.textContent = 'Unable to resend.'; mfaMsg.style.display='block'; }
    });

    function updateAuthUI(){
        const authed = Auth.isAuthenticated();
        if(authed){
            btnShowLogin.style.display = 'none';
            btnShowRegister.style.display = 'none';
            btnLogout.style.display = 'inline-block';
        } else {
            btnShowLogin.style.display = 'inline-block';
            btnShowRegister.style.display = 'inline-block';
            btnLogout.style.display = 'none';
        }
    }

    // Seed demo user for convenience
    if(window.Auth && typeof Auth.seedTestUser === 'function'){ Auth.seedTestUser().catch(()=>{}); }

    // ensure auth UI reflects session
    updateAuthUI();

    // Prevent using the form until authenticated
    function requireAuthOrPrompt(){
        if(!Auth.isAuthenticated()){
            showAuthModal('login');
            return false;
        }
        return true;
    }

    // Validation per step
    function validateStep(step) {
        const current = document.querySelector(`.step-content[data-step="${step}"]`);
        if (!current) return false;

        let valid = true;
        const required = Array.from(current.querySelectorAll('[required]'));

        required.forEach(input => {
            input.classList.remove('input-error');

            // Skip hidden elements
            const style = window.getComputedStyle(input);
            if (style.display === 'none' || style.visibility === 'hidden') return;

            if (input.type === 'radio') {
                const name = input.name;
                const checked = current.querySelector(`input[name="${name}"]:checked`);
                if (!checked) {
                    valid = false;
                    input.classList.add('input-error');
                }
                return;
            }

            if (input.type === 'checkbox') {
                if (!input.checked) {
                    valid = false;
                    input.classList.add('input-error');
                }
                return;
            }

            const val = (input.value || '').toString().trim();
            if (!val) {
                valid = false;
                input.classList.add('input-error');
                return;
            }

            // Field-specific checks
            if (input.id === 'email') {
                const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!re.test(val)) { valid = false; input.classList.add('input-error'); }
            }
            if (input.id === 'ssn') {
                if (!/^\d{3}-\d{2}-\d{4}$/.test(val)) { valid = false; input.classList.add('input-error'); document.getElementById('ssn-help').style.display = 'block'; }
                else { document.getElementById('ssn-help').style.display = 'none'; }
            }
            if (input.id === 'routing-number') {
                if (!/^\d{9}$/.test(val)) { valid = false; input.classList.add('input-error'); }
            }
        });

        // File validation (if present)
        if (uploadInput && uploadInput.files && uploadInput.files.length) {
            const f = uploadInput.files[0];
            const allowed = ['application/pdf','image/jpeg','image/png'];
            if (!allowed.includes(f.type) || f.size > 5 * 1024 * 1024) {
                valid = false;
                document.getElementById('upload-help').style.display = 'block';
            } else {
                document.getElementById('upload-help').style.display = 'none';
            }
        }

        if (!valid) {
            // Friendly inline message instead of alert where possible
            window.scrollTo({ top: (current.getBoundingClientRect().top + window.scrollY) - 20, behavior: 'smooth' });
        }

        return valid;
    }

    function handleDependentsInput() {
        if (!dependentsYes || !dependentsNo) return;
        if (dependentsYes.checked) {
            dependentsCountInput.style.display = 'block';
            dependentsCountLabel.style.display = 'block';
            dependentsCountInput.setAttribute('required','required');
            dependentsCountInput.value = dependentsCountInput.value || 1;
        } else {
            dependentsCountInput.style.display = 'none';
            dependentsCountLabel.style.display = 'none';
            dependentsCountInput.removeAttribute('required');
            dependentsCountInput.value = '';
            dependentsCountInput.classList.remove('input-error');
        }
    }

    // Mask SSN input as XXX-XX-XXXX
    function maskSSN(e) {
        const el = e.target;
        let digits = el.value.replace(/\D/g, '').slice(0,9);
        if (digits.length >= 6) {
            el.value = digits.replace(/(\d{3})(\d{2})(\d{1,4})/, '$1-$2-$3');
        } else if (digits.length >= 3) {
            el.value = digits.replace(/(\d{3})(\d{1,2})?/, (m, a, b) => b ? `${a}-${b}` : a);
        } else {
            el.value = digits;
        }
    }

    // Basic phone cleanup on blur
    function formatPhoneOnBlur(e) {
        const v = (e.target.value || '').replace(/\D/g, '');
        if (v.length === 10) {
            e.target.value = `(${v.slice(0,3)}) ${v.slice(3,6)}-${v.slice(6)}`;
        }
    }

    function updateReviewSummary() {
        const getRadioValue = (name) => {
            const radio = document.querySelector(`input[name="${name}"]:checked`);
            return radio ? radio.value.replace(/-/g,' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
        };
        const fmt = (v) => v ? Number(v).toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0}) : 'N/A';

        const name = document.getElementById('full-name').value || 'N/A';
        const email = document.getElementById('email').value || 'N/A';
        const year = document.getElementById('tax-year').value || 'N/A';
        const income = document.getElementById('gross-income').value || 0;
        const withheld = document.getElementById('tax-withheld').value || 0;
        const deps = dependentsYes && dependentsYes.checked ? (dependentsCountInput.value || '1') : 'None';

        document.getElementById('review-name').textContent = name;
        document.getElementById('review-email').textContent = email;
        document.getElementById('review-year').textContent = year;
        document.getElementById('review-income').textContent = fmt(income);
        document.getElementById('review-withheld').textContent = fmt(withheld);
        document.getElementById('review-dependents').textContent = deps;
    }

    // Simple mock calculator (same as before)
    function calculateMockRefund(income, withheld, status, dependents) {
        let deduction = 0;
        if (status === 'single') deduction = 13850;
        if (status === 'married-joint') deduction = 27700;
        if (status === 'head-household') deduction = 20800;
        const taxableIncome = Math.max(0, income - deduction);
        let taxLiability = 0;
        if (taxableIncome > 50000) {
            taxLiability = 50000 * 0.12 + (taxableIncome - 50000) * 0.22;
        } else {
            taxLiability = taxableIncome * 0.10;
        }
        let totalCredits = 0;
        if (dependents > 0) totalCredits = dependents * 2000;
        const netTaxDue = Math.max(0, taxLiability - totalCredits);
        return Math.max(0, withheld - netTaxDue);
    }

    function displayResult(refundAmount) {
        const maskedSSN = (document.getElementById('ssn').value || '').slice(-4);
        const modalHtml = `
            <div class="modal-content" role="dialog" aria-modal="true">
                <h3>Estimated Refund</h3>
                <p style="font-size:1.1rem; margin:8px 0;">Your estimated refund:</p>
                <p style="font-size:1.6rem; color:var(--success-color); font-weight:700; margin:6px 0;">$${refundAmount.toFixed(2)}</p>
                <p style="font-size:0.9rem; color:#666;">We will never display your full SSN — last 4: ${maskedSSN || 'N/A'}</p>
                <div style="margin-top:14px; display:flex; gap:8px; justify-content:center; flex-direction:column;">
                    <button class="btn btn-success" id="modal-efile">E-File Now (Simulated)</button>
                    <button class="btn btn-primary" id="modal-close">Close</button>
                </div>
            </div>
        `;
        resultModal.innerHTML = modalHtml;
        resultModal.style.display = 'flex';
        resultModal.setAttribute('aria-hidden','false');

        document.getElementById('modal-close').addEventListener('click', () => {
            resultModal.style.display = 'none';
            resultModal.setAttribute('aria-hidden','true');
        });

        document.getElementById('modal-efile').addEventListener('click', () => {
            // show e-file verification form
            const efileHtml = `
                <div class="modal-content" role="dialog" aria-modal="true">
                    <h3>E-File Verification</h3>
                    <p style="font-size:0.95rem; color:#333;">To e-file we need to verify your identity with either last year's AGI or a Self-Select PIN. You may also enter an IRS IP PIN if you have one.</p>
                    <label for="verify-method">Verification method</label>
                    <select id="verify-method">
                        <option value="agi">Last year AGI</option>
                        <option value="pin">Self-Select PIN (5 digits)</option>
                    </select>
                    <div class="form-group" style="margin-top:8px;">
                        <label for="agi-input">AGI (last year)</label>
                        <input id="agi-input" type="number" placeholder="e.g., 25000" />
                    </div>
                    <div class="form-group">
                        <label for="ssn-pin">Self-Select PIN (5 digits)</label>
                        <input id="ssn-pin" type="text" maxlength="5" placeholder="12345" />
                    </div>
                    <div class="form-group">
                        <label for="ip-pin">IRS IP PIN (optional, 6 digits)</label>
                        <input id="ip-pin" type="text" maxlength="6" placeholder="000000" />
                    </div>
                    <div style="display:flex; gap:8px; margin-top:8px;">
                        <button class="btn btn-primary" id="btn-submit-efile">Submit Return (Simulated)</button>
                        <button class="btn btn-secondary" id="btn-cancel-efile">Cancel</button>
                    </div>
                    <div id="efile-msg" class="error-message" style="display:none; margin-top:8px;"></div>
                </div>
            `;
            resultModal.innerHTML = efileHtml;

            document.getElementById('btn-cancel-efile').addEventListener('click', () => {
                resultModal.style.display = 'none';
                resultModal.setAttribute('aria-hidden','true');
            });

            document.getElementById('btn-submit-efile').addEventListener('click', () => {
                const method = document.getElementById('verify-method').value;
                const agi = document.getElementById('agi-input').value.trim();
                const pin = document.getElementById('ssn-pin').value.trim();
                const ipPin = document.getElementById('ip-pin').value.trim();
                const msg = document.getElementById('efile-msg');
                msg.style.display = 'none';

                // Basic simulated validation using seeded profile if available
                const profile = (window.Auth && Auth.getCurrentUserProfile) ? Auth.getCurrentUserProfile() : null;
                let valid = false;
                if(method === 'agi'){
                    if(profile && profile.agi_lastyear && Number(agi) === Number(profile.agi_lastyear)) valid = true;
                    else if(Number(agi) > 100) valid = true; // relaxed demo fallback
                } else {
                    if(pin === '12345') valid = true; // demo self-select pin
                }

                // If IP PIN present, check against stored if available
                if(ipPin && profile && profile.ip_pin && ipPin === profile.ip_pin) valid = true;

                // Simulate sending to IRS and status updates
                if(!valid){ msg.textContent = 'Verification failed. Please confirm AGI or PIN.'; msg.style.display = 'block'; return; }

                // Show Received status and simulate processing
                resultModal.innerHTML = `
                    <div class="modal-content" role="dialog" aria-modal="true">
                        <h3>Return Submitted</h3>
                        <p>Your return was submitted to the IRS (simulated). Tracking progress below.</p>
                        <div id="efile-status" style="text-align:left; margin-top:12px;">
                            <p><strong>Status:</strong> <span id="status-text">Received</span></p>
                        </div>
                        <div style="margin-top:12px;">
                            <button class="btn btn-secondary" id="btn-close-status">Close</button>
                        </div>
                    </div>
                `;

                const statusText = document.getElementById('status-text');
                document.getElementById('btn-close-status').addEventListener('click', () => { resultModal.style.display='none'; resultModal.setAttribute('aria-hidden','true'); });

                // Simulate timeline
                statusText.textContent = 'Received';
                setTimeout(()=>{ statusText.textContent = 'Accepted'; }, 2000);
                setTimeout(()=>{ statusText.textContent = 'Processing'; }, 4000);
                setTimeout(()=>{ statusText.textContent = 'Refund Approved - Sent'; }, 6000);
            });
        });
    }

    // Event bindings
    nextBtn.addEventListener('click', () => {
        if (!requireAuthOrPrompt()) return;
        if (validateStep(currentStep)) showStep(currentStep + 1);
    });

    prevBtn.addEventListener('click', () => showStep(Math.max(1, currentStep - 1)));

    steps.forEach(s => s.addEventListener('click', (e) => {
        const stepTo = parseInt(s.getAttribute('data-step'));
        if (stepTo < currentStep || validateStep(currentStep)) showStep(stepTo);
    }));

    // Dependents logic
    if (dependentsYes && dependentsNo) {
        dependentsYes.addEventListener('change', handleDependentsInput);
        dependentsNo.addEventListener('change', handleDependentsInput);
    }

    // Input helpers
    if (ssnInput) ssnInput.addEventListener('input', maskSSN);
    if (phoneInput) phoneInput.addEventListener('blur', formatPhoneOnBlur);

    if (uploadInput) {
        uploadInput.addEventListener('change', () => {
            const help = document.getElementById('upload-help');
            if (uploadInput.files.length === 0) { help.style.display = 'none'; return; }
            const f = uploadInput.files[0];
            const allowed = ['application/pdf','image/jpeg','image/png'];
            if (!allowed.includes(f.type) || f.size > 5 * 1024 * 1024) {
                help.style.display = 'block';
            } else help.style.display = 'none';
        });
    }

    // Form submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!requireAuthOrPrompt()) return;
            if (!validateStep(currentStep)) return;

            // gather data
            const income = parseFloat(document.getElementById('gross-income').value || 0);
            const withheld = parseFloat(document.getElementById('tax-withheld').value || 0);
            const filing = (document.querySelector('input[name="filing-status"]:checked') || {}).value || 'single';
            const deps = dependentsYes && dependentsYes.checked ? parseInt(dependentsCountInput.value || 0) : 0;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Calculating...';

            setTimeout(() => {
                const refund = calculateMockRefund(income, withheld, filing, deps);
                displayResult(refund);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Calculate My Refund';
            }, 1000);
        });
    }

    // Initialize
    showStep(1);
});