const toggle = document.getElementById("toggle");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");
const allowedCount = document.getElementById("allowed-count");

// Load current state
chrome.storage.local.get(["enabled", "allowedToday"], (data) => {
  const isEnabled = data.enabled !== false; // Default to true
  toggle.checked = isEnabled;
  updateUI(isEnabled);
  
  // Show blocked count
  allowedCount.textContent = data.allowedToday || 0;
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
    statusText.textContent = "Active";
    status.innerHTML = '<span class="status-icon">🛡️</span><span>Active</span>';
  } else {
    status.className = "status inactive";
    statusText.textContent = "Disabled";
    status.innerHTML = '<span class="status-icon">⚠️</span><span>Disabled</span>';
  }
}

