// ./src/main/windows/settings/settings.js

const { BrowserWindow } = require("electron");
const path = require("path");

let settingsWindow;

function createSettingsWindow(taskbarWindow) {
    if (!settingsWindow) {
        settingsWindow = new BrowserWindow({
            width: 640,
            height: 500,
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

        settingsWindow.webContents.openDevTools({ mode: "detach" });

        // Dynamically position the settings window relative to the taskbar
        if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
            const taskbarBounds = taskbarWindow.getBounds();
            const settingsX = taskbarBounds.x; // Align horizontally
            const settingsY = taskbarBounds.y + taskbarBounds.height + 10; // Below the taskbar

            settingsWindow.setBounds({
                x: settingsX,
                y: settingsY,
                width: 640,
                height: 610,
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
