const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Environment Loader
 * Looks for .env in the root (one level up from /backend) for local testing.
 * On Render, these values come from the Dashboard settings.
 */
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        try {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split(/\r?\n/).forEach(line => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = match[2] || '';
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    process.env[key] = value;
                }
            });
            console.log('[OK] Local .env file loaded.');
        } catch (e) {
            console.warn('[INFO] .env found but could not be parsed.');
        }
    }
}

loadEnv();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const VERIFIED_SENDER = process.env.VERIFIED_SENDER || 'ogunderotamiloluwa@gmail.com';

function sendBrevoEmail({ to, subject, html }) {
    return new Promise((resolve, reject) => {
        if (!BREVO_API_KEY) {
            console.error('[CONFIG ERROR] BREVO_API_KEY is missing from environment variables.');
            return reject(new Error("Server Configuration Error: Email service unavailable."));
        }

        const payload = JSON.stringify({
            sender: { email: VERIFIED_SENDER, name: "Federal Tax Support" },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html
        });

        const req = https.request({
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': BREVO_API_KEY,
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    console.error(`[BREVO ERROR] Code: ${res.statusCode} | Body: ${body}`);
                    reject(new Error(`Email Provider Error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error('[NETWORK ERROR] Failed to reach Brevo:', e.message);
            reject(e);
        });
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
    
    // 1. API Endpoint for sending emails
    if (url.pathname === '/api/send-email' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const { toEmail, subject, htmlContent } = JSON.parse(body);
                if (!toEmail || !subject || !htmlContent) throw new Error("Missing required data.");
                
                await sendBrevoEmail({ to: toEmail, subject, html: htmlContent });
                
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // 2. Static File Serving (Root is the directory above /backend)
    let requestedPath = url.pathname;
    
    // Default to tax.html for the root URL
    if (requestedPath === '/') {
        requestedPath = '/tax.html';
    }
    
    let filePath = path.join(__dirname, '..', requestedPath);

    // If file doesn't exist, serve tax.html as fallback (SPA style)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(__dirname, '..', 'tax.html');
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("404 - Document Not Found");
            return;
        }
        res.writeHead(200, { 
            'Content-Type': contentType, 
            'Access-Control-Allow-Origin': '*',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end(data);
    });
}

const PORT = process.env.PORT || 8080;
http.createServer(handleRequest).listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`FEDERAL TAX PORTAL - PRODUCTION SERVER`);
    console.log(`Status: ACTIVE`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Email Service: ${BREVO_API_KEY ? 'CONFIGURED' : 'WAITING FOR API KEY'}`);
    console.log(`==============================================\n`);
});