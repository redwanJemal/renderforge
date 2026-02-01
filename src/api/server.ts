import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import healthRouter from './routes/health';
import templatesRouter from './routes/templates';
import renderRouter from './routes/render';
import previewRouter from './routes/preview';

// Side-effect imports: register all templates
import '../templates/product-launch';
import '../templates/quote-of-day';
import '../templates/stats-recap';
import '../templates/testimonial';
import '../templates/announcement';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3100', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${_res.statusCode} ${duration}ms`
    );
  });
  next();
});

// API Routes
app.use(healthRouter);
app.use(templatesRouter);
app.use(renderRouter);
app.use(previewRouter);

// Serve dashboard static files
const dashboardDir = path.resolve(__dirname, '../../dashboard/dist');
if (fs.existsSync(dashboardDir)) {
  app.use(express.static(dashboardDir));

  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }
    const indexPath = path.join(dashboardDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
} else {
  // Root info when dashboard not built
  app.get('/', (_req, res) => {
    res.json({
      name: 'RenderForge API',
      version: '0.1.0',
      description: 'Dynamic video template engine powered by Remotion',
      note: 'Dashboard not built. Run: cd dashboard && npm run build',
      endpoints: {
        health: 'GET /health',
        templates: 'GET /api/templates',
        templateById: 'GET /api/templates/:id',
        themes: 'GET /api/themes',
        preview: 'GET /api/preview?template=X&format=Y&theme=Z&props={}&frame=0',
        render: 'POST /api/render',
        renderStatus: 'GET /api/render/:jobId',
        renderDownload: 'GET /api/render/:jobId/download',
      },
    });
  });
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'Endpoint does not exist. GET / for available endpoints.',
  });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
    });
  }
);

// Ensure output directory exists
const outputDir = path.resolve(__dirname, '../../output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Cleanup old renders every 10 minutes (files older than 1 hour)
setInterval(() => {
  try {
    const files = fs.readdirSync(outputDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old render: ${file}`);
      }
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}, 10 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────┐
  │                                      │
  │   🎬  RenderForge API               │
  │   Running on http://localhost:${PORT}  │
  │                                      │
  │   GET  /health                       │
  │   GET  /api/templates                │
  │   GET  /api/templates/:id            │
  │   GET  /api/themes                   │
  │   GET  /api/preview                  │
  │   POST /api/render                   │
  │   GET  /api/render/:jobId            │
  │   GET  /api/render/:jobId/download   │
  │                                      │
  └──────────────────────────────────────┘
  `);
});

export default app;
