const QUOTES = [
  "The cost of distraction is greater than the cost of focus.",
  "You're not missing out. You're opting in to your goals.",
  "Every minute here is a minute stolen from your dreams.",
  "Champions are made in the moments nobody is watching.",
  "Your attention is your most valuable currency. Spend it wisely.",
  "The person you want to become is watching this decision.",
  "Comfort today, regret tomorrow. Choose wisely.",
  "Great things are built in focused hours, not scattered minutes.",
  "This scroll won't remember you, but your work will.",
  "You didn't come this far to only come this far.",
  "Distractions are just dreams in disguise—other people's dreams.",
  "One hour of deep work beats four hours of distracted effort."
];

const quoteEl = document.getElementById("quote");
quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

const params = new URLSearchParams(window.location.search);
const targetUrl = params.get("target");

// Check if extension is disabled - if so, redirect to target
chrome.storage.local.get("enabled", (data) => {
  if (data.enabled === false && targetUrl) {
    window.location.href = targetUrl;
  }
});

// Listen for extension being disabled while on this page
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled && changes.enabled.newValue === false && targetUrl) {
    window.location.href = targetUrl;
  }
});



// Display the blocked site name
const blockedSiteEl = document.getElementById("blocked-site");
if (blockedSiteEl && targetUrl) {
  try {
    const hostname = new URL(targetUrl).hostname.replace('www.', '');
    blockedSiteEl.textContent = hostname;
  } catch {
    blockedSiteEl.textContent = targetUrl;
  }
}
  
// Modal elements
const modal = document.getElementById("time-modal");
const timeOptions = document.querySelectorAll(".time-option");
const confirmBtn = document.getElementById("modal-confirm");
const cancelBtn = document.getElementById("modal-cancel");

let selectedMinutes = null; //default when a background tab is opend to avoid long distraction

// Show modal when clicking Continue
document.getElementById("continue").onclick = () => {
  modal.classList.add("active");
};

// Handle time option selection
timeOptions.forEach(option => {
  option.onclick = () => {
    // Remove selected class from all options
    timeOptions.forEach(opt => opt.classList.remove("selected"));
    // Add selected class to clicked option
    option.classList.add("selected");
    // Store selected minutes
    selectedMinutes = parseInt(option.dataset.minutes);
    // Enable confirm button
    confirmBtn.disabled = false;
  };
});

// Cancel button - close modal
cancelBtn.onclick = () => {
  modal.classList.remove("active");
  selectedMinutes = null;
  timeOptions.forEach(opt => opt.classList.remove("selected"));
  confirmBtn.disabled = true;
};

// Click outside modal to close
modal.onclick = (e) => {
  if (e.target === modal) {
    cancelBtn.onclick();
  }
};

// Confirm button - set timer and redirect
confirmBtn.onclick = () => {
  createAlaram(selectedMinutes);
};

function createAlaram(selectedMinutes) {

  // Get site name for the notification
  let siteName = targetUrl;
  try {
    siteName = new URL(targetUrl).hostname.replace("www.", "");
  } catch {}

  // Increment allowed count for today
  chrome.storage.local.get("allowedToday", (data) => {
    const newCount = (data.allowedToday || 0) + 1;
    chrome.storage.local.set({ allowedToday: newCount });
  });

  // Tell background to allow, set timer, and redirect
  chrome.runtime.sendMessage({
    action: "allowAndRedirect",
    url: targetUrl,
    reminderMinutes: selectedMinutes,
    siteName: siteName
  });
}


document.getElementById("back").onclick = () => {
  // Navigate to empty tab
  chrome.runtime.sendMessage({ action: "goBack" });
};
  