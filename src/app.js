const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const routes = require('./routes');
const reportRoutes = require('./modules/reports/reports.routes');
const calendarRoutes = require('./modules/calendar/calendar.routes');
const dashboardRoutes = require('./modules/dashboards/dashboards.routes');
const { errorHandler } = require('./middlewares/error.middleware');

dotenv.config();

const app = express();

// Middleware
const clientOrigin = (process.env.CLIENT_URL || 'http://localhost:5173').trim();
const allowedOrigins = [
  clientOrigin,
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://legal-case-manage.kiaansoftware.com',
  'https://legal-case-manage.kiaansoftware.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.railway.app') || 
                      origin.endsWith('.kiaansoftware.com') ||
                      process.env.NODE_ENV !== 'production'; // Allow all in dev for mobile testing
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'VkTori Legal Backend is running' });
});

// API Routes
app.use('/api', routes);
app.use('/api/reports', reportRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/tasks', require('./modules/tasks/tasks.routes'));

// Error Handling
app.use(errorHandler);

module.exports = app;
