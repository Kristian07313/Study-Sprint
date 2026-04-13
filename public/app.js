const elements = {
  tipButton: document.getElementById("tipButton"),
  tipText: document.getElementById("tipText"),
  uploadForm: document.getElementById("uploadForm"),
  studyFileInput: document.getElementById("studyFile"),
  uploadButton: document.getElementById("uploadButton"),
  uploadMessage: document.getElementById("uploadMessage"),
  selectedFileName: document.getElementById("selectedFileName"),
  extractedText: document.getElementById("extractedText")
};

function getSelectedFile() {
  return elements.studyFileInput.files[0] || null;
}

function setButtonLoadingState(isLoading) {
  elements.uploadButton.disabled = isLoading;
}

async function loadTip() {
  elements.tipText.textContent = "Loading a fresh study tip...";

  try {
    const response = await fetch("/api/tip");

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const data = await response.json();
    elements.tipText.textContent = data.tip;
  } catch (error) {
    elements.tipText.textContent = "Something went wrong while loading the tip.";
  }
}

function showUploadMessage(message, type) {
  elements.uploadMessage.textContent = message;
  elements.uploadMessage.className = `upload-message ${type}`.trim();
}

function updateSelectedFileName() {
  const selectedFile = getSelectedFile();

  if (!selectedFile) {
    elements.selectedFileName.textContent = "No file selected yet.";
    return;
  }

  elements.selectedFileName.textContent = `Selected file: ${selectedFile.name}`;
}

function showExtractedText(text) {
  elements.extractedText.textContent = text || "No readable text was found in this PDF.";
}

function resetUploadForm() {
  elements.uploadForm.reset();
}

function isPdfSelection(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function uploadPdf(event) {
  event.preventDefault();

  const selectedFile = getSelectedFile();

  if (!selectedFile) {
    showUploadMessage("Please choose a PDF file first.", "error");
    return;
  }

  if (!isPdfSelection(selectedFile)) {
    showUploadMessage("Only PDF files can be uploaded.", "error");
    return;
  }

  // FormData makes the browser build the multipart upload request for us.
  const formData = new FormData();
  formData.append("studyFile", selectedFile);

  setButtonLoadingState(true);
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

    elements.selectedFileName.textContent = `Uploaded file: ${data.fileName}`;
    showUploadMessage(data.message, "success");
    showExtractedText(data.extractedText);
    resetUploadForm();
  } catch (error) {
    showUploadMessage(error.message, "error");
    showExtractedText("Your extracted text will appear here after a successful upload.");
  } finally {
    setButtonLoadingState(false);
  }
}

elements.tipButton.addEventListener("click", loadTip);
elements.studyFileInput.addEventListener("change", updateSelectedFileName);
elements.uploadForm.addEventListener("submit", uploadPdf);
