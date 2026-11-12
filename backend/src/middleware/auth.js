/* =========================================================
   auth.js — میدلور محافظ (protect)
   توکن JWT رو از هدر «Authorization: Bearer <token>» می‌خونه، درستیش رو چک می‌کنه
   و کاربر رو به req.user می‌ده. هر مسیری که این رو داشته باشه بدون ورود قابل استفاده نیست.
   ========================================================= */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0 }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });

const protect = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('برای این کار باید وارد حسابت بشی.', 401, 'UNAUTHORIZED');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch (e) {
    throw new AppError('نشست تو تموم شده؛ دوباره وارد شو.', 401, 'TOKEN_INVALID');
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  // اگه کاربر حذف شده یا رمزش عوض شده (tokenVersion فرق می‌کنه)، توکن قدیمی دیگه معتبر نیست
  if (!user || (user.tokenVersion || 0) !== payload.tv) throw new AppError('نشست تو تموم شده؛ دوباره وارد شو.', 401, 'TOKEN_INVALID');

  req.user = user;
  next();
});

module.exports = { protect, signToken };
