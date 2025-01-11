// ./src/main/main.js

const { app, ipcMain } = require("electron");
const { createReminderWindow } = require("./windows/reminder/reminder");
const { createSettingsWindow } = require("./windows/settings/settings");
const { createTaskbarWindow } = require("./windows/taskbar/taskbar");
const { createChecklistWindow } = require("./windows/checklist/checklist");
const { createCountdownWindow } = require("./windows/countdown/countdown");
const { createClockWindow } = require("./windows/clock/clock");

const path = require("path");
const fs = require("fs");

const SETTINGS_FILE = path.join(app.getPath("userData"), "settings.json");

let windows = {}; // To store references to all windows
let appSettings = loadSettings(); // Load app settings from file

// Function to load settings from a file
function loadSettings() {
    try {
        const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
        const settings = JSON.parse(data);

        // Ensure checklist property exists and is an array
        if (!Array.isArray(settings.checklist)) {
            settings.checklist = [];
        }

        return settings;
    } catch {
        return {
            text: "REMINDER", // Default reminder text
            checklist: [], // Initialize with an empty checklist
        };
    }
}

// Unified function to save settings to a file
function saveSettings() {
    if (!Array.isArray(appSettings.checklist)) {
        appSettings.checklist = []; // Ensure checklist is an array
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2));
}

// IPC Handlers

// Settings// Settings// Settings// Settings// Settings

ipcMain.on("toggle-settings", () => {
    const settingsWindow = windows.settings;
    if (settingsWindow) {
        settingsWindow.isVisible() ? settingsWindow.hide() : settingsWindow.show();
    }
});

ipcMain.handle("get-settings", () => appSettings);

ipcMain.on("update-settings", (event, newSettings) => {
    appSettings = { ...appSettings, ...newSettings };
    saveSettings();

    if (windows.reminder) {
        windows.reminder.webContents.send("update-reminder-text", newSettings.text);
    }
});


// reminder

ipcMain.on("toggle-reminder", () => {
    const reminderWindow = windows.reminder;
    if (reminderWindow) {
        reminderWindow.isVisible() ? reminderWindow.hide() : reminderWindow.show();
    }
});

// Checklist

ipcMain.on("toggle-checklist", () => {
    const checklistWindow = windows.checklist;
    if (checklistWindow) {
        checklistWindow.isVisible() ? checklistWindow.hide() : checklistWindow.show();
    }
});

function getLegacyChecklistItems() {
    return [
        { text: "hijacked", type: "critical", state: "default" },
        { text: "MACD", type: "critical", state: "default" },
        { text: "Volume", type: "critical", state: "default" },
        { text: "Extended", type: "optional", state: "state-yellow" },
        { text: "Candles", type: "reminder", state: "default" },
        { text: "Alignment", type: "reminder", state: "default" },
        { text: "Spread", type: "critical", state: "default" },
        { text: "Orders", type: "reminder", state: "default" },
        { text: "9 ema", type: "reminder", state: "default" },
        { text: "Time left", type: "reminder", state: "default" },
        { text: "50%", type: "reminder", state: "default" },
        { text: "VWAP", type: "reminder", state: "default" },
        { text: "Float", type: "optional", state: "state-yellow" },
        { text: "Cat", type: "optional", state: "state-yellow" },
    ];
}

ipcMain.on("reset-to-legacy-checklist", () => {
    console.log("Resetting checklist to legacy default items...");
    appSettings.checklist = getLegacyChecklistItems(); // Replace current checklist
    saveSettings(); // Save to file
    updateChecklistWindows(); // Update all windows
});

ipcMain.handle("load-checklist-state", () => {
    console.log("Checklist state being sent to checklist window:", appSettings.checklist); // Debug log
    return appSettings.checklist;
});

ipcMain.on("toggle-checklist-item", (event, { index, newState }) => {
    if (appSettings.checklist[index]) {
        // Update item state
        appSettings.checklist[index] = { ...appSettings.checklist[index], ...newState };

        saveSettings();
        updateChecklistWindows();
    } else {
        console.error("Checklist item not found at index:", index);
    }
});
ipcMain.on("add-checklist-item", (event, item) => {
    if (!Array.isArray(appSettings.checklist)) {
        appSettings.checklist = [];
    }
    appSettings.checklist.push(item);
    console.log("Checklist item added:", appSettings.checklist); // Debug log
    saveSettings(appSettings);
    updateChecklistWindows();
});

ipcMain.on("remove-checklist-item", (event, index) => {
    if (appSettings.checklist[index]) {
        console.log("Removing item:", appSettings.checklist[index]); // Debug log
        appSettings.checklist.splice(index, 1);
        saveSettings(appSettings);
        updateChecklistWindows();
    } else {
        console.error("Item not found at index:", index); // Debug log
    }
});

ipcMain.on("reset-checklist", () => {
    appSettings.checklist = getDefaultChecklistItems();
    saveSettings();
    updateChecklistWindows();
});

function getDefaultChecklistItems() {
    return [
        { text: "Review Orders", type: "critical", state: "default" },
        { text: "Check Volume", type: "critical", state: "default" },
        { text: "Verify EMA", type: "reminder", state: "default" },
        { text: "Prepare VWAP", type: "reminder", state: "default" },
        { text: "Float Size", type: "optional", state: "state-yellow" },
        { text: "Spread Analysis", type: "critical", state: "default" },
    ];
}

function updateChecklistWindows() {
    if (windows.checklist) {
        console.log("Updating checklist window with state:", appSettings.checklist);
        windows.checklist.webContents.send("update-checklist", appSettings.checklist);
    }
    if (windows.settings) {
        console.log("Updating settings window with state:", appSettings.checklist);
        windows.settings.webContents.send("update-checklist", appSettings.checklist);
    }
}

ipcMain.on("request-update", (event) => {
    const updatedData = getUpdatedData(); // Function to fetch updated data
    event.sender.send("update-data", updatedData);
});

// Countdown

ipcMain.on("toggle-countdown", () => {
    const countdownWindow = windows.countdown;

    if (countdownWindow) {
        if (countdownWindow.isVisible()) {
            countdownWindow.hide();
            // Set volume to 0 when window is closed
            Object.values(windows).forEach((window) => {
                if (window && window.webContents) {
                    window.webContents.send("update-volume", 0);
                }
            });
        } else {
            countdownWindow.show();
            // Set volume to 0.5 when window is shown
            Object.values(windows).forEach((window) => {
                if (window && window.webContents) {
                    window.webContents.send("update-volume", 0.5);
                }
            });
        }
    }
});

ipcMain.on("volume-change", (event, volume) => {
    console.log("Received volume change:", volume);
    if (windows.countdown) {
        windows.countdown.webContents.send("update-volume", volume);
    }
});

ipcMain.handle("get-tick-sound-path", () => {
    return path.join(app.getAppPath(), "assets/sounds/tick.mp3");
});

ipcMain.on("volume-change", (event, volume) => {
    console.log("Main process received volume change:", volume);
    // Broadcast the volume update to all renderer processes
    Object.values(windows).forEach((window) => {
        if (window && window.webContents) {
            window.webContents.send("update-volume", volume);
        }
    });
});

// Clock 

ipcMain.on("toggle-clock", () => {
    const clockWindow = windows.clock;
    if (clockWindow) {
        clockWindow.isVisible() ? clockWindow.hide() : clockWindow.show();
    }
});


// App Ready Event
app.on("ready", () => {
     // Create Taskbar Window
     windows.taskbar = createTaskbarWindow(
        () => ipcMain.emit("toggle-reminder"),
        () => ipcMain.emit("toggle-settings"),
        () => ipcMain.emit("toggle-checklist"),
        () => ipcMain.emit("toggle-countdown"),
        () => ipcMain.emit("toggle-clock")
    );

    // Ensure the taskbar window is created before passing
    if (!windows.taskbar) {
        console.error("Taskbar window could not be created.");
        return;
    }

    // Create Windows
    windows.reminder = createReminderWindow(windows.taskbar, appSettings.text);
    windows.settings = createSettingsWindow(windows.taskbar);
    windows.checklist = createChecklistWindow(windows.taskbar);
    windows.countdown = createCountdownWindow(windows.taskbar);
    windows.clock = createClockWindow(windows.taskbar);


    windows.reminder.webContents.once("dom-ready", () => {
        windows.reminder.webContents.send("update-reminder-text", appSettings.text);
    });

    windows.reminder.hide(); // Hide reminder window by default

    windows.settings.webContents.once("dom-ready", () => {
        windows.settings.webContents.send("update-checklist", appSettings.checklist);
    });

    windows.checklist.webContents.once("dom-ready", () => {
        windows.checklist.webContents.send("load-checklist-state", appSettings.checklist);
    });

});


// Quit the app when all windows are closed
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

ipcMain.on("exit-app", () => {
    console.log("Exiting the app...");
    app.quit();
});