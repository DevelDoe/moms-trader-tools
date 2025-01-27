// ./src/main/main.js

const { app, ipcMain, BrowserWindow } = require("electron");
const { createReminderWindow } = require("./windows/reminder/reminder");
const { createSettingsWindow } = require("./windows/settings/settings");
const { createTaskbarWindow } = require("./windows/taskbar/taskbar");
const { createChecklistWindow } = require("./windows/checklist/checklist");
const { createCountdownWindow } = require("./windows/countdown/countdown");
const { createClockWindow } = require("./windows/clock/clock");
const { createResumptionWindow } = require("./windows/resumption/resumption"); // Import
const { desktopCapturer } = require("electron");

const path = require("path");
const fs = require("fs");

const SETTINGS_FILE = path.join(app.getPath("userData"), "settings.json");

let windows = {}; // To store references to all windows
let snipperWindows = {}; // Store references to dynamically created snipper windows
let appSettings = loadSettings(); // Load app settings from file

// Function to load settings from a file
function loadSettings() {
    try {
        const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
        const settings = JSON.parse(data);

        // Log the settings to inspect their content
        console.log("Loaded settings on boot:", settings);

        // Ensure all settings properties exist
        if (!Array.isArray(settings.checklist)) settings.checklist = [];
        if (!Array.isArray(settings.sessionCountdowns)) settings.sessionCountdowns = [];

        return settings;
    } catch {
        return {
            text: "REMINDER", // Default reminder text
            checklist: [], // Initialize with an empty checklist
            sessionCountdowns: [], // Initialize with no session countdowns
        };
    }
}

function saveSettings() {
    if (!Array.isArray(appSettings.checklist)) appSettings.checklist = [];
    if (!Array.isArray(appSettings.sessionCountdowns)) appSettings.sessionCountdowns = [];

    console.log("Saving updated settings:", appSettings);

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2));
}

// IPC Handlers

ipcMain.on("resize-window-to-content", (event, { width, height }) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        console.log(`Resizing window to: ${width}x${height}`);
        senderWindow.setBounds({
            x: senderWindow.getBounds().x,
            y: senderWindow.getBounds().y,
            width: Math.max(width, 80), // Minimum width
            height: Math.max(height, 100), // Minimum height
        });
    }
});

// Settings

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

    if (windows.clock) {
        windows.clock.webContents.send("update-session-countdowns", appSettings.sessionCountdowns);
    }
    if (windows.reminder) {
        windows.reminder.webContents.send("update-reminder-text", newSettings.text);
    }

    // Force a refresh in all relevant windows
    Object.values(windows).forEach((window) => {
        if (window && window.webContents) {
            window.webContents.send("settings-updated", appSettings);
        }
    });
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
        { text: "Hijacked", type: "critical", state: "default" },
        { text: "MACD", type: "critical", state: "default" },
        { text: "Volume", type: "critical", state: "default" },
        { text: "Extended", type: "optional", state: "state-yellow" },
        { text: "Candles", type: "reminder", state: "default" },
        { text: "Alignment", type: "reminder", state: "default" },
        { text: "Spread", type: "critical", state: "default" },
        { text: "Orders", type: "reminder", state: "default" },
        { text: "Price", type: "reminder", state: "default" },
        { text: "9 ema", type: "reminder", state: "default" },
        { text: "Time", type: "reminder", state: "default" },
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
    // console.log("Checklist state being sent to checklist window:", appSettings.checklist); // Debug log
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

// Resumption

ipcMain.on("toggle-resumption", () => {
    const resumptionWindow = windows.resumption;
    if (resumptionWindow) {
        resumptionWindow.isVisible() ? resumptionWindow.hide() : resumptionWindow.show();
    }
});

ipcMain.handle("get-beep-sound-path", () => {
    return path.join(app.getAppPath(), "assets/sounds/beep.mp3");
});

//  Snipper

// Create a new snipper window
ipcMain.on("create-snipper-window", (event, { name, bounds }) => {
    console.log(`Creating snipper window: "${name}" with bounds:`, bounds);

    if (!name || !bounds) {
        console.error("Main process: snipper name and bounds are required.");
        return;
    }

    if (snipperWindows[name]) {
        console.warn(`Main process: snipper window "${name}" already exists.`);
        return;
    }

    const snipperWindow = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, "../renderer/common/preload.js"), // Path to your preload file
            contextIsolation: true, // Required for contextBridge
            enableRemoteModule: false,
            nodeIntegration: false, // Must be false when using contextBridge
        },
    });
    
    // Automatically open DevTools when the window is created
    snipperWindow.webContents.openDevTools({ mode: "detach" });

    snipperWindow
        .loadFile(path.join(__dirname, "../renderer/snipper/snipper.html"))
        .then(() => console.log(`snipper window "${name}" loaded`))
        .catch((err) => console.error("Error loading snipper HTML:", err));

    // Pass the bounds to the snipper window
    snipperWindow.webContents.once("dom-ready", () => {
        snipperWindow.webContents.send("region-selected", bounds);
    });

    snipperWindows[name] = snipperWindow;

    snipperWindow.on("closed", () => {
        delete snipperWindows[name];
        console.log(`Main process: snipper "${name}" closed.`);
    });
});

ipcMain.on("resize-window-to-content", (event, dimensions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        console.log("Resizing window to:", dimensions);
        win.setBounds({
            x: win.getBounds().x,
            y: win.getBounds().y,
            width: Math.max(dimensions.width, 300), // Ensure a minimum width
            height: Math.max(dimensions.height, 300), // Ensure a minimum height
        });
    }
});

ipcMain.on("start-region-selection", async (event, snipperName) => {
    console.log(`Main process: Starting region selection for snipper "${snipperName}".`);

    const regionWindow = new BrowserWindow({
        fullscreen: true,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, "../renderer/common/preload.js"),
        },
    });

    regionWindow.loadFile(path.join(__dirname, "../renderer/snipper/region.html"));

    ipcMain.once("region-selected", async (event, bounds) => {
        console.log("Main process: Region selected:", bounds);

        // Fetch snipper sources
        const sources = await desktopCapturer.getSources({ types: ["screen"] });

        if (sources.length === 0) {
            console.error("No screen sources found.");
            return;
        }

        // Dynamically find the source that matches the region bounds
        const source = sources.find((src) => src.id.includes(bounds.display_id)) || sources[0];
        if (!source) {
            console.error("No matching snipper source found for the selected region.");
            return;
        }

        bounds.sourceId = source.id; // Use the matching source ID

        // Pass bounds and sourceId to create-snipper-window
        ipcMain.emit("create-snipper-window", event, { name: snipperName, bounds });
    });

    ipcMain.once("close-region-selection", () => {
        regionWindow.close();
    });
});


// Update snipper settings
ipcMain.on("update-snipper-settings", (event, { name, settings }) => {
    const snipper = snipperWindows[name];
    if (!snipper) {
        console.error(`No snipper window found with name "${name}"`);
        return;
    }

    // Update settings
    Object.assign(snipper.settings, settings);

    // Apply updates to the snipper window
    if (settings.opacity !== undefined) {
        snipper.window.setOpacity(settings.opacity);
    }

    sendSnipperUpdates(); // Notify renderer of changes
});

// Remove a snipper window
ipcMain.on("remove-snipper-window", (event, name) => {
    const snipper = snipperWindows[name];
    if (!snipper) {
        console.error(`No snipper window found with name "${name}"`);
        return;
    }

    // Close and remove the window
    snipper.window.close();
    delete snipperWindows[name];
    sendSnipperUpdates(); // Notify renderer of changes
});

// Fetch active snippers
ipcMain.handle("get-active-snippers", () => {
    return Object.keys(snipperWindows).map((name) => ({
        name,
        settings: snipperWindows[name].settings,
    }));
});

// Notify renderer of updates
function sendSnipperUpdates() {
    const activeSnippers = Object.keys(snipperWindows).map((name) => ({
        name,
        settings: snipperWindows[name].settings,
    }));

    Object.values(windows).forEach((window) => {
        if (window && window.webContents && window.webContents.send) {
            window.webContents.send("snipper-settings-updated", activeSnippers);
        }
    });
}

// App Ready Event
app.on("ready", () => {
    // Create Taskbar Window
    windows.taskbar = createTaskbarWindow(
        () => ipcMain.emit("toggle-reminder"),
        () => ipcMain.emit("toggle-settings"),
        () => ipcMain.emit("toggle-checklist"),
        () => ipcMain.emit("toggle-countdown"),
        () => ipcMain.emit("toggle-clock"),
        () => ipcMain.emit("toggle-resumption")
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
    windows.resumption = createResumptionWindow(windows.taskbar);

    windows.reminder.webContents.once("dom-ready", () => {
        windows.reminder.webContents.send("update-reminder-text", appSettings.text);
    });

    // Hide all windows by default
    Object.values(windows).forEach((window) => window?.hide());

    // Ensure the taskbar is visible
    if (windows.taskbar) {
        windows.taskbar.show();
    }

    windows.settings.webContents.once("dom-ready", () => {
        windows.settings.webContents.send("update-checklist", appSettings.checklist);
    });

    windows.checklist.webContents.once("dom-ready", () => {
        windows.checklist.webContents.send("load-checklist-state", appSettings.checklist);
    });

    windows.clock.webContents.once("dom-ready", () => {
        windows.clock.webContents.send("update-session-countdowns", appSettings.sessionCountdowns);
    });

    // Ensure other windows are also synced
    Object.values(windows).forEach((window) => {
        if (window && window.webContents) {
            window.webContents.send("settings-updated", appSettings);
        }
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

ipcMain.on("restart-app", () => {
    app.relaunch();
    app.exit(0);
});
