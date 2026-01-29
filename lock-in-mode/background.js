const DISTRACTING_SITES = [
  "instagram.com",
  "youtube.com",
  "twitter.com",
  "facebook.com",
  "x.com",
  "tiktok.com"
];

//todo: remove the allowedTabs from localstorage
// Track tabs that user chose to continue (temporarily allowed)
const allowedTabs = new Set();

// Create alarm for background tabs (not active/focused)
async function createBackgroundTabAlarm(tabId, originalUrl = 'i dont know', minutes = 10) {
  const alarmName = `bg_reminder_${tabId}_${Date.now()}`;
  
  let siteName = originalUrl;
  try {
    siteName = new URL(originalUrl).hostname.replace("www.", "");
  } catch {}

  // Store alarm info
  await chrome.storage.local.set({
    [alarmName]: {
      tabId: tabId,
      siteName: siteName,
      minutes: minutes,
      targetUrl: originalUrl
    }
  });

  // Create the alarm
  chrome.alarms.create(alarmName, {
    delayInMinutes: minutes
  });

  console.log(`Created background tab alarm: ${alarmName} for ${minutes} minutes`);
}

// Safe tab update - handles closed tabs gracefully
// Pass originalUrl if you want to create an alarm for background tabs
async function safeTabUpdate(tabId, updateProps, originalUrl = null) {
  try {
    // If the tab is not active (not in focus), don't update immediately
    // Usecase: for listening to songs or podcasts in background tabs
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active) {
      console.log("Tab is not active, skipping update:", tabId);
      // Create an alarm so this tab won't stay unblocked forever
      await createBackgroundTabAlarm(tabId, originalUrl, 1); // 10 minutes
      return;
    }
    await chrome.tabs.update(tabId, updateProps);
  } catch (error) {
    // Tab was closed or doesn't exist - ignore
    console.log("Tab no longer exists:", tabId);
  }
}

// Clean up all reminder alarms and their storage data
async function cleanupAllReminders() {
  // Get all alarms
  const alarms = await chrome.alarms.getAll();
  
  // Filter reminder alarms (both regular and background tab reminders)
  const reminderAlarms = alarms.filter(a => 
    a.name.startsWith("reminder_") || a.name.startsWith("bg_reminder_")
  );
  
  for (const alarm of reminderAlarms) {
    await chrome.alarms.clear(alarm.name);
    await chrome.storage.local.remove(alarm.name);
  }
  
  console.log(`Cleaned up ${reminderAlarms.length} reminders`);
}

// Common function to check and block a tab if it's on a distracting site
async function checkAndBlockTab(tabId, url) {
  if (!url) return;

  // Skip if this tab was allowed by the user
  // console.log("allowedTabs", allowedTabs);
  // if (allowedTabs.has(tabId)) {
  //   allowedTabs.delete(tabId); // One-time pass
  //   return;
  // }

  //get allowed tabs from local storage
  const allowedTabs = await chrome.storage.local.get("allowed_tabs");
  const allowedTabsArray = allowedTabs.allowed_tabs || [];
  if (allowedTabsArray.includes(tabId)) {
    return;
  }


  const isDistracting = DISTRACTING_SITES.some(site => url.includes(site));
  if (!isDistracting) return;

  // Redirect to our own extension page
  const blockPage = chrome.runtime.getURL(
    "block.html?target=" + encodeURIComponent(url)
  );

  // Pass original URL for background tab alarm creation
  safeTabUpdate(tabId, { url: blockPage }, url);
}

async function setAllowedTabsLocalStorage(tabId) {
  const data = await chrome.storage.local.get("allowed_tabs");

  const allowedTabsArray = data.allowed_tabs || [];

  if (!allowedTabsArray.includes(tabId)) {
    allowedTabsArray.push(tabId);
  }

  await chrome.storage.local.set({
    allowed_tabs: allowedTabsArray
  });
}


// Use onBeforeNavigate - fires once per navigation, before the page starts loading
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigations (not iframes)
  if (details.frameId !== 0) return;

  // Check if extension is enabled
  const data = await chrome.storage.local.get("enabled");
  if (data.enabled === false) return; // Skip if disabled

  await checkAndBlockTab(details.tabId, details.url);
});

// When extension is turned ON/OFF, handle accordingly
chrome.storage.onChanged.addListener(async (changes) => {
  if (!changes.enabled) return;

  if (changes.enabled.newValue === true) {
    // Extension turned ON
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      if (tab.id && tab.url) {
        await checkAndBlockTab(tab.id, tab.url);
      }
    }
  }

  if (changes.enabled.newValue === false) {
    // Extension turned OFF
    await cleanupAllReminders();
  }
});



// Listen for messages from the block page
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "allowAndRedirect") {
    const tabId = sender.tab.id;
    console.log("allowAndRedirect", tabId, message);

    await setAllowedTabsLocalStorage(tabId);

    safeTabUpdate(tabId, { url: message.url });

    if (message.reminderMinutes) {
      const alarmName = `reminder_${tabId}_${Date.now()}`;

      await chrome.storage.local.set({
        [alarmName]: {
          tabId: tabId,
          siteName: message.siteName,
          minutes: message.reminderMinutes,
          targetUrl: message.url
        }
      });

      chrome.alarms.create(alarmName, {
        delayInMinutes: message.reminderMinutes
      });
    }
  } else if (message.action === "goBack") {
    safeTabUpdate(sender.tab.id, { url: "chrome://newtab" });
  }
});


// Handle alarm - redirect to time's up page
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log("onAlarm", alarm);
  
  // Handle both regular reminders and background tab reminders
  if (alarm.name.startsWith("reminder_") || alarm.name.startsWith("bg_reminder_")) {
    // Check if extension is enabled
    const enabledData = await chrome.storage.local.get("enabled");
    if (enabledData.enabled === false) {
      // Extension is disabled - just clean up, don't interrupt
      chrome.storage.local.remove(alarm.name);
      return;
    }

    // Get stored info for this alarm
    const data = await chrome.storage.local.get(alarm.name);
    const info = data[alarm.name] || {};
    const tabId = info.tabId;
    const siteName = info.siteName || "the site";
    const minutes = info.minutes || "a few";
    const targetUrl = info.targetUrl || "";

    // Build the time's up page URL
    const timeupPage = chrome.runtime.getURL(
      `timeup.html?site=${encodeURIComponent(siteName)}&minutes=${encodeURIComponent(minutes)}&target=${encodeURIComponent(targetUrl)}`
    );

    //remove the tab from allowed tabs in local storage
    const allowedTabsData = await chrome.storage.local.get("allowed_tabs");
    let allowedTabsArray = allowedTabsData.allowed_tabs || [];
    allowedTabsArray = allowedTabsArray.filter(id => id !== tabId);
    await chrome.storage.local.set({ allowed_tabs: allowedTabsArray });

    // Redirect the tab to the time's up page (handles closed tabs gracefully)
    if (tabId) {
      await safeTabUpdate(tabId, { url: timeupPage });
    }

    // Clean up stored data
    chrome.storage.local.remove(alarm.name);
  }
});
  