// IMPORTS
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const sirv = require("sirv");

// ENVIRONMENT VARIABLES
const PORT = process.env.PORT || 3030;
const DEV = process.env.NODE_ENV === "development";
const TOKEN = process.env.TOKEN;

// SETUP SERVERS
const app = express();
app.use(express.json(), cors());
const server = http.createServer(app);
const io = socketio(server, { cors: {} });

// AUTHENTICATION MIDDLEWARE
io.use((socket, next) => {
    const token = socket.handshake.auth.token; // check the auth token provided by the client upon connection
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

// MESSAGING LOGIC
io.on("connection", (socket) => {
    console.log("User connected with id", socket.id);

    socket.on("ready", (peerId, peerType) => {
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
            const newPeer = { socketId: socket.id, peerId, peerType };
            // Updates connections object
            connections[peerId] = newPeer;
            // Let all other peers know about new peer
            socket.broadcast.emit("message", {
                from: peerId,
                target: "all",
                payload: { action: "open", connections: [newPeer], bePolite: true }, // send connections object with an array containing the only new peer and make all exisiting peers polite.
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
