// Required modules
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

// Setup express app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store for waiting user in matchmaking
let waitingUser = null;

// Middleware for socket authentication and user setup
io.use((socket, next) => {
    if (socket.handshake.query && socket.handshake.query.callerId) {
        socket.user = socket.handshake.query.callerId;
        next();
    } else {
        next(new Error("Authentication error"));
    }
});

// Handle user connections
io.on('connection', (socket) => {
    console.log('User connected:', socket.user);

    // User joins their own room based on their ID
    socket.join(socket.user);

    // Matchmaking queue join request
    socket.on('join', () => {
        if (waitingUser) {
            // Pair with the waiting user
            const roomId = `${waitingUser}-${socket.user}`;
            
            // Both users join the same room
            socket.join(roomId);
            io.to(waitingUser).emit('match', roomId);
            io.to(socket.user).emit('match', roomId);
            console.log(`Room created: ${roomId}`);

            // Clear the waiting user
            waitingUser = null;
        } else {
            // No user waiting, set this user as waiting
            waitingUser = socket.user;
            console.log('User waiting:', waitingUser);
        }
    });

    // Handle WebRTC signaling (offer/answer exchange)
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.user,
            signal: data.signal,
        });
    });

    // Handle incoming call
    socket.on('call', (data) => {
        let calleeId = data.calleeId;
        let rtcMessage = data.rtcMessage;

        socket.to(calleeId).emit("newCall", {
            callerId: socket.user,
            rtcMessage: rtcMessage,
        });
    });

    // Handle call answer
    socket.on('answerCall', (data) => {
        let callerId = data.callerId;
        let rtcMessage = data.rtcMessage;

        socket.to(callerId).emit('callAnswered', {
            callee: socket.user,
            rtcMessage: rtcMessage,
        });
    });

    // Handle ICE candidate exchange
    socket.on('ICEcandidate', (data) => {
        let calleeId = data.calleeId;
        let rtcMessage = data.rtcMessage;

        socket.to(calleeId).emit('ICEcandidate', {
            sender: socket.user,
            rtcMessage: rtcMessage,
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user);
        if (waitingUser === socket.user) {
            waitingUser = null; // Clear waiting user if they disconnect
        }
    });
});

// Start the server
server.listen(3002, () => {
    console.log('Signaling server running on port 3002');
});
