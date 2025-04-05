// ./src/main/bridge/server.js
const net = require("net");
const { handleBridgeMessage } = require("./handlers/gallery");

const PORT = 47800; // arbitrary local port, can adjust
const clients = [];

const server = net.createServer((socket) => {
    console.log("🔌 New bridge client connected");

    clients.push(socket);

    socket.on("data", (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log("📨 Incoming message:", message);
            handleBridgeMessage(message); // we'll build this next
        } catch (err) {
            console.error("❌ Failed to parse bridge message:", err);
        }
    });

    socket.on("end", () => {
        console.log("⚡ Client disconnected");
        const index = clients.indexOf(socket);
        if (index !== -1) clients.splice(index, 1);
    });

    socket.on("error", (err) => {
        console.error("💥 Socket error:", err);
    });
});

function startBridgeServer() {
    server.listen(PORT, () => {
        console.log(`🌉 Bridge server listening on port ${PORT}`);
    });
}

module.exports = { startBridgeServer };
