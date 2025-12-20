export async function handler(event) {
  try {
    const { email, code } = JSON.parse(event.body || "{}");

    if (!email || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email and code required" }) };
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: "Tax Refund Portal", email: "ogunderotamiloluwa@gmail.com" },
        to: [{ email }],
        subject: "Your 6-Digit Verification Code",
        htmlContent: `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires shortly.</p>`
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 500, body: err };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
