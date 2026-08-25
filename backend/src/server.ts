import http from 'http';
import app from './app';
import { config } from './config';
import { prisma } from './lib/prisma';
import { initSocket } from './lib/socket';
import { startBackgroundJobs } from './services/cron.service';
import { seedDatabase } from './services/seed.service';

const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Start Cron background workers
startBackgroundJobs();

async function initDatabase() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Database is empty. Auto-seeding initial demo data and accounts...');
      await seedDatabase(prisma, false);
      console.log('✅ Auto-seed completed successfully!');
    } else {
      console.log(`📊 Connected to database: ${userCount} existing users found.`);
    }
  } catch (err: any) {
    console.warn('⚠️ Database check notice:', err.message || err);
    console.log('ℹ️ If tables do not exist yet, run: npm run prisma:push');
  }
}

server.listen(config.port, async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Smart Gate & Leave API Server running on port ${config.port}`);
  console.log(`🌐 REST API:   http://localhost:${config.port}/api`);
  console.log(`⚡ WebSocket:  ws://localhost:${config.port}`);
  console.log(`🩺 Health:     http://localhost:${config.port}/api/health`);
  console.log(`🔧 DB Status:  http://localhost:${config.port}/api/setup/status`);
  console.log(`======================================================\n`);

  await initDatabase();
});

