export const Auth = (() => {
  const codes = {};

  function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async function sendCode(email) {
    const code = generateCode();
    codes[email] = code;

    // Local testing: show code in console/alert
    console.log(`Verification code for ${email}: ${code}`);
    alert(`Verification code for ${email}: ${code}`);

    // Skip actual fetch in local testing
    if (!window.location.href.includes("netlify.app")) {
      return true;
    }

    // Production: send via Netlify Function
    const res = await fetch("/.netlify/functions/sendMail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to send verification code.");
    }

    return true;
  }

  return {
    register: async (email, password, info = {}) => {
      if (!email || !password) throw new Error("Email and password required.");
      if (password.length < 7) throw new Error("Password must be at least 7 characters.");

      const existing = localStorage.getItem("user_" + email);
      if (existing) throw new Error("Account already exists with this email.");

      // Save user with info
      localStorage.setItem("user_" + email, JSON.stringify({ password, ...info }));

      return sendCode(email);
    },

    login: async (email, password) => {
      const saved = localStorage.getItem("user_" + email);
      if (!saved) throw new Error("No account exists with this email.");

      const data = JSON.parse(saved);
      if (data.password !== password) throw new Error("Invalid login credentials.");

      return sendCode(email);
    },

    requestReset: async (email) => {
      const saved = localStorage.getItem("user_" + email);
      if (!saved) throw new Error("No account exists with this email.");

      return sendCode(email);
    },

    verifyMfa: (email, code) => codes[email] === code,

    updatePassword: (email, newPass) => {
      const saved = localStorage.getItem("user_" + email);
      if (!saved) throw new Error("No account exists with this email.");

      const data = JSON.parse(saved);
      data.password = newPass;
      localStorage.setItem("user_" + email, JSON.stringify(data));
      delete codes[email];
    },

    sendFinalApplication: async (data) => {
      console.log("Final application data:", data);
      return true;
    }
  };
})();
