/* =========================================================
   env.js — خوندن و بررسی متغیرهای محیطی (Environment Variables)
   همه‌ی تنظیمات و رازها از فایل .env میان، نه از توی کد.
   اگه چیز مهمی کم باشه، همون اول اجرا با پیام واضح متوقف می‌شیم.
   ========================================================= */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const list = (v, fallback = []) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fallback;

const env = {
  nodeEnv,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  baseUrl: (process.env.BASE_URL || `http://localhost:${Number(process.env.PORT) || 5000}`).replace(/\/+$/, ''),
  corsOrigins: list(process.env.CORS_ORIGINS),
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  clickRetentionDays: Number(process.env.CLICK_RETENTION_DAYS) || 365,
  frontendDir: process.env.FRONTEND_DIR
    ? path.resolve(process.env.FRONTEND_DIR)
    : path.join(__dirname, '..', '..', '..', 'frontend'),
};

// در تست‌ها خودمون مقدار می‌دیم؛ در بقیه‌ی حالت‌ها اجباریه
if (!isTest) {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (!env.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    console.error(`\n❌ این متغیرها توی .env تنظیم نشدن: ${missing.join(', ')}\n   فایل .env.example رو کپی کن به .env و پرشون کن.\n`);
    process.exit(1);
  }
  if (env.jwtSecret.length < 32) {
    console.error('\n❌ JWT_SECRET باید حداقل ۳۲ کاراکتر باشه (ترجیحاً تصادفی).\n');
    process.exit(1);
  }
}

module.exports = env;
