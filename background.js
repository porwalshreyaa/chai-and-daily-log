/**
 * background.js
 * 
 * Background service worker for the Chrome extension.
 * Handles extension icon click events to open the side panel.
 */

/**
 * Listens for clicks on the extension icon.
 * When clicked, opens the side panel in the current window.
 * 
 * @param {chrome.tabs.Tab} tab - The tab where the extension icon was clicked
 */
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel in the same window as the clicked tab
  chrome.sidePanel.open({ windowId: tab.windowId });
});

