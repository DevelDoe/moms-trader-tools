const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },
    // 🛠️ Settings Management
    getSettings: () => ipcRenderer.invoke("get-settings"),
    updateSettings: (settings) => ipcRenderer.send("update-settings", settings),
    onSettingsUpdated: (callback) => ipcRenderer.on("settings-updated", (_, updatedSettings) => callback(updatedSettings)),

    // 🔄 Toggling Windows
    toggleSettings: () => ipcRenderer.send("toggle-settings"),
    toggleReminder: () => ipcRenderer.send("toggle-reminder"),
    toggleChecklist: () => ipcRenderer.send("toggle-checklist"),
    toggleCountdown: () => ipcRenderer.send("toggle-countdown"),
    toggleClock: () => ipcRenderer.send("toggle-clock"),
    toggleResumption: () => ipcRenderer.send("toggle-resumption"),

    // 📌 Reminder
    sendReminderReady: () => ipcRenderer.send("reminder-ready"),
    onUpdateReminderItems: (callback) => ipcRenderer.on("update-reminder-items", (_, items) => callback(items)),

    // ✅ Checklist
    loadChecklistState: () => ipcRenderer.invoke("load-checklist-state"),
    addChecklistItem: (item) => ipcRenderer.send("add-checklist-item", item),
    removeChecklistItem: (index) => ipcRenderer.send("remove-checklist-item", index),
    resetChecklist: () => ipcRenderer.send("reset-checklist"),
    toggleChecklistItem: (index, newState) => ipcRenderer.send("toggle-checklist-item", { index, newState }),
    onChecklistUpdated: (callback) => ipcRenderer.on("update-checklist", (_, checklist) => callback(checklist)),
    resetToLegacyChecklist: () => ipcRenderer.send("reset-to-legacy-checklist"),

    // ⏳ Countdown
    getTickSoundPath: async () => await ipcRenderer.invoke("get-tick-sound-path"),
    setCountdownVolume: (volume) => ipcRenderer.send("countdown-volume-change", volume),
    onCountdownVolumeUpdate: (callback) => ipcRenderer.on("update-countdown-volume", (_, volume) => callback(volume)),

    // ⏰ Session Countdowns
    setSessionVolume: (volume) => ipcRenderer.send("session-volume-change", volume),
    getBellSoundPath: async () => await ipcRenderer.invoke("get-bell-sound-path"),
    resetToDefaultSessions: () => ipcRenderer.send("reset-to-default-sessions"),
    onUpdateSessionCountdowns: (callback) => ipcRenderer.on("update-session-countdowns", (_, updatedSessions) => callback(updatedSessions)),
    onSessionVolumeUpdate: (callback) => ipcRenderer.on("update-session-volume", (_, volume) => callback(volume)),

    // 📢 Resumption
    getBeepSoundPath: async () => await ipcRenderer.invoke("get-beep-sound-path"),

    // ✂️ Snipper Management
    createSnipperWindow: (name) => ipcRenderer.send("create-snipper-window", name),
    startRegionSelection: (snipperName) => ipcRenderer.send("start-region-selection", snipperName),
    openSnipperDialog: () => ipcRenderer.send("open-snipper-dialog"),
    getActiveSnippers: async () => await ipcRenderer.invoke("get-active-snippers"),
    updateSnipperSettings: (oldName, newName, x, y) => ipcRenderer.send("update-snipper-settings", { oldName, newName, x, y }),
    removeSnipperWindow: (name) => ipcRenderer.send("remove-snipper-window", name),
    onSnipperSettingsUpdated: (callback) => ipcRenderer.on("snipper-settings-updated", (_, snippers) => callback(snippers)),
    confirmSnipperName: (name) => ipcRenderer.send("snipper-name-confirmed", name),
    cancelSnipper: () => ipcRenderer.send("snipper-cancelled"),
    getSnipperBounds: () => ipcRenderer.invoke("get-snipper-bounds"),

    // ❌ Exit and Restart
    exitApp: () => ipcRenderer.send("exit-app"),
    restartApp: () => ipcRenderer.send("restart-app"),

    // 📏 Window Resizing
    resizeWindowToContent: (width, height) => ipcRenderer.send("resize-window-to-content", { width, height }),
});

// 🖼️ Region Selection API
contextBridge.exposeInMainWorld("regionAPI", {
    send: (channel, data) => {
        const validChannels = ["region-selected", "close-region-selection"];
        if (validChannels.includes(channel)) ipcRenderer.send(channel, data);
    },
    on: (channel, callback) => {
        const validChannels = ["region-selected"];
        if (validChannels.includes(channel)) ipcRenderer.on(channel, (_, ...args) => callback(...args));
    },
});

// 📸 Snipper Capture API
contextBridge.exposeInMainWorld("snipperAPI", {
    readyToCapture: () => ipcRenderer.send("ready-to-capture"),
    onRegionSelected: (callback) => ipcRenderer.on("region-selected", (_, bounds) => callback(bounds)),
});
