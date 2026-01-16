const DISTRACTING_SITES = [
  "instagram.com",
  "youtube.com",
  "twitter.com",
  "facebook.com",
  "x.com"
];

// Track tabs that user chose to continue (temporarily allowed)
const allowedTabs = new Set();

// Use onBeforeNavigate - fires once per navigation, before the page starts loading
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Only handle main frame navigations (not iframes)
  if (details.frameId !== 0) return;
  
  const url = details.url;
  if (!url) return;

  // Skip if this tab was allowed by the user
  if (allowedTabs.has(details.tabId)) {
    allowedTabs.delete(details.tabId); // One-time pass
    return;
  }

  const isDistracting = DISTRACTING_SITES.some(site => url.includes(site));
  if (!isDistracting) return;

  // Redirect to our own extension page
  const blockPage = chrome.runtime.getURL(
    "block.html?target=" + encodeURIComponent(url)
  );

  chrome.tabs.update(details.tabId, { url: blockPage });
});

// Listen for messages from the block page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "allowAndRedirect") {
    const tabId = sender.tab.id;
    allowedTabs.add(tabId);
    chrome.tabs.update(tabId, { url: message.url });
  } else if (message.action === "goBack") {
    chrome.tabs.update(sender.tab.id, { url: "chrome://newtab" });
  }
});
  