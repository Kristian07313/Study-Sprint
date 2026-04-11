const tipButton = document.getElementById("tipButton");
const tipText = document.getElementById("tipText");
const uploadForm = document.getElementById("uploadForm");
const studyFileInput = document.getElementById("studyFile");
const uploadButton = document.getElementById("uploadButton");
const uploadMessage = document.getElementById("uploadMessage");
const selectedFileName = document.getElementById("selectedFileName");
const extractedText = document.getElementById("extractedText");

async function loadTip() {
  tipText.textContent = "Loading a fresh study tip...";

  try {
    const response = await fetch("/api/tip");

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const data = await response.json();
    tipText.textContent = data.tip;
  } catch (error) {
    tipText.textContent = "Something went wrong while loading the tip.";
  }
}

function showUploadMessage(message, type) {
  uploadMessage.textContent = message;
  uploadMessage.className = `upload-message ${type}`;
}

function updateSelectedFileName() {
  const selectedFile = studyFileInput.files[0];

  if (!selectedFile) {
    selectedFileName.textContent = "No file selected yet.";
    return;
  }

  selectedFileName.textContent = `Selected file: ${selectedFile.name}`;
}

function showExtractedText(text) {
  extractedText.textContent = text || "No readable text was found in this PDF.";
}

async function uploadPdf(event) {
  event.preventDefault();

  const selectedFile = studyFileInput.files[0];

  if (!selectedFile) {
    showUploadMessage("Please choose a PDF file first.", "error");
    return;
  }

  if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
    showUploadMessage("Only PDF files can be uploaded.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("studyFile", selectedFile);

  uploadButton.disabled = true;
  showUploadMessage("Uploading your PDF...", "");
  showExtractedText("Processing your PDF and extracting text...");

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed.");
    }

    selectedFileName.textContent = `Uploaded file: ${data.fileName}`;
    showUploadMessage(data.message, "success");
    showExtractedText(data.extractedText);
    uploadForm.reset();
  } catch (error) {
    showUploadMessage(error.message, "error");
    showExtractedText("Your extracted text will appear here after a successful upload.");
  } finally {
    uploadButton.disabled = false;
  }
}

tipButton.addEventListener("click", loadTip);
studyFileInput.addEventListener("change", updateSelectedFileName);
uploadForm.addEventListener("submit", uploadPdf);
