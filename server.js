const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Fallback for local testing without netlify dev
const BREVO_API_KEY = process.env.BREVO_API_KEY || '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';
const VERIFIED_SENDER = process.env.VERIFIED_SENDER || 'ogunderotamiloluwa@gmail.com';

function sendBrevoEmail({ to, subject, html }) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            sender: { email: VERIFIED_SENDER, name: "Tax Portal Local" },
            to: [{ email: to }],
            subject,
            htmlContent: html
        });

        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) return resolve();
                reject(new Error(`Brevo Error ${res.statusCode}: ${body}`));
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
};

async function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/api/send-email' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { toEmail, subject, htmlContent } = JSON.parse(body);
                await sendBrevoEmail({ to: toEmail, subject, html: htmlContent });
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true }));
                console.log(`[Local Server] Email sent to ${toEmail}`);
            } catch (err) {
                console.error("[Local Server] Error:", err.message);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    let safePath = pathname.replace(/^\/+/, '') || 'index.html';
    const filePath = path.join(__dirname, safePath);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            const indexPath = path.join(__dirname, 'index.html');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            fs.createReadStream(indexPath).pipe(res);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(filePath).pipe(res);
    });
}

const PORT = 8080;
http.createServer(handleRequest).listen(PORT, () => {
    console.log(`\nLocal server running at http://localhost:${PORT}`);
});