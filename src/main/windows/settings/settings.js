// ./src/main/windows/settings/settings.js

const { BrowserWindow } = require("electron");
const path = require("path");

let settingsWindow;

function createSettingsWindow(taskbarWindow) {
    if (!settingsWindow) {
        settingsWindow = new BrowserWindow({
            width: 960,
            height: 540,
            frame: false,
            show: false,
            alwaysOnTop: true,
            resizable: false,

            webPreferences: {
                preload: path.join(__dirname, "../../../renderer/common/preload.js"),
                contextIsolation: true,
                enableRemoteModule: false,
                nodeIntegration: false,
            },
        });

        settingsWindow.loadFile(path.join(__dirname, "../../../renderer/settings/settings.html"));

        // Add listener for Ctrl+R to reload window
        settingsWindow.webContents.on('before-input-event', (event, input) => {
            if (input.key === 'r' && input.control) {
                event.preventDefault(); // Prevent default behavior
                settingsWindow.reload(); // Reload the window content
            }
        });

        // settingsWindow.webContents.openDevTools({ mode: "detach" });

        // Dynamically position the settings window relative to the taskbar
        if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
            const taskbarBounds = taskbarWindow.getBounds();
            const settingsX = taskbarBounds.x; // Align horizontally
            const settingsY = taskbarBounds.y + taskbarBounds.height + 10; // Below the taskbar

            settingsWindow.setBounds({
                x: settingsX,
                y: settingsY,
                width: 960,
                height: 540,
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
