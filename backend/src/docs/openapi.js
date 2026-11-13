const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema, example) => ({ 'application/json': { schema, ...(example ? { example } : {}) } });
const err = (description) => ({ description, content: json(ref('Error')) });
const secured = [{ bearerAuth: [] }];
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' }, description: 'شناسه‌ی لینک' };

const linkExample = {
  id: '671f2c0a9d3e4b0012a4c111', title: 'پورتفولیوی من', slug: 'portfolio', url: 'https://github.com/amir/portfolio',
  shortUrl: 'http://localhost:5000/portfolio', clicks: 12, archived: false, status: 'active', expiresAt: null, lastClickAt: null, createdAt: '2026-10-30T09:00:00.000Z',
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'API لینک‌پالس',
    version: '1.0.0',
    description: [
      'کوتاه‌کننده‌ی لینک با آمار کلیک.',
      '',
      '**احراز هویت:** بعد از ورود یا ثبت‌نام یه `token` می‌گیری. توی درخواست‌های بعدی بفرستش: `Authorization: Bearer <token>`.',
      '',
      '**قالب پاسخ:** موفق → `{ "data": ... }` (و گاهی `meta`). خطا → `{ "error": { "code", "message", "details" } }`.',
      '',
      '**ریدایرکت:** `GET /{slug}` (خارج از `/api`) کاربر رو با ۳۰۲ به مقصد می‌بره و کلیک رو ثبت می‌کنه.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'همین سرور' }],
  tags: [{ name: 'Auth' }, { name: 'Users' }, { name: 'Links' }, { name: 'Analytics' }, { name: 'Redirect' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string', example: 'VALIDATION_ERROR' }, message: { type: 'string', example: 'این ایمیل درست به نظر نمی‌رسه.' }, details: { type: 'object', additionalProperties: { type: 'string' } } } } } },
      User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, username: { type: 'string', nullable: true }, bio: { type: 'string' }, settings: { type: 'object', properties: { defaultExpiry: { type: 'string', enum: ['none', '1', '7', '30', '90'] }, pageSize: { type: 'integer', enum: [6, 10, 20] }, notifyMilestone: { type: 'boolean' }, notifyExpiry: { type: 'boolean' }, notifyNews: { type: 'boolean' } } }, createdAt: { type: 'string', format: 'date-time' } } },
      Link: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, slug: { type: 'string' }, url: { type: 'string' }, shortUrl: { type: 'string' }, clicks: { type: 'integer' }, archived: { type: 'boolean' }, status: { type: 'string', enum: ['active', 'expired', 'archived'] }, expiresAt: { type: 'string', format: 'date-time', nullable: true }, lastClickAt: { type: 'string', format: 'date-time', nullable: true }, createdAt: { type: 'string', format: 'date-time' } } },
    },
  },
  paths: {
    '/api/auth/register': { post: { tags: ['Auth'], summary: 'ثبت‌نام', description: 'محدودیت: ۲۰ درخواست در ۱۵ دقیقه برای هر IP.',
      requestBody: { required: true, content: json({ type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string', minLength: 2, maxLength: 60 }, email: { type: 'string' }, password: { type: 'string', minLength: 8 } } }, { name: 'سارا', email: 'sara@example.com', password: 'Passw0rd!x' }) },
      responses: { 201: { description: 'حساب ساخته شد', content: json({ type: 'object', properties: { data: { type: 'object', properties: { token: { type: 'string' }, user: ref('User') } } } }) }, 400: err('ورودی نامعتبر'), 409: err('ایمیل تکراری'), 429: err('درخواست زیاد') } } },
    '/api/auth/login': { post: { tags: ['Auth'], summary: 'ورود',
      requestBody: { required: true, content: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } }, { email: 'sara@example.com', password: 'Passw0rd!x' }) },
      responses: { 200: { description: 'وارد شدی', content: json({ type: 'object', properties: { data: { type: 'object', properties: { token: { type: 'string' }, user: ref('User') } } } }) }, 401: err('ایمیل یا رمز اشتباه'), 429: err('درخواست زیاد') } } },
    '/api/auth/logout': { post: { tags: ['Auth'], summary: 'خروج', description: 'توکن‌ها stateless هستن؛ کلاینت باید توکنش رو پاک کنه.', security: secured, responses: { 204: { description: 'انجام شد' }, 401: err('نیاز به ورود') } } },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'کاربر فعلی', security: secured, responses: { 200: { description: 'اطلاعات کاربر', content: json({ type: 'object', properties: { data: { type: 'object', properties: { user: ref('User') } } } }) }, 401: err('نیاز به ورود') } } },
    '/api/users/me': {
      get: { tags: ['Users'], summary: 'پروفایل و مجموع آمار', security: secured, responses: { 200: { description: 'OK' }, 401: err('نیاز به ورود') } },
      patch: { tags: ['Users'], summary: 'ویرایش پروفایل', security: secured, requestBody: { content: json({ type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, username: { type: 'string', nullable: true }, bio: { type: 'string', maxLength: 160 } } }) }, responses: { 200: { description: 'ذخیره شد' }, 400: err('ورودی نامعتبر'), 409: err('ایمیل/نام‌کاربری تکراری') } },
      delete: { tags: ['Users'], summary: 'حذف حساب و همه‌ی لینک‌ها و آمار', security: secured, requestBody: { required: true, content: json({ type: 'object', required: ['password'], properties: { password: { type: 'string' } } }) }, responses: { 204: { description: 'حذف شد' }, 400: err('رمز اشتباه') } },
    },
    '/api/users/me/settings': { patch: { tags: ['Users'], summary: 'ذخیره‌ی تنظیمات', security: secured, requestBody: { content: json({ type: 'object', properties: { defaultExpiry: { type: 'string' }, pageSize: { type: 'integer' }, notifyMilestone: { type: 'boolean' }, notifyExpiry: { type: 'boolean' }, notifyNews: { type: 'boolean' } } }) }, responses: { 200: { description: 'ذخیره شد' }, 400: err('ورودی نامعتبر') } } },
    '/api/users/me/password': { put: { tags: ['Users'], summary: 'تغییر رمز', description: 'همه‌ی توکن‌های قبلی باطل می‌شن و توکن تازه برمی‌گرده.', security: secured, requestBody: { required: true, content: json({ type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } } }) }, responses: { 200: { description: 'عوض شد' }, 400: err('رمز فعلی اشتباه یا رمز جدید نامعتبر') } } },
    '/api/links': {
      get: { tags: ['Links'], summary: 'لیست لینک‌های من', description: 'جستجو، فیلتر وضعیت، مرتب‌سازی و صفحه‌بندی. فقط لینک‌های خود کاربر.', security: secured,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'جستجو در عنوان، slug و آدرس' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'active', 'expired', 'archived'], default: 'all' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'clicks', 'title'], default: 'newest' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
        ],
        responses: { 200: { description: 'OK', content: json({ type: 'object', properties: { data: { type: 'object', properties: { links: { type: 'array', items: ref('Link') }, summary: { type: 'object' } } }, meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' } } } } }) }, 401: err('نیاز به ورود') } },
      post: { tags: ['Links'], summary: 'ساخت لینک کوتاه', description: 'اگه slug ندی، یکی تصادفی ساخته می‌شه. فقط آدرس‌های http/https قبول می‌شن. محدودیت: ۶۰ لینک در ساعت.', security: secured,
        requestBody: { required: true, content: json({ type: 'object', required: ['url'], properties: { url: { type: 'string' }, title: { type: 'string' }, slug: { type: 'string', example: 'my-link' }, expiresAt: { type: 'string', format: 'date-time', nullable: true } } }, { url: 'https://example.com/a/very/long/page', slug: 'my-link', title: 'صفحه‌ی من' }) },
        responses: { 201: { description: 'ساخته شد', content: json({ type: 'object', properties: { data: { type: 'object', properties: { link: ref('Link') } } } }, { data: { link: linkExample } }) }, 400: err('آدرس یا slug نامعتبر'), 409: err('slug تکراری'), 429: err('درخواست زیاد') } },
      delete: { tags: ['Links'], summary: 'حذف همه‌ی لینک‌های من', security: secured, responses: { 200: { description: 'تعداد حذف‌شده‌ها' } } },
    },
    '/api/links/export.csv': { get: { tags: ['Links'], summary: 'خروجی CSV', description: 'همان فیلترهای لیست رو می‌گیره (q, status, sort).', security: secured, responses: { 200: { description: 'فایل CSV', content: { 'text/csv': { schema: { type: 'string' } } } } } } },
    '/api/links/check-slug': { get: { tags: ['Links'], summary: 'آزاد بودن slug', security: secured, parameters: [{ name: 'slug', in: 'query', required: true, schema: { type: 'string' } }, { name: 'exceptId', in: 'query', schema: { type: 'string' }, description: 'موقع ویرایش: شناسه‌ی خود لینک' }], responses: { 200: { description: '{ available, reason }' } } } },
    '/api/links/bulk-delete': { post: { tags: ['Links'], summary: 'حذف گروهی', security: secured, requestBody: { required: true, content: json({ type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, maxItems: 100 } } }) }, responses: { 200: { description: '{ deleted }' }, 400: err('ورودی نامعتبر') } } },
    '/api/links/{id}': {
      get: { tags: ['Links'], summary: 'یک لینک', security: secured, parameters: [idParam], responses: { 200: { description: 'OK' }, 404: err('پیدا نشد (یا مال کاربر دیگه‌ست)') } },
      patch: { tags: ['Links'], summary: 'ویرایش لینک', description: 'هر فیلدی رو که بفرستی عوض می‌شه. با `archived` می‌شه لینک رو آرشیو کرد. `expiresAt: null` انقضا رو برمی‌داره.', security: secured, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', properties: { url: { type: 'string' }, title: { type: 'string' }, slug: { type: 'string' }, expiresAt: { type: 'string', nullable: true }, archived: { type: 'boolean' } } }) }, responses: { 200: { description: 'OK' }, 400: err('ورودی نامعتبر'), 404: err('پیدا نشد'), 409: err('slug تکراری') } },
      delete: { tags: ['Links'], summary: 'حذف لینک و آمارش', security: secured, parameters: [idParam], responses: { 204: { description: 'حذف شد' }, 404: err('پیدا نشد') } },
    },
    '/api/links/{id}/analytics': { get: { tags: ['Analytics'], summary: 'آمار یک لینک', description: 'سری زمانی، تفکیک منبع/دستگاه/مرورگر/کشور، شاخص‌ها و آخرین کلیک‌ها.', security: secured, parameters: [idParam, { name: 'range', in: 'query', schema: { type: 'string', enum: ['24h', '7d', '30d', 'all'], default: '7d' } }, { name: 'tz', in: 'query', schema: { type: 'string', default: 'UTC', example: 'Asia/Tehran' }, description: 'منطقه‌ی زمانی IANA برای ساختن روزها' }], responses: { 200: { description: 'OK' }, 404: err('پیدا نشد') } } },
    '/api/analytics/overview': { get: { tags: ['Analytics'], summary: 'نمای کلی داشبورد', security: secured, parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', enum: [7, 30], default: 7 } }, { name: 'tz', in: 'query', schema: { type: 'string', default: 'UTC' } }], responses: { 200: { description: 'سری روزانه، خلاصه و ۴ لینک برتر' } } } },
    '/api/notifications': { get: { tags: ['Analytics'], summary: 'اعلان‌ها', description: 'لینک‌های نزدیک به انقضا و عددهای رُند کلیک (طبق تنظیمات اعلان کاربر).', security: secured, responses: { 200: { description: 'OK' } } } },
    '/{slug}': { get: { tags: ['Redirect'], summary: 'باز کردن لینک کوتاه', description: 'ریدایرکت ۳۰۲ به مقصد و ثبت کلیک. ربات‌ها شمرده نمی‌شن. برای لینک منقضی/آرشیوشده ۴۱۰ و برای ناموجود ۴۰۴ می‌ده.', parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }], responses: { 302: { description: 'ریدایرکت به آدرس مقصد' }, 404: { description: 'پیدا نشد' }, 410: { description: 'منقضی یا آرشیو' } } } },
  },
};
