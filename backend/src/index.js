import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenant.js';
import rosterRoutes from './routes/roster.js';
import settingsRoutes from './routes/settings.js';
import attendanceRoutes from './routes/attendance.js';
import metricsRoutes from './routes/metrics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security & Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Verity Attendance Backend',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/metrics', metricsRoutes);

// Global 404
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Verity Backend listening on http://0.0.0.0:${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
  });
}

export default app;
