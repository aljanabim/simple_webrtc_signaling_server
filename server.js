// IMPORTS
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const sirv = require("sirv");
const rateLimit = require("express-rate-limit");

// ENVIRONMENT VARIABLES
const PORT = process.env.PORT || 3030;
const DEV = process.env.NODE_ENV === "development";
const TOKEN = process.env.TOKEN;

// SETUP SERVERS
const app = express();
app.use(express.json(), cors());
const server = http.createServer(app);
const io = socketio(server, { cors: {} });
const MAX_CONNECTIONS = 20;

// AUTHENTICATION MIDDLEWARE
io.use((socket, next) => {
    const ip = socket.handshake.address;
    const token = socket.handshake.auth.token;

    // // Check rate limit
    if (!checkRateLimit(ip)) {
        console.log("Too many connection attempts from this IP, please try again later.")
        next(new Error("Too many connection attempts from this IP, please try again later."));
        return;
    }

    // next();
    // Check token
    if (token === TOKEN) {
        next();
    } else {
        next(new Error("Authentication error"));
    }
});

// API ENDPOINT TO DISPLAY THE CONNECTION TO THE SIGNALING SERVER
let connections = {};
app.get("/connections", (req, res) => {
    res.json(Object.values(connections));
});

// HTTP RATE LIMITER
const httpRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(httpRateLimiter);

// WEBSOCKET RATE LIMITER
const connectionAttempts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 500; // Max 5 connection attempts per IP

function checkRateLimit(ip) {
    const now = Date.now();
    const attempts = connectionAttempts.get(ip) || { count: 0, firstAttempt: now };

    // Reset count if window has expired
    if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
        attempts.count = 0;
        attempts.firstAttempt = now;
    }

    attempts.count += 1;

    // Update the map
    connectionAttempts.set(ip, attempts);

    // Check if limit is exceeded
    if (attempts.count > MAX_ATTEMPTS) {
        return false;
    }

    // Clean up old entries
    for (const [key, value] of connectionAttempts) {
        if (now - value.firstAttempt > RATE_LIMIT_WINDOW) {
            connectionAttempts.delete(key);
        }
    }

    return true;
}

// MESSAGING LOGIC
io.on("connection", (socket) => {
    console.log("User connected with id", socket.id);

    // Check connection limit before proceeding
    const currentConnections = Object.keys(connections).length;
    if (currentConnections >= MAX_CONNECTIONS) {
        // Find the oldest peer
        const oldestPeer = Object.values(connections).reduce((oldest, peer) => 
            (!oldest || peer.connectionTime < oldest.connectionTime) ? peer : oldest
        );
        
        // Disconnect the oldest peer
        const oldestSocket = io.sockets.sockets.get(oldestPeer.socketId);
        if (oldestSocket) {
            oldestSocket.emit("message", {
                from: "server",
                target: oldestPeer.peerId,
                payload: { action: "close", message: "Disconnected due to connection limit" }
            });
            oldestSocket.disconnect(true);
            delete connections[oldestPeer.peerId];
            console.log(`Dropped oldest peer ${oldestPeer.peerId} to make room for new connection`);
        }
    }

    socket.on("ready", (readyMessage) => {
        const { peerDto, type } = readyMessage;
        const { peerId, publicKey, x, y, sex, searching, age } = peerDto;
        // Make sure that the hostname is unique, if the hostname is already in connections, send an error and disconnect
        if (peerId in connections) {
            socket.emit("uniquenessError", {
                message: `${peerId} is already connected to the signalling server. Please change your peer ID and try again.`,
            });
            socket.disconnect(true);
        } else {
            console.log(`Added ${peerId} to connections`);
            // Let new peer know about all exisiting peers
            socket.send({ from: "all", target: peerId, payload: { action: "open", connections: Object.values(connections), bePolite: false } }); // The new peer doesn't need to be polite.
            // Create new peer
            const newPeer = { socketId: socket.id, peerId, type, publicKey, age, x, y, sex, searching };
            // Updates connections object
            connections[peerId] = newPeer;
            // Let all other peers know about new peer
            socket.broadcast.emit("message", {
                from: peerId,
                target: "all",
                payload: { action: "open", connections: connections, bePolite: true }, // send connections object with an array containing the only new peer and make all exisiting peers polite.
            });
        }
    });
    socket.on("message", (message) => {
        // Send message to all peers expect the sender
        socket.broadcast.emit("message", message);
    });
    socket.on("messageOne", (message) => {
        // Send message to a specific targeted peer
        const { target } = message;
        const targetPeer = connections[target];
        if (targetPeer) {
            io.to(targetPeer.socketId).emit("message", { ...message });
        } else {
            console.log(`Target ${target} not found`);
        }
    });
    socket.on("disconnect", () => {
        const disconnectingPeer = Object.values(connections).find((peer) => peer.socketId === socket.id);
        if (disconnectingPeer) {
            console.log("Disconnected", socket.id, "with peerId", disconnectingPeer.peerId);
            // Make all peers close their peer channels
            socket.broadcast.emit("message", {
                from: disconnectingPeer.peerId,
                target: "all",
                payload: { action: "close", message: "Peer has left the signaling server" },
            });
            // remove disconnecting peer from connections
            delete connections[disconnectingPeer.peerId];
        } else {
            console.log(socket.id, "has disconnected");
        }
    });
});

// SERVE STATIC FILES
app.use(sirv("public", { DEV }));

// RUN APP
server.listen(PORT, console.log(`Listening on PORT ${PORT}`));
