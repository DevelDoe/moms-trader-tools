// ./src/main/main.js

const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require("electron");
const createLogger = require("../hlps/logger");
const { autoUpdater } = require("electron-updater");

const { createSplashWindow } = require("./windows/splash/splash");
const { createReminderWindow } = require("./windows/reminder/reminder");
const { createSettingsWindow } = require("./windows/settings/settings");
const { createTaskbarWindow } = require("./windows/taskbar/taskbar");
const { createChecklistWindow } = require("./windows/checklist/checklist");
const { createCountdownWindow } = require("./windows/countdown/countdown");
const { createClockWindow } = require("./windows/clock/clock");
const { createResumptionWindow } = require("./windows/resumption/resumption");

const path = require("path");
const fs = require("fs");

const log = createLogger(__filename);

autoUpdater.autoDownload = false; // Enable auto-downloading updates
autoUpdater.allowPrerelease = true; // Ensure pre-releases are checked
autoUpdater.forceDevUpdateConfig = true; // ✅ Force update check in development mod

autoUpdater.setFeedURL({
    provider: "github",
    owner: "DevelDoe",
    repo: "moms-trader-tools",
});


const isDevelopment = process.env.NODE_ENV === "development";
const isDebug = process.env.DEBUG === "true";

// Use system settings file for production, separate file for development
const SETTINGS_FILE = isDevelopment
    ? path.join(__dirname, "../settings.dev.json") 
    : path.join(app.getPath("userData"), "settings.json"); 

const FIRST_RUN_FILE = path.join(app.getPath("userData"), "first-run.lock"); // Marker file

// Default settings for fresh installs
const DEFAULT_SETTINGS = {
    checklist: [
        { text: "Hijacked", type: "critical", state: "default" },
        { text: "MACD", type: "critical", state: "default" },
        { text: "Volume", type: "critical", state: "default" },
        { text: "Extended", type: "optional", state: "state-yellow" },
        { text: "Candles", type: "reminder", state: "default" },
        { text: "Spread", type: "critical", state: "default" },
        { text: "Orders", type: "reminder", state: "default" },
        { text: "9 ema", type: "reminder", state: "default" },
        { text: "Time", type: "reminder", state: "default" },
        { text: "50%", type: "reminder", state: "default" },
        { text: "VWAP", type: "reminder", state: "default" },
        { text: "Float", type: "optional", state: "state-yellow" },
        { text: "Cat", type: "optional", state: "state-yellow" },
    ],
    sessionCountdowns: [
        {
            start: "04:00",
            end: "09:30",
            title: "Pre Market",
        },
        {
            start: "07:00",
            end: "09:30",
            title: "Breaking News",
        },
        {
            start: "09:30",
            end: "16:00",
            title: "Open Market",
        },
        {
            start: "15:00",
            end: "16:00",
            title: "Power Hour",
        },
        {
            start: "16:00",
            end: "20:00",
            title: "Post Market",
        },
    ],
    reminderItems: [
        {
            text: "Reminder",
            type: "critical",
        },
        {
            text: "Jot down important insights, ideas and observations.",
            type: "optional",
        },
        {
            text: "inform your trading decisions.",
            type: "reminder",
        },
    ],
    snippers: [],
    reminderTransparent: true
};

// 🛠️ **Function to check if it's a fresh install**
function isFirstInstall() {
    return !fs.existsSync(SETTINGS_FILE) && !fs.existsSync(FIRST_RUN_FILE);
}

// 🛠️ **Function to initialize settings**

if (isFirstInstall()) {
    log.log("Fresh install detected! Creating default settings...");

    // Ensure the userData directory exists
    const settingsDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(settingsDir)) {
        log.log(`Creating settings directory: ${settingsDir}`);
        fs.mkdirSync(settingsDir, { recursive: true }); // ✅ Ensure all parent folders exist
    }

    // Write default settings
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));

    // Create marker file to prevent future resets
    fs.writeFileSync(FIRST_RUN_FILE, "installed");

    log.log("Settings file initialized:", SETTINGS_FILE);
} else {
    log.log("App has been installed before. Keeping existing settings.");
}

let windows = {}; // To store references to all windows
let snipperWindows = {}; // Store references to dynamically created snipper windows
let selectedScreenId = null;
let appSettings = loadSettings(); // Load app settings from file

app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("disable-gpu-process-crash-limit");

// Function to load settings from a file
function loadSettings() {
    try {
        const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
        const settings = JSON.parse(data);

        log.log("Settings loaded");

        // Ensure all settings properties exist
        if (!Array.isArray(settings.checklist)) settings.checklist = [];
        if (!Array.isArray(settings.sessionCountdowns)) settings.sessionCountdowns = [];
        if (!Array.isArray(settings.reminderItems)) settings.reminderItems = []; // Ensure this exists
        if (!Array.isArray(settings.snippers)) settings.snippers = [];

        return settings;
    } catch (err) {
        log.error("error loading settings:", err);
        return {
            checklist: [],
            sessionCountdowns: [],
            reminderItems: [],
        };
    }
}

function saveSettings() {
    if (!Array.isArray(appSettings.checklist)) appSettings.checklist = [];
    if (!Array.isArray(appSettings.sessionCountdowns)) appSettings.sessionCountdowns = [];
    if (!Array.isArray(appSettings.reminderItems)) appSettings.reminderItems = [];
    if (!Array.isArray(appSettings.snippers)) appSettings.snippers = [];

    log.log("Final settings before writing:");
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2));
}

// IPC Handlers

ipcMain.on("close-splash", () => {
    log.log(windows.splash)
    if (windows.splash) {
        log.log("Closing Splash Screen")
        windows.splash.close();
        delete windows.splash; // Remove reference after closing
    }
});

ipcMain.on("resize-window-to-content", (event, { width, height }) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        senderWindow.setBounds({
            x: senderWindow.getBounds().x,
            y: senderWindow.getBounds().y,
            width: Math.max(width, 1),
            height: Math.max(height, 1),
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

ipcMain.handle("get-settings", () => {
    if (!Array.isArray(appSettings.reminderItems)) {
        log.error("Fixing reminderItems array issue...");
        appSettings.reminderItems = [];
    }

    log.log("Returning settings");
    return appSettings;
});

ipcMain.on("update-settings", (event, newSettings) => {
    const previousReminderItems = JSON.stringify(appSettings.reminderItems);
    const previousSessionVolume = appSettings.sessionVolume;

    appSettings = { ...appSettings, ...newSettings };
    saveSettings();

    // Only send reminder update if `reminderItems` changed
    if (JSON.stringify(appSettings.reminderItems) !== previousReminderItems) {
        log.log("Reminder items changed, updating reminder window...");
        if (windows.reminder) {
            windows.reminder.webContents.send("update-reminder-items", appSettings.reminderItems);
        }
    }

    // Only send session volume update separately
    if (appSettings.sessionVolume !== previousSessionVolume) {
        log.log("Session volume changed, updating session volume...");
        Object.values(windows).forEach((window) => {
            if (window && window.webContents) {
                window.webContents.send("update-session-volume", appSettings.sessionVolume);
            }
        });
    }

    // Send full settings update only to windows that need everything
    Object.values(windows).forEach((window) => {
        if (window && window.webContents && window !== windows.reminder) {
            window.webContents.send("settings-updated", appSettings);
        }
    });
});

// reminder

ipcMain.on("toggle-reminder", () => {
    let reminderWindow = windows.reminder;

    if (reminderWindow) {
        if (reminderWindow.isVisible()) {
            reminderWindow.hide();
        } else {
            reminderWindow.show();

            setTimeout(() => {
                log.log("Sending reminder settings after opening...");
                reminderWindow.webContents.send("update-reminder-settings", {
                    reminderTransparent: appSettings.reminderTransparent ?? true, // Default to true
                });
            }, 10); // ✅ Ensure UI loads before sending data
        }
    }
});

ipcMain.on("reminder-ready", (event) => {
    log.log("Reminder window is ready!");

    if (windows.reminder) {
        windows.reminder.webContents.send("update-reminder-items", appSettings.reminderItems);
    }
});

ipcMain.on("refresh-reminder-window", async () => {
    log.log("Refreshing Reminder window due to settings change...");

    if (windows.reminder) {
        windows.reminder.close(); // Close the old window
    }

    // ✅ Recreate the window with updated settings
    windows.reminder = await createReminderWindow(windows.taskbar);
    windows.reminder.show();
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
        { text: "Spread", type: "critical", state: "default" },
        { text: "Orders", type: "reminder", state: "default" },
        { text: "9 ema", type: "reminder", state: "default" },
        { text: "Time", type: "reminder", state: "default" },
        { text: "50%", type: "reminder", state: "default" },
        { text: "VWAP", type: "reminder", state: "default" },
        { text: "Float", type: "optional", state: "state-yellow" },
        { text: "Cat", type: "optional", state: "state-yellow" },
    ];
}

ipcMain.on("reset-to-legacy-checklist", () => {
    log.log("Resetting checklist to legacy default items...");
    appSettings.checklist = getLegacyChecklistItems(); // Replace current checklist
    saveSettings(); // Save to file
    updateChecklistWindows(); // Update all windows
});

ipcMain.handle("load-checklist-state", () => {
    return appSettings.checklist;
});

ipcMain.on("toggle-checklist-item", (event, { index, newState }) => {
    if (appSettings.checklist[index]) {
        // Update item state
        appSettings.checklist[index] = { ...appSettings.checklist[index], ...newState };

        saveSettings();
        updateChecklistWindows();
    } else {
        log.error("Checklist item not found at index:", index);
    }
});
ipcMain.on("add-checklist-item", (event, item) => {
    if (!Array.isArray(appSettings.checklist)) {
        appSettings.checklist = [];
    }
    appSettings.checklist.push(item);
    log.log("Checklist item added:", appSettings.checklist);
    saveSettings(appSettings);
    updateChecklistWindows();
});

ipcMain.on("remove-checklist-item", (event, index) => {
    if (appSettings.checklist[index]) {
        log.log("Removing item:", appSettings.checklist[index]);
        appSettings.checklist.splice(index, 1);
        saveSettings(appSettings);
        updateChecklistWindows();
    } else {
        log.error("Item not found at index:", index);
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
        log.log("Updating checklist window with state:", appSettings.checklist);
        windows.checklist.webContents.send("update-checklist", appSettings.checklist);
    }
    if (windows.settings) {
        log.log("Updating settings window with state:", appSettings.checklist);
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
                    window.webContents.send("update-countdown-volume", 0);
                }
            });
        } else {
            countdownWindow.show();
            // Set volume to 0.5 when window is shown
            Object.values(windows).forEach((window) => {
                if (window && window.webContents) {
                    window.webContents.send("update-countdown-volume", 0.5);
                }
            });
        }
    }
});

ipcMain.on("countdown-volume-change", (event, volume) => {
    log.log("Received volume change:", volume);
    if (windows.countdown) {
        windows.countdown.webContents.send("update-countdown-volume", volume);
    }
});

ipcMain.handle("get-tick-sound-path", () => {
    return path.join(app.getAppPath(), "assets/sounds/tick.mp3");
});

ipcMain.on("countdown-volume-change", (event, volume) => {
    log.log("Main process received volume change:", volume);
    // Broadcast the volume update to all renderer processes
    Object.values(windows).forEach((window) => {
        if (window && window.webContents) {
            window.webContents.send("update-countdown-volume", volume);
        }
    });
});

// Clock

ipcMain.on("toggle-clock", async () => {
    const clockWindow = windows.clock;
    if (clockWindow) {
        if (clockWindow.isVisible()) {
            clockWindow.hide();
            // Mute the session bell when clock is closed
            log.log("Clock hidden, muting session volume.");
            if (windows.clock) {
                windows.clock.webContents.send("update-session-volume", 0);
            }
        } else {
            clockWindow.show();

            // Fetch the stored session volume from settings
            const settings = await loadSettings(); // Ensure this function is async and correctly loads settings
            const sessionVolume = settings.sessionVolume || 0.1; // Default to 0.1 if missing

            log.log(`Clock opened, restoring session volume to ${sessionVolume}.`);
            if (windows.clock) {
                windows.clock.webContents.send("update-session-volume", sessionVolume);
            }
        }
    }
});

ipcMain.handle("get-bell-sound-path", () => {
    return path.join(app.getAppPath(), "assets/sounds/bell.mp3");
});

ipcMain.handle("get-5min-sound-path", () => {
    return path.join(app.getAppPath(), "assets/sounds/5min.mp3");
});

ipcMain.on("session-volume-change", (event, volume) => {
    log.log("Session bell volume changed to:", volume);
    appSettings.sessionVolume = volume;
    saveSettings(); // Save to settings.json

    // Broadcast the updated volume to all windows
    Object.values(windows).forEach((window) => {
        if (window && window.webContents) {
            window.webContents.send("update-session-volume", volume);
        }
    });
});

ipcMain.on("reset-to-default-sessions", () => {
    log.log("Resetting session countdowns to default settings...");

    appSettings.sessionCountdowns = [
        { start: "04:00", end: "09:30", title: "Pre Market" },
        { start: "07:00", end: "09:30", title: "Breaking News" },
        { start: "09:30", end: "16:00", title: "Open Market" },
        { start: "15:00", end: "16:00", title: "Power Hour" },
        { start: "16:00", end: "20:00", title: "Post Market" },
    ];

    saveSettings(); // Save to file
    updateSessionWindows(); // Notify UI about the change
});

function updateSessionWindows() {
    if (windows.clock) {
        log.log("Updating clock window with session countdowns:", appSettings.sessionCountdowns);
        windows.clock.webContents.send("update-session-countdowns", appSettings.sessionCountdowns);
    }
    if (windows.settings) {
        log.log("Updating settings window with session countdowns:", appSettings.sessionCountdowns);
        windows.settings.webContents.send("update-session-countdowns", appSettings.sessionCountdowns);
    }
}

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

// Snipper

// Open Snipper Dialog
ipcMain.on("open-snipper-dialog", (event) => {
    log.log("Opening Snipper Dialog...");
    const dialogWindow = createSnipperDialogWindow();

    ipcMain.once("snipper-name-confirmed", (event, name) => {
        log.log(`Snipper name confirmed: ${name}`);
        if (dialogWindow) {
            dialogWindow.close();
        }
    });
});

ipcMain.on("screen-selected", (event, sourceId) => {
    if (!sourceId) {
        log.error("❌ Invalid screen ID received!");
        return;
    }
    log.log(`✅ User selected screen: ${sourceId}`);
    selectedScreenId = sourceId; // ✅ Ensure it gets saved
});

ipcMain.handle("get-screens", async () => {
    try {
        log.log("🖥 Fetching available screens...");
        const sources = await desktopCapturer.getSources({ types: ["screen"] });
        log.log("📺 Available screens:", sources);

        return sources.map((source) => ({
            id: source.id,
            name: source.name || `Screen ${source.id}`,
        }));
    } catch (error) {
        log.error("❌ Error fetching screens:", error);
        return [];
    }
});

ipcMain.handle("get-selected-screen", async () => {
    log.log("🔎 Looking for selected screen:", selectedScreenId);

    if (!selectedScreenId) {
        console.warn("⚠️ No screen has been selected yet. Returning default.");
        return { id: "default", name: "Unknown", display_id: null, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
    }

    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    log.log(
        "📺 All available sources:",
        sources.map((src) => ({ id: src.id, name: src.name }))
    );

    const selectedScreen = sources.find((src) => src.id === selectedScreenId);

    if (!selectedScreen) {
        log.error("❌ No matching screen found for ID:", selectedScreenId);
        return { id: "default", name: "Unknown", display_id: null, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
    }

    log.log("✅ Found selected screen:", selectedScreen);
    return {
        id: selectedScreen.id,
        name: selectedScreen.name,
        display_id: selectedScreen.display_id,
        bounds: selectedScreen.bounds || { x: 0, y: 0, width: 1920, height: 1080 },
    };
});

ipcMain.on("snipper-name-confirmed", (event, name) => {
    log.log(`✅ Snipper name confirmed: ${name}`);

    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) senderWindow.close(); // Close the dialog window

    // 🚨 Ensure only one region selection starts
    if (!windows.regionSelection) {
        ipcMain.emit("start-region-selection", event, name);
    } else {
        console.warn("⚠️ Region selection is already open, ignoring duplicate request.");
    }
});

ipcMain.on("snipper-cancelled", (event) => {
    log.log("❌ Snipper creation cancelled.");

    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) senderWindow.close(); // Close the dialog window
});

// Create Snipper Window
ipcMain.on("create-snipper-window", (event, { name, bounds, sourceId }) => {
    if (!name || !bounds || !sourceId) {
        log.error("Missing required data for creating Snipper window.", { name, bounds, sourceId });
        return;
    }

    log.log(`Creating Snipper window`);

    if (snipperWindows[name]) {
        console.warn(`Snipper "${name}" already exists.`);
        return;
    }

    // Get correct screen bounds from Electron's screen API
    const displays = require("electron").screen.getAllDisplays();
    const matchedDisplay = displays.find((d) => d.id === parseInt(bounds.display_id));

    if (!matchedDisplay) {
        log.error(`No matching display found for screen ID: ${bounds.display_id}`);
        return;
    }

    const { x: screenX, y: screenY } = matchedDisplay.bounds;
    log.log(`Snipper should appear at screen `);

    // Adjust for multi-screen layout
    const snipperWindow = new BrowserWindow({
        x: screenX + bounds.x, // Ensure it appears on the right screen
        y: screenY + bounds.y,
        width: bounds.width,
        height: bounds.height,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "../renderer/common/preload.js"),
            contextIsolation: true,
        },
    });

    snipperWindow
        .loadFile(path.join(__dirname, "../renderer/snipper/snipper.html"))
        .then(() => log.log(`Snipper window "${name}" loaded`))
        .catch((err) => log.error("Error loading snipper HTML:", err));

    // ✅ Send the correct `sourceId` to renderer
    snipperWindow.webContents.once("dom-ready", () => {
        snipperWindow.webContents.send("region-selected", { ...bounds, sourceId });
    });

    snipperWindows[name] = snipperWindow;

    snipperWindow.on("closed", () => {
        log.log(`Snipper "${name}" closed.`);
        delete snipperWindows[name];

        saveSettings();
        sendSnipperUpdates();
    });

    saveSettings();
    sendSnipperUpdates();
});

// Handle Region Selection
ipcMain.on("start-region-selection", async (event, snipperName) => {
    log.log(`🟢 Starting region selection for Snipper "${snipperName}". Called by:`, event.sender.getURL());

    if (windows.regionSelection) {
        console.warn("⚠️ Region selection is already open. Ignoring duplicate request.");
        return;
    }

    try {
        // Fetch selected screen details
        const sources = await desktopCapturer.getSources({ types: ["screen"] });
        log.log(
            "📺 Available screens:",
            sources.map((src) => ({ id: src.id, name: src.name }))
        );

        if (!selectedScreenId) {
            log.error("No screen has been selected. Defaulting to primary screen.");
            selectedScreenId = sources[0]?.id; // Set to first screen if none selected
        }

        const selectedScreen = sources.find((src) => src.id === selectedScreenId);

        if (!selectedScreen) {
            log.error(`No matching screen found for ID: ${selectedScreenId}`);
            return;
        }

        // Electron does not provide bounds from `desktopCapturer`, so get it another way
        const displays = require("electron").screen.getAllDisplays();
        const matchedDisplay = displays.find((d) => d.id === parseInt(selectedScreen.display_id));

        if (!matchedDisplay) {
            log.error(`Could not retrieve display bounds for screen ID: ${selectedScreen.display_id}`);
            return;
        }

        const { x, y, width, height } = matchedDisplay.bounds;
        log.log(`Opening region selection window on: ${selectedScreen.name} at (${x}, ${y}) [${width}x${height}]`);

        // Create the region selection window at the correct position
        windows.regionSelection = new BrowserWindow({
            x: x,
            y: y,
            width: width,
            height: height,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            fullscreen: true, // ✅ Takes full screen on the selected monitor
            webPreferences: {
                contextIsolation: true,
                preload: path.join(__dirname, "../renderer/common/preload.js"),
            },
        });

        await windows.regionSelection.loadFile(path.join(__dirname, "../renderer/snipper/region.html"));

        log.log("Region selection window loaded on the correct screen.");

        windows.regionSelection.webContents.once("dom-ready", () => {
            log.log("`region.html` is ready for selection.");
        });

        ipcMain.removeAllListeners("region-selected");

        ipcMain.once("region-selected", async (event, bounds) => {
            log.log("Region selected:", bounds);
            log.log("Using selected screen ID:", selectedScreenId);

            try {
                bounds.sourceId = selectedScreen.id;
                bounds.display_id = selectedScreen.display_id; // Store display ID

                log.log(`📌 Saving selected region for "${snipperName}" on screen ${selectedScreen.name}:`, bounds);

                appSettings.snippers = appSettings.snippers.filter((snip) => snip.name !== snipperName);
                appSettings.snippers.push({ name: snipperName, ...bounds });

                saveSettings();

                ipcMain.emit("create-snipper-window", event, { name: snipperName, bounds, sourceId: bounds.sourceId });
            } catch (error) {
                log.error("⚠️ Error processing region selection:", error);
            }

            if (windows.regionSelection) {
                windows.regionSelection.close();
                windows.regionSelection = null;
            }
        });

        ipcMain.once("close-region-selection", () => {
            log.log("Region selection canceled.");
            if (windows.regionSelection) {
                windows.regionSelection.close();
                windows.regionSelection = null;
            }
        });
    } catch (error) {
        log.error("Error starting region selection:", error);
    }
});

// Update Snipper Settings (Rename & Move)
ipcMain.on("update-snipper-settings", (event, { oldName, newName, x, y }) => {
    if (!snipperWindows[oldName]) return;

    const snipper = snipperWindows[oldName];

    if (newName && newName !== oldName) {
        snipperWindows[newName] = snipper;
        delete snipperWindows[oldName];
        snipper.setTitle(newName);
    }

    if (x !== undefined && y !== undefined) {
        snipper.setBounds({ x, y, width: snipper.getBounds().width, height: snipper.getBounds().height });
    }

    saveSettings();
    sendSnipperUpdates();
});

// Remove Snipper Window
ipcMain.on("remove-snipper-window", (event, name) => {
    if (!snipperWindows[name]) return;

    snipperWindows[name].close();
    delete snipperWindows[name];

    appSettings.snippers = appSettings.snippers.filter((snip) => snip.name !== name);

    saveSettings();
    sendSnipperUpdates();
});

// Fetch Active Snippers
ipcMain.handle("get-active-snippers", () => {
    return Object.keys(snipperWindows).map((name) => ({
        name,
        x: snipperWindows[name].getBounds().x,
        y: snipperWindows[name].getBounds().y,
    }));
});

// Notify Renderer of Snipper Updates
function sendSnipperUpdates() {
    const activeSnippers = Object.keys(snipperWindows).map((name) => ({
        name,
        x: snipperWindows[name].getBounds().x,
        y: snipperWindows[name].getBounds().y,
    }));

    Object.values(BrowserWindow.getAllWindows()).forEach((window) => {
        if (window.webContents) {
            window.webContents.send("snipper-settings-updated", activeSnippers);
        }
    });
}

// Create Snipper Dialog Window
function createSnipperDialogWindow() {
    const dialogWindow = new BrowserWindow({
        width: 230,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        resizable: true,
        transparent: true,
        webPreferences: {
            preload: path.join(__dirname, "../renderer/common/preload.js"),
            contextIsolation: true,
        },
    });

    dialogWindow.loadFile(path.join(__dirname, "../renderer/snipper/dialog.html"));

    dialogWindow.webContents.openDevTools({ mode: "detach" });

    return dialogWindow;
}
app.on("ready", () => {
    log.log("App is starting...");

    // Show Splash Screen first, then load the main app
    windows.splash = createSplashWindow(() => { // ✅ Store splash reference
        log.log("Splash screen closed. Loading main app...");

        // Do NOT redefine `windows` here! Remove `let windows = {};`
        // 🟢 Create Taskbar Window
        windows.taskbar = createTaskbarWindow(
            () => ipcMain.emit("toggle-reminder"),
            () => ipcMain.emit("toggle-settings"),
            () => ipcMain.emit("toggle-checklist"),
            () => ipcMain.emit("toggle-countdown"),
            () => ipcMain.emit("toggle-clock"),
            () => ipcMain.emit("toggle-resumption")
        );

        if (!windows.taskbar) {
            log.error("Taskbar window could not be created.");
            return;
        }

        // 🟢 Create Main Windows
        windows.reminder = createReminderWindow(windows.taskbar, appSettings.text);
        windows.settings = createSettingsWindow(windows.taskbar);
        windows.checklist = createChecklistWindow(windows.taskbar);
        windows.countdown = createCountdownWindow(windows.taskbar);
        windows.clock = createClockWindow(windows.taskbar);
        windows.resumption = createResumptionWindow(windows.taskbar);

        // windows.reminder.webContents.once("dom-ready", () => {
        //     windows.reminder.webContents.send("update-reminder-text", appSettings.text);
        // });

        // Hide all windows except the taskbar
        Object.values(windows).forEach((window) => window?.hide());

        // 🟢 Ensure Taskbar is visible
        if (windows.taskbar) {
            windows.taskbar.show();
        }

        // Load settings into windows
        windows.settings.webContents.once("dom-ready", () => {
            windows.settings.webContents.send("update-checklist", appSettings.checklist);
        });

        windows.checklist.webContents.once("dom-ready", () => {
            windows.checklist.webContents.send("load-checklist-state", appSettings.checklist);
        });

        windows.clock.webContents.once("dom-ready", () => {
            windows.clock.webContents.send("update-session-countdowns", appSettings.sessionCountdowns);
        });

        // 🟢 Sync Settings Across Windows
        Object.values(windows).forEach((window) => {
            if (window && window.webContents) {
                window.webContents.send("settings-updated", appSettings);
            }
        });

        // 🟢 Restore Snippers
        if (Array.isArray(appSettings.snippers)) {
            log.log("Restoring Snippers from saved regions");

            desktopCapturer
                .getSources({ types: ["screen"] })
                .then((sources) => {
                    if (sources.length === 0) {
                        log.error("No screen sources available for Snipper.");
                        return;
                    }

                    appSettings.snippers.forEach((snip) => {
                        log.log(`Restoring Snipper with saved region bounds`);

                        const source = sources.find((src) => snip.sourceId && src.id === snip.sourceId) || sources[0];

                        if (!source) {
                            log.error(`No matching source found for Snipper: ${snip.name}`);
                            return;
                        }

                        log.log(`Assigning sourceId`);

                        ipcMain.emit("create-snipper-window", null, {
                            name: snip.name,
                            bounds: snip,
                            sourceId: source.id,
                        });
                    });
                })
                .catch((error) => {
                    log.error("Error fetching screen sources:", error);
                });
        }

        log.log("Snippers restored from settings");
    });
});

// Quit the app when all windows are closed
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

ipcMain.on("exit-app", () => {
    log.log("Exiting the app...");
    app.quit();
});

ipcMain.on("restart-app", () => {
    app.relaunch();
    app.exit(0);
});

// UPDATES - Only runs in production mode
if (!isDevelopment) {
    log.log("Production mode detected, checking for updates...");
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on("checking-for-update", () => {
        log.log("Checking for update...");
    });

    autoUpdater.on("update-available", (info) => {
        log.log(`🔔 Update found: ${info.version}`);
    
        if (appSettings.hasDonated) {
            // 🛠 If user has donated, let them decide
            dialog.showMessageBox({
                type: "info",
                title: "Update Available",
                message: `A new update (${info.version}) is available. Would you like to download it now?`,
                buttons: ["Download", "Later"],
            }).then((result) => {
                if (result.response === 0) {
                    log.log("User confirmed download, starting...");
                    autoUpdater.downloadUpdate();
                } else {
                    log.log("User postponed update.");
                }
            });
        } else {
            // 🛠 If user hasn’t donated, update automatically
            log.log("User hasn't donated, auto-downloading update...");
            autoUpdater.downloadUpdate();
        }
    });

    autoUpdater.on("update-not-available", () => {
        log.log("No update available.");
    });

    autoUpdater.on("error", (err) => {
        log.error("Update error:", err);
    });
    process.on("unhandledRejection", (reason, promise) => {
        log.error("Unhandled Promise Rejection:", reason);
    });

    autoUpdater.on("download-progress", (progressObj) => {
        let logMessage = `Download speed: ${progressObj.bytesPerSecond} - `;
        logMessage += `Downloaded ${progressObj.percent}% (${progressObj.transferred} / ${progressObj.total})`;
        log.log(logMessage);
    });

    autoUpdater.on("update-downloaded", () => {
        if (appSettings.hasDonated) {
            // 🛠 Donors can choose when to install
            dialog.showMessageBox({
                type: "info",
                title: "Update Ready",
                message: "The update has been downloaded. Would you like to restart the app now to install it?",
                buttons: ["Restart", "Later"],
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        } else {
            // 🛠 Non-donors get auto-installed updates
            log.log("User hasn't donated, installing update now...");
            autoUpdater.quitAndInstall();
        }
    });

} else {
    log.log("Skipping auto-updates in development mode.");
}
