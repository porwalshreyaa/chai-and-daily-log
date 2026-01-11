/**
 * popup.js
 * 
 * Main entry point for the Chrome extension side panel.
 * Handles daily log entries, storage, and UI updates.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ============================================================================
  // DOM ELEMENT REFERENCES
  // ============================================================================
  // Get references to all DOM elements needed for the application
  const todayLogs = document.getElementById("todayLogs");      // Container for today's log entries
  const allLogs = document.getElementById("allLogs");          // Container for all historical logs
  const todaySection = document.querySelector(".todaySection"); // Section showing today's logs
  const allSection = document.querySelector(".allSection");     // Section showing all logs
  const addLog = document.getElementById("addLog");            // Button to add a new log entry
  const showLogs = document.getElementById("showLogs");        // Button to show all logs
  const showToday = document.getElementById("showToday");      // Button to show today's logs
  const logInput = document.getElementById("newLog");          // Textarea input for new log entries

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  /**
   * Global state object:
   * - logs: Object storing all logs organized by date (YYYY-MM-DD format)
   *   Structure: { "2024-01-15": { "10:30:00": "log entry", ... }, ... }
   * - currentLog: Reference to today's log entries (points to logs[todayKey])
   */
  let logs = {};
  let currentLog = null;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  /**
   * Loads existing logs from Chrome storage and initializes today's log entry.
   * This runs asynchronously when the page loads.
   */
  chrome.storage.local.get(["logs", "currentLog"], (result) => {
    // Load existing logs from storage, or initialize empty object if none exist
    logs = result.logs || {};
    
    // Generate today's date key in ISO format (YYYY-MM-DD)
    const todayKey = new Date().toISOString().slice(0, 10);
    
    // Create today's log entry if it doesn't exist yet
    if (!logs[todayKey]) {
      logs[todayKey] = {};
    }
    
    // Set currentLog to reference today's log entries in the logs object
    // This ensures modifications to currentLog also update logs[todayKey]
    currentLog = logs[todayKey];
    
    // Save state and update UI with loaded data
    saveState();
  });

  // ============================================================================
  // STORAGE FUNCTIONS
  // ============================================================================
  /**
   * Saves the current state to Chrome local storage and updates the UI.
   * This function is called whenever the logs are modified.
   */
  function saveState() {
    // Save both logs object and currentLog reference to Chrome storage
    chrome.storage.local.set({ logs, currentLog });
    
    // Update the UI to reflect the current state
    updateUIState();
  }

  // ============================================================================
  // UI NAVIGATION FUNCTIONS
  // ============================================================================
  /**
   * Switches the view to show all historical logs.
   * Hides today's section and shows the all logs section.
   */
  const showAllLogs = () => {
    todaySection.classList.add("hidden");
    allSection.classList.remove("hidden");
  };

  /**
   * Switches the view to show only today's logs.
   * Hides the all logs section and shows today's section.
   */
  const showTodayLogs = () => {
    allSection.classList.add("hidden");
    todaySection.classList.remove("hidden");
  };

  // Attach event listeners to navigation buttons
  showLogs.addEventListener("click", showAllLogs);
  showToday.addEventListener("click", showTodayLogs);

  // ============================================================================
  // LOG ENTRY FUNCTIONS
  // ============================================================================
  /**
   * Creates a new log entry with the current timestamp.
   * 
   * @param {string} newLog - The log entry text to store
   */
  const logEntry = (newLog) => {
    const d = new Date();
    console.log(d);
    
    // Extract time in HH:MM:SS format
    const currentTime = d.toTimeString().slice(0, 8);
    console.log(currentTime);
    
    // Initialize the time slot if it doesn't exist
    // Note: If multiple entries are made in the same second, the previous one will be overwritten
    if (!currentLog[currentTime]) {
      currentLog[currentTime] = '';
    }
    
    // Store the log entry with the current time as the key
    currentLog[currentTime] = newLog;
    
    // Save the updated state to storage and refresh UI
    saveState();
  };

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  /**
   * Handles Enter key press in the log input textarea.
   * Submits the log entry when Enter is pressed (Shift+Enter allows new lines).
   */
  logInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default newline behavior
      const newLog = (logInput.value || "").trim();
      if (newLog) logEntry(newLog);
    }
  });

  /**
   * Handles click event on the "Add Log" button.
   * Submits the current textarea value as a log entry.
   */
  addLog.addEventListener("click", () => {
    const newLog = (logInput.value || "").trim();
    if (newLog) logEntry(newLog);
  });

  // ============================================================================
  // UI UPDATE FUNCTION
  // ============================================================================
  /**
   * Updates the entire UI to reflect the current state of logs.
   * This function:
   * 1. Updates button states (enabled/disabled)
   * 2. Renders today's log entries
   * 3. Renders all historical log entries
   */
  function updateUIState() {
    console.log("ui update working");
    
    // Check if there are any logs to display
    const hasCurrentLog = Object.keys(currentLog).length > 0;
    const hasLogs = Object.keys(logs).length > 0;
    
    // Enable/disable buttons based on whether logs exist
    addLog.disabled = !hasCurrentLog;
    showLogs.disabled = !hasLogs;

    // ========================================================================
    // UPDATE TODAY'S LOGS DISPLAY
    // ========================================================================
    const todayList = todayLogs.querySelector("ol");
    todayList.innerHTML = ""; // Clear existing entries

    if (hasCurrentLog) {
      // Sort entries by time (newest first) and create list items
      for (const [key, value] of Object.entries(currentLog).sort(([keyA], [keyB]) => {
        return keyB.localeCompare(keyA); // Descending order (newest first)
      })) {
        const newLi = document.createElement('li');
        
        // Create time label
        const timeLabel = document.createElement('label');
        timeLabel.textContent = key;
        timeLabel.className = "toLog";
        
        // Create entry label
        const entryLabel = document.createElement('label');
        entryLabel.textContent = value;
        entryLabel.className = "entry";
        
        // Append to list item and list
        newLi.appendChild(timeLabel);
        newLi.appendChild(entryLabel);
        todayList.appendChild(newLi);
      }
    }
    
    // ========================================================================
    // UPDATE ALL LOGS DISPLAY
    // ========================================================================
    const allList = allLogs.querySelector("#allLogList");
    allList.innerHTML = ""; // Clear existing entries

    if (hasLogs) {
      // Sort days by date (newest first) and create list items
      for (const [key, value] of Object.entries(logs).sort(([keyA], [keyB]) => {
        return keyB.localeCompare(keyA); // Descending order (newest first)
      })) {
        const newLi = document.createElement('li');
        
        // Create day header
        const dayLabel = document.createElement('h1');
        dayLabel.textContent = key;
        
        // Create inner list for the day's entries
        const innerOl = document.createElement('ol');

        // Sort entries by time (newest first) and create list items
        for (const [innerKey, innerValue] of Object.entries(value).sort(([keyA], [keyB]) => {
          return keyB.localeCompare(keyA); // Descending order (newest first)
        })) {
          const innerLi = document.createElement('li');
          
          // Create time label
          const timeLabel = document.createElement('label');
          timeLabel.textContent = innerKey;
          timeLabel.className = "toLog";
          
          // Create entry label
          const entryLabel = document.createElement('label');
          entryLabel.textContent = innerValue;
          entryLabel.className = "entry";
          
          // Append to inner list item and inner list
          innerLi.appendChild(timeLabel);
          innerLi.appendChild(entryLabel);
          innerOl.appendChild(innerLi);
        }
        
        // Append day header and entries to list item
        newLi.appendChild(dayLabel);
        newLi.appendChild(innerOl);
        allList.appendChild(newLi);
      }
    }
  }
});
