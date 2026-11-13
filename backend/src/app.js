const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const routes = require('./routes');
const limiters = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { redirect } = require('./controllers/redirectController');
const openapi = require('./docs/openapi');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', env.trustProxy);

  const secure = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  });
  const relaxed = helmet({ contentSecurityPolicy: false });
  app.use((req, res, next) => (req.path.startsWith('/docs') ? relaxed : secure)(req, res, next));

  const allowed = new Set(env.corsOrigins);
  app.use('/api', cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      if (!env.isProd && origin === 'null') return cb(null, true);
      return cb(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }));

  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(express.json({ limit: '10kb' }));

  app.use('/api', limiters.api, routes);
  app.use('/api', notFound);

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'مستندات API لینک‌پالس' }));

  if (fs.existsSync(env.frontendDir)) {
    app.use(express.static(env.frontendDir, { extensions: ['html'], index: 'index.html', dotfiles: 'ignore' }));
  }

  app.get('/:slug', limiters.redirect, redirect);

  app.use((req, res) => {
    const file = path.join(env.frontendDir, '404.html');
    res.status(404);
    if (fs.existsSync(file)) return res.sendFile(file);
    res.type('text').send('پیدا نشد.');
  });

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
