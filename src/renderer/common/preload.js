//  ./src/renderer/common/preload.html -->

const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
    // Settings functions
    getSettings: () => ipcRenderer.invoke("get-settings"),
    updateSettings: (settings) => ipcRenderer.send("update-settings", settings),

    onSettingsUpdated: (callback) => {
        ipcRenderer.on("settings-updated", (event, updatedSettings) => {
            console.log("Settings updated:", updatedSettings);
            callback(updatedSettings);
        });
    },

    // Toggling windows
    toggleSettings: () => ipcRenderer.send("toggle-settings"),
    toggleReminder: () => {
        console.log("🔄 Toggling Reminder...");
        ipcRenderer.send("toggle-reminder"); 
    },
    toggleChecklist: () => ipcRenderer.send("toggle-checklist"),
    toggleCountdown: () => ipcRenderer.send("toggle-countdown"),
    toggleClock: () => ipcRenderer.send("toggle-clock"),
    toggleResumption: () => ipcRenderer.send("toggle-resumption"),

    // Reminder
    onUpdateReminderItems: (callback) => {
        ipcRenderer.on("update-reminder-items", (event, items) => {
            console.log("Received updated reminder items:", items);
            callback(items);
        });
    },
    sendReminderReady: () => ipcRenderer.send("reminder-ready"),

    // Checklist
    loadChecklistState: () => ipcRenderer.invoke("load-checklist-state"),
    addChecklistItem: (item) => ipcRenderer.send("add-checklist-item", item),
    removeChecklistItem: (index) => ipcRenderer.send("remove-checklist-item", index),
    resetChecklist: () => ipcRenderer.send("reset-checklist"),
    toggleChecklistItem: (index, newState) => ipcRenderer.send("toggle-checklist-item", { index, newState }),
    onChecklistUpdated: (callback) => {
        ipcRenderer.on("update-checklist", (event, checklist) => callback(checklist));
    },
    resetToLegacyChecklist: () => ipcRenderer.send("reset-to-legacy-checklist"),

    // Countdown
    getTickSoundPath: async () => await ipcRenderer.invoke("get-tick-sound-path"),
    setCountdownVolume: (volume) => ipcRenderer.send("countdown-volume-change", volume),
    onCountdownVolumeUpdate: (callback) => {
        ipcRenderer.on("update-countdown-volume", (event, volume) => callback(volume));
    },

    // Session countdowns
    onUpdateSessionCountdowns: (callback) => {
        ipcRenderer.on("update-session-countdowns", (event, updatedSessions) => {
            callback(updatedSessions);
            if (window.displayNextSessionCountdown) {
                window.displayNextSessionCountdown();
            }
        });
    },
    setSessionVolume: (volume) => ipcRenderer.send("session-volume-change", volume),
    onSessionVolumeUpdate: (callback) => {
        ipcRenderer.on("update-session-volume", (event, volume) => callback(volume));
    },
    getBellSoundPath: async () => await ipcRenderer.invoke("get-bell-sound-path"),
    resetToDefaultSessions: () => ipcRenderer.send("reset-to-default-sessions"),

    // Resumption
    getBeepSoundPath: async () => await ipcRenderer.invoke("get-beep-sound-path"),

    // snipper management
    createSnipperWindow: (name) => {
        console.log("Preload: Sending request to create snipper window with name:", name);
        ipcRenderer.send("create-snipper-window", name);
    },
    updateSnipperSettings: (name, settings) => ipcRenderer.send("update-snipper-settings", { name, settings }),
    removeSnipperWindow: (name) => ipcRenderer.send("remove-snipper-window", name),
    onSnipperSettingsUpdated: (callback) => {
        ipcRenderer.on("snipper-settings-updated", (event, activeSnippers) => callback(activeSnippers));
    },
    getActiveSnippers: async () => await ipcRenderer.invoke("get-active-snippers"),
    getSnipperSettings: async () => await ipcRenderer.invoke("get-snipper-settings"),
    closeCurrentSnipper: () => ipcRenderer.send("close-current-snipper"),
    onSnipperUpdated: (callback) => {
        ipcRenderer.on("snipper-updated", (event, settings) => callback(settings));
    },
    startRegionSelection: (snipperName) => ipcRenderer.send("start-region-selection", snipperName),

    // Exit and restart
    exitApp: () => ipcRenderer.send("exit-app"),
    restartApp: () => ipcRenderer.send("restart-app"),

    // Resize window
    resizeWindowToContent: (width, height) => ipcRenderer.send("resize-window-to-content", { width, height }),
});

contextBridge.exposeInMainWorld("regionAPI", {
    send: (channel, data) => {
        const validChannels = ["region-selected", "close-region-selection"];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    on: (channel, callback) => {
        const validChannels = ["snipper-updated", "region-selected"]; // Add valid listeners here if needed
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
});

contextBridge.exposeInMainWorld("snipperAPI", {
    readyToCapture: () => {
        console.log("snipperAPI: readyToCapture called");
        ipcRenderer.send("ready-to-capture");
    },
    onRegionSelected: (callback) => {
        console.log("snipperAPI: Listening for region-selected");
        ipcRenderer.on("region-selected", (event, bounds) => callback(bounds));
    },
});
