import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { startAlertScheduler } from './services/schedulerService';
import alertsRouter from './routes/alerts';
import triggersRouter from './routes/triggers';
import statisticsRouter from './routes/statistics';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/alerts', alertsRouter);
app.use('/api/triggers', triggersRouter);
app.use('/api/statistics', statisticsRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
async function startServer() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   NIx PM Backend - Alert Service      ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Test database connection
    console.log('Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n✓ Server listening on port ${PORT}`);
      console.log(`✓ API available at http://localhost:${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health\n`);

      // Start alert scheduler
      const cronExpression = process.env.ALERT_CHECK_INTERVAL || '*/5 * * * *';
      startAlertScheduler(cronExpression);

      console.log('═══════════════════════════════════════════');
      console.log('Server is ready to accept requests');
      console.log('═══════════════════════════════════════════\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📋 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n📋 SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();
