// ./src/main/windows/checklist/checklist.js

const { BrowserWindow } = require("electron");
const path = require("path");

function createChecklistWindow(taskbarWindow) {
    const checklistWindow = new BrowserWindow({
        width: 80, // Initial size
        height: 350, // Initial size
        show: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    checklistWindow.loadFile(path.join(__dirname, "../../../renderer/checklist/checklist.html"));

    checklistWindow.webContents.openDevTools({ mode: "detach" });

    // Dynamically position the checklist window relative to the taskbar
    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        const checklistX = taskbarBounds.x;
        const checklistY = taskbarBounds.y + taskbarBounds.height + 10;

        checklistWindow.setBounds({
            x: checklistX,
            y: checklistY,
            width: 80,
            height: 350,
        });
    } else {
        console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
    }

    // Listen for resize requests from the renderer
    const { ipcMain } = require("electron");
    ipcMain.on("resize-checklist-window", (event, { width, height }) => {
        checklistWindow.setBounds({
            x: checklistWindow.getBounds().x,
            y: checklistWindow.getBounds().y,
            width: Math.max(width, 80), // Minimum width
            height: Math.max(height, 50), // Minimum height
        });
    });

    return checklistWindow;
}
module.exports = { createChecklistWindow };