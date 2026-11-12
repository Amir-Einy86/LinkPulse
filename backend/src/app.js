/* =========================================================
   app.js — ساخت اپلیکیشن Express (بدون روشن کردن سرور)
   جدا بودنش از server.js باعث می‌شه توی تست‌ها بدون باز کردن پورت ازش استفاده کنیم.
   ترتیب میدلورها مهمه: هر درخواست به ترتیب از بالا به پایین رد می‌شه.
   ========================================================= */
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
  if (env.trustProxy) app.set('trust proxy', env.trustProxy); // برای خوندن IP واقعی پشت پروکسی

  /* ۱) هدرهای امنیتی. صفحه‌ی مستندات (Swagger) اسکریپت درون‌خطی داره، پس CSP سخت‌گیرانه براش خاموشه */
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

  /* ۲) CORS: فقط مبدأهای مجاز می‌تونن از مرورگر به API درخواست بدن. */
  const allowed = new Set(env.corsOrigins);
  app.use('/api', cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // ابزارهایی مثل curl و درخواست‌های هم‌مبدأ
      if (allowed.has(origin)) return cb(null, true);
      if (!env.isProd && origin === 'null') return cb(null, true); // باز کردن فرانت با file:// فقط در حالت توسعه
      return cb(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }));

  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  /* ۳) خوندن بدنه‌ی JSON با سقف حجم */
  app.use(express.json({ limit: '10kb' }));

  /* ۴) API */
  app.use('/api', limiters.api, routes);
  app.use('/api', notFound);

  /* ۵) مستندات */
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'مستندات API لینک‌پالس' }));

  /* ۶) فایل‌های فرانت‌اند (صفحه‌های HTML، CSS، JS) */
  if (fs.existsSync(env.frontendDir)) {
    app.use(express.static(env.frontendDir, { extensions: ['html'], index: 'index.html', dotfiles: 'ignore' }));
  }

  /* ۷) لینک‌های کوتاه: GET /:slug  (باید بعد از static و api باشه تا چیزی رو نپوشونه) */
  app.get('/:slug', limiters.redirect, redirect);

  /* ۸) هر چیز دیگه: صفحه‌ی ۴۰۴ */
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
