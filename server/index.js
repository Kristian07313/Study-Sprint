const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const studyTips = [
  "Break big topics into 25-minute focus sessions.",
  "Review your notes within 24 hours to improve recall.",
  "Practice active recall instead of only rereading.",
  "Use short quizzes to check what you actually remember.",
  "Study one difficult topic first while your energy is high."
];

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(data));
}

function serveFile(filePath, response) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 500, { error: "Unable to load file." });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream"
    });
    response.end(content);
  });
}

function getSafeFilePath(requestPath) {
  const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const safePath = normalizedPath === path.sep ? "index.html" : normalizedPath;
  return path.join(PUBLIC_DIR, safePath);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { status: "ok", app: "StudySprint" });
    return;
  }

  if (requestUrl.pathname === "/api/tip") {
    const randomTip = studyTips[Math.floor(Math.random() * studyTips.length)];
    sendJson(response, 200, { tip: randomTip });
    return;
  }

  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = getSafeFilePath(requestedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, { error: "Access denied." });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      sendJson(response, 404, { error: "Page not found." });
      return;
    }

    serveFile(filePath, response);
  });
});

server.listen(PORT, () => {
  console.log(`StudySprint is running at http://localhost:${PORT}`);
});
