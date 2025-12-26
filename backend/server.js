
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Simple .env loader for local development.
 * On Render, these variables are pulled from the Dashboard Environment section.
 */
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const [key, ...val] = line.split('=');
            if (key && val.length > 0) process.env[key.trim()] = val.join('=').trim();
        });
    }
} catch (e) { console.warn('[INFO] .env file not found locally. Using system environment variables.'); }

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const VERIFIED_SENDER = process.env.VERIFIED_SENDER || 'ogunderotamiloluwa@gmail.com';

/**
 * Sends email via Brevo SMTP API v3
 */
function sendBrevoEmail({ to, subject, html }) {
    return new Promise((resolve, reject) => {
        if (!BREVO_API_KEY) {
            return reject(new Error("Internal Configuration Error: BREVO_API_KEY is missing."));
        }

        const payload = JSON.stringify({
            sender: { email: VERIFIED_SENDER, name: "Federal Tax Portal Support" },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html
        });

        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': BREVO_API_KEY,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    console.error(`[BREVO ERROR] Status: ${res.statusCode} | Body: ${body}`);
                    reject(new Error(`Email Provider Error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });
}

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

async function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // API Endpoint
    if (url.pathname === '/api/send-email' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { toEmail, subject, htmlContent } = JSON.parse(body);
                await sendBrevoEmail({ to: toEmail, subject, html: htmlContent });
                res.writeHead(200, { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error("[SERVER API ERROR]", err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Static File Serving
    // Default to index.html for root path "/"
    let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
    let filePath = path.join(__dirname, '..', reqPath);

    // If file doesn't exist, serve index.html (Standard SPA behavior)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(__dirname, '..', 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("404 - Not Found");
            return;
        }
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
}

// Render uses process.env.PORT, fallback to 10000
const PORT = process.env.PORT || 10000;
http.createServer(handleRequest).listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`FEDERAL TAX PORTAL - PRODUCTION SERVER`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'Development'}`);
    console.log(`==============================================\n`);
});
