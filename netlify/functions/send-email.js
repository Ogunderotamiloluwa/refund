const https = require('https');

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Pulling from netlify.toml environment settings
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const VERIFIED_SENDER = process.env.VERIFIED_SENDER;

    if (!BREVO_API_KEY || !VERIFIED_SENDER) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server configuration error: Missing API Key or Sender Email" })
        };
    }

    try {
        const { toEmail, subject, htmlContent } = JSON.parse(event.body);

        const payload = JSON.stringify({
            sender: { email: VERIFIED_SENDER, name: "Tax Support" },
            to: [{ email: toEmail }],
            subject: subject,
            htmlContent: htmlContent
        });

        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: { 
                            "Access-Control-Allow-Origin": "*",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ success: res.statusCode < 300, details: data })
                    });
                });
            });

            req.on('error', e => resolve({
                statusCode: 500,
                body: JSON.stringify({ error: e.message })
            }));

            req.write(payload);
            req.end();
        });
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }
};