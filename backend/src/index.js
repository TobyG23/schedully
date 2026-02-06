require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const locationRoutes = require('./routes/location.routes');
const positionRoutes = require('./routes/position.routes');
const shiftRoutes = require('./routes/shift.routes');
const timesheetRoutes = require('./routes/timesheet.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const timeOffRoutes = require('./routes/timeoff.routes');
const timeclockRoutes = require('./routes/timeclock.routes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/time-off', timeOffRoutes);
app.use('/api/timeclock', timeclockRoutes); // Rutas publicas para el reloj de asistencia

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
