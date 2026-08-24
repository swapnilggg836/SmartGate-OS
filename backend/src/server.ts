import http from 'http';
import app from './app';
import { config } from './config';
import { initSocket } from './lib/socket';
import { startBackgroundJobs } from './services/cron.service';

const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Start Cron background workers
startBackgroundJobs();

server.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Smart Gate & Leave API Server running on port ${config.port}`);
  console.log(`🌐 REST API:   http://localhost:${config.port}/api`);
  console.log(`⚡ WebSocket:  ws://localhost:${config.port}`);
  console.log(`🩺 Health:     http://localhost:${config.port}/api/health`);
  console.log(`======================================================\n`);
});
