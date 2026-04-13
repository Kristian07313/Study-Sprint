const http = require("http");
const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const { promisify } = require("util");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);

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

function sendFile(response, filePath, fileContent) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream"
  });
  response.end(fileContent);
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

function getBoundaryFromContentType(contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!contentType.startsWith("multipart/form-data") || !boundaryMatch) {
    return null;
  }

  return boundaryMatch[1] || boundaryMatch[2];
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    request.on("error", () => {
      reject(new Error("Something went wrong while receiving the upload."));
    });
  });
}

function getMultipartFilePart(parts) {
  for (const part of parts) {
    if (part.includes('name="studyFile"')) {
      return part;
    }
  }

  return null;
}

function parseMultipartFile(bodyBuffer, boundary) {
  const boundaryText = `--${boundary}`;
  const bodyText = bodyBuffer.toString("latin1");
  const parts = bodyText.split(boundaryText);
  const filePart = getMultipartFilePart(parts);

  if (!filePart) {
    return { error: "No file was received by the server." };
  }

  const headerEndIndex = filePart.indexOf("\r\n\r\n");

  if (headerEndIndex === -1) {
    return { error: "No file was received by the server." };
  }

  const headerText = filePart.slice(0, headerEndIndex);
  const fileNameMatch = headerText.match(/filename="([^"]+)"/i);
  const contentTypeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

  if (!fileNameMatch) {
    return { error: "Please choose a PDF file before uploading." };
  }

  const fileName = sanitizeFileName(fileNameMatch[1]);
  const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : "";
  const fileContentStart = headerEndIndex + 4;
  const fileContentEnd = filePart.lastIndexOf("\r\n");

  if (fileContentEnd <= fileContentStart) {
    return { error: "The uploaded file was empty." };
  }

  const fileText = filePart.slice(fileContentStart, fileContentEnd);
  const fileBuffer = Buffer.from(fileText, "latin1");

  return {
    fileName,
    contentType,
    fileBuffer
  };
}

async function extractPdfText(fileBuffer) {
  const parser = new PDFParse({ data: fileBuffer });

  try {
    const result = await parser.getText({ pageJoiner: "" });
    return result.text
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } finally {
    await parser.destroy();
  }
}

function validateUploadedPdf(file) {
  if (!isPdfFile(file.fileName, file.contentType, file.fileBuffer)) {
    return { error: "Only PDF files are allowed." };
  }

  return { file };
}

function buildUploadResponse(fileName, extractedText) {
  return {
    message: extractedText
      ? "PDF uploaded and text extracted successfully."
      : "PDF uploaded successfully, but no readable text was found.",
    fileName,
    extractedText
  };
}

async function saveUploadedPdf(file) {
  ensureUploadsDirectory();

  const savedFileName = `${Date.now()}-${file.fileName}`;
  const savePath = path.join(UPLOADS_DIR, savedFileName);

  await writeFile(savePath, file.fileBuffer);
}

async function processUploadedPdf(request) {
  const contentType = request.headers["content-type"] || "";
  const boundary = getBoundaryFromContentType(contentType);

  if (!boundary) {
    return {
      statusCode: 400,
      data: { error: "Please upload the PDF using a multipart form." }
    };
  }

  const bodyBuffer = await readRequestBody(request);
  const parsedFile = parseMultipartFile(bodyBuffer, boundary);

  if (parsedFile.error) {
    return {
      statusCode: 400,
      data: { error: parsedFile.error }
    };
  }

  const validationResult = validateUploadedPdf(parsedFile);

  if (validationResult.error) {
    return {
      statusCode: 400,
      data: { error: validationResult.error }
    };
  }

  const extractedText = await extractPdfText(parsedFile.fileBuffer);
  await saveUploadedPdf(parsedFile);

  return {
    statusCode: 200,
    data: buildUploadResponse(parsedFile.fileName, extractedText)
  };
}

function getRandomStudyTip() {
  return studyTips[Math.floor(Math.random() * studyTips.length)];
}

function getRequestUrl(request) {
  return new URL(request.url, `http://${request.headers.host}`);
}

function getSafePublicFilePath(requestPath) {
  const requestedPath = requestPath === "/" ? "/index.html" : requestPath;
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const safePath = normalizedPath === path.sep ? "index.html" : normalizedPath;
  return path.join(PUBLIC_DIR, safePath);
}

async function serveStaticFile(requestPath, response) {
  const filePath = getSafePublicFilePath(requestPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, { error: "Access denied." });
    return;
  }

  try {
    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      sendJson(response, 404, { error: "Page not found." });
      return;
    }

    const fileContent = await readFile(filePath);
    sendFile(response, filePath, fileContent);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(response, 404, { error: "Page not found." });
      return;
    }

    sendJson(response, 500, { error: "Unable to load file." });
  }
}

async function handlePdfUpload(request, response) {
  try {
    const result = await processUploadedPdf(request);
    sendJson(response, result.statusCode, result.data);
  } catch (error) {
    const message = error.message === "Something went wrong while receiving the upload."
      ? error.message
      : "Something went wrong while processing the PDF.";

    sendJson(response, 500, { error: message });
  }
}

async function handleRequest(request, response) {
  const requestUrl = getRequestUrl(request);

  if (requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { status: "ok", app: "StudySprint" });
    return;
  }

  if (requestUrl.pathname === "/api/tip") {
    sendJson(response, 200, { tip: getRandomStudyTip() });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/upload") {
    await handlePdfUpload(request, response);
    return;
  }

  await serveStaticFile(requestUrl.pathname, response);
}

const server = http.createServer((request, response) => {
  // Route handling stays tiny here so the upload flow is easier to follow.
  handleRequest(request, response);
});

server.listen(PORT, () => {
  console.log(`StudySprint is running at http://localhost:${PORT}`);
});
