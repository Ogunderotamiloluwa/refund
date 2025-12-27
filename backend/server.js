
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Local .env parser - only used for local development
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const [key, ...val] = line.split('=');
            if (key && val.length > 0) process.env[key.trim()] = val.join('=').trim();
        });
    }
} catch (e) { 
    console.warn('[INFO] .env not found. Using system environment variables (standard for Render).'); 
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const VERIFIED_SENDER = process.env.VERIFIED_SENDER || 'ogunderotamiloluwa@gmail.com';

function sendBrevoEmail({ to, subject, html }) {
    return new Promise((resolve, reject) => {
        if (!BREVO_API_KEY) {
            return reject(new Error("Missing BREVO_API_KEY in environment variables."));
        }

        const payload = JSON.stringify({
            sender: { email: VERIFIED_SENDER, name: "Federal Tax Portal" },
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
    
    // API Route for sending emails
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
                console.error("[SERVER ERROR]", err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Static File Serving
    let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
    let filePath = path.join(__dirname, '..', reqPath);

    // Serve index.html if the requested path is not found (SPA behavior)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(__dirname, '..', 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not Found");
            return;
        }
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
}

const PORT = process.env.PORT || 10000;
http.createServer(handleRequest).listen(PORT, () => {
    console.log(`==============================================`);
    console.log(`TAX PORTAL BACKEND ACTIVE`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Sender: ${VERIFIED_SENDER}`);
    console.log(`API Key Loaded: ${BREVO_API_KEY ? 'Yes' : 'No'}`);
    console.log(`==============================================`);
});
