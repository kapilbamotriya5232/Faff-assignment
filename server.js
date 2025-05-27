// server.js (if using JavaScript)
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const lag = require('event-loop-lag')(1000); // Initialize with 1000ms interval

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost'; // Or '0.0.0.0' to listen on all interfaces
const port = parseInt(process.env.PORT, 10) || 3000; // Use your app's port

// When using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Start ELL logging *after* app is prepared
  setInterval(() => {
    const currentLag = lag(); // Get current lag in milliseconds
    // Log it - make sure your PM2 logs capture stdout
    process.stdout.write(`MONITORING_METRIC: EventLoopLag=${currentLag.toFixed(2)}ms\n`);
  }, 5000); // Log every 5 seconds

  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request in custom server:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://<span class="math-inline">\{hostname\}\:</span>{port} - ENV: ${process.env.NODE_ENV || 'development'}`);
      console.log('> Event Loop Lag monitoring active.');
    });
});