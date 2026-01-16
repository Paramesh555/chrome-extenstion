const toggle = document.getElementById("toggle");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");
const blockCount = document.getElementById("block-count");

// Load current state
chrome.storage.local.get(["enabled", "allowedToday"], (data) => {
  const isEnabled = data.enabled !== false; // Default to true
  toggle.checked = isEnabled;
  updateUI(isEnabled);
  
  // Show blocked count
  blockCount.textContent = data.allowedToday || 0;
});

// Handle toggle change
toggle.addEventListener("change", () => {
  const isEnabled = toggle.checked;
  chrome.storage.local.set({ enabled: isEnabled });
  updateUI(isEnabled);
});

function updateUI(isEnabled) {
  if (isEnabled) {
    status.className = "status active";
    statusText.textContent = "Protection Active";
    status.innerHTML = '<span class="status-icon">🛡️</span><span>Protection Active</span>';
  } else {
    status.className = "status inactive";
    statusText.textContent = "Protection Disabled";
    status.innerHTML = '<span class="status-icon">⚠️</span><span>Protection Disabled</span>';
  }
}

