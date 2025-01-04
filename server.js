import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const users = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  const ip = socket.handshake.headers['x-forwarded-for'] || 
             socket.handshake.address;
  
  // Add user immediately on connection
  users.set(socket.id, {
    id: socket.id,
    ip: ip,
    connected: true,
    consented: false
  });
  io.emit('users:update', Array.from(users.values()));

  socket.on('user:consent', () => {
    const user = users.get(socket.id);
    if (user) {
      users.set(socket.id, {
        ...user,
        consented: true
      });
      io.emit('users:update', Array.from(users.values()));
    }
  });

  socket.on('admin:command', ({ targetId, type, payload }) => {
    const targetUser = users.get(targetId);
    if (targetUser && targetUser.consented) {
      io.to(targetId).emit('command', { type, payload });
      console.log(`Command sent to ${targetId}:`, type, payload);
    } else {
      console.log(`Cannot send command to ${targetId}: User not consented`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    users.delete(socket.id);
    io.emit('users:update', Array.from(users.values()));
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
