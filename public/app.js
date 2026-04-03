const tipButton = document.getElementById("tipButton");
const tipText = document.getElementById("tipText");

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

tipButton.addEventListener("click", loadTip);
