
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables locally for development
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER = process.env.VERIFIED_SENDER || 'ogunderotamiloluwa@gmail.com';

function sendEmail({ to, subject, html }) {
    return new Promise((resolve, reject) => {
        if (!BREVO_API_KEY) {
            console.error("ERROR: BREVO_API_KEY is not defined in environment variables.");
            return reject(new Error("Internal Server Error: Email service not configured."));
        }
        
        const payload = JSON.stringify({
            sender: { email: SENDER, name: "Tax Portal Support" },
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
                    console.log(`Email successfully sent to ${to}`);
                    resolve();
                } else {
                    console.error(`Brevo API Error: ${res.statusCode} - ${body}`);
                    reject(new Error(`Brevo Error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.error("Network error connecting to Brevo:", err);
            reject(err);
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

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // API Endpoint for emails
    if (url.pathname === '/api/send-email' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                if (!data.toEmail || !data.subject || !data.htmlContent) {
                    throw new Error("Missing email parameters");
                }
                await sendEmail({ to: data.toEmail, subject: data.subject, html: data.htmlContent });
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error("API Error:", err.message);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Static File Serving - CHANGED DEFAULT TO index.html
    let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
    let filePath = path.join(__dirname, '..', reqPath);

    // Security: Prevent accessing files outside of the project root
    if (!filePath.startsWith(path.join(__dirname, '..'))) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    // Fallback to index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(__dirname, '..', 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
            return;
        }
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end(data);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`PRODUCTION SERVER RUNNING`);
    console.log(`Port: ${PORT}`);
    console.log(`Email Sender: ${SENDER}`);
    console.log(`==============================================\n`);
});
