const elements = {
  tipButton: document.getElementById("tipButton"),
  tipText: document.getElementById("tipText"),
  uploadForm: document.getElementById("uploadForm"),
  studyFileInput: document.getElementById("studyFile"),
  uploadButton: document.getElementById("uploadButton"),
  uploadMessage: document.getElementById("uploadMessage"),
  selectedFileName: document.getElementById("selectedFileName"),
  extractedText: document.getElementById("extractedText"),
  flashcards: document.getElementById("flashcards")
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

function createFlashcardElement(flashcard, index) {
  const card = document.createElement("article");
  card.className = "flashcard";

  const label = document.createElement("span");
  label.className = "flashcard-label";
  label.textContent = `Flashcard ${index + 1}`;

  const question = document.createElement("p");
  question.className = "flashcard-question";
  question.innerHTML = "<strong>Question:</strong> ";
  question.append(document.createTextNode(flashcard.question));

  const answer = document.createElement("p");
  answer.className = "flashcard-answer";
  answer.innerHTML = "<strong>Answer:</strong> ";
  answer.append(document.createTextNode(flashcard.answer));

  card.append(label, question, answer);
  return card;
}

function showFlashcards(flashcards, emptyMessage = "No flashcards could be created from this PDF yet.") {
  elements.flashcards.innerHTML = "";

  if (!flashcards || flashcards.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "flashcards-empty";
    emptyState.textContent = emptyMessage;
    elements.flashcards.append(emptyState);
    return;
  }

  flashcards.forEach((flashcard, index) => {
    elements.flashcards.append(createFlashcardElement(flashcard, index));
  });
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
  showFlashcards([], "Generating flashcards from your PDF...");

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
    showFlashcards(data.flashcards);
    resetUploadForm();
  } catch (error) {
    showUploadMessage(error.message, "error");
    showExtractedText("Your extracted text will appear here after a successful upload.");
    showFlashcards([], "Your flashcards will appear here after a successful PDF upload.");
  } finally {
    setButtonLoadingState(false);
  }
}

elements.tipButton.addEventListener("click", loadTip);
elements.studyFileInput.addEventListener("change", updateSelectedFileName);
elements.uploadForm.addEventListener("submit", uploadPdf);
