const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

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

function ensureUploadsDirectory() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function sanitizeFileName(fileName) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isPdfFile(fileName, contentType, fileBuffer) {
  const hasPdfExtension = path.extname(fileName).toLowerCase() === ".pdf";
  const hasPdfMimeType = contentType === "application/pdf" || contentType === "";
  const hasPdfHeader = fileBuffer.subarray(0, 4).toString("utf8") === "%PDF";
  return hasPdfExtension && hasPdfMimeType && hasPdfHeader;
}

function parseMultipartFile(bodyBuffer, boundary) {
  const boundaryText = `--${boundary}`;
  const bodyText = bodyBuffer.toString("latin1");
  const parts = bodyText.split(boundaryText);

  for (const part of parts) {
    if (!part.includes('name="studyFile"')) {
      continue;
    }

    const headerEndIndex = part.indexOf("\r\n\r\n");

    if (headerEndIndex === -1) {
      continue;
    }

    const headerText = part.slice(0, headerEndIndex);
    const fileNameMatch = headerText.match(/filename="([^"]+)"/i);
    const contentTypeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

    if (!fileNameMatch) {
      return { error: "Please choose a PDF file before uploading." };
    }

    const fileName = sanitizeFileName(fileNameMatch[1]);
    const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : "";
    const fileContentStart = headerEndIndex + 4;
    const fileContentEnd = part.lastIndexOf("\r\n");

    if (fileContentEnd <= fileContentStart) {
      return { error: "The uploaded file was empty." };
    }

    const fileText = part.slice(fileContentStart, fileContentEnd);
    const fileBuffer = Buffer.from(fileText, "latin1");

    return {
      fileName,
      contentType,
      fileBuffer
    };
  }

  return { error: "No file was received by the server." };
}

function handlePdfUpload(request, response) {
  const contentType = request.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!contentType.startsWith("multipart/form-data") || !boundaryMatch) {
    sendJson(response, 400, {
      error: "Please upload the PDF using a multipart form."
    });
    return;
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const chunks = [];

  request.on("data", (chunk) => {
    chunks.push(chunk);
  });

  request.on("end", () => {
    try {
      const bodyBuffer = Buffer.concat(chunks);
      const parsedFile = parseMultipartFile(bodyBuffer, boundary);

      if (parsedFile.error) {
        sendJson(response, 400, { error: parsedFile.error });
        return;
      }

      if (!isPdfFile(parsedFile.fileName, parsedFile.contentType, parsedFile.fileBuffer)) {
        sendJson(response, 400, {
          error: "Only PDF files are allowed."
        });
        return;
      }

      ensureUploadsDirectory();

      const savedFileName = `${Date.now()}-${parsedFile.fileName}`;
      const savePath = path.join(UPLOADS_DIR, savedFileName);

      fs.writeFile(savePath, parsedFile.fileBuffer, (error) => {
        if (error) {
          sendJson(response, 500, { error: "Unable to save the uploaded PDF." });
          return;
        }

        sendJson(response, 200, {
          message: "PDF uploaded successfully.",
          fileName: parsedFile.fileName
        });
      });
    } catch (error) {
      sendJson(response, 500, {
        error: "Something went wrong while processing the upload."
      });
    }
  });

  request.on("error", () => {
    sendJson(response, 500, {
      error: "Something went wrong while receiving the upload."
    });
  });
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

  if (request.method === "POST" && requestUrl.pathname === "/api/upload") {
    handlePdfUpload(request, response);
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
