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
const clientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isAllowedDomain = origin.endsWith('.railway.app') || 
                            origin.endsWith('.kiaansoftware.com');
    const isClientUrl = clientUrls.includes(origin);
    const isDev = process.env.NODE_ENV !== 'production';

    if (isLocalhost || isAllowedDomain || isClientUrl || isDev) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(null, false);
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
app.use('/api/activities', require('./modules/activities/activities.routes'));
app.use('/api/court-forms', require('./modules/court-forms/court-forms.routes'));
app.use('/api/titan-email', require('./routes/titanEmail.routes'));

// Error Handling
app.use(errorHandler);

module.exports = app;
