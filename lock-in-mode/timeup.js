const params = new URLSearchParams(window.location.search);
const siteName = params.get("site") || "the site";
const minutes = params.get("minutes") || "a few";
const targetUrl = params.get("target") || "";

// Display site name and time
document.getElementById("site-name").textContent = siteName;
document.getElementById("time-allowed").textContent = minutes;

// Back to Work - go to empty tab
document.getElementById("back").onclick = () => {
  chrome.runtime.sendMessage({ action: "goBack" });
};



