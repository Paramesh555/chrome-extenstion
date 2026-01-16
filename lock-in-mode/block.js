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
  
  document.getElementById("continue").onclick = () => {
  // Tell background to allow this tab and redirect
  chrome.runtime.sendMessage({ action: "allowAndRedirect", url: targetUrl });
};

document.getElementById("back").onclick = () => {
  // Navigate to empty tab
  chrome.runtime.sendMessage({ action: "goBack" });
};
  