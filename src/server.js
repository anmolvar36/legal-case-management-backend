const app = require('./app');
const http = require('http');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Start scheduled tasks
require('./modules/tasks/tasks.cron');
require('./modules/calendar/calendar.cron');

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Retrying in 2 seconds...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 2000);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
