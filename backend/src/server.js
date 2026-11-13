const env = require('./config/env');
const { connectDB } = require('./config/db');
const createApp = require('./app');
const Link = require('./models/Link');
const Click = require('./models/Click');
const User = require('./models/User');

async function main() {
  await connectDB();
  console.log('✅ به MongoDB وصل شدیم.');
  await Promise.all([User.init(), Link.init(), Click.init()]);

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`🚀 لینک‌پالس روی ${env.baseUrl} بالا اومد  (مستندات: ${env.baseUrl}/docs)`);
  });

  const shutdown = (sig) => {
    console.log(`\n${sig} گرفتیم؛ دارم خاموش می‌شم…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('❌ راه‌اندازی ناموفق:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
