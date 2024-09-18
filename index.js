const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let waitingUser = null; // Store the waiting user

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // When a user wants to join the matchmaking queue
    socket.on('join', () => {
        if (waitingUser) {
            // If there's already a user waiting, pair them
            const roomId = `${waitingUser}-${socket.id}`;
            
            // Let both users join the same room
            socket.join(roomId);
            io.to(waitingUser).emit('match', roomId);  // Notify the first user of the match
            io.to(socket.id).emit('match', roomId);    // Notify the second user of the match

            console.log(`Room created: ${roomId}`);
            
            // Clear the waiting user
            waitingUser = null;
        } else {
            // If no one is waiting, mark this user as waiting
            waitingUser = socket.id;
            console.log('User waiting:', waitingUser);
        }
    });

    // Handle WebRTC signaling (e.g., offer/answer exchange)
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal,
        });
    });

    // When a user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (waitingUser === socket.id) {
            waitingUser = null; // Clear waiting user if the user disconnects
        }
    });
});

server.listen(3002, () => {
    console.log('Signaling server running on port 3000');
});
