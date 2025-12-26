const https = require('https');

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const VERIFIED_SENDER = process.env.VERIFIED_SENDER || 'ogunderotamiloluwa@gmail.com';

    if (!BREVO_API_KEY) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal Server Error: API Key missing" }) };
    }

    try {
        const { toEmail, subject, htmlContent } = JSON.parse(event.body);
        const payload = JSON.stringify({
            sender: { name: "Tax Portal Support", email: VERIFIED_SENDER },
            to: [{ email: toEmail }],
            subject,
            htmlContent
        });

        return new Promise((resolve) => {
            const req = https.request({
                hostname: 'api.brevo.com',
                path: '/v3/smtp/email',
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers,
                        body: JSON.stringify({ success: res.statusCode < 300, details: data })
                    });
                });
            });
            req.on('error', e => resolve({ statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }));
            req.write(payload);
            req.end();
        });
    } catch (err) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Bad Request" }) };
    }
};