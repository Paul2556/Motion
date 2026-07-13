// Shared friendly-HTML error page for download.js - same copy/response
// shape whether the token is missing, expired, or exhausted, so a
// token-probing attacker can't distinguish failure modes from the response.
const MESSAGE = "This link has expired or been used — request a fresh one at /source.";

export function sendErrorPage(res, status) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Motion — Source download</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0d0d0d; color: #fff; font-family: system-ui, -apple-system, sans-serif; }
  main { max-width: 26rem; padding: 2rem; text-align: center; line-height: 1.6; }
  a { color: #fff; }
</style>
</head>
<body>
  <main>
    <p>${MESSAGE.replace("/source", '<a href="/source">/source</a>')}</p>
  </main>
</body>
</html>`;

  res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}
