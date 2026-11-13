const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Link = require('../src/models/Link');
const Click = require('../src/models/Click');

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@linkpulse.local';
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('seed روی production اجرا نمی‌شه.');
  await connectDB();
  const password = process.env.DEMO_PASSWORD || crypto.randomBytes(9).toString('base64url');

  const old = await User.findOne({ email: DEMO_EMAIL });
  if (old) {
    await Promise.all([Click.deleteMany({ owner: old._id }), Link.deleteMany({ owner: old._id }), User.deleteOne({ _id: old._id })]);
  }
  const user = await User.create({ name: 'کاربر دمو', email: DEMO_EMAIL, passwordHash: await bcrypt.hash(password, 12) });

  const specs = [
    ['پرتفولیو من', 'demo-portfolio', 'https://example.com/portfolio', 120],
    ['کمپین پاییزه', 'demo-fall', 'https://example.com/campaign/fall', 60],
    ['مقاله‌ی وبلاگ', 'demo-blog', 'https://example.com/blog/post-1', 25],
    ['لینک منقضی', 'demo-old', 'https://example.com/old', 8],
  ];
  const sources = [['direct', ''], ['search', 'google.com'], ['social', 'instagram.com'], ['social', 't.me'], ['other', 'example.org']];
  const devices = ['desktop', 'mobile', 'mobile', 'tablet'];
  const browsers = ['chrome', 'chrome', 'safari', 'firefox', 'edge'];
  const countries = ['IR', 'IR', 'DE', 'US', 'TR'];

  for (const [title, slug, url, n] of specs) {
    const link = await Link.create({
      owner: user._id, title, slug, url,
      expiresAt: slug === 'demo-old' ? new Date(Date.now() - 864e5) : null,
    });
    const clicks = [];
    for (let i = 0; i < n; i++) {
      const [source, refHost] = pick(sources);
      clicks.push({
        link: link._id, owner: user._id, at: new Date(Date.now() - Math.random() * 30 * 864e5),
        source, refHost, device: pick(devices), browser: pick(browsers), country: pick(countries),
        visitor: crypto.randomBytes(8).toString('hex'),
      });
    }
    await Click.insertMany(clicks);
    await Link.updateOne({ _id: link._id }, { clicks: n, lastClickAt: new Date() });
  }

  console.log('✅ داده‌ی دمو ساخته شد.');
  console.log('   ایمیل:', DEMO_EMAIL);
  console.log('   رمز  :', password);
  await disconnectDB();
}

main().catch(async (e) => { console.error('❌', e.message); await disconnectDB().catch(() => {}); process.exit(1); });
