// ./src/main/windows/resumption/resumption.js

const { BrowserWindow } = require("electron");
const path = require("path");

function createResumptionWindow(taskbarWindow) {
    const resumptionWindow = new BrowserWindow({
        width: 313, // Initial size
        height: 50, // Initial size
        show: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    resumptionWindow.loadFile(path.join(__dirname, "../../../renderer/resumption/resumption.html"));

    // resumptionWindow.webContents.openDevTools({ mode: "detach" });

    // Dynamically position the resumption window relative to the taskbar
    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        const resumptionX = taskbarBounds.x;
        const resumptionY = taskbarBounds.y + taskbarBounds.height + 10;

        resumptionWindow.setBounds({
            x: resumptionX,
            y: resumptionY,
            width: 295,
            height: 75,
        });
    } else {
        console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
    }

    // Listen for resize requests from the renderer
    const { ipcMain } = require("electron");
    ipcMain.on("resize-resumption-window", (event, { width, height }) => {
        resumptionWindow.setBounds({
            x: resumptionWindow.getBounds().x,
            y: resumptionWindow.getBounds().y,
            width: Math.max(width, 150), // Minimum width
            height: Math.max(height, 50), // Minimum height
        });
    });

    return resumptionWindow;
}

module.exports = { createResumptionWindow };
