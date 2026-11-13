const { z } = require('zod');
const { normalizeUrl } = require('../utils/url');
const { SLUG_RE, isReserved } = require('../utils/slug');

const msg = (m) => ({ message: m });

const name = z.string(msg('اسم رو وارد کن.')).trim().min(2, 'اسم باید حداقل ۲ حرف باشه.').max(60, 'اسم نباید از ۶۰ حرف بیشتر باشه.');
const email = z.string(msg('ایمیل رو وارد کن.')).trim().toLowerCase().max(254, 'ایمیل خیلی بلنده.').regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'این ایمیل درست به نظر نمی‌رسه.');
const password = z.string(msg('رمز عبور رو وارد کن.')).min(8, 'رمز باید حداقل ۸ کاراکتر باشه.').max(128, 'رمز نباید از ۱۲۸ کاراکتر بیشتر باشه.');

const url = z.string(msg('آدرس مقصد رو وارد کن.')).trim().max(2048, 'آدرس خیلی بلنده.').transform((v, ctx) => {
  const clean = normalizeUrl(v);
  if (!clean) { ctx.addIssue({ code: 'custom', message: 'این آدرس معتبر نیست. فقط آدرس‌های http و https قبول می‌شن.' }); return z.NEVER; }
  return clean;
});

const slug = z.string(msg('slug باید متن باشه.')).trim().toLowerCase()
  .regex(SLUG_RE, 'slug باید ۳ تا ۳۲ کاراکتر باشه و فقط حرف انگلیسی، عدد، خط تیره و زیرخط داشته باشه.')
  .refine((s) => !isReserved(s), 'این اسلاگ رزرو شده؛ یکی دیگه انتخاب کن.');

const title = z.string().trim().max(120, 'عنوان نباید از ۱۲۰ حرف بیشتر باشه.');

const expiresAt = z.union([z.null(), z.string().datetime({ message: 'تاریخ انقضا معتبر نیست.' })])
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || d.getTime() > Date.now(), 'تاریخ انقضا باید در آینده باشه.');

const objectId = z.string(msg('شناسه معتبر نیست.')).regex(/^[a-f0-9]{24}$/i, 'شناسه معتبر نیست.');
const tz = z.string().max(64).refine((v) => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch (e) { return false; } }, 'منطقه‌ی زمانی معتبر نیست.');

const register = z.object({ name, email, password });
const login = z.object({ email, password: z.string(msg('رمز عبور رو وارد کن.')).min(1, 'رمز عبور رو وارد کن.').max(128) });

const updateProfile = z.object({
  name: name.optional(),
  email: email.optional(),
  username: z.union([
    z.literal('').transform(() => null),
    z.null(),
    z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, 'نام کاربری باید ۳ تا ۲۴ کاراکتر و فقط شامل حرف انگلیسی، عدد و _ باشه.'),
  ]).optional(),
  bio: z.string().trim().max(160, 'بیو نباید از ۱۶۰ کاراکتر بیشتر باشه.').optional(),
}).strict();

const updateSettings = z.object({
  defaultExpiry: z.enum(['none', '1', '7', '30', '90']).optional(),
  pageSize: z.union([z.literal(6), z.literal(10), z.literal(20)]).optional(),
  notifyMilestone: z.boolean().optional(),
  notifyExpiry: z.boolean().optional(),
  notifyNews: z.boolean().optional(),
}).strict();

const changePassword = z.object({
  currentPassword: z.string(msg('رمز فعلی رو وارد کن.')).min(1, 'رمز فعلی رو وارد کن.').max(128),
  newPassword: password,
}).refine((d) => d.currentPassword !== d.newPassword, { path: ['newPassword'], message: 'رمز جدید نباید با رمز فعلی یکی باشه.' });

const deleteAccount = z.object({ password: z.string(msg('رمز عبور رو وارد کن.')).min(1, 'رمز عبور رو وارد کن.').max(128) });

const createLink = z.object({
  url,
  title: title.optional(),
  slug: z.union([z.literal('').transform(() => undefined), slug]).optional(),
  expiresAt: expiresAt.optional(),
}).strict();

const updateLink = z.object({
  url: url.optional(),
  title: title.min(1, 'عنوان نمی‌تونه خالی باشه.').optional(),
  slug: slug.optional(),
  expiresAt: expiresAt.optional(),
  archived: z.boolean().optional(),
}).strict().refine((d) => Object.keys(d).length > 0, { message: 'هیچ تغییری ارسال نشده.' });

const listLinks = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['all', 'active', 'expired', 'archived']).default('all'),
  sort: z.enum(['newest', 'oldest', 'clicks', 'title']).default('newest'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const bulkDelete = z.object({ ids: z.array(objectId).min(1, 'هیچ لینکی انتخاب نشده.').max(100, 'در هر بار حداکثر ۱۰۰ لینک.') }).strict();
const checkSlug = z.object({ slug: z.string().trim().toLowerCase().max(64), exceptId: objectId.optional() });
const idParam = z.object({ id: objectId });

const linkAnalytics = z.object({ range: z.enum(['24h', '7d', '30d', 'all']).default('7d'), tz: tz.default('UTC') });
const overview = z.object({ days: z.coerce.number().int().refine((n) => n === 7 || n === 30, 'days باید ۷ یا ۳۰ باشه.').default(7), tz: tz.default('UTC') });

module.exports = {
  register, login, updateProfile, updateSettings, changePassword, deleteAccount,
  createLink, updateLink, listLinks, bulkDelete, checkSlug, idParam, linkAnalytics, overview,
};
