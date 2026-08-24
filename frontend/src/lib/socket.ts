import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    socket = io(url, {
      autoConnect: true,
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Smart Gate real-time server');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from real-time server');
    });
  }

  return socket;
}

export function reconnectSocketWithToken(token: string) {
  if (socket) {
    socket.auth = { token };
    socket.disconnect().connect();
  } else {
    getSocket();
  }
}
