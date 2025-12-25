// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const todayLogs = document.getElementById("todayLogs")
  const allLogs = document.getElementById("allLogs") 
  const todaySection = document.querySelector(".todaySection")
  const allSection = document.querySelector(".allSection")
  const addLog = document.getElementById("addLog");
  const showLogs = document.getElementById("showLogs");
  const showToday = document.getElementById("showToday");
  const logInput = document.getElementById("newLog");

  let logs = {};
  let currentLog = null;

  chrome.storage.local.get(["logs", "currentLog"], (result) => {
    logs = result.logs || {};
    let latestKey = Object.keys(logs).sort().at(-1);
    const todayKey = new Date().toISOString().slice(0,10);
    if (!latestKey) {
      logs[todayKey] = {};
    }
    currentLog = logs[todayKey] ?? {};
    saveState()
  });

  function saveState() {
    chrome.storage.local.set({ logs, currentLog });
    updateUIState();
  }

  const showAllLogs = () => {
    todaySection.classList.add("hidden");
    allSection.classList.remove("hidden");
  }
  const showTodayLogs = () => {
    allSection.classList.add("hidden");
    todaySection.classList.remove("hidden");
  }

  showLogs.addEventListener("click", showAllLogs)
  showToday.addEventListener("click", showTodayLogs)

  const logEntry = (newLog) => {
    const d = new Date();
    console.log(d)
    const currentTime = d.toTimeString().slice(0, 8);
    console.log(currentTime)
    if (!currentLog[currentTime]) {
      currentLog[currentTime] = '';
    }
    currentLog[currentTime] = newLog;
    saveState();
  }

  logInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const newLog = (logInput.value || "").trim();
      if (newLog) logEntry(newLog);
    }
  });

  addLog.addEventListener("click", () => {
    const newLog = (logInput.value || "").trim();
    if (newLog) logEntry(newLog);
  });


  function updateUIState() {
    console.log("ui update working")
    const hasCurrentLog = Object.keys(currentLog).length > 0;
    const hasLogs = Object.keys(logs).length > 0;
    addLog.disabled = !hasCurrentLog;
    showLogs.disabled = !hasLogs;

    const todayList = todayLogs.querySelector("ol");
    todayList.innerHTML = "";

    if (hasCurrentLog) {
      for (const [key, value] of Object.entries(currentLog).sort(([keyA], [keyB]) => {
        return keyB.localeCompare(keyA);
      })) {
        const newLi = document.createElement('li');
        const timeLabel = document.createElement('label');
        timeLabel.textContent = key;
        timeLabel.className = "toLog"
        const entryLabel = document.createElement('label');
        entryLabel.textContent = value;
        entryLabel.className = "entry"
        newLi.appendChild(timeLabel);
        newLi.appendChild(entryLabel);
        todayList.appendChild(newLi);
      }
    }
    
    const allList = allLogs.querySelector("#allLogList");
    allList.innerHTML = "";

    if (hasLogs) {
      for (const [key, value] of Object.entries(logs).sort(([keyA], [keyB]) => {
        return keyB.localeCompare(keyA);
      })) {
        const newLi = document.createElement('li');
        const dayLabel = document.createElement('h1');
        dayLabel.textContent = key;
        const innerOl = document.createElement('ol');

        for (const [innerKey, innerValue] of Object.entries(value).sort(([keyA], [keyB]) => {
          return keyB.localeCompare(keyA);
        })) {
          const innerLi = document.createElement('li');
          const timeLabel = document.createElement('label');
          timeLabel.textContent = innerKey;
          timeLabel.className = "toLog"
          const entryLabel = document.createElement('label');
          entryLabel.textContent = innerValue;
          entryLabel.className = "entry"
          innerLi.appendChild(timeLabel);
          innerLi.appendChild(entryLabel);
          innerOl.appendChild(innerLi);
        }
        newLi.appendChild(dayLabel);
        newLi.appendChild(innerOl);
        allList.appendChild(newLi);
      }
    }
  }

});
