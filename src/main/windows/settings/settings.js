const { BrowserWindow } = require("electron");
const path = require("path");

let settingsWindow;

function createSettingsWindow(taskbarWindow) {
    if (!settingsWindow) {
        settingsWindow = new BrowserWindow({
            width: 450,
            height: 780,
            frame: false,
            show: false,
            alwaysOnTop: true,
            webPreferences: {
                preload: path.join(__dirname, "../../../renderer/common/preload.js"),
                contextIsolation: true,
                enableRemoteModule: false,
                nodeIntegration: false,
            },
        });

        settingsWindow.loadFile(path.join(__dirname, "../../../renderer/settings/settings.html"));

        // Dynamically position the settings window relative to the taskbar
        if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
            const taskbarBounds = taskbarWindow.getBounds();
            const settingsX = taskbarBounds.x; // Align horizontally
            const settingsY = taskbarBounds.y + taskbarBounds.height + 10; // Below the taskbar

            settingsWindow.setBounds({
                x: settingsX,
                y: settingsY,
                width: 450,
                height: 780,
            });
        } else {
            console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
        }

        settingsWindow.on("closed", () => {
            settingsWindow = null; // Clean up reference when window is closed
        });
    } else {
        settingsWindow.show();
    }

    return settingsWindow;
}

module.exports = { createSettingsWindow };
