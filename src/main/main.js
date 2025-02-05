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

app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("disable-gpu-process-crash-limit");

// Function to load settings from a file
function loadSettings() {
    try {
        const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
        const settings = JSON.parse(data);

        console.log("Loaded settings on boot:", settings);

        // Ensure all settings properties exist
        if (!Array.isArray(settings.checklist)) settings.checklist = [];
        if (!Array.isArray(settings.sessionCountdowns)) settings.sessionCountdowns = [];
        if (!Array.isArray(settings.reminderItems)) settings.reminderItems = []; // Ensure this exists
        if (!Array.isArray(settings.snippers)) settings.snippers = [];

        // Remove deprecated 'text' key if present
        if ("text" in settings) {
            console.log("Removing deprecated 'text' attribute from settings...");
            delete settings.text;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2)); // Save the cleaned settings
        }

        return settings;
    } catch (error) {
        console.error("Error loading settings:", error);
        return {
            checklist: [],
            sessionCountdowns: [],
            reminderItems: [], // Initialize as an empty list
        };
    }
}

function saveSettings() {
    if (!Array.isArray(appSettings.checklist)) appSettings.checklist = [];
    if (!Array.isArray(appSettings.sessionCountdowns)) appSettings.sessionCountdowns = [];
    if (!Array.isArray(appSettings.reminderItems)) appSettings.reminderItems = [];
    if (!Array.isArray(appSettings.snippers)) appSettings.snippers = [];

    // Remove deprecated `text` field
    if ("text" in appSettings) {
        console.log("Removing deprecated 'text' from settings...");
        delete appSettings.text;
    }

    console.log("✅ Final settings before writing:", JSON.stringify(appSettings, null, 2));

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
            width: Math.max(width, 1), // Set a minimum width
            height: Math.max(height, 1), // Set a minimum height
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
        console.error("Fixing reminderItems array issue...");
        appSettings.reminderItems = [];
    }

    console.log("Returning settings:", appSettings);
    return appSettings;
});

ipcMain.on("update-settings", (event, newSettings) => {
    const previousReminderItems = JSON.stringify(appSettings.reminderItems);
    const previousSessionVolume = appSettings.sessionVolume;

    appSettings = { ...appSettings, ...newSettings };
    saveSettings();

    // Only send reminder update if `reminderItems` changed
    if (JSON.stringify(appSettings.reminderItems) !== previousReminderItems) {
        console.log("📌 Reminder items changed, updating reminder window...");
        if (windows.reminder) {
            windows.reminder.webContents.send("update-reminder-items", appSettings.reminderItems);
        }
    }

    // Only send session volume update separately
    if (appSettings.sessionVolume !== previousSessionVolume) {
        console.log("🔊 Session volume changed, updating session volume...");
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

// ipcMain.on("toggle-reminder", () => {
//     const reminderWindow = windows.reminder;
//     if (reminderWindow) {
//         if (reminderWindow.isVisible()) {
//             reminderWindow.hide();
//         } else {
//             reminderWindow.show();

//             setTimeout(() => {
//                 console.log("Sending reminder items after opening...");
//                 reminderWindow.webContents.send("update-reminder-items", appSettings.reminderItems);
//             }, 10); // ✅ Give time for UI to load first
//         }
//     }
// });

ipcMain.on("toggle-reminder", () => {
    let reminderWindow = windows.reminder;

    if (reminderWindow) {
        if (reminderWindow.isVisible()) {
            reminderWindow.hide();
        } else {
            reminderWindow.show();

            setTimeout(() => {
                console.log("Sending reminder settings after opening...");
                reminderWindow.webContents.send("update-reminder-settings", {
                    reminderTransparent: appSettings.reminderTransparent ?? true, // Default to true
                });
            }, 10); // ✅ Ensure UI loads before sending data
        }
    }
});


ipcMain.on("reminder-ready", (event) => {
    console.log("Reminder window is ready!");

    if (windows.reminder) {
        windows.reminder.webContents.send("update-reminder-items", appSettings.reminderItems);
    }
});

ipcMain.on("refresh-reminder-window", async () => {
    console.log("🔄 Refreshing Reminder window due to settings change...");

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
    console.log("Received volume change:", volume);
    if (windows.countdown) {
        windows.countdown.webContents.send("update-countdown-volume", volume);
    }
});

ipcMain.handle("get-tick-sound-path", () => {
    return path.join(app.getAppPath(), "assets/sounds/tick.mp3");
});

ipcMain.on("countdown-volume-change", (event, volume) => {
    console.log("Main process received volume change:", volume);
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
            console.log("Clock hidden, muting session volume.");
            if (windows.clock) {
                windows.clock.webContents.send("update-session-volume", 0);
            }
        } else {
            clockWindow.show();

            // Fetch the stored session volume from settings
            const settings = await loadSettings(); // Ensure this function is async and correctly loads settings
            const sessionVolume = settings.sessionVolume || 0.1; // Default to 0.1 if missing

            console.log(`Clock opened, restoring session volume to ${sessionVolume}.`);
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
    console.log("🔊 Session bell volume changed to:", volume);
    appSettings.sessionVolume = volume;
    saveSettings(); // Save to settings.json

    // Broadcast the updated volume to all windows
    Object.values(windows).forEach((window) => {
        if (window && window.webContents) {
            window.webContents.send("update-session-volume", volume);
        }
    });
});

// ipcMain.on("session-5min-warrning-volume-change", (event, volume) => {
//     console.log("🔊 Session 5 min warrning volume changed to:", volume);
//     appSettings.5minVolume = volume;
//     saveSettings(); // Save to settings.json

//     // Broadcast the updated volume to all windows
//     Object.values(windows).forEach((window) => {
//         if (window && window.webContents) {
//             window.webContents.send("update-5min-volume", volume);
//         }
//     });
// });

ipcMain.on("reset-to-default-sessions", () => {
    console.log("Resetting session countdowns to default settings...");

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
        console.log("Updating clock window with session countdowns:", appSettings.sessionCountdowns);
        windows.clock.webContents.send("update-session-countdowns", appSettings.sessionCountdowns);
    }
    if (windows.settings) {
        console.log("Updating settings window with session countdowns:", appSettings.sessionCountdowns);
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

// Open Snipper Dialog
ipcMain.on("open-snipper-dialog", (event) => {
    console.log("Opening Snipper Dialog...");
    const dialogWindow = createSnipperDialogWindow();

    ipcMain.once("snipper-name-confirmed", (event, name) => {
        console.log(`Snipper name confirmed: ${name}`);
        if (dialogWindow) {
            dialogWindow.close();
        }
    });
});

ipcMain.on("snipper-name-confirmed", (event, name) => {
    console.log(`✅ Snipper name confirmed: ${name}`);

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
    console.log("❌ Snipper creation cancelled.");

    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) senderWindow.close(); // Close the dialog window
});

// Create Snipper Window
ipcMain.on("create-snipper-window", (event, { name, bounds, sourceId }) => {
    if (!name || !bounds || !sourceId) {
        console.error("❌ Missing required data for creating Snipper window.", { name, bounds, sourceId });
        return;
    }

    console.log(`📸 Creating Snipper window: "${name}" with bounds:`, bounds, "sourceId:", sourceId);

    if (snipperWindows[name]) {
        console.warn(`⚠️ Snipper "${name}" already exists.`);
        return;
    }

    const snipperWindow = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, "../renderer/common/preload.js"),
            contextIsolation: true,
        },
    });

    snipperWindow
        .loadFile(path.join(__dirname, "../renderer/snipper/snipper.html"))
        .then(() => console.log(`✅ Snipper window "${name}" loaded`))
        .catch((err) => console.error("❌ Error loading snipper HTML:", err));

    // ✅ Send the correct `sourceId` to renderer
    snipperWindow.webContents.once("dom-ready", () => {
        snipperWindow.webContents.send("region-selected", { ...bounds, sourceId });
    });

    snipperWindows[name] = snipperWindow;

    snipperWindow.on("closed", () => {
        console.log(`❌ Snipper "${name}" closed.`);
        delete snipperWindows[name];

        saveSettings();
        sendSnipperUpdates();
    });

    saveSettings();
    sendSnipperUpdates();
});


// Handle Region Selection
ipcMain.on("start-region-selection", async (event, snipperName) => {
    console.log(`🟢 Starting region selection for Snipper "${snipperName}". Called by:`, event.sender.getURL());

    // 🚨 Prevent multiple region selection windows from opening
    if (windows.regionSelection) {
        console.warn("⚠️ Region selection is already open. Ignoring duplicate request.");
        return;
    }


    windows.regionSelection = new BrowserWindow({
        fullscreen: true,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, "../renderer/common/preload.js"),
        },
    });

    await windows.regionSelection.loadFile(path.join(__dirname, "../renderer/snipper/region.html"));

    console.log("✅ Region selection window loaded.");

    windows.regionSelection.webContents.once("dom-ready", () => {
        console.log("✅ region.html is ready for selection.");
    });

    ipcMain.removeAllListeners("region-selected");

    ipcMain.once("region-selected", async (event, bounds) => {
        console.log("✅ Region selected:", bounds);

        try {
            const sources = await desktopCapturer.getSources({ types: ["screen"] });

            if (sources.length === 0) {
                console.error("❌ No screen sources found.");
                return;
            }

            const source = sources.find((src) => bounds.display_id && src.id.includes(bounds.display_id)) || sources[0];

            if (!source) {
                console.error("❌ No matching snipper source found.");
                return;
            }

            bounds.sourceId = source.id;

            console.log(`📌 Saving selected region for "${snipperName}":`, bounds);

            appSettings.snippers = appSettings.snippers.filter((snip) => snip.name !== snipperName);
            appSettings.snippers.push({ name: snipperName, ...bounds });

            saveSettings();

            ipcMain.emit("create-snipper-window", event, { name: snipperName, bounds, sourceId: bounds.sourceId });
        } catch (error) {
            console.error("⚠️ Error processing region selection:", error);
        }

        if (windows.regionSelection) {
            windows.regionSelection.close();
            windows.regionSelection = null; // ✅ Clear reference after closing
        }
    });

    ipcMain.once("close-region-selection", () => {
        console.log("🛑 Region selection canceled.");
        if (windows.regionSelection) {
            windows.regionSelection.close();
            windows.regionSelection = null;
        }
    });
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
        width: 300,
        height: 250,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "../renderer/common/preload.js"),
            contextIsolation: true,
        },
    });

    dialogWindow.loadFile(path.join(__dirname, "../renderer/snipper/dialog.html"));

    // dialogWindow.webContents.openDevTools({ mode: "detach" });

    return dialogWindow;
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

    // Restore Snippers from saved settings
    if (Array.isArray(appSettings.snippers)) {
        console.log("🔄 Restoring Snippers from saved regions:", appSettings.snippers);

        desktopCapturer
            .getSources({ types: ["screen"] })
            .then((sources) => {
                if (sources.length === 0) {
                    console.error("❌ No screen sources available for Snipper.");
                    return;
                }

                appSettings.snippers.forEach((snip) => {
                    console.log(`🔍 Restoring Snipper: ${snip.name} with saved region bounds:`, snip);

                    const source = sources.find((src) => snip.sourceId && src.id === snip.sourceId) || sources[0];

                    if (!source) {
                        console.error(`❌ No matching source found for Snipper: ${snip.name}`);
                        return;
                    }

                    console.log(`📸 Assigning sourceId: ${source.id} to Snipper: ${snip.name}`);

                    ipcMain.emit("create-snipper-window", null, {
                        name: snip.name,
                        bounds: snip, // ✅ Use saved region bounds!
                        sourceId: source.id,
                    });
                });
            })
            .catch((error) => {
                console.error("❌ Error fetching screen sources:", error);
            });
    }

    console.log("Snippers restored from settings:", appSettings.snippers);
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
