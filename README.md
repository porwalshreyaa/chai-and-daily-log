# Hitesh Sir Attendance - Chrome Extension

A Chrome extension for logging daily activities and tracking your progress. This extension helps you maintain a daily log of what you've completed.

## Overview

This extension provides a side panel interface where you can:
- Add daily log entries with timestamps
- View today's logs
- View all historical logs organized by date
- Persist all data locally using Chrome's storage API

## Project Structure

```
.
├── manifest.json      # Extension manifest (configuration)
├── background.js      # Background service worker
├── index.html         # Main HTML structure
├── popup.js           # Main application logic
├── styles.css         # Styling
├── icon.png           # Extension icon
└── image/             # Images directory
    └── background.jpg
```

## Architecture & Data Flow

### Extension Initialization

1. **Extension Installation**
   - The extension is configured via `manifest.json`
   - Uses Manifest V3 (latest Chrome extension standard)
   - Requests `storage` and `sidePanel` permissions

2. **User Interaction Flow**
   ```
   User clicks extension icon
        ↓
   background.js opens side panel (index.html)
        ↓
   popup.js loads and initializes
        ↓
   Loads existing logs from Chrome storage
        ↓
   UI is rendered with current data
   ```

### Data Structure

The extension stores data in Chrome's local storage with the following structure:

```javascript
{
  logs: {
    "2024-01-15": {
      "10:30:00": "Completed Writing Blogs on Google AI ADK",
      "14:20:00": "Documented Piyush Garg's series",
      "16:45:00": "Fixed bug in popup.js"
    },
    "2024-01-16": {
      "09:15:00": "Morning standup",
      "11:30:00": "Code review"
    }
  },
  currentLog: {
    "10:30:00": "Completed Writing Blogs on Google AI ADK",
    "14:20:00": "Documented Piyush Garg's series"
  }
}
```

**Key Points:**
- `logs`: Object where keys are dates (YYYY-MM-DD format), values are objects with time entries
- `currentLog`: Reference to today's log entries (points to `logs[todayKey]`)
- Time format: HH:MM:SS (24-hour format)
- Date format: ISO date string (YYYY-MM-DD)

## File-by-File Breakdown

### manifest.json

Defines the extension configuration:
- **manifest_version**: 3 (Manifest V3)
- **name**: Extension display name
- **permissions**: 
  - `storage`: Required for saving logs
  - `sidePanel`: Required for side panel functionality
- **side_panel**: Configuration for the side panel interface
- **background**: Service worker for handling extension icon clicks

### background.js

**Purpose**: Handles extension icon click events.

**Functionality**:
- Listens for clicks on the extension icon
- Opens the side panel when clicked

**Code Flow**:
```javascript
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
```

### index.html

**Purpose**: Defines the HTML structure of the side panel.

**Key Sections**:
1. **Header**: Contains images and greeting text
2. **Today's Logs Section** (`todaySection`): 
   - Displays today's log entries
   - Contains "Show All" button to switch views
3. **All Logs Section** (`allSection`): 
   - Displays all historical logs
   - Hidden by default
   - Contains "Show Today" button to switch back
4. **Bottom Bar**: 
   - Textarea for input (`newLog`)
   - Button to add log (`addLog`)

### popup.js

**Purpose**: Main application logic - handles all functionality.

#### Key Variables

- `logs`: Global object storing all logs organized by date
- `currentLog`: Reference to today's log entries

#### Functions

##### `saveState()`

**Purpose**: Saves current state to Chrome storage and updates UI.

**Flow**:
1. Saves `logs` and `currentLog` to Chrome local storage
2. Calls `updateUIState()` to refresh the display

**When called**:
- After loading initial data
- After adding a new log entry
- Any time the logs are modified

##### `showAllLogs()`

**Purpose**: Switches view to show all historical logs.

**Flow**:
1. Hides `todaySection` by adding "hidden" class
2. Shows `allSection` by removing "hidden" class

##### `showTodayLogs()`

**Purpose**: Switches view to show only today's logs.

**Flow**:
1. Hides `allSection` by adding "hidden" class
2. Shows `todaySection` by removing "hidden" class

##### `logEntry(newLog)`

**Purpose**: Creates a new log entry with current timestamp.

**Parameters**:
- `newLog` (string): The log entry text

**Flow**:
1. Gets current date/time
2. Extracts time in HH:MM:SS format
3. Stores the log entry in `currentLog` with time as key
4. Calls `saveState()` to persist changes

**Important Notes**:
- Uses current time as the key
- If multiple entries are made in the same second, the previous one is overwritten
- `currentLog` is a reference to `logs[todayKey]`, so changes update both

##### `updateUIState()`

**Purpose**: Refreshes the entire UI to reflect current state.

**Flow**:
1. **Button State Updates**:
   - Enables/disables buttons based on whether logs exist
   
2. **Today's Logs Rendering**:
   - Clears existing display
   - Sorts entries by time (newest first)
   - Creates DOM elements for each entry
   - Appends to the list
   
3. **All Logs Rendering**:
   - Clears existing display
   - Iterates through all dates
   - Sorts dates (newest first)
   - For each date, sorts entries by time (newest first)
   - Creates nested DOM structure
   - Appends to the list

#### Event Listeners

1. **Log Input Keydown**:
   - Listens for Enter key (without Shift)
   - Prevents default newline behavior
   - Submits the log entry

2. **Add Log Button Click**:
   - Gets value from textarea
   - Submits the log entry

3. **Show Logs Button Click**:
   - Switches to all logs view

4. **Show Today Button Click**:
   - Switches to today's logs view

#### Initialization Flow

1. **DOM Content Loaded**:
   - Gets references to all DOM elements
   - Initializes empty state variables

2. **Load from Storage**:
   - Asynchronously loads existing logs
   - Gets today's date key
   - Creates today's log entry if it doesn't exist
   - Sets `currentLog` to reference today's entries
   - Calls `saveState()` to initialize UI

3. **Event Listener Setup**:
   - Attaches all event listeners
   - Application is ready for user interaction

## Critical Bug Fix

### The Bug
Previously, when `logs[todayKey]` didn't exist, the code used:
```javascript
currentLog = logs[todayKey] ?? {};
```

This created a **new object** that wasn't part of `logs`. When `currentLog` was modified, `logs[todayKey]` remained undefined, causing data loss.

### The Fix
Now the code ensures `logs[todayKey]` exists first:
```javascript
if (!logs[todayKey]) {
  logs[todayKey] = {};
}
currentLog = logs[todayKey];
```

This ensures `currentLog` always references the object inside `logs`, so modifications update both correctly.

## Usage

1. **Install the Extension**:
   - Load unpacked extension in Chrome Developer Mode
   - Or package and install from Chrome Web Store

2. **Add a Log Entry**:
   - Click the extension icon to open side panel
   - Type your log entry in the textarea
   - Press Enter or click "+Log" button

3. **View Logs**:
   - Today's logs are shown by default
   - Click "Show All" to see all historical logs
   - Click "Show Today" to return to today's view

4. **Data Persistence**:
   - All logs are automatically saved to Chrome local storage
   - Data persists across browser sessions
   - Data is stored locally on your machine

## Browser Compatibility

- Chrome (Manifest V3 support required)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Storage Limits

Chrome local storage has a limit of approximately 10MB per extension. Given the text-based nature of this extension, this should be sufficient for years of daily logs.

## Future Enhancement Ideas

- Export logs to JSON/CSV
- Search functionality
- Edit/delete log entries
- Categories/tags for entries
- Statistics/analytics view
- Reminder notifications
- Dark/light theme toggle
