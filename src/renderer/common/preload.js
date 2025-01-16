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
    toggleSettings: () => {
        console.log("Preload: toggleSettings called");
        ipcRenderer.send("toggle-settings");
    },
    toggleReminder: () => {
        console.log("Preload: toggleReminder called");
        ipcRenderer.send("toggle-reminder");
    },
    toggleChecklist: () => ipcRenderer.send("toggle-checklist"),

    // Reminder text update
    onUpdateReminderText: (callback) => {
        ipcRenderer.removeAllListeners("update-reminder-text");
        ipcRenderer.on("update-reminder-text", (event, newText) => {
            console.log("Preload received update-reminder-text:", newText);
            callback(newText);
        });
    },

    // Checklist functions
    loadChecklistState: () => ipcRenderer.invoke("load-checklist-state"),
    addChecklistItem: (item) => {
        console.log("Preload: Adding checklist item:", item);
        ipcRenderer.send("add-checklist-item", item);
    },
    removeChecklistItem: (index) => {
        console.log("Preload: Removing checklist item at index:", index);
        ipcRenderer.send("remove-checklist-item", index);
    },
    resetChecklist: () => {
        console.log("Preload: Resetting checklist");
        ipcRenderer.send("reset-checklist");
    },
    toggleChecklistItem: (index, newState) => {
        console.log("Preload: Toggling checklist item at index:", index, "with new state:", newState);
        ipcRenderer.send("toggle-checklist-item", { index, newState });
    },
    onChecklistUpdated: (callback) => {
        ipcRenderer.removeAllListeners("update-checklist");
        ipcRenderer.on("update-checklist", (event, checklist) => {
            console.log("Preload received update-checklist:", checklist);
            callback(checklist);
        });
    },
    resetToLegacyChecklist: () => ipcRenderer.send("reset-to-legacy-checklist"),

    // Countdown
    toggleCountdown: () => {
        console.log("Preload: toggleCountdown called");
        ipcRenderer.send("toggle-countdown");
    },

    getTickSoundPath: async () => {
        const tickSoundPath = await ipcRenderer.invoke("get-tick-sound-path");
        console.log("Resolved tick sound path:", tickSoundPath);
        return tickSoundPath;
    },

    setVolume: (volume) => {
        console.log("Preload: setVolume called with volume:", volume);
        ipcRenderer.send("volume-change", volume);
    },

    onVolumeUpdate: (callback) => {
        ipcRenderer.on("update-volume", (event, volume) => {
            console.log("Preload received volume update:", volume);
            callback(volume);
        });
    },

    // Clock 
    toggleClock: () => {
        console.log("Preload: toggleClock called");
        ipcRenderer.send("toggle-clock");
    },

    onUpdateSessionCountdowns: (callback) => {
        ipcRenderer.removeAllListeners("update-session-countdowns");
        ipcRenderer.on("update-session-countdowns", (event, updatedSessions) => {
            console.log("Preload: Received updated session countdowns:", updatedSessions);
    
            // Update the sessionCountdowns array directly in the renderer
            callback(updatedSessions);
    
            // Notify the renderer to refresh the session display
            if (window.displayNextSessionCountdown) {
                window.displayNextSessionCountdown(); // Ensure this function is globally accessible
            }
        });
    },

    updateSettings: (settings) => ipcRenderer.send("update-settings", settings),

    // Exit the application
    exitApp: () => ipcRenderer.send("exit-app"),
    restartApp: () => ipcRenderer.send('restart-app'),

    // Resize window to fit content
    resizeWindowToContent: (width, height) => {
        console.log("Preload: Sending resize request to main process with dimensions:", width, height);
        ipcRenderer.send("resize-window-to-content", { width, height });
    },
});
