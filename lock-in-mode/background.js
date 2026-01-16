const DISTRACTING_SITES = [
  "instagram.com",
  "youtube.com",
  "twitter.com",
  "facebook.com",
  "x.com",
  "tiktok.com"
];

// Track tabs that user chose to continue (temporarily allowed)
const allowedTabs = new Set();

// Use onBeforeNavigate - fires once per navigation, before the page starts loading
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigations (not iframes)
  if (details.frameId !== 0) return;
  
  const url = details.url;
  if (!url) return;

  // Check if extension is enabled
  const data = await chrome.storage.local.get("enabled");
  if (data.enabled === false) return; // Skip if disabled

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
    console.log("allowAndRedirect", tabId, message);
    allowedTabs.add(tabId);
    chrome.tabs.update(tabId, { url: message.url });

    // Set a reminder alarm if time was specified
    if (message.reminderMinutes) {
      const alarmName = `reminder_${tabId}_${Date.now()}`;
      
      // Store alarm info for the time's up page
      chrome.storage.local.set({
        [alarmName]: {
          tabId: tabId,
          siteName: message.siteName,
          minutes: message.reminderMinutes,
          targetUrl: message.url
        }
      });

      // Create the alarm
      chrome.alarms.create(alarmName, {
        delayInMinutes: message.reminderMinutes
      });
    }
  } else if (message.action === "goBack") {
    chrome.tabs.update(sender.tab.id, { url: "chrome://newtab" });
  }
});

// Handle alarm - redirect to time's up page
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("onAlarm", alarm);
  if (alarm.name.startsWith("reminder_")) {
    // Get stored info for this alarm
    chrome.storage.local.get(alarm.name, (data) => {
      const info = data[alarm.name] || {};
      const tabId = info.tabId;
      const siteName = info.siteName || "the site";
      const minutes = info.minutes || "a few";
      const targetUrl = info.targetUrl || "";

      // Build the time's up page URL
      const timeupPage = chrome.runtime.getURL(
        `timeup.html?site=${encodeURIComponent(siteName)}&minutes=${encodeURIComponent(minutes)}&target=${encodeURIComponent(targetUrl)}`
      );

      // Redirect the tab to the time's up page
      if (tabId) {
        chrome.tabs.update(tabId, { url: timeupPage });
      }

      // Clean up stored data
      chrome.storage.local.remove(alarm.name);
    });
  }
});
  