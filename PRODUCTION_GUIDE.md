# Production-Style Coding Guide

This guide outlines best practices and improvements for making your code production-ready. These principles apply to all JavaScript projects, not just Chrome extensions.

## Table of Contents

1. [Code Organization](#code-organization)
2. [Error Handling](#error-handling)
3. [Code Quality & Maintainability](#code-quality--maintainability)
4. [Performance](#performance)
5. [Security](#security)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Build & Deployment](#build--deployment)

---

## 1. Code Organization

### Current State
Your code is all in one file (`popup.js`). This works for small projects but becomes difficult to maintain as code grows.

### Production Approach

#### Module Pattern
Split code into logical modules:

```
src/
├── utils/
│   ├── storage.js      # Storage operations
│   ├── dateUtils.js    # Date/time utilities
│   └── domUtils.js     # DOM manipulation helpers
├── services/
│   └── logService.js   # Log entry business logic
├── components/
│   ├── LogList.js      # Log list component
│   ├── Navigation.js   # Navigation component
│   └── InputForm.js    # Input form component
├── config/
│   └── constants.js    # Constants and configuration
└── popup.js            # Main entry point
```

#### Example: storage.js
```javascript
/**
 * Storage service for managing Chrome extension storage
 */
class StorageService {
  static async getLogs() {
    try {
      const result = await chrome.storage.local.get(['logs']);
      return result.logs || {};
    } catch (error) {
      console.error('Error getting logs:', error);
      throw new Error('Failed to retrieve logs from storage');
    }
  }

  static async saveLogs(logs) {
    try {
      await chrome.storage.local.set({ logs });
    } catch (error) {
      console.error('Error saving logs:', error);
      throw new Error('Failed to save logs to storage');
    }
  }
}

export default StorageService;
```

#### Example: constants.js
```javascript
/**
 * Application constants
 */
export const STORAGE_KEYS = {
  LOGS: 'logs',
  CURRENT_LOG: 'currentLog'
};

export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:MM:SS';
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
```

---

## 2. Error Handling

### Current State
No error handling for storage operations or DOM manipulations.

### Production Approach

#### Try-Catch Blocks
Always wrap async operations and risky code in try-catch:

```javascript
async function loadLogs() {
  try {
    const result = await chrome.storage.local.get(['logs']);
    logs = result.logs || {};
    initializeTodayLog();
  } catch (error) {
    console.error('Failed to load logs:', error);
    showErrorMessage('Failed to load your logs. Please try refreshing.');
    // Fallback to empty state
    logs = {};
    initializeTodayLog();
  }
}
```

#### Error Boundaries
Create error handling utilities:

```javascript
/**
 * Wraps async functions with error handling
 */
function withErrorHandling(fn, errorMessage) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(errorMessage, error);
      showUserFriendlyError(errorMessage);
      throw error;
    }
  };
}

// Usage
const saveLogsSafely = withErrorHandling(
  saveLogs,
  'Failed to save your log entry'
);
```

#### User-Friendly Error Messages
```javascript
function showErrorMessage(message) {
  // Create a toast notification or error banner
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => errorDiv.remove(), 5000);
}
```

---

## 3. Code Quality & Maintainability

### Current State
- Magic strings scattered throughout
- No input validation
- Console.logs in production code
- No type checking

### Production Approach

#### Constants
Extract magic strings and numbers:

```javascript
// Before
const todayKey = new Date().toISOString().slice(0, 10);

// After
const DATE_FORMAT = {
  ISO_DATE: 'YYYY-MM-DD',
  ISO_SLICE: [0, 10]
};
const todayKey = new Date().toISOString().slice(...DATE_FORMAT.ISO_SLICE);
```

#### Input Validation
Validate all user inputs:

```javascript
function validateLogEntry(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Log entry must be a non-empty string');
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error('Log entry cannot be empty');
  }
  
  if (trimmed.length > 1000) {
    throw new Error('Log entry is too long (max 1000 characters)');
  }
  
  return trimmed;
}

// Usage
const logEntry = (newLog) => {
  try {
    const validatedLog = validateLogEntry(newLog);
    // ... rest of the code
  } catch (error) {
    showErrorMessage(error.message);
    return;
  }
};
```

#### Remove Console Logs
Use a proper logging utility:

```javascript
// utils/logger.js
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(level = LOG_LEVELS.INFO) {
    this.level = level;
  }

  debug(...args) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }
}

// In production, disable debug logs
const logger = new Logger(
  process.env.NODE_ENV === 'production' 
    ? LOG_LEVELS.ERROR 
    : LOG_LEVELS.DEBUG
);
```

#### TypeScript (Optional but Recommended)
Add type safety:

```typescript
interface Logs {
  [date: string]: {
    [time: string]: string;
  };
}

interface StorageResult {
  logs?: Logs;
  currentLog?: { [time: string]: string };
}

function saveState(logs: Logs, currentLog: { [time: string]: string }): Promise<void> {
  return chrome.storage.local.set({ logs, currentLog });
}
```

---

## 4. Performance

### Current State
- Re-renders entire UI on every update
- No debouncing
- Synchronous operations could block UI

### Production Approach

#### Debouncing
Debounce rapid function calls:

```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage
const debouncedSaveState = debounce(saveState, 300);
```

#### Virtual Scrolling (for large lists)
If you have thousands of entries, only render visible items:

```javascript
// Only render items in viewport
function renderVisibleItems(items, container, itemHeight) {
  const scrollTop = container.scrollTop;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + container.clientHeight) / itemHeight);
  
  return items.slice(visibleStart, visibleEnd);
}
```

#### Lazy Loading
Load data incrementally:

```javascript
async function loadLogsIncrementally(dateRange) {
  const logs = {};
  for (const date of dateRange) {
    const dayLogs = await chrome.storage.local.get([`logs_${date}`]);
    logs[date] = dayLogs[`logs_${date}`] || {};
  }
  return logs;
}
```

---

## 5. Security

### Current State
- No XSS protection
- Direct innerHTML usage (currently safe, but risky pattern)

### Production Approach

#### Sanitize User Input
```javascript
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input; // Automatically escapes HTML
  return div.textContent;
}

// Usage
entryLabel.textContent = sanitizeInput(value); // Safe
// Instead of: entryLabel.innerHTML = value; // Dangerous
```

#### Content Security Policy
Already configured in manifest.json, but ensure it's strict:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

---

## 6. Testing

### Unit Tests
Test individual functions:

```javascript
// tests/logEntry.test.js
import { logEntry } from '../src/services/logService';

describe('logEntry', () => {
  it('should create log entry with timestamp', () => {
    const logs = {};
    const result = logEntry(logs, 'Test entry');
    expect(result).toHaveProperty('10:30:00', 'Test entry');
  });

  it('should handle empty input', () => {
    expect(() => logEntry(logs, '')).toThrow();
  });
});
```

### Integration Tests
Test the full flow:

```javascript
// tests/integration.test.js
describe('Log Entry Flow', () => {
  it('should save and retrieve log entry', async () => {
    await addLogEntry('Test entry');
    const logs = await loadLogs();
    expect(logs).toContain('Test entry');
  });
});
```

### Testing Framework
- **Jest**: Popular, well-documented
- **Mocha + Chai**: Flexible
- **Vitest**: Fast, modern

---

## 7. Documentation

### Code Comments
✅ You now have good comments (just added!)

### JSDoc Comments
Add JSDoc for better IDE support:

```javascript
/**
 * Creates a new log entry with the current timestamp
 * 
 * @param {string} newLog - The log entry text to store
 * @param {Object} currentLog - The current log object to update
 * @returns {Object} Updated currentLog object
 * @throws {Error} If newLog is empty or invalid
 * 
 * @example
 * const log = {};
 * logEntry('Completed task', log);
 * // log now contains { '10:30:00': 'Completed task' }
 */
function logEntry(newLog, currentLog) {
  // ...
}
```

### API Documentation
Document public APIs:

```javascript
/**
 * @module LogService
 * @description Service for managing daily log entries
 */

/**
 * @typedef {Object} LogEntry
 * @property {string} time - Time in HH:MM:SS format
 * @property {string} text - Log entry text
 */
```

---

## 8. Build & Deployment

### Build Tools
Use bundlers for production:

#### Webpack Configuration
```javascript
// webpack.config.js
module.exports = {
  entry: {
    popup: './src/popup.js',
    background: './src/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  optimization: {
    minimize: true
  }
};
```

#### Package.json Scripts
```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

### Environment Variables
```javascript
// config/env.js
const config = {
  development: {
    LOG_LEVEL: 'debug',
    STORAGE_PREFIX: 'dev_'
  },
  production: {
    LOG_LEVEL: 'error',
    STORAGE_PREFIX: ''
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

### Linting & Formatting
Use ESLint and Prettier:

```json
// .eslintrc.json
{
  "extends": ["eslint:recommended"],
  "env": {
    "browser": true,
    "es2021": true
  },
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-unused-vars": "error"
  }
}
```

---

## Quick Start: Making Your Code Production-Ready

### Priority 1 (Critical)
1. ✅ Add comments (DONE!)
2. Add error handling for storage operations
3. Add input validation
4. Remove console.logs from production code

### Priority 2 (Important)
5. Extract constants
6. Add JSDoc comments
7. Set up linting (ESLint)
8. Add basic tests

### Priority 3 (Nice to Have)
9. Split into modules
10. Add TypeScript
11. Set up build tools
12. Add CI/CD pipeline

---

## Example: Refactored Code Snippet

### Before (Current)
```javascript
const logEntry = (newLog) => {
  const d = new Date();
  const currentTime = d.toTimeString().slice(0, 8);
  currentLog[currentTime] = newLog;
  saveState();
};
```

### After (Production-Ready)
```javascript
/**
 * Creates a new log entry with the current timestamp
 * @param {string} newLog - The log entry text
 * @throws {ValidationError} If input is invalid
 */
const logEntry = async (newLog) => {
  try {
    // Validate input
    const validatedLog = validateLogEntry(newLog);
    
    // Get current time
    const currentTime = getCurrentTimeFormatted();
    
    // Update log entry
    currentLog[currentTime] = validatedLog;
    
    // Save state (with error handling)
    await saveState();
    
    // Clear input
    logInput.value = '';
    
    logger.debug('Log entry created', { time: currentTime, length: validatedLog.length });
  } catch (error) {
    logger.error('Failed to create log entry', error);
    showErrorMessage('Failed to save log entry. Please try again.');
    throw error;
  }
};
```

---

## Resources

- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/devguide/)
- [JavaScript Style Guide (Airbnb)](https://github.com/airbnb/javascript)
- [Webpack Documentation](https://webpack.js.org/)
- [Jest Testing Framework](https://jestjs.io/)
- [ESLint Rules](https://eslint.org/docs/rules/)

---

## Summary

Production-ready code is:
- **Maintainable**: Easy to understand and modify
- **Robust**: Handles errors gracefully
- **Testable**: Functions can be tested in isolation
- **Performant**: Optimized for speed and efficiency
- **Secure**: Protected against common vulnerabilities
- **Documented**: Well-commented and explained
- **Consistent**: Follows coding standards and conventions

Start with the Priority 1 items, then gradually work through Priority 2 and 3 as your project grows!
