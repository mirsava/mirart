/**
 * Generates HTML previews of all email templates.
 * Run: npm run preview-emails  (or: node scripts/preview-emails.js from backend/)
 * Output: backend/email-previews/*.html
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../email-previews');

const { buildTemplate, templates } = await import('../services/emailService.js');

const sampleData = {
  contact: {
    listingTitle: 'Sunset Over the Mountains',
    listingId: 42,
    message: "Hi! I'm very interested in this piece.\n\nCould you tell me more about the dimensions and whether it's still available?",
    fromName: 'Jane Doe',
    from: 'jane@example.com',
  },
  messageReply: {
    listingTitle: 'Abstract Blue #3',
    listingId: 18,
    message: "Thanks for your message! Yes, the piece is still available. I can ship it within 2-3 business days.",
    fromName: 'John Smith',
    from: 'john@example.com',
  },
  welcome: { userName: 'Alex', loginUrl: 'http://localhost:5173' },
  verificationCode: { userName: 'Alex', code: '847291', expiresInMinutes: 24 },
  passwordReset: { userName: 'Alex', code: '382916', expiresInMinutes: 60 },
  passwordChanged: { userName: 'Alex' },
};

mkdirSync(OUT_DIR, { recursive: true });

for (const [name, builder] of Object.entries(templates)) {
  const data = sampleData[name] || {};
  const template = builder(data);
  const { html } = buildTemplate(template);
  const filepath = join(OUT_DIR, `${name}.html`);
  writeFileSync(filepath, html.trim(), 'utf8');
  console.log(`Wrote ${filepath}`);
}

// Write run log for verification
const logPath = join(OUT_DIR, '_preview-log.txt');
writeFileSync(logPath, `Generated at ${new Date().toISOString()}\nTemplates: ${Object.keys(templates).join(', ')}\n`, 'utf8');

// Also create an index.html that links to all previews
const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Template Previews</title>
  <style>
    body { font-family: system-ui; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { color: #4a3a9a; }
    ul { list-style: none; padding: 0; }
    li { margin: 0.5rem 0; }
    a { color: #534bae; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Email Template Previews</h1>
  <p>Sample HTML output for each template. Open in browser to preview.</p>
  <ul>
    ${Object.keys(templates).map((n) => `<li><a href="${n}.html">${n}.html</a></li>`).join('\n    ')}
  </ul>
</body>
</html>
`.trim();

writeFileSync(join(OUT_DIR, 'index.html'), indexHtml, 'utf8');
console.log(`Wrote ${join(OUT_DIR, 'index.html')}`);
console.log(`\nOpen ${OUT_DIR}/index.html in a browser to view all previews.`);
