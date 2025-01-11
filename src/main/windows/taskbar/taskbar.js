// ./src/main/windows/taskbar/taskbar.js

const { BrowserWindow, Menu } = require("electron");
const path = require("path");

function createTaskbarWindow(toggleReminder, toggleSettings) {
    const taskbarWindow = new BrowserWindow({
        width: 600,
        height: 48,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true, // Required for contextBridge
            enableRemoteModule: false, // Keep this disabled unless necessary
            nodeIntegration: false, // Should be false for security
        },
    });

    taskbarWindow.loadFile(path.join(__dirname, "../../../renderer/taskbar/taskbar.html"));

    const menuTemplate = [
        {
            label: "Windows",
            submenu: [
                { label: "Reminder", click: toggleReminder },
                { label: "Settings", click: toggleSettings },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    return taskbarWindow;
}

module.exports = { createTaskbarWindow };
