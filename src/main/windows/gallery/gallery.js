// ./src/main/windows/gallery/gallery.js

const { BrowserWindow } = require("electron");
const path = require("path");

function createGalleryWindow(isDevelopment = true) {
    const window = new BrowserWindow({
        width: 1920,
        height: 1080,
        show: false,
        frame: false,
        alwaysOnTop: false,
        resizable: true,
        transparent: false,
        hasShadow: false,
        roundedCorners: false,
        backgroundColor: "#00000000",
        useContentSize: true,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true, // Required for contextBridge
            enableRemoteModule: false, // Keep this disabled unless necessary
            nodeIntegration: false, // Should be false for security
        },
    });

    window.loadFile(path.join(__dirname, "../../../renderer/gallery/gallery.html"));

    if (isDevelopment) window.webContents.openDevTools();

    // Add listener for Ctrl+R to reload window
    window.webContents.on("before-input-event", (event, input) => {
        if (input.key === "r" && input.control) {
            event.preventDefault(); // Prevent default behavior
            window.reload(); // Reload the window content
        }
    });

    return window; // ✅ Return the window instance
}

module.exports = { createGalleryWindow };
