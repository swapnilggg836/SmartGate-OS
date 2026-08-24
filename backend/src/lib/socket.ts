import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';

let io: Server | null = null;
const userSocketMap = new Map<string, string[]>(); // userId -> socketIds

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) {
      return next(); // allow unauthenticated or anonymous for public gate info, but tag if authenticated
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      // Proceed without user object
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    if (user?.userId) {
      const sockets = userSocketMap.get(user.userId) || [];
      sockets.push(socket.id);
      userSocketMap.set(user.userId, sockets);

      // Join user specific room
      socket.join(`user:${user.userId}`);
      // Join role specific room
      socket.join(`role:${user.role}`);
    }

    socket.on('disconnect', () => {
      if (user?.userId) {
        const sockets = userSocketMap.get(user.userId) || [];
        userSocketMap.set(user.userId, sockets.filter(id => id !== socket.id));
      }
    });
  });

  console.log('⚡ Socket.io real-time layer initialized');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}

export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToRole(role: string, event: string, data: any) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

export function emitBroadcast(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
