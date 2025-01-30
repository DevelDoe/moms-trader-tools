// ./src/main/windows/reminder/reminder.js

const { BrowserWindow } = require("electron");
const path = require("path");

function createReminderWindow(taskbarWindow) {
    const reminderWindow = new BrowserWindow({
        width: 10, // Initial size
        height: 10, // Adjusted for multiple items
        transparent: true,
        frame: false,
        resizable: true,
        alwaysOnTop: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    reminderWindow.loadFile(path.join(__dirname, "../../../renderer/reminder/reminder.html"));

    // reminderWindow.webContents.openDevTools({ mode: "detach" });

    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        reminderWindow.setBounds({
            x: taskbarBounds.x,
            y: taskbarBounds.y + taskbarBounds.height + 10,
            width: 10,
            height: 10,
        });
    } else {
        console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
    }


    return reminderWindow;
}

module.exports = { createReminderWindow };
