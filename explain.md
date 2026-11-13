# راهنمای کامل پروژه‌ی لینک‌پالس (LinkPulse)

این فایل همه‌ی پروژه را توضیح می‌دهد: چه فایلی چه کاری می‌کند، چرا هست، به چه چیزی وصل است و اگر دستش بزنی چه می‌شود. بر اساس فایل‌های واقعی پروژه نوشته شده است.

> اصطلاح‌های انگلیسی همراه معنی فارسی‌شان آمده‌اند.

---

## ۱. معرفی پروژه

**لینک‌پالس** یک کوتاه‌کننده‌ی لینک با آمار کلیک است. کاربر ثبت‌نام می‌کند، آدرس بلند را می‌دهد و یک لینک کوتاه می‌گیرد (مثلاً `site.com/my-link`). هر بار که کسی آن لینک را باز کند، به آدرس اصلی می‌رود و یک کلیک با اطلاعات تحلیلی (منبع، دستگاه، مرورگر، کشور) ثبت می‌شود. کاربر در پنل نمودار و آمار را می‌بیند.

**تکنولوژی‌ها (فقط همین‌ها):**
- فرانت‌اند: HTML، CSS، JavaScript نسخه‌ی ES6 (بدون React، Vite، Tailwind)
- بک‌اند: Node.js، Express.js، MongoDB، Mongoose
- کتابخانه‌های کمکی بک‌اند: `zod` (اعتبارسنجی)، `bcryptjs` (هش رمز)، `jsonwebtoken` (توکن)، `helmet` (هدرهای امنیتی)، `cors`، `express-rate-limit` (محدودیت تعداد درخواست)، `dotenv`، `morgan` (لاگ درخواست‌ها)، `swagger-ui-express` (مستندات)؛ برای تست: `jest`، `supertest`، `mongodb-memory-server`.

---

## ۲. درخت پوشه‌ها

```
linkpulse/
├── README.md                  راهنمای سریع اجرا و استقرار
├── explain.md                 همین فایل (کامنت‌های کد هم در بخش ۱۴ همین فایل هستن)
├── ANIMATIONS-EXPLAIN.md      توضیح کامل انیمیشن‌ها
├── .gitignore / .dockerignore / .gitattributes
├── backend/
│   ├── package.json           اسکریپت‌ها و وابستگی‌ها
│   ├── .env.example           الگوی تنظیمات محیط
│   ├── Dockerfile             ساخت ایمیج برای استقرار
│   ├── scripts/seed.js        ساخت داده‌ی آزمایشی
│   ├── src/
│   │   ├── server.js          نقطه‌ی شروع: اتصال به دیتابیس + بالا آوردن سرور
│   │   ├── app.js             ساخت اپ Express و ترتیب middlewareها
│   │   ├── config/            env.js و db.js
│   │   ├── models/            User, Link, Click (Mongoose)
│   │   ├── routes/index.js    فهرست مسیرهای /api
│   │   ├── controllers/       منطق هر مسیر
│   │   ├── middleware/        auth, validate, rateLimiters, errorHandler
│   │   ├── validators/        schemas.js (قوانین Zod)
│   │   ├── utils/             ابزارهای کوچک و مشترک
│   │   └── docs/openapi.js    مستندات OpenAPI برای /docs
│   └── tests/                 تست‌های خودکار (۸۶ تست)
└── frontend/
    ├── *.html                 ۹ صفحه
    ├── css/                   fonts, base, components, app, site, animations
    ├── js/                    config, utils, api, data, ui, charts, layout, link-modal, animations, background
    ├── js/pages/              یک فایل برای هر صفحه
    ├── assets/logo.svg
    └── assets/fonts/          فونت‌ها داخل خود پروژه (Google Fonts توی ایران همیشه در دسترس نیست)
```

---

## ۳. معماری فرانت‌اند

### ۳.۱ ایده‌ی اصلی
هر صفحه یک فایل HTML است که چند اسکریپت را **به ترتیب** لود می‌کند. همه‌ی اسکریپت‌ها روی یک شیء سراسری به نام `window.LP` چیز اضافه می‌کنند (به‌جای ماژول‌ها). بنابراین **ترتیب `<script>`ها مهم است**:

```
utils.js → config.js → api.js → data.js → ui.js → charts.js → layout.js → link-modal.js → pages/<صفحه>.js
```

هر فایل فقط به فایل‌های قبل از خودش تکیه می‌کند.

### ۳.۲ لایه‌ها
1. **utils.js** — ابزارهای عمومی بدون وابستگی (فرمت عدد و تاریخ فارسی، escape کردن HTML، اعتبارسنجی URL، کپی، دانلود).
2. **config.js** — فقط `LP_CONFIG.apiBase` را می‌گذارد (آدرس بک‌اند).
3. **api.js** — تنها جایی که `fetch` صدا زده می‌شود. توکن را نگه می‌دارد، خطاها را به `ApiError` تبدیل می‌کند و نشست (session) را مدیریت می‌کند.
4. **data.js** — لایه‌ی «داده» روی `api.js`: توابع نام‌دار مثل `LP.data.create(...)` و تبدیل پاسخ سرور به برچسب‌های فارسی.
5. **ui.js / charts.js** — اجزای بصری (toast، modal، نمودار SVG).
6. **layout.js** — منوی کناری و نوار بالای صفحه‌های پنل.
7. **link-modal.js** — پنجره‌ی ساخت/ویرایش لینک.
8. **pages/*.js** — منطق هر صفحه.

### ۳.۳ نشست (Session) و `LP.ready`
صفحه‌های پنل `<body data-shell="app">` دارند. `api.js` برای آن‌ها:
- اگر توکن نیست → کاربر را به `login.html` می‌فرستد.
- اگر هست → `GET /api/auth/me` می‌زند. وقتی کاربر آمد، Promise به نام `LP.ready` حل می‌شود.

هر فایل صفحه کارش را داخل `LP.ready.then(...)` شروع می‌کند، پس مطمئن است کاربر لود شده.
اگر سرور جواب ۴۰۱ با کد `TOKEN_INVALID` بدهد (توکن منقضی یا بعد از تغییر رمز باطل شده)، توکن پاک و کاربر به `login.html?expired=1` برده می‌شود.

### ۳.۴ توکن
توکن JWT در `localStorage` با کلید `lp:token` ذخیره می‌شود و با هدر `Authorization: Bearer ...` فرستاده می‌شود. (ریسک: اگر سایت XSS داشته باشد، توکن قابل دزدیدن است؛ برای همین CSP سخت‌گیرانه در سرور هست و همه‌ی متن‌های کاربر با `LP.esc` escape می‌شوند.)

---

## ۴. معماری بک‌اند

### ۴.۱ لایه‌ها
```
درخواست → app.js (middlewareهای عمومی) → routes/index.js
        → [rateLimiter] → [protect] → [validate] → controller → model (Mongoose) → MongoDB
        → پاسخ  یا  خطا → errorHandler
```
- **route** فقط می‌گوید «این آدرس به کدام کنترلر می‌رود و از کدام فیلترها رد می‌شود».
- **middleware** کارهای تکراری (ورود، اعتبارسنجی، محدودیت) را انجام می‌دهد.
- **controller** منطق اصلی.
- **model** شکل داده و قوانین دیتابیس.

### ۴.۲ قالب پاسخ‌ها
- موفق: `{ "data": {...}, "meta": {...}? }`
- خطا: `{ "error": { "code": "SLUG_TAKEN", "message": "پیام فارسی", "details": { "slug": "..." }? } }`

فرانت از `code` برای تصمیم و از `message` برای نمایش به کاربر استفاده می‌کند.

### ۴.۳ ترتیب middlewareها در `app.js` (مهم!)
1. `helmet` — هدرهای امنیتی و CSP (برای `/docs` کمی شل‌تر)
2. `cors` روی `/api` — فقط originهای مجاز
3. `morgan` — لاگ (در تست خاموش)
4. `express.json({limit:'10kb'})` — خواندن بدنه‌ی JSON
5. `/api` ← rate limiter کلی ← routes
6. `/api` ← `notFound` (مسیر ناموجود)
7. `/docs` — مستندات Swagger
8. فایل‌های ثابت فرانت (`express.static`)
9. `GET /:slug` — ریدایرکت لینک کوتاه
10. صفحه‌ی 404
11. `errorHandler`

> چرا ریدایرکت **بعد از** فایل‌های ثابت؟ تا `/login` یا `/dashboard.html` به‌عنوان اسلاگ تفسیر نشوند. این اسم‌ها هم در `RESERVED_SLUGS` رزرو شده‌اند.

---

## ۵. چرخه‌ی یک درخواست (مثال: ساخت لینک)

1. کاربر فرم را در `link-modal.js` پر می‌کند. اعتبارسنجی سمت کاربر (فقط برای تجربه‌ی بهتر).
2. `LP.data.create(payload)` ← `LP.api.post('/links', payload)` ← `fetch` با توکن.
3. سرور: `app.js` → `/api` limiter → `routes/index.js`:
   `limiters.createLink` (۶۰ در ساعت) → `protect` (توکن را می‌خواند و کاربر را از دیتابیس می‌آورد) → `validate({body: S.createLink})` (Zod؛ آدرس را نرمال و بررسی می‌کند) → `links.create`.
4. `linkController.create`: سقف ۱۰۰۰ لینک به‌ازای هر کاربر را چک می‌کند، اگر اسلاگ نداده باشد تصادفی می‌سازد، `Link.create`. اگر اسلاگ تکراری باشد، ایندکس یکتای MongoDB خطای `11000` می‌دهد.
5. خطای ۱۱۰۰۰ به `errorHandler` می‌رسد و به `409 SLUG_TAKEN` با پیام فارسی تبدیل می‌شود؛ اگر اسلاگ تصادفی بوده، تا چند بار دوباره تلاش می‌شود.
6. پاسخ `201 {data:{link}}` ← فرانت `lp:links-changed` را منتشر می‌کند ← صفحه‌ها دوباره داده می‌گیرند.

### چرخه‌ی ریدایرکت (`GET /:slug`)
1. `redirectController.redirect` لینک را با اسلاگ (حروف کوچک) پیدا می‌کند.
2. نبود لینک → ۴۰۴؛ منقضی یا آرشیو → ۴۱۰. در هر دو صفحه‌ی `404.html` نشان داده می‌شود.
3. پاسخ `302` با `Cache-Control: no-store` (تا مرورگر کش نکند و کلیک بعدی هم ثبت شود).
4. **بعد از ارسال پاسخ**، کلیک ثبت می‌شود (fire-and-forget: کاربر منتظر دیتابیس نمی‌ماند). درخواست `HEAD`، ربات‌ها و بدون User-Agent شمرده نمی‌شوند.

---

## ۶. دیتابیس (MongoDB با Mongoose)

### ۶.۱ `User`
| فیلد | توضیح |
|---|---|
| `name` | اسم نمایشی |
| `email` | یکتا، با حروف کوچک ذخیره می‌شود |
| `username` | اختیاری، یکتا و sparse (چند کاربر بدون username مشکلی ندارند) |
| `bio` | درباره‌ی من |
| `passwordHash` | هش bcrypt (۱۲ دور)؛ `select:false` یعنی به‌صورت پیش‌فرض خوانده نمی‌شود |
| `tokenVersion` | با تغییر رمز یکی زیاد می‌شود تا توکن‌های قدیمی باطل شوند؛ `select:false` |
| `settings` | زیرسند: `defaultExpiry`, `pageSize`, `notifyMilestone`, `notifyExpiry`, `notifyNews` |

### ۶.۲ `Link`
`owner`, `title`, `slug` (یکتا، حروف کوچک، ۳ تا ۳۲ کاراکتر), `url`, `archived`, `expiresAt`, `clicks` (شمارنده), `lastClickAt`, `createdAt/updatedAt`.
- وضعیت (`active | expired | archived`) **ذخیره نمی‌شود**، هنگام ارسال محاسبه می‌شود (تا با گذشت زمان کهنه نشود).
- ایندکس‌ها: `{owner, createdAt:-1}` (لیست من) و `{owner, clicks:-1}` (مرتب‌سازی با کلیک) + ایندکس یکتای `slug`.

### ۶.۳ `Click`
یک سند برای هر کلیک: `link`, `owner` (کپی‌شده تا آمار داشبورد بدون join بیاید), `at`, `source` (direct|search|social|other), `refHost`, `device` (desktop|mobile|tablet), `browser`, `country` (دو حرف یا `XX`), `visitor`.
- `visitor` هش HMAC از (IP + مرورگر + نمک روزانه) است؛ IP و User-Agent خام ذخیره **نمی‌شوند**.
- ایندکس‌ها: `{link, at}`, `{owner, at}` و یک **TTL index** که کلیک‌های قدیمی‌تر از `CLICK_RETENTION_DAYS` (پیش‌فرض ۳۶۵ روز) را خود MongoDB پاک می‌کند.

---

## ۷. مرجع API

پیشوند همه: `/api`. «🔒» یعنی توکن لازم است. مستندات تعاملی: `/docs`.

| متد و مسیر | کار |
|---|---|
| `GET /health` | سلامت سرور |
| `POST /auth/register` | ثبت‌نام (`name,email,password`) ← `{token,user}` |
| `POST /auth/login` | ورود ← `{token,user}` |
| `POST /auth/logout` 🔒 | ۲۰۴؛ خروج بدون وضعیت (کلاینت توکن را دور می‌اندازد) |
| `GET /auth/me` 🔒 | کاربر فعلی |
| `GET /users/me` 🔒 | پروفایل + مجموع‌ها |
| `PATCH /users/me` 🔒 | ویرایش `name, username, bio` |
| `PATCH /users/me/settings` 🔒 | ویرایش تنظیمات |
| `PUT /users/me/password` 🔒 | تغییر رمز (توکن‌های قبلی باطل، توکن جدید برمی‌گردد) |
| `DELETE /users/me` 🔒 | حذف حساب (رمز در بدنه) و همه‌ی لینک‌ها و کلیک‌ها |
| `GET /links` 🔒 | لیست با `q, status, sort, page, limit` |
| `POST /links` 🔒 | ساخت لینک |
| `DELETE /links` 🔒 | حذف همه‌ی لینک‌های من |
| `GET /links/export.csv` 🔒 | خروجی CSV (تا ۵۰۰۰ ردیف) |
| `GET /links/check-slug` 🔒 | آزاد بودن اسلاگ |
| `POST /links/bulk-delete` 🔒 | حذف گروهی با `ids` |
| `GET/PATCH/DELETE /links/:id` 🔒 | خواندن/ویرایش/حذف یک لینک (فقط مال خودت) |
| `GET /links/:id/analytics?range=&tz=` 🔒 | آمار لینک؛ `range`: `24h|7d|30d|all` |
| `GET /analytics/overview?days=&tz=` 🔒 | نمای کلی داشبورد؛ `days`: ۷ یا ۳۰ |
| `GET /notifications` 🔒 | اعلان‌ها (لینک‌های رو به انقضا و سنگ‌میل‌های کلیک) |
| `GET /:slug` (بدون /api) | ریدایرکت |

کدهای خطای مهم: `VALIDATION_ERROR` و `BAD_JSON` و `BAD_ID` (400)، `UNAUTHORIZED` و `TOKEN_INVALID` (401)، `INVALID_CREDENTIALS` (ورود با اطلاعات غلط)، `WRONG_PASSWORD` (رمز فعلی غلط در تغییر رمز/حذف حساب)، `LINK_LIMIT` (۴۰۳؛ سقف ۱۰۰۰ لینک)، `LINK_NOT_FOUND` و `NOT_FOUND` (۴۰۴)، `SLUG_TAKEN` و `EMAIL_TAKEN` و `USERNAME_TAKEN` (۴۰۹)، `SELF_URL`، `PAYLOAD_TOO_LARGE` (۴۱۳)، `RATE_LIMITED` (۴۲۹)، `INTERNAL_ERROR` (۵۰۰ عمومی؛ جزئیات داخلی هرگز به کاربر نمی‌رود).

---

## ۸. فایل به فایل — بک‌اند

> قالب: **کار** / **چرا هست** / **خروجی‌ها** / **چه کسی استفاده می‌کند** / **اگر عوضش کنی**

### `backend/package.json`
- **کار:** نام پروژه، وابستگی‌ها، اسکریپت‌ها: `start`، `dev` (با `--watch`)، `seed`، `test` (`jest --runInBand --forceExit`).
- **چرا:** `npm` همه‌چیز را از اینجا می‌خواند.
- **اگر عوضش کنی:** حذف یک وابستگی ← خطای `Cannot find module`. نسخه‌ها را بدون تست بالا نبر.

### `backend/.env.example`
- **کار:** الگوی تنظیمات: `NODE_ENV, PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, BASE_URL, CORS_ORIGINS, TRUST_PROXY, CLICK_RETENTION_DAYS, FRONTEND_DIR`.
- **چرا:** خود `.env` (که رمز دارد) نباید وارد گیت شود؛ این فایل مستندش است.
- **نکته:** اصلاً مقدار واقعی `JWT_SECRET` در آن نیست؛ خودت با دستور داخل فایل می‌سازی.

### `backend/.gitignore`، ریشه‌ی `.gitignore` و `.dockerignore`
جلوگیری از آپلود `node_modules`، `.env` و لاگ‌ها.

### `backend/Dockerfile`
ایمیج `node:22-alpine`، نصب وابستگی‌های production، کپی بک‌اند و فرانت (چون سرور فرانت را سرو می‌کند)، اجرا با کاربر غیر root. از **ریشه‌ی پروژه** بساز: `docker build -f backend/Dockerfile -t linkpulse .`

### `backend/scripts/seed.js`
- **کار:** کاربر دمو (`demo@linkpulse.local`) با ۴ لینک و کلیک‌های تصادفی می‌سازد؛ رمز تصادفی را چاپ می‌کند (یا از `DEMO_PASSWORD`). اگر دمو از قبل بود، پاکش و دوباره می‌سازد.
- **ایمنی:** با `NODE_ENV=production` اجرا نمی‌شود.
- **وابسته به:** `env`, `db`, سه مدل.

### `backend/src/server.js`
- **کار:** `connectDB()` ← `app.listen(port)`؛ خطاهای `unhandledRejection` را لاگ می‌کند؛ با `SIGTERM/SIGINT` تمیز خاموش می‌شود.
- **چرا جدا از app.js؟** تست‌ها `app` را بدون listen کردن import می‌کنند.

### `backend/src/app.js`
- **کار:** ساخت Express و ترتیب middlewareها (بخش ۴.۳). ‏`trust proxy` را از env می‌گیرد.
- **خروجی:** خود `app`.
- **اگر ترتیب را عوض کنی:** مثلاً `static` بعد از ریدایرکت باشد، `/login.html` به‌عنوان اسلاگ دیده می‌شود؛ `errorHandler` اگر وسط بیفتد خطاها را نمی‌گیرد.

### `backend/src/config/env.js`
- **کار:** `dotenv` را لود (با `quiet`) و همه‌ی متغیرها را در یک شیء می‌دهد. اگر `MONGODB_URI` یا `JWT_SECRET` (حداقل ۳۲ کاراکتر) نباشد، با پیام فارسی خارج می‌شود (در تست مستثنا).
- **وابسته:** تقریباً همه‌ی بک‌اند.

### `backend/src/config/db.js`
`connectDB(uri)` و `disconnectDB()`؛ `strictQuery` روشن (فیلد ناشناس در فیلتر نادیده گرفته می‌شود). `serverSelectionTimeoutMS: 8000` تا اگر MongoDB نباشد، زود خطا بدهد نه بی‌نهایت منتظر بماند.

### `backend/src/models/User.js`
مدل بخش ۶.۱. متد `toJSON` فیلدهای حساس را حذف می‌کند. اگر `select:false` را برداری، هش رمز در هر query بیرون می‌آید.

### `backend/src/models/Link.js`
مدل بخش ۶.۲. اسلاگ `lowercase: true` دارد، پس `Abc` و `abc` یکی‌اند. حذف ایندکس یکتا ← امکان اسلاگ تکراری در رقابت دو درخواست همزمان.

### `backend/src/models/Click.js`
مدل بخش ۶.۳ + TTL. تغییر `CLICK_RETENTION_DAYS` بعد از ساخت ایندکس نیاز به ساخت دوباره‌ی ایندکس دارد (MongoDB همان مقدار قدیمی را نگه می‌دارد).

### `backend/src/utils/AppError.js`
کلاس خطای «قابل‌پیش‌بینی» با `statusCode`, `code`, `details`. `errorHandler` فقط پیام این خطاها را مستقیم به کاربر می‌دهد.

### `backend/src/utils/asyncHandler.js`
یک خط: اگر تابع async خطا داد، آن را به `next(err)` می‌دهد. **بدون آن** در Express خطای async به `errorHandler` نمی‌رسد و درخواست معلق می‌ماند. (Express 5 هم این را خودش انجام می‌دهد؛ نگه داشتیم تا رفتار صریح باشد.)

### `backend/src/utils/slug.js`
`RESERVED_SLUGS` (مثل `login`, `api`, `dashboard`, `docs`, ...)، `SLUG_RE = /^[a-z0-9][a-z0-9_-]{2,31}$/`، `isValidSlug`, `isReserved`, `randomSlug(len)` (با `crypto`، نه `Math.random`). این لیست باید با `LP.RESERVED_SLUGS` در فرانت هماهنگ بماند.

### `backend/src/utils/url.js`
- `normalizeUrl(raw)`: فقط `http/https`؛ بدون username/password در آدرس؛ هاست باید نقطه داشته باشد (پس `localhost` و `127.0.0.1` پذیرفته نمی‌شوند)؛ آدرس را استاندارد می‌کند.
- `isSelfUrl(url)`: آیا آدرس به خود سرویس اشاره می‌کند؟ (جلوگیری از حلقه‌ی ریدایرکت.)
- **چرا:** جلوگیری از `javascript:`، فیشینگ با credential و حلقه. سرور **هرگز** آدرس مقصد را fetch نمی‌کند (پس SSRF ندارد).

### `backend/src/utils/clickInfo.js`
`parseSource(referer)`, `parseUserAgent(ua)` ← `{device, browser}`, `parseCountry(headers)` (فقط از هدر CDN: `cf-ipcountry`, `x-vercel-ip-country`, `x-country-code`)، `isBot(ua)`, `visitorHash(req)` (HMAC از IP و User-Agent با نمک روزانه)، `fromRequest(req)` که همه را کنار هم می‌گذارد.
**نکته:** بدون CDN، کشور همیشه `XX` است.

### `backend/src/utils/serialize.js`
`serializeLink(link)` ← `id,title,slug,url,shortUrl,clicks,archived,status,expiresAt,lastClickAt,createdAt` و `shortUrl(slug)` از `BASE_URL`. تنها راه خروج لینک از API است؛ فیلد داخلی (مثل `owner`) از اینجا بیرون نمی‌رود.

### `backend/src/utils/csv.js`
`toCSV` و `cell`: BOM برای اکسل (فارسی درست دیده شود) و جلوگیری از **CSV/Formula injection** (سلولی که با `= + - @` شروع شود، یک `'` در ابتدایش می‌گیرد).

### `backend/src/utils/timeBuckets.js`
کلیدهای روز/ساعت با منطقه‌ی زمانی کاربر (`dayKeyOf`, `hourKeyOf`, `lastDayKeys`, `lastHourKeys`, `addDays`, `diffDays`, `mongoKey`). `mongoKey` فرمت `$dateToString` با `timezone` را می‌دهد تا MongoDB کلیک‌ها را در «روز محلی کاربر» دسته‌بندی کند. اگر `tz` نامعتبر باشد به UTC برمی‌گردد.

### `backend/src/validators/schemas.js`
همه‌ی قوانین Zod با پیام فارسی: `register, login, updateProfile, updateSettings, changePassword, deleteAccount, createLink, updateLink, listLinks, checkSlug, bulkDelete, idParam (ObjectId), linkAnalytics, overview`.
- بدنه‌ی `updateLink` حداقل یک فیلد می‌خواهد.
- فیلد اضافه حذف می‌شود (کاربر نمی‌تواند `owner` یا `clicks` بفرستد: **mass assignment** بسته است).

### `backend/src/middleware/validate.js`
`validate({params, query, body})` ← داده‌ی تمیز را در `req.valid.params/query/body` می‌گذارد؛ خطای Zod را به `VALIDATION_ERROR` با `details` به‌ازای هر فیلد تبدیل می‌کند. کنترلرها فقط از `req.valid` می‌خوانند، نه `req.body` خام.

### `backend/src/middleware/auth.js`
- `signToken(user)` ← JWT (HS256) با `{sub: id, tv: tokenVersion}`.
- `protect` ← توکن Bearer را می‌خواند، کاربر را می‌آورد، `tv` را با `tokenVersion` کاربر مقایسه می‌کند. ناهمخوان یا کاربر حذف‌شده → `401 TOKEN_INVALID`.
- **اگر `tv` را برداری:** تغییر رمز توکن‌های قدیمی را باطل نمی‌کند.

### `backend/src/middleware/rateLimiters.js`
چهار محدودکننده: `api` (۳۰۰/دقیقه)، `auth` (۲۰ در ۱۵ دقیقه)، `createLink` (۶۰/ساعت)، `redirect` (۶۰۰/دقیقه). در تست خاموش‌اند مگر `forceInTest`. پیام‌ها فارسی‌اند.

### `backend/src/middleware/errorHandler.js`
- `notFound` ← ۴۰۴ برای `/api/...` ناموجود.
- `errorHandler` ← ترجمه‌ی همه‌ی خطاها به قالب یکنواخت: Zod، `ValidationError` و `CastError` مانگوس، کلید تکراری ۱۱۰۰۰ (slug/email/username)، JSON خراب (`BAD_JSON`)، بدنه‌ی بزرگ (۴۱۳). هر چیز ناشناس ← ۵۰۰ عمومی و جزئیات فقط در لاگ سرور.

### `backend/src/controllers/authController.js`
`register`, `login`, `logout`, `me`, `changePassword`, `deleteAccount`.
- `login`: اگر ایمیل وجود نداشته باشد هم یک مقایسه‌ی bcrypt ساختگی انجام می‌دهد تا زمان پاسخ، وجود ایمیل را لو ندهد؛ پیام هر دو حالت یکی است.
- `changePassword`: رمز فعلی را می‌خواهد، `tokenVersion` را زیاد می‌کند و توکن تازه برمی‌گرداند.
- `deleteAccount`: رمز را می‌خواهد؛ کلیک‌ها، لینک‌ها و کاربر را پاک می‌کند.

### `backend/src/controllers/userController.js`
`getProfile` (پروفایل + مجموع لینک‌ها و کلیک‌ها)، `updateProfile`، `updateSettings` (به‌روزرسانی نقطه‌ای با `$set` روی `settings.x` تا بقیه‌ی تنظیمات پاک نشود).

### `backend/src/controllers/linkController.js`
`summarize` (تعداد کل/فعال/منقضی/آرشیو؛ در داشبورد هم استفاده می‌شود)، `list`، `exportCsv`، `get`، `create`، `update`، `remove`، `bulkRemove`، `removeAll`، `checkSlug`.
- همه‌ی query‌ها شرط `owner: req.user._id` دارند؛ لینک دیگران ← ۴۰۴ (نه ۴۰۳، تا وجودش لو نرود).
- جستجوی `q` با `$regex` است، با escape کردن ورودی (ReDoS و تزریق regex بسته). روی دیتای خیلی بزرگ از ایندکس استفاده نمی‌کند.
- با حذف لینک، کلیک‌هایش هم حذف می‌شوند.

### `backend/src/controllers/redirectController.js`
`redirect` (بخش ۵). کلیک‌ها با `Click.create` و `Link.updateOne({$inc:{clicks:1}, lastClickAt})` ثبت می‌شوند؛ خطای ثبت فقط لاگ می‌شود و کاربر را نگه نمی‌دارد.

### `backend/src/controllers/analyticsController.js`
- `linkAnalytics`: سری زمانی (۲۴ ساعت ساعتی؛ ۷ و ۳۰ روز روزانه؛ «همه» روزانه تا ۲۱ روز و بعدش هفتگی)، تفکیک منبع/دستگاه/مرورگر/کشور، KPI ها (روند ۷ روز اخیر نسبت به ۷ روز قبل، بازدیدکننده‌ی یکتا، منبع برتر، میانگین، اوج) و ۱۰ کلیک اخیر. با aggregation مانگو و **پر کردن روزهای خالی با صفر** در جاوااسکریپت.
- `overview`: سری کل، خلاصه و ۴ لینک پرکلیک با نمودار کوچک.
- `notifications`: لینک‌های نزدیک انقضا و رسیدن به سنگ‌میل کلیک؛ تنظیمات `notifyExpiry/notifyMilestone` کاربر را رعایت می‌کند.

### `backend/src/routes/index.js`
فهرست بخش ۷. مسیرهای ثابت (`export.csv`, `check-slug`, `bulk-delete`) **قبل از** `/:id` آمده‌اند؛ وگرنه `export.csv` به‌عنوان `id` تفسیر می‌شد.

### `backend/src/docs/openapi.js`
شیء OpenAPI 3 که `swagger-ui-express` در `/docs` نشان می‌دهد. فقط مستندات است؛ اگر با کد ناهماهنگ شود، چیزی خراب نمی‌شود ولی مستندات دروغ می‌گوید. هنگام اضافه کردن route اینجا هم اضافه کن.

### `backend/tests/` (۸۶ تست)
- `helpers.js`: `NODE_ENV=test`، MongoDB موقت در حافظه (`mongodb-memory-server`)، توابع `registerUser`, `createLink`, `waitFor`. **تست‌ها هیچ‌وقت به دیتابیس واقعی وصل نمی‌شوند.**
- `auth.test.js` (۱۸)، `links.test.js` (۳۳)، `redirect.test.js` (۱۲)، `analytics.test.js` (۱۳)، `security.test.js` (۱۰): هدرهای امنیتی، CORS، rate limit، تزریق NoSQL، دسترسی به لینک دیگران، ...
- اجرا: `cd backend && npm test`. اولین اجرا mongod را دانلود می‌کند.

---

## ۹. فایل به فایل — فرانت‌اند

### صفحه‌های HTML
هر کدام فقط ساختار و `<script>`ها را دارند؛ منطق در `js/pages/` است.

| فایل | توضیح | اسکریپت صفحه |
|---|---|---|
| `index.html` | لندینگ، فرم کوتاه‌کننده، پرسش‌های متداول | `landing.js` |
| `login.html` / `register.html` | فرم‌ها؛ با `LP.session` | `auth.js` |
| `dashboard.html` | داشبورد (`data-shell="app"`) | `dashboard.js` |
| `my-links.html` | جدول لینک‌ها | `my-links.js` |
| `link-details.html` | آمار یک لینک (`?id=`) | `link-details.js` |
| `profile.html` / `settings.html` | پروفایل و تنظیمات | `profile.js` / `settings.js` |
| `404.html` | ناموجود/منقضی؛ سرور برای ۴۰۴ و ۴۱۰ نشانش می‌دهد | فقط `utils.js` |

صفحه‌های پنل `data-shell="app"` و `data-page` و `data-title` دارند؛ `layout.js` از آن‌ها منو را می‌سازد. اگر `data-shell` را برداری، منو و بررسی ورود از بین می‌رود.

### `js/config.js`
`window.LP_CONFIG = { apiBase: '' }`. خالی یعنی «همان دامنه‌ای که صفحه از آن آمده». اگر فرانت جدا هاست شد، آدرس بک‌اند را اینجا بگذار (و در `CORS_ORIGINS` سرور اضافه کن).

### `js/utils.js`
ابزارها: `LP.esc` (جلوگیری از XSS: **هر متن کاربر که در `innerHTML` می‌رود باید از آن رد شود**)، `LP.store` (localStorage امن با try/catch)، `LP.fa/pct/compact` (اعداد فارسی)، `LP.fmtDate/fmtShort/fmtTime/rel` (تاریخ)، `LP.normalizeUrl`, `LP.host`, `LP.RESERVED_SLUGS`, `LP.isValidSlug`, `LP.randomSlug`, `LP.copy`, `LP.toCSV`, `LP.download`, `LP.debounce`, `LP.query` (خواندن `?x=`), `LP.go`, `LP.toEnDigits`, `LP.initial`, `LP.greeting`.
**همه‌ی فایل‌های دیگر** به آن وابسته‌اند.

### `js/api.js`
- `ApiError(message, status, code, details)`.
- `LP.api.get/post/patch/put/delete(path, ...)` ← `request()`؛ آدرس = `apiBase + '/api' + path`. خطای شبکه ← پیام فارسی. `401 TOKEN_INVALID` ← پاک کردن توکن و رفتن به ورود.
- `LP.session`: `user`, `isLoggedIn()`, `start({token,user})`, `logout()`, `refresh()`. `LP.ready` (بخش ۳.۳).
- در صورت خطای شبکه در پنل، صفحه‌ی «سرور در دسترس نیست» با دکمه‌ی تلاش دوباره نشان می‌دهد (بدون inline script، چون CSP اجازه نمی‌دهد).

### `js/data.js`
لایه‌ی داده روی API (فهرست توابع در بخش ۳.۲). نکات:
- هر تغییر لینک رویداد `lp:links-changed` را روی `document` می‌فرستد؛ داشبورد، لینک‌ها و اعلان‌ها به آن گوش می‌دهند.
- `linkAnalytics` و `overview` پاسخ سرور را به برچسب فارسی تبدیل می‌کنند (نام کشور با `Intl.DisplayNames`، منطقه‌ی زمانی از مرورگر).
- خوانده‌شدن اعلان‌ها فقط در `localStorage` (`lp:notif-read`) است، نه سرور.

### `js/ui.js`
`toast`, `modal`, `confirm`, `dropdown`, `popover`, `busy` (دکمه‌ی در حال بارگذاری), `setError/clearError/clearAll/liveClear/focusFirstError` (خطای فرم، دسترس‌پذیر)، `emptyState`, `errorState`, `skeletonRows`, `pager`, `wirePasswordToggles`, `statusBadge`, `delta`. مودال‌ها فوکوس را می‌گیرند و با Esc بسته می‌شوند.

### `js/charts.js`
نمودار با SVG دستی: `charts.line` (خطی با tooltip و قابل‌فوکوس با کیبورد), `charts.donut`, `charts.spark` (نمودار کوچک). بدون کتابخانه‌ی بیرونی.

### `js/layout.js`
منوی کناری، نوار بالا (جستجو، دکمه‌ی ساخت، اعلان‌ها، آواتار)، منوی موبایل. بعد از `LP.ready` سوار می‌شود. دکمه‌ی خروج ← تأیید ← `LP.session.logout()`.

### `js/link-modal.js`
`LP.linkModal.open()` (ساخت)، `open({link})` (ویرایش)، `open({url})` (با آدرس از پیش پر). خطاهای فیلد سرور (`err.details`) کنار همان فیلد نشان داده می‌شود؛ تکراری بودن اسلاگ را فقط سرور تشخیص می‌دهد (تنها روش درست در برابر رقابت همزمان).

### `js/pages/`
- `landing.js`: مهمان ← آدرس را در `pending-url` ذخیره می‌کند و به ثبت‌نام می‌رود؛ کاربر واردشده ← لینک واقعی می‌سازد و نتیجه را نشان می‌دهد. + نمودار نمونه (ثابت، فقط تزئینی)، منوی موبایل، انیمیشن اسکرول.
- `auth.js`: ورود و ثبت‌نام (اعتبارسنجی سمت کاربر + خطای سرور)، نمایش نوار «خارج شدی» (`?out=1`) و «نشست تمام شد» (`?expired=1`)، اگر قبلاً وارد شده مستقیم به داشبورد.
- `dashboard.js`: نمای کلی + ۵ لینک اخیر؛ `seq` (شماره‌ی درخواست) تا پاسخ قدیمی روی جدید نیفتد. اگر `pending-url` باشد، مودال ساخت را باز می‌کند.
- `my-links.js`: جستجو/فیلتر/مرتب‌سازی/صفحه‌بندی سمت **سرور**، انتخاب و حذف گروهی، خروجی CSV.
- `link-details.js`: انتخاب بازه، KPI، نمودار، تفکیک‌ها، جدول کلیک‌های اخیر، ویرایش/آرشیو/حذف.
- `profile.js`: نمایش و ویرایش نام/username/bio.
- `settings.js`: تنظیمات (ذخیره‌ی خودکار روی سرور)، تغییر رمز، حذف همه‌ی لینک‌ها، حذف حساب (با رمز و تایپ «حذف»).

### `css/`
- `base.css`: متغیرهای رنگ (`:root`)، ریست، فونت، RTL. **رنگ‌ها را فقط از اینجا عوض کن.**
- `components.css`: دکمه، فرم، مودال، toast، جدول، badge.
- `app.css`: قاب پنل (sidebar, topbar, کارت‌ها، responsive).
- `site.css`: صفحه‌های عمومی (لندینگ، ورود/ثبت‌نام).

### `assets/logo.svg`
لوگوی موقت؛ در `layout.js` و HTMLها استفاده شده.

---

## ۱۰. امنیت — چه چیزهایی بسته شده

| تهدید | راه‌حل |
|---|---|
| ذخیره‌ی رمز خام | bcrypt با ۱۲ دور |
| حدس رمز | rate limit ورود + پیام یکسان + مقایسه‌ی ساختگی (timing) |
| توکن بعد از تغییر رمز | `tokenVersion` |
| XSS | `LP.esc`، CSP سخت‌گیر، بدون inline script |
| NoSQL injection | Zod همه‌ی ورودی‌ها را به نوع مشخص تبدیل می‌کند |
| Mass assignment | فقط فیلدهای schema پذیرفته می‌شوند |
| دسترسی به لینک دیگران | فیلتر `owner` در همه‌ی query‌ها |
| ریدایرکت خطرناک | فقط http/https، بدون credential، بدون آدرس خود سرویس |
| SSRF | سرور هرگز آدرس مقصد را نمی‌خواند |
| حریم خصوصی | IP و UA خام ذخیره نمی‌شوند؛ هش با نمک روزانه |
| CSV injection | پیشوند `'` |
| بدنه‌ی بزرگ | محدودیت ۱۰ کیلوبایت |

**محدودیت‌های آگاهانه:** توکن در localStorage است؛ خروج بدون وضعیت است (توکن تا انقضا معتبر می‌ماند مگر رمز عوض شود)؛ بازیابی رمز ندارد (نیاز به ارسال ایمیل)؛ «بازدیدکننده‌ی یکتا» تقریبی است؛ کشور فقط پشت CDN؛ جستجوی `$regex` ایندکس نمی‌شود.

---

## ۱۱. نصب و اجرا

```bash
cd backend
npm install
cp .env.example .env
# JWT_SECRET را بساز:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# MongoDB لوکال باید روشن باشد، یا آدرس Atlas را در MONGODB_URI بگذار
npm run dev            # http://localhost:5000
npm run seed           # (اختیاری) داده‌ی آزمایشی
npm test               # ۸۶ تست
```
فرانت را سرور خودش سرو می‌کند؛ لازم نیست چیز دیگری اجرا کنی. مستندات: `http://localhost:5000/docs`.

### استقرار
`NODE_ENV=production`، `BASE_URL` = آدرس عمومی، `TRUST_PROXY=1` پشت پروکسی، `JWT_SECRET` قوی، `MONGODB_URI` از Atlas. اگر فرانت جدا هاست می‌شود: `apiBase` + `CORS_ORIGINS`. برای دیدن کشور بازدیدکننده‌ها، CDN مثل Cloudflare لازم است.

---

## ۱۲. راهنمای اشکال‌یابی

| علامت | علت محتمل | بررسی |
|---|---|---|
| سرور با «❌ این متغیرها…» بسته می‌شود | `.env` نیست یا ناقص | `.env` را از `.env.example` بساز؛ `JWT_SECRET` ≥ ۳۲ کاراکتر |
| `MongooseServerSelectionError` | MongoDB روشن نیست / آدرس غلط | `MONGODB_URI` را چک کن؛ `mongod` اجرا باشد |
| فرانت «ارتباط با سرور برقرار نشد» | سرور خاموش، `apiBase` غلط یا CORS | تب Network مرورگر؛ `CORS_ORIGINS` |
| مدام به صفحه‌ی ورود برمی‌گردد | توکن منقضی/باطل | `localStorage['lp:token']`؛ پاسخ `/auth/me` |
| `۴۲۹` | rate limit | چند دقیقه صبر کن |
| لینک کوتاه باز می‌شود اما آمار صفر | ربات تشخیص داده شده، `HEAD` یا بدون User-Agent | `isBot` در `clickInfo.js` (curl و wget و ابزارهای مشابه هم ربات حساب می‌شوند) |
| آمار روز اشتباه | `tz` | مرورگر `Intl...timeZone` می‌فرستد؛ در curl خودت بده |
| ‏`localhost` به‌عنوان مقصد رد می‌شود | قانون «هاست باید نقطه داشته باشد» | عمدی است |
| تست‌ها در اولین اجرا کند | دانلود mongod | یک‌بار طول می‌کشد |
| کشور همیشه «نامشخص» | CDN هدر نمی‌فرستد | عادی است |

---

## ۱۳. چطور چیزی اضافه کنم؟

**مثال: قابلیت «پین کردن لینک»**
1. `models/Link.js` ← فیلد `pinned: { type: Boolean, default: false }`.
2. `validators/schemas.js` ← `pinned: z.boolean().optional()` در `updateLink` (و `listLinks` اگر فیلتر می‌خواهی).
3. `utils/serialize.js` ← `pinned` را به خروجی اضافه کن.
4. `controllers/linkController.js` ← در `update` فیلد را بپذیر؛ در `list` مرتب‌سازی را عوض کن.
5. `docs/openapi.js` ← مستندات.
6. `tests/links.test.js` ← تست بنویس (لینک کسی دیگر را نمی‌شود پین کرد، ...).
7. فرانت: `data.js` (چیزی لازم نیست، `update` کلی است) ← `my-links.js` دکمه و نمایش.

**مثال: route جدید** — تابع کنترلر در فایل کنترلر، یک خط در `routes/index.js` با ترتیب `[limiter] → protect → validate → controller`، schema در `schemas.js`، تست.

**قانون طلایی:** هر ورودی کاربر را (۱) در schema بگیر، (۲) فیلتر `owner` بگذار، (۳) خروجی را از `serialize` رد کن، (۴) متن را در فرانت با `LP.esc` بریز، (۵) تست بنویس.

---

## ۱۴. کامنت‌های کد (منتقل‌شده از داخل فایل‌ها)

همه‌ی کامنت‌های راهنمایی که قبلاً داخل فایل‌ها نوشته شده بودن، از کد پاک شدن و اینجا جمع شدن (۵۰۸ کامنت از ۶۶ فایل). کد خودش هیچ تغییری نکرده.

**چطوری بخونیش:** زیر اسم هر فایل، هر مورد با یه خط کد شروع می‌شه؛ کامنت دقیقاً **بالای** همون خط (یا اگه با «کنار» مشخص شده، **کنار** همون خط) نوشته شده بود. برای پیدا کردنش توی فایل، همون خط کد رو با `Ctrl+F` جستجو کن.

### بک‌اند

#### `backend/.env.example`

- `NODE_ENV=development`
  کپی کن به .env و مقدارها رو عوض کن (فایل .env رو هیچ‌وقت توی گیت نذار)  
  محیط اجرا: development | production | test
- `MONGODB_URI=mongodb://127.0.0.1:27017/linkpulse`
  آدرس MongoDB. لوکال: mongodb://127.0.0.1:27017/linkpulse  
  اتلس (Atlas): mongodb+srv://USER:PASSWORD@cluster.mongodb.net/linkpulse
- `JWT_SECRET=`
  کلید امضای توکن. حداقل ۳۲ کاراکتر تصادفی. تولیدش:  
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
- `BASE_URL=http://localhost:5000`
  آدرس عمومی همین سرور؛ لینک کوتاه از روی اون ساخته می‌شه (بدون / آخر)
- `CORS_ORIGINS=http://localhost:5000,http://127.0.0.1:5000`
  آدرس‌هایی که اجازه دارن از مرورگر به API درخواست بدن (با ویرگول جدا کن).  
  اگه فرانت رو از خود سرور بالا میاری (پیش‌فرض)، لازم نیست چیزی اضافه کنی.
- `TRUST_PROXY=0`
  اگه پشت پروکسی/میزبان ابری هستی (Render, Railway, Nginx, ...) عدد ۱ بذار تا IP واقعی کاربر خونده بشه
- `CLICK_RETENTION_DAYS=365`
  نگه‌داری آمار کلیک‌ها (روز). بعد از این مدت خودکار پاک می‌شن
- `FRONTEND_DIR=`
  پوشه‌ی فرانت‌اند که سرور ازش سرو می‌کنه (خالی = پوشه‌ی ../frontend)

#### `backend/Dockerfile`

- `FROM node:22-alpine`
  ایمیج سبک برای اجرای لینک‌پالس (بک‌اند + فرانت‌اند ثابت)

#### `backend/scripts/seed.js`

- `const crypto = require('crypto');`
  seed.js — ساخت داده‌ی آزمایشی برای دیدن پنل با آمار پر  
  اجرا: npm run seed  
  یه کاربر دمو با چند لینک و کلیک‌های تصادفی می‌سازه.  
  رمز دمو رو خودت با DEMO_PASSWORD توی .env یا هنگام اجرا بده؛  
  اگه ندی، یه رمز تصادفی ساخته و همین‌جا چاپ می‌شه.

#### `backend/src/app.js`

- `const path = require('path');`
  app.js — ساخت اپلیکیشن Express (بدون روشن کردن سرور)  
  جدا بودنش از server.js باعث می‌شه توی تست‌ها بدون باز کردن پورت ازش استفاده کنیم.  
  ترتیب میدلورها مهمه: هر درخواست به ترتیب از بالا به پایین رد می‌شه.
- کنار `if (env.trustProxy) app.set('trust proxy', env.trustProxy);`
  برای خوندن IP واقعی پشت پروکسی
- `const secure = helmet({`
  ۱) هدرهای امنیتی. صفحه‌ی مستندات (Swagger) اسکریپت درون‌خطی داره، پس CSP سخت‌گیرانه براش خاموشه
- `const allowed = new Set(env.corsOrigins);`
  ۲) CORS: فقط مبدأهای مجاز می‌تونن از مرورگر به API درخواست بدن.
- کنار `if (!origin) return cb(null, true);`
  ابزارهایی مثل curl و درخواست‌های هم‌مبدأ
- کنار `if (!env.isProd && origin === 'null') return cb(null, true);`
  باز کردن فرانت با file:// فقط در حالت توسعه
- `app.use(express.json({ limit: '10kb' }));`
  ۳) خوندن بدنه‌ی JSON با سقف حجم
- `app.use('/api', limiters.api, routes);`
  ۴) API
- `app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'مستندات API لینک‌پالس' }));`
  ۵) مستندات
- `if (fs.existsSync(env.frontendDir)) {`
  ۶) فایل‌های فرانت‌اند (صفحه‌های HTML، CSS، JS)
- `app.get('/:slug', limiters.redirect, redirect);`
  ۷) لینک‌های کوتاه: GET /:slug  (باید بعد از static و api باشه تا چیزی رو نپوشونه)
- `app.use((req, res) => {`
  ۸) هر چیز دیگه: صفحه‌ی ۴۰۴

#### `backend/src/config/db.js`

- `const mongoose = require('mongoose');`
  db.js — اتصال به MongoDB با Mongoose

#### `backend/src/config/env.js`

- `const path = require('path');`
  env.js — خوندن و بررسی متغیرهای محیطی (Environment Variables)  
  همه‌ی تنظیمات و رازها از فایل .env میان، نه از توی کد.  
  اگه چیز مهمی کم باشه، همون اول اجرا با پیام واضح متوقف می‌شیم.
- `if (!isTest) {`
  در تست‌ها خودمون مقدار می‌دیم؛ در بقیه‌ی حالت‌ها اجباریه

#### `backend/src/controllers/analyticsController.js`

- `const Link = require('../models/Link');`
  analyticsController.js — آمار کلیک  
  همه‌ی محاسبه‌ها توی خود MongoDB با «Aggregation Pipeline» انجام می‌شن (نه با آوردن همه‌ی  
  کلیک‌ها به حافظه)؛ یعنی هر ساختار داده‌ای که می‌بینی نتیجه‌ی $match و $group هست.
- `async function countByKey(match, unit, tz, keys) {`
  شمارش هر کلید (روز/ساعت) روی یه $match پایه → { key: count }
- `function toWeekly(points) {`
  تبدیل نقطه‌های روزانه به هفتگی (از امروز به عقب، هر ۷ روز)
- `exports.linkAnalytics = asyncHandler(async (req, res) => {`
  آمار یه لینک
- `let unit = 'day';`
  ۱) کلیدهای بازه
- `const counts = await countByKey({ ...base, at: { $gte: windowStart } }, unit, tz, keys);`
  ۲) سری زمانی با صفر پر کردن
- `const inWindow = [`
  ۳) تفکیک‌ها (فقط کلیک‌های داخل بازه)
- `const d14 = T.lastDayKeys(14, tz, now);`
  ۴) شاخص‌ها (مستقل از بازه‌ی انتخابی): ۷ روز اخیر در برابر ۷ روز قبلش، بازدیدکننده‌ی یکتا و منبع اصلی
- `const recent = await Click.find(base).sort({ at: -1 }).limit(10).select('at country source refHost device b…`
  ۵) آخرین کلیک‌ها
- `exports.overview = asyncHandler(async (req, res) => {`
  نمای کلی داشبورد
- کنار `const keys = T.lastDayKeys(days * 2, tz, now);`
  بازه‌ی فعلی + بازه‌ی قبلی (برای درصد تغییر)
- `const top = activeLinks.slice().sort((a, b) => b.clicks - a.clicks || String(a._id).localeCompare(String(b.…`
  ۴ لینک برتر + نمودار کوچک ۷ روزه + روند هفتگی
- `const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 50000, 100000];`
  اعلان‌ها (از روی لینک‌ها محاسبه می‌شن)

#### `backend/src/controllers/authController.js`

- `const bcrypt = require('bcryptjs');`
  authController.js — ثبت‌نام، ورود، خروج، رمز و حذف حساب
- کنار `const BCRYPT_ROUNDS = 12;`
  هرچی بیشتر، هش کردن کندتر (و حمله‌ی حدسی سخت‌تر)
- `const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);`
  برای ورود با ایمیل ناموجود هم یه مقایسه‌ی bcrypt انجام می‌دیم تا زمان پاسخ، وجود یا نبود ایمیل رو لو نده
- `const user = await User.create({ name, email, passwordHash });`
  اگه ایمیل تکراری باشه، ایندکس یکتا خطای 11000 می‌ده و errorHandler اون رو به ۴۰۹ تبدیل می‌کنه
- `exports.logout = (req, res) => res.status(204).end();`
  توکن‌ها بدون وضعیت (stateless) هستن؛ پس «خروج» یعنی کلاینت توکنش رو دور می‌ریزه.  
  این مسیر برای کامل بودن قرارداد API هست و درخواست ورود به همه‌ی دستگاه‌ها رو باطل نمی‌کنه.
- کنار `user.tokenVersion += 1;`
  همه‌ی توکن‌های قبلی باطل می‌شن
- کنار `res.json({ data: authPayload(user) });`
  توکن تازه برای دستگاه فعلی

#### `backend/src/controllers/linkController.js`

- `const Link = require('../models/Link');`
  linkController.js — مدیریت لینک‌ها (فقط لینک‌های خود کاربر)  
  قانون طلایی: هر کوئری روی لینک‌ها حتماً شرط «owner: req.user._id» داره.  
  اگه لینکی مال کاربر دیگه‌ای باشه، جواب ۴۰۴ می‌دیم (نه ۴۰۳) تا وجودش لو نره.
- کنار `const rx = new RegExp(escapeRegex(q), 'i');`
  escape: ورودی کاربر هیچ‌وقت به‌عنوان regex اجرا نمی‌شه
- `async function summarize(owner) {`
  خلاصه‌ی آمار لینک‌های کاربر (برای کارت‌های بالای صفحه)
- `link = await Link.create({ ...base, slug });`
  slug دلخواه: اگه تکراری باشه، ایندکس یکتا خطای 11000 می‌ده → ۴۰۹ با پیام فارسی
- `for (let i = 0; i < 6 && !link; i++) {`
  slug تصادفی: اگه تصادفاً تکراری شد، دوباره امتحان می‌کنیم

#### `backend/src/controllers/redirectController.js`

- `const path = require('path');`
  redirectController.js — باز کردن لینک کوتاه: GET /:slug  
  مهم‌ترین مسیر عمومی برنامه (بدون نیاز به ورود).  
  - فقط به آدرس‌هایی ریدایرکت می‌کنیم که موقع ساخت لینک اعتبارسنجی شدن (http/https).  
  - هیچ‌وقت خودمون به آدرس مقصد درخواست نمی‌زنیم.  
  - ریدایرکت ۳۰۲ (موقت) می‌دیم نه ۳۰۱؛ وگرنه مرورگر نتیجه رو کش می‌کنه و کلیک‌های بعدی دیده نمی‌شن.
- `function recordClick(link, req) {`
  ثبت کلیک بعد از ارسال ریدایرکت (کاربر منتظر دیتابیس نمی‌مونه). خطاها فقط لاگ می‌شن.
- کنار `if (!SLUG_RE.test(slug)) return next();`
  چیزی شبیه slug نیست؛ بره سراغ ۴۰۴ عادی

#### `backend/src/controllers/userController.js`

- `const User = require('../models/User');`
  userController.js — پروفایل و تنظیمات کاربر
- `['name', 'email', 'username', 'bio'].forEach((k) => {`
  فقط فیلدهای مجاز رو می‌ذاریم؛ validator هم قبلاً فیلدهای ناشناس رو رد کرده (strict)
- کنار `await req.user.save();`
  اگه ایمیل/نام‌کاربری تکراری باشه، خطای 11000 → ۴۰۹

#### `backend/src/docs/openapi.js`

- `` const ref = (n) => ({ $ref: `#/components/schemas/${n}` }); ``
  openapi.js — مستندات API به فرمت OpenAPI 3 (Swagger)  
  بعد از روشن کردن سرور، توی مرورگر باز کن:  /docs

#### `backend/src/middleware/auth.js`

- `const jwt = require('jsonwebtoken');`
  auth.js — میدلور محافظ (protect)  
  توکن JWT رو از هدر «Authorization: Bearer &lt;token&gt;» می‌خونه، درستیش رو چک می‌کنه  
  و کاربر رو به req.user می‌ده. هر مسیری که این رو داشته باشه بدون ورود قابل استفاده نیست.
- `if (!user || (user.tokenVersion || 0) !== payload.tv) throw new AppError('نشست تو تموم شده؛ دوباره وارد شو.…`
  اگه کاربر حذف شده یا رمزش عوض شده (tokenVersion فرق می‌کنه)، توکن قدیمی دیگه معتبر نیست

#### `backend/src/middleware/errorHandler.js`

- `const AppError = require('../utils/AppError');`
  errorHandler.js — مدیریت متمرکز خطاها  
  همه‌ی خطاها (از هر جای برنامه) آخر سر به اینجا می‌رسن و با یه شکل ثابت جواب داده می‌شن:  
  { "error": { "code": "...", "message": "...", "details": {...} } }  
  جزئیات فنی (stack) هیچ‌وقت به کاربر نمی‌رسه.
- `function normalize(err) {`
  تبدیل انواع خطاهای شناخته‌شده به AppError
- `if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err))`
  JSON خراب
- `if (err.name === 'ValidationError' && err.errors) {`
  خطاهای Mongoose
- `if (err.code === 11000) {`
  کد 11000 = تکراری بودن مقدار یه فیلد یکتا (unique index)
- `const errorHandler = (err, req, res, next) => {`
  eslint-disable-next-line no-unused-vars
- `if (!env.isTest) console.error('[خطای پیش‌بینی‌نشده]', err);`
  خطای پیش‌بینی‌نشده: توی لاگ سرور کامل ثبت می‌شه، ولی به کاربر فقط پیام کلی می‌رسه

#### `backend/src/middleware/rateLimiters.js`

- `const rateLimit = require('express-rate-limit');`
  rateLimiters.js — محدودیت تعداد درخواست (Rate Limiting)  
  جلوی حدس‌زدن رمز، ساخت انبوه لینک و فشار بیش‌ازحد رو می‌گیره.  
  در حالت تست غیرفعاله تا تست‌ها گیر نکنن (خود محدودکننده جداگانه تست می‌شه).
- `api: make(60 * 1000, 300, 'درخواست‌هات زیاد شد؛ یه دقیقه صبر کن.'),`
  کل API
- `auth: make(15 * 60 * 1000, 20, 'تلاش‌های ورود/ثبت‌نام زیاد شد؛ ۱۵ دقیقه‌ی دیگه دوباره امتحان کن.'),`
  ورود و ثبت‌نام: سخت‌گیرانه‌تر
- `createLink: make(60 * 60 * 1000, 60, 'تعداد لینک‌های ساخته‌شده در این ساعت زیاد شد؛ بعداً دوباره امتحان کن.'),`
  ساخت لینک
- `redirect: make(60 * 1000, 600, 'درخواست‌ها زیاد شد؛ کمی بعد دوباره امتحان کن.'),`
  ریدایرکت‌ها (عمومی): سخاوتمندانه ولی نه بی‌نهایت
- `_make: make,`
  برای تست خود محدودکننده

#### `backend/src/middleware/validate.js`

- `const AppError = require('../utils/AppError');`
  validate — اعتبارسنجی body و query و params با اسکیمای Zod؛ مقدارهای تمیزشده رو جایگزین ورودی خام می‌کنه.
- کنار `if (!details[key]) details[key] = issue.message;`
  فقط اولین خطای هر فیلد
- `req.valid = req.valid || {};`
  در Express 5، req.query فقط‌خوندنیه؛ پس نتیجه رو توی یه مکان جدا می‌ذاریم

#### `backend/src/models/Click.js`

- `const mongoose = require('mongoose');`
  Click.js — یه سند به ازای هر کلیک  
  فقط اطلاعات تحلیلی ذخیره می‌کنیم: آدرس IP و User-Agent خام ذخیره نمی‌شن.
- `owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },`
  owner رو اینجا هم نگه می‌داریم تا آمار کل داشبورد بدون join (پیوند بین کالکشن‌ها) درآد
- `visitor: { type: String, default: '', maxlength: 32 },`
  هش یک‌طرفه از (IP + مرورگر + نمک روزانه). برای شمردن «بازدیدکننده‌ی یکتا» به کار می‌ره و از روش  
  نمی‌شه IP رو برگردوند. چون نمک هر روز عوض می‌شه، آدمی که چند روز بیاد، چند بار شمرده می‌شه.
- کنار `clickSchema.index({ link: 1, at: -1 });`
  آمار یک لینک
- کنار `clickSchema.index({ owner: 1, at: -1 });`
  آمار کل داشبورد
- `clickSchema.index({ at: 1 }, { expireAfterSeconds: env.clickRetentionDays * 86400 });`
  TTL index: مونگو خودش سندهایی که از «at + مدت» گذشتن رو پاک می‌کنه

#### `backend/src/models/Link.js`

- `const mongoose = require('mongoose');`
  Link.js — مدل لینک کوتاه‌شده  
  هر لینک به یه کاربر (owner) وصله. رابطه‌ی «یک به چند»: یه کاربر چند لینک.
- `owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },`
  ارجاع (reference) به کاربر صاحب لینک؛ فقط شناسه‌ی اون رو نگه می‌داریم
- `slug: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 3…`
  slug همیشه با حروف کوچکه تا «Demo» و «demo» یه لینک حساب بشن.  
  unique:true یه ایندکس یکتا می‌سازه؛ «دیتابیس» جلوی دو لینک با یه slug رو می‌گیره،  
  حتی اگه دو درخواست همزمان برسن (چک کردن توی کد به‌تنهایی کافی نیست).
- `expiresAt: { type: Date, default: null },`
  null = بدون انقضا
- `clicks: { type: Number, default: 0, min: 0 },`
  شمارنده‌ی کل کلیک‌ها. هر کلیک یه سند توی کالکشن Click هم داره،  
  ولی این عدد رو جدا نگه می‌داریم تا برای نمایش لیست، مجبور نباشیم هر بار همه‌ی کلیک‌ها رو بشماریم.
- `linkSchema.index({ owner: 1, createdAt: -1 });`
  برای «لینک‌های من» (فیلتر بر اساس صاحب + مرتب‌سازی جدیدترین): این ایندکس ترکیبی کوئری رو سریع می‌کنه
- `linkSchema.methods.getStatus = function () {`
  وضعیت لینک از روی فیلدها محاسبه می‌شه و جدا ذخیره نمی‌شه (تا هیچ‌وقت ناهماهنگ نشه)

#### `backend/src/models/User.js`

- `const mongoose = require('mongoose');`
  User.js — مدل کاربر  
  «مدل» (Model) در Mongoose یعنی یه کلاس که با یه «کالکشن» (Collection)  
  توی MongoDB وصله. «اسکیما» (Schema) هم شکل و قانون‌های هر سند (Document) رو  
  مشخص می‌کنه: چه فیلدهایی داره، نوعشون چیه، کدوم‌ها اجباری‌ان و...
- `email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },`
  ایمیل همیشه با حروف کوچک ذخیره می‌شه تا «A@x.com» و «a@x.com» دو حساب جدا نشن
- `username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, match: /^[a-z0-9_]{3,24}…`
  sparse: چند کاربر می‌تونن username نداشته باشن، ولی اگه دارن یکتا باشه
- `passwordHash: { type: String, required: true, select: false },`
  هش رمز؛ select:false یعنی تا صریحاً نخوای توی کوئری‌ها برنمی‌گرده
- `tokenVersion: { type: Number, default: 0, select: false },`
  با هر تغییر رمز یکی بیشتر می‌شه و توکن‌های قدیمی باطل می‌شن
- کنار `{ timestamps: true }`
  createdAt و updatedAt رو خودش پر می‌کنه
- `userSchema.set('toJSON', {`
  وقتی کاربر رو به JSON تبدیل می‌کنیم، فیلدهای حساس هیچ‌وقت بیرون نمی‌رن

#### `backend/src/routes/index.js`

- `const express = require('express');`
  routes/index.js — فهرست همه‌ی مسیرهای API (پیشوند /api)  
  هر مسیر: [محدودیت تعداد] → [ورود لازم؟] → [اعتبارسنجی] → کنترلر
- `router.post('/auth/register', limiters.auth, validate({ body: S.register }), auth.register);`
  احراز هویت
- `router.get('/users/me', protect, user.getProfile);`
  کاربر فعلی
- `router.use('/links', protect);`
  لینک‌ها ----- (مسیرهای ثابت باید قبل از /:id بیان)
- `router.get('/analytics/overview', protect, validate({ query: S.overview }), analytics.overview);`
  آمار کل و اعلان‌ها

#### `backend/src/server.js`

- `const env = require('./config/env');`
  server.js — نقطه‌ی شروع: اتصال به دیتابیس و روشن کردن سرور  
  اجرا:  npm start   (یا  npm run dev  برای راه‌اندازی مجدد خودکار)
- `await Promise.all([User.init(), Link.init(), Click.init()]);`
  ساخت ایندکس‌ها (اگه از قبل نباشن). برای یکتا بودن slug و ایمیل حیاتیه.

#### `backend/src/utils/AppError.js`

- `class AppError extends Error {`
  AppError — خطایی که «انتظارش رو داریم» (مثلاً ۴۰۴ یا ۴۰۹) و پیامش به کاربر نشون داده می‌شه.
- کنار `this.details = details;`
  مثلاً خطای هر فیلد فرم

#### `backend/src/utils/asyncHandler.js`

- `module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);`
  asyncHandler — خطای هر تابع async رو می‌گیره و به میدلور خطا می‌فرسته، تا try/catch تکراری ننویسیم.

#### `backend/src/utils/clickInfo.js`

- `const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu)\./i;`
  clickInfo.js — از درخواست ریدایرکت، اطلاعات تحلیلی بی‌هویت درمیاره.  
  بدون هیچ درخواست بیرونی و بدون ذخیره‌ی IP.
- `function parseCountry(headers) {`
  کشور رو فقط از هدرهای میزبان‌های ابری (Cloudflare, Vercel) می‌خونیم؛ هیچ جستجوی IP انجام نمی‌دیم
- `function visitorHash(req) {`
  هش یک‌طرفه‌ی روزانه برای شمردن بازدیدکننده‌ی یکتا (IP خام هیچ‌جا ذخیره نمی‌شه)

#### `backend/src/utils/csv.js`

- `function cell(v) {`
  csv.js — ساخت CSV امن. سلول‌هایی که با = + - @ شروع می‌شن (حمله‌ی «Formula Injection» در اکسل) با ' خنثی می‌شن.
- کنار `const toCSV = (rows) => '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');`
  BOM تا اکسل فارسی رو درست نشون بده

#### `backend/src/utils/serialize.js`

- `const env = require('../config/env');`
  serialize.js — شکل لینکی که به فرانت‌اند می‌دیم

#### `backend/src/utils/slug.js`

- `const crypto = require('crypto');`
  slug.js — قانون‌های slug (بخش آخر لینک کوتاه)  
  همین قانون‌ها توی فرانت‌اند (utils.js) هم هست؛ ولی اعتبار نهایی با سرور.
- `const RESERVED_SLUGS = [`
  اینا با مسیرهای خود برنامه تداخل دارن و نباید slug بشن
- کنار `const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';`
  بدون حرف‌های گیج‌کننده مثل l و o

#### `backend/src/utils/timeBuckets.js`

- `const pad = (n) => String(n).padStart(2, '0');`
  timeBuckets.js — ساخت «سطل‌های زمانی» (روز/ساعت) برای نمودارها  
  روزها بر اساس منطقه‌ی زمانی کاربر حساب می‌شن (مثلاً Asia/Tehran)، نه UTC؛  
  وگرنه کلیک ساعت ۲ بامداد ایران توی «دیروز» می‌افتاد.  
  کلیدها رشته‌ان: «2026-10-30» برای روز و «2026-10-30T14» برای ساعت.
- `function addDays(key, n) {`
  جمع/تفریق روز روی «رشته‌ی تاریخ» (بدون دردسر ساعت تابستانی)
- `function lastDayKeys(n, tz, now = new Date()) {`
  لیست N کلید روز منتهی به امروز (قدیمی‌ترین اول)
- `const mongoKey = (unit, tz) => ({`
  عبارت Mongo برای ساخت کلید از فیلد at

#### `backend/src/utils/url.js`

- `function normalizeUrl(input) {`
  url.js — اعتبارسنجی امن آدرس مقصد  
  فقط http و https. هیچ‌وقت خودمون به این آدرس درخواست نمی‌زنیم (جلوگیری از SSRF).
- `if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;`
  اگه پروتکل نداشت (مثلاً example.com/x) https اضافه می‌کنیم
- کنار `if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;`
  javascript:, data:, file: و... رد می‌شن
- کنار `if (u.username || u.password) return null;`
  آدرس‌های user:pass@host برای فیشینگ استفاده می‌شن
- کنار `if (!u.hostname || !u.hostname.includes('.')) return null;`
  localhost و نام‌های بدون نقطه رد می‌شن
- `function isSelfUrl(url, baseUrl) {`
  آدرس خود سرویس رو نمی‌خوایم کوتاه بشه (جلوگیری از حلقه‌ی ریدایرکت)

#### `backend/src/validators/schemas.js`

- `const { z } = require('zod');`
  schemas.js — قانون‌های اعتبارسنجی ورودی با Zod  
  هر درخواستی که از بیرون میاد «غیرقابل اعتماده». قبل از رسیدن به کنترلر،  
  شکل و مقدارش رو اینجا چک می‌کنیم. پیام‌ها فارسی‌ان چون مستقیم توی فرم‌ها نمایش داده می‌شن.
- `const name = z.string(msg('اسم رو وارد کن.')).trim().min(2, 'اسم باید حداقل ۲ حرف باشه.').max(60, 'اسم نبای…`
  قطعه‌های قابل استفاده‌ی دوباره
- `const expiresAt = z.union([z.null(), z.string().datetime({ message: 'تاریخ انقضا معتبر نیست.' })])`
  تاریخ انقضا: null (بدون انقضا) یا یه تاریخ ISO در آینده
- `const register = z.object({ name, email, password });`
  احراز هویت و کاربر
- `const createLink = z.object({`
  لینک‌ها
- `const linkAnalytics = z.object({ range: z.enum(['24h', '7d', '30d', 'all']).default('7d'), tz: tz.default('…`
  آمار

#### `backend/tests/analytics.test.js`

- `async function addClicks(link, user, specs) {`
  کلیک مستقیم توی دیتابیس می‌سازیم تا زمانش دست خودمون باشه
- `const keys = series.points.map((p) => p.from);`
  کلیدها پشت‌سرهم و قدیمی‌ترین اول
- `await Link.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(old.id) }, { $set: { create…`
  createdAt در Mongoose تغییرناپذیره؛ پس مستقیم روی کالکشن می‌نویسیم
- کنار `expect(kpis.trend).toBeCloseTo(60, 5);`
  ۸ کلیک این هفته در برابر ۵ کلیک هفته‌ی قبل
- کنار `expect(kpis.uniqueVisitors).toBe(6);`
  visitorها v0 تا v5 هستن (دسته‌ها از v0 شروع می‌شن)
- `const todayTehran = T.dayKeyOf(new Date(), 'Asia/Tehran');`
  ۲۰:۴۵ UTC دیروز = ۰۰:۱۵ بامداد امروز تهران (UTC+3:30)
- `if (at.getTime() > Date.now()) return;`
  این تست فقط وقتی معنی داره که این کلیک توی گذشته باشه (وگرنه فردا معتبر می‌شه)
- کنار `expect(d.series.total).toBe(10);`
  ۶ + ۴ (آرشیو حساب نمی‌شه)
- کنار `expect(d.series.prevTotal).toBe(2);`
  ۱۰ روز پیش

#### `backend/tests/auth.test.js`

- کنار `expect(res.body.data.user.email).toBe('sara@example.com');`
  ایمیل با حروف کوچک ذخیره می‌شه
- کنار `expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);`
  هش bcrypt، نه خود رمز
- کنار `expect((await api().get('/api/auth/me').set(u.auth)).status).toBe(401);`
  توکن قدیمی

#### `backend/tests/helpers.js`

- `process.env.NODE_ENV = 'test';`
  helpers.js — کمک‌های مشترک تست‌ها: دیتابیس موقت در حافظه + ساخت کاربر
- `await Promise.all(Object.values(mongoose.models).map((m) => m.init()));`
  ایندکس‌های یکتا باید قبل از تست ساخته شده باشن
- `async function waitFor(fn, { tries = 40, ms = 50 } = {}) {`
  صبر می‌کنیم تا یه شرط (مثلاً ثبت کلیک در پس‌زمینه) درست بشه

#### `backend/tests/links.test.js`

- کنار `expect(still.title).not.toBe('هک');`
  لینک دست‌نخورده موند
- `const bulk = await api().post('/api/links/bulk-delete').set(a.auth).send({ ids: [l2.id, other.id] });`
  لینک کاربر دیگه توی لیست ids باشه، حذف نمی‌شه
- کنار `await Link.updateOne({ _id: d.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });`
  منقضی‌شده (مستقیم توی دیتابیس)
- کنار `expect(evil.body.data.links).toHaveLength(0);`
  «.*» به‌عنوان متن جستجو می‌شه، نه الگوی regex
- کنار `` expect(res.text).toContain(`"'=HYPERLINK(""http://evil.test"",""کلیک کن"")"`); ``
  با ' خنثی شده

#### `backend/tests/redirect.test.js`

- کنار `expect(await Click.countDocuments()).toBe(0);`
  کلیک روی لینک مرده ثبت نمی‌شه
- `expect(JSON.stringify(click)).not.toMatch(/iPhone|127\.0\.0\.1|::ffff/);`
  IP و User-Agent خام ذخیره نشده

#### `backend/tests/security.test.js`

- کنار `expect(res.body.data.links).toHaveLength(1);`
  فیلتری اعمال نشده
- کنار `expect(bad.status).toBe(400);`
  مقدار خارج از لیست مجاز

### فرانت‌اند

#### `frontend/assets/logo.svg`

- `<rect width="64" height="64" rx="15" fill="#1d1b18"/>`
  لوگو: مربع جوهری با خط «پالس» به رنگ تأکید

#### `frontend/css/animations.css`

- `:root {`
  animations.css — همه‌ی انیمیشن‌های سایت (مفهوم «جوهر و پالس»)  
  اگه این فایل رو از HTML حذف کنی، سایت بدون انیمیشن کار می‌کنه.  
  ۱) توکن‌های حرکت: با عوض کردن همین‌ها سرعت کل سایت عوض می‌شه
- `@media (prefers-reduced-motion: reduce) {`
  کاربری که توی سیستم‌عاملش «حرکت کمتر» رو روشن کرده (یا انیمیشن‌های ویندوز خاموشه):  
  هیچ چیزی جابه‌جا نمی‌شه، ولی بخش‌ها موقع اسکرول نرم «محو» ظاهر می‌شن.  
  (محو شدن حرکت نیست و سرگیجه نمی‌آره.)
- `html.js .reveal, html.js [data-reveal] {`
  base.css همه‌ی transitionها رو صفر می‌کنه؛ اینجا فقط محو شدن رو برمی‌گردونیم
- `html.js .reveal:not(.is-in):not(.line-host):not(.faq):not(.cta) { opacity: 0; }`
  site.css توی این حالت .reveal رو همیشه نمایش می‌ده؛ اینجا قبل از دیده شدن مخفیش می‌کنیم تا محو بشه
- `html.js .line-host .line-inner,`
  خط‌ها و تیترها بدون حرکت، از اول سر جاشون
- `html:not(.js) .reveal,`
  ۲) ایمنی: اگه جاوااسکریپت اجرا نشه، هیچ چیزی مخفی نمی‌مونه
- `html.js [data-reveal] {`
  ۳) سیستم ظاهر شدن  
  هر عنصری که data-reveal داشته باشه، تا وقتی وارد صفحه نشده مخفیه.  
  animations.js وقتی دیدش، کلاس is-in رو اضافه می‌کنه.  
  --i شماره‌ی عنصر توی گروه پله‌ایه (data-stagger) و تأخیرش رو تعیین می‌کنه.
- `html.js [data-reveal='lines']:not(.is-in) { opacity: 1; transform: none; }`
  «lines»: خود عنصر مخفی نمی‌شه، فقط خط‌های داخلش (بخش ۴)
- `html.js .reveal {`
  کلاس قدیمی .reveal (لندینگ) هم از همین توکن‌ها و تأخیر پله‌ای استفاده می‌کنه
- `.lp-bg-host { position: relative; isolation: isolate; }`
  ۴) پس‌زمینه‌ی زنده (canvas ساخته‌شده توسط background.js)
- `-webkit-mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 72%, transparent);`
  لبه‌های بالا و پایین محو، تا مرز کانواس دیده نشه
- `.hero > .lp-bg { left: 50%; right: auto; width: 100vw; transform: translateX(-50%); }`
  هیرو داخل .container هست؛ کانواس تا لبه‌های صفحه پهن می‌شه
- `html.js .site-header { animation: lp-fade var(--dur-base) var(--ease-out) both; }`
  ۵) ورود صفحه  
  هدر سایت
- `.hero-copy { --stagger: 110ms; }`
  هیرو: آیتم‌ها با فاصله‌ی بیشتر پشت سر هم میان
- `html.js .kicker::before {`
  خط کوچیک کنار برچسب‌ها از راست کشیده می‌شه
- `html.js .eyebrow::before { transform-origin: right; animation: lp-draw var(--dur-slow) var(--ease-in-out) 1…`
  برچسب پنل (مثلاً «مدیریت لینک‌ها») موقع لود
- `.line-mask { display: block; overflow: hidden; padding-block: 0.12em; margin-block: -0.12em; }`
  تیترهای چندخطی: هر خط از پشت یه لبه‌ی نامرئی بالا میاد.  
  animations.js هر خط رو داخل .line-mask &gt; .line-inner می‌ذاره.
- `html.js .line-host.reveal:not(.is-in),`
  میزبان خط‌ها اگه خودش .reveal باشه، خودش محو نمی‌شه؛ فقط خط‌هاش حرکت می‌کنن
- `html.js .specimen.reveal {`
  کارت «قبل و بعد»: مثل برگه‌ای که روی میز گذاشته می‌شه
- `html.js .specimen .specimen-row,`
  داخل کارت: آدرس طولانی، فلش، و بعد لینک کوتاه مثل مُهر
- `html.js .auth-mini[data-reveal] { transition: opacity var(--dur-slow) var(--ease-out), transform 900ms cubi…`
  کارت نمونه‌ی صفحه‌ی ورود هم همین‌طور گذاشته می‌شه
- `html.js .mock.reveal:not(.is-in) { transform: translateY(28px) scale(0.985); }`
  نمونه‌ی پنل در لندینگ: کمی بزرگ‌شونده بالا میاد
- `.bar-fill { transform-origin: right; }`
  نمودارها: کشیدن خط با JS انجام می‌شه؛ نوارها از راست پر می‌شن
- `.feature-list { --stagger: 90ms; }`
  ۶) انیمیشن‌های اسکرول، هر نوع بخش مخصوص خودش  
  فهرست امکانات: خط زیر هر آیتم از راست کشیده می‌شه
- `.steps { --stagger: 240ms; }`
  سه قدم: خط بالای قدم‌ها پشت سر هم کشیده می‌شه، مثل نوار پیشرفت
- `html.js .faq.reveal:not(.is-in) { opacity: 1; transform: none; }`
  سؤال‌ها: خود کادر فوراً دیده می‌شه، جفت‌ها پله‌ای میان
- `html.js .cta { position: relative; border-top-color: transparent; }`
  دعوت نهایی: خط بالاش کشیده می‌شه
- `.page { --stagger: 70ms; }`
  پنل: بخش‌های اصلی صفحه پشت سر هم
- `.btn { transition-duration: var(--dur-fast); }`
  ۷) واکنش‌های کوچیک (Micro-interactions)  
  دکمه‌ها: فشرده شدن موقع کلیک
- `html.js .nav-text, html.js .link, html.js .link-btn, html.js .footer-links a, html.js .site-nav > a:not(.bt…`
  لینک‌های متنی: خط زیر از راست کشیده می‌شه (به‌جای ظاهر شدن یهویی)
- `.back-link .icon { transition: transform var(--dur-fast) var(--ease-out); }`
  فلش «برگشت» به سمت مقصدش حرکت می‌کنه
- `.top-item { transition: background var(--dur-fast), transform var(--dur-base) var(--ease-out); }`
  ردیف‌های قابل‌کلیک: کمی به سمت جهت خوندن (چپ) حرکت می‌کنن
- `.field-error { animation: lp-drop var(--dur-base) var(--ease-out); }`
  فیلدها: پیام خطا از بالا سُر می‌خوره (لرزش فیلد با JS)
- `.result.flash .result-link { display: inline-block; animation: lp-stamp 520ms var(--ease-spring) 120ms both; }`
  نتیجه‌ی کوتاه کردن: لینک جدید مثل مُهر ظاهر می‌شه
- `.icon.lp-swap { animation: lp-swap var(--dur-base) var(--ease-spring); }`
  آیکونی که عوض می‌شه (کپی ← تیک، نمایش رمز، منو) با یه فنر کوچیک
- `.switch .track::after { transition: transform var(--dur-base) var(--ease-spring), background var(--dur-fast…`
  سوییچ: دکمه‌ی گرد با فنر جابه‌جا می‌شه
- `.modal-backdrop { animation-duration: var(--dur-base); }`
  مودال: باز شدن نرم، و بسته شدن هم با حرکت (نه فقط محو)
- `.dd-menu { transform-origin: top right; animation: lp-menu var(--dur-fast) var(--ease-out); }`
  منوی کشویی و پاپ‌اور: از سمت دکمه‌ی خودشون باز می‌شن
- `.toast { animation: lp-toast var(--dur-base) var(--ease-spring); }`
  توست: از پایین با فنر خفیف
- `.bulk:not([hidden]) { animation: lp-rise var(--dur-base) var(--ease-out); }`
  نوار انتخاب گروهی
- `.sidebar { transition-duration: var(--dur-base); transition-timing-function: var(--ease-out); }`
  سایدبار موبایل
- `.notif-dot::after {`
  اعلان جدید: یه حلقه دو بار پخش می‌شه و تموم
- `.seg.has-indicator { position: relative; }`
  انتخاب بازه: نشانگری که بین گزینه‌ها سُر می‌خوره (با JS ساخته می‌شه)
- `@keyframes lp-fade { from { opacity: 0; } to { opacity: 1; } }`
  ۸) کی‌فریم‌ها
- `@media (prefers-reduced-motion: reduce) {`
  «حرکت کمتر»: کی‌فریم‌ها هم خاموش (base.css هم مدت‌ها رو صفر می‌کنه)

#### `frontend/css/app.css`

- `.sidebar {`
  app.css — ظاهر صفحه‌های داخل پنل  
  (قاب، داشبورد، لینک‌های من، آمار لینک، پروفایل، تنظیمات)  
  چون سایت راست‌به‌چپه، به‌جای left/right از ویژگی‌های «منطقی»  
  مثل inline-start و inline-end استفاده کردیم.  
  قاب پنل
- `.page { display: flex; flex-direction: column; gap: 1.25rem; padding: 2.25rem 1.75rem 3.5rem; max-width: 14…`
  صفحه
- `.kpis { display: grid; gap: 0; background: var(--raised); border: 1px solid var(--line); border-radius: var…`
  کارت‌های آمار: یه نوار واحد با جداکننده، نه چند کارت شناور
- `.grid-main { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 1.25rem; align-items…`
  چیدمان‌ها
- `.top-links { display: flex; flex-direction: column; }`
  پرکلیک‌ترین‌ها: فهرست ساده با خط جداکننده
- `.table-card { padding: 1.25rem 1.25rem 0.5rem; }`
  جدول لینک‌ها
- `.details-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wr…`
  صفحه‌ی آمار لینک
- `.grid-profile { display: grid; grid-template-columns: minmax(0, 20rem) minmax(0, 1fr); gap: 1.25rem; align-…`
  پروفایل
- `.settings-grid { display: grid; grid-template-columns: 13rem minmax(0, 1fr); gap: 1.5rem; align-items: star…`
  تنظیمات
- `@media (max-width: 1280px) {`
  واکنش‌گرایی (موبایل و تبلت)

#### `frontend/css/base.css`

- `:root {`
  base.css — رنگ‌ها، فونت‌ها، ریست و کلاس‌های کمکی  
  ظاهر کلی: کاغذی و روشن، با جوهر تیره و فقط «یک» رنگ تأکید  
  (نارنجی-آجری). اگه بخوای رنگ سایت رو عوض کنی، فقط همین  
  متغیرهای بالا رو تغییر بده.
- `--paper: #f5f2eb;`
  سطح‌ها: کاغذ (پس‌زمینه)، فرورفته، و برجسته (کارت)
- `--ink: #1d1b18;`
  جوهر (متن) از پررنگ به کم‌رنگ
- `--line: #e1dbcf;`
  خط‌ها
- `--accent: #c2512b;`
  تنها رنگ تأکید
- `--ok: #2f7550;`
  رنگ‌های وضعیت (کم‌اشباع، هم‌خانواده با کاغذ)
- `--font-body: 'Vazirmatn', 'Segoe UI', Tahoma, system-ui, sans-serif;`
  فونت‌ها
- `--radius-sm: 6px;`
  گوشه‌ها: داخلی‌ها تیزتر، قاب‌ها نرم‌تر
- `--shadow-1: 0 1px 2px rgba(62, 48, 30, 0.06);`
  سایه‌ها رنگِ کاغذ دارن، نه مشکیِ خالص
- `--sidebar-w: 15rem;`
  اندازه‌های ثابت قاب پنل
- `--z-sticky: 30;`
  لایه‌ها
- `*, *::before, *::after { box-sizing: border-box; }`
  ریست
- `* { scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }`
  نوار اسکرول باریک
- `.icon {`
  آیکون‌ها (Material Symbols، نازک‌تر از حالت پیش‌فرض)  
  اگه فونت آیکون لود نشد، فقط یه مربع کوچیک دیده می‌شه، نه یه عالمه متن انگلیسی
- `.ltr { direction: ltr; unicode-bidi: isolate; text-align: left; }`
  کلاس‌های کمکی
- `.tone-primary { color: var(--accent); }`
  «تُن»ها: primary = رنگ تأکید، secondary = جوهر، tertiary = مثبت

#### `frontend/css/components.css`

- `.brand { display: inline-flex; align-items: center; gap: 0.55rem; font-weight: 700; font-size: 17px; }`
  components.css — اجزای تکراری: دکمه، فرم، کارت، جدول، پنجره...  
  لوگو
- `.btn {`
  دکمه
- `.btn-primary { background: var(--ink); color: var(--paper); }`
  دکمه‌ی اصلی جوهریه؛ رنگ تأکید فقط برای جاهایی که واقعاً مهمن
- `.field { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }`
  فرم
- `.input-wrap > .input.ltr { padding-inline-start: 0.9rem; padding-inline-end: 2.6rem; }`
  فیلد آدرس چپ‌به‌چپه؛ آیکون همچنان سمت راسته، پس padding سمت راست رو زیاد می‌کنیم
- `.input-wrap.has-end > .input.ltr { padding-left: 2.9rem; }`
  فیلد چپ‌به‌چپ (مثل رمز): دکمه‌ی نمایش رمز سمت چپه، پس فاصله رو سمت چپ می‌ذاریم
- `.card { background: var(--raised); border: 1px solid var(--line); border-radius: var(--radius-lg); padding:…`
  کارت: فقط یه خط نازک، بدون سایه
- `.badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.05rem 0.5rem; border-radius: 4p…`
  نشان‌ها: مربعی و کم‌صدا، نه قرص‌های براق
- `.table-wrap { overflow-x: auto; }`
  جدول
- `.no-scroll { overflow: hidden; }`
  پنجره (Modal)
- `.toasts { position: fixed; z-index: var(--z-toast); bottom: 1.25rem; inset-inline: 0; display: flex; flex-d…`
  پیام کوتاه (Toast): جوهری روی کاغذ
- `.dd { position: relative; display: inline-block; }`
  منوی کشویی
- `.state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; padd…`
  حالت‌های خالی، خطا، بارگذاری
- `.pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;…`
  صفحه‌بندی
- `.seg { display: inline-flex; padding: 0.2rem; gap: 0.1rem; border-radius: var(--radius); background: var(--…`
  دکمه‌ی انتخاب بازه (Segmented)
- `.chart { position: relative; }`
  نمودارها
- `.avatar { width: 2.25rem; height: 2.25rem; border-radius: 9px; display: inline-grid; place-items: center; f…`
  آواتار: مربع گرد، تک‌رنگ
- `.skip { position: absolute; top: -4rem; inset-inline-start: 1rem; z-index: 300; padding: 0.5rem 1rem; borde…`
  دکمه‌ی پرش به محتوا (دسترس‌پذیری)

#### `frontend/css/fonts.css`

- `@font-face {`
  fonts.css — فونت‌ها از داخل خود پروژه (assets/fonts) لود می‌شن.  
  Google Fonts توی ایران همیشه در دسترس نیست؛ اگه لود نشه،  
  فونت‌ها به Tahoma برمی‌گردن و آیکون‌ها به‌شکل مربع خالی دیده می‌شن.  
  متن اصلی: وزیرمتن (متغیر، همه‌ی وزن‌ها در یک فایل)  
  تیترها: مرکزی (Markazi Text)  
  آدرس‌ها و کدها  
  آیکون‌ها (فونت متغیر: وزن، پرشدگی، اندازه‌ی نوری)

#### `frontend/css/site.css`

- `.container { width: 100%; max-width: 72rem; margin-inline: auto; padding-inline: 1.25rem; }`
  site.css — صفحه‌های عمومی: لندینگ، ورود، ثبت‌نام، ۴۰۴
- `body.site::before {`
  بافت خیلی ملایم کاغذ؛ فقط روی صفحه‌های عمومی
- `.reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.7s var(--ease), transform 0.7s var…`
  ظاهر شدن نرم
- `.no-js .reveal { opacity: 1; transform: none; }`
  اگه جاوااسکریپت کار نکنه، محتوا مخفی نمی‌مونه
- `.kicker { display: inline-flex; align-items: center; gap: 0.6rem; color: var(--accent); font-size: 13px; fo…`
  برچسب کوچیک بالای عنوان‌ها: یه خط کوتاه + متن، بدون قرص و نقطه‌ی چشمک‌زن
- `.site-header { position: sticky; top: 0; z-index: var(--z-sticky); background: rgba(245, 242, 235, 0.86); b…`
  هدر
- `.hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 3.5rem; align-items: e…`
  بخش اول: نامتقارن، متن سمت راست
- `.specimen { position: relative; display: flex; flex-direction: column; gap: 0.25rem; padding: 1.25rem; bord…`
  نمونه‌ی «قبل و بعد» کنار عنوان
- `.mock { margin: 0; border-radius: var(--radius-xl); background: var(--raised); border: 1px solid var(--line…`
  نمونه‌ی پنل
- `.section-head { display: flex; flex-direction: column; align-items: flex-start; gap: 0.6rem; margin-bottom:…`
  عنوان بخش‌ها
- `.split { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr); gap: 4rem; align-items: s…`
  چیدمان دو ستونه: عنوان چسبان یه طرف، محتوا طرف دیگه
- `.feature-list { display: flex; flex-direction: column; border-top: 1px solid var(--line-strong); }`
  امکانات: فهرست شماره‌دار
- `.steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.5rem; counter-reset: s; }`
  مراحل
- `.faq { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.25rem 2.5rem; }`
  سؤال‌های رایج: همه باز، بدون آکاردئون
- `.cta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.5rem 2re…`
  دعوت نهایی
- `.site-footer { margin-top: 3rem; padding-block: 2rem; border-top: 1px solid var(--line); }`
  فوتر
- `.auth { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr); min-height: 100dvh; }`
  ورود و ثبت‌نام
- `.nf { display: flex; flex-direction: column; min-height: 100dvh; }`
  ۴۰۴
- `@media (max-width: 960px) {`
  ریسپانسیو

#### `frontend/dashboard.html`

- `<div class="page-head">`
  سلام و دکمه‌های بالای صفحه
- `<section class="kpis kpis-3" aria-label="خلاصه‌ی آمار">`
  سه کارت آمار
- `<section class="grid-main">`
  نمودار کلیک‌ها + پرکلیک‌ترین‌ها
- `<section class="card table-card">`
  جدول آخرین لینک‌ها

#### `frontend/index.html`

- `<header class="site-header" id="siteHeader">`
  هدر
- `<section class="hero container">`
  بخش اول
- `<figure class="specimen reveal" aria-label="مقایسه‌ی لینک خام و لینک کوتاه">`
  قبل و بعد: همون کاری که سایت انجام می‌ده، بدون توضیح اضافه
- `<section class="container section-tight">`
  نمونه‌ی پنل
- `<section class="container section split" id="features">`
  امکانات
- `<section class="container section" id="how">`
  روند کار
- `<section class="container section split" id="faq">`
  سؤال‌های رایج
- `<section class="container section">`
  دعوت نهایی
- `<footer class="site-footer">`
  فوتر

#### `frontend/js/animations.js`

- `(function () {`
  animations.js — ظاهر شدن موقع اسکرول، شمارش عددها، کشیدن نمودارها  
  و واکنش‌های کوچیک. همه‌ی کدهای حرکتی جاوااسکریپت اینجاست.  
  این فایل داخل &lt;head&gt; لود می‌شه تا کلاس «js» قبل از نمایش صفحه  
  اضافه بشه (وگرنه محتوا یه لحظه دیده می‌شه و بعد مخفی می‌شه).
- `const html = document.documentElement;`
  ۱) علامت «جاوااسکریپت کار می‌کنه»
- `const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.2, 1)';`
  منحنی‌ها و مدت‌ها برای Web Animations API (هم‌خوان با توکن‌های CSS)
- `const RECIPES = [`
  ۲) دستورهای صحنه (Recipes): کدوم بخش‌ها چطوری ظاهر بشن.  
  group  = ظرفی که بچه‌هاش پله‌ای میان  
  items  = کدوم بچه‌ها (پیش‌فرض: همه‌ی بچه‌های مستقیم)  
  variant = up | fade | scale  
  به این شکل لازم نیست به HTML صفحه‌ها چیزی اضافه کنیم.
- `{ group: '.hero-copy', variant: 'up' },`
  لندینگ
- `{ group: '.auth-box', variant: 'up' },`
  ورود، ثبت‌نام، ۴۰۴
- `{ group: '.page', variant: 'up' },`
  پنل: بخش‌های اصلی صفحه، و فهرست‌های داخلشون
- `const LINE_HEADINGS = '.hero-title, .section-head h2, .split-head h2, .cta h2, .auth-box h1, .auth-aside h2…`
  تیترهایی که خط به خط از پشت لبه بالا میان
- کنار `const MAX_INDEX = 8;`
  آیتم‌های بعد از هشتمی دیگه تأخیر بیشتری نمی‌گیرن
- `function all(root, sel) {`
  مثل querySelectorAll، ولی اگه خود root هم با selector جور باشه، اونم برمی‌گردونه
- `let observer = null;`
  ۳) سیستم ظاهر شدن
- `function applyRecipes(root) {`
  دستورها رو روی صفحه پیاده کن: به بچه‌ها data-reveal بده (اگه از قبل نداشتن)
- `all(root, '.table tbody').forEach((tbody) => {`
  ردیف‌های جدول: فقط بار اول، حداکثر ۱۰ ردیف
- `if (!observer) reveal(el);`
  حتی با «حرکت کمتر» هم منتظر اسکرول می‌مونیم، چون CSS اون موقع فقط محو می‌کنه
- `function splitLines(root) {`
  ۴) تیترها: هر خط داخل یه «پوشش»
- `if (!h.closest(SELECTOR)) h.setAttribute('data-reveal', 'lines');`
  اگه هیچ والد ظاهرشونده‌ای نداره، خودش ماشه‌ی حرکت باشه
- `const FA = '۰۱۲۳۴۵۶۷۸۹';`
  ۵) شمارش عددها از صفر
- `function runCounter(el) {`
  el.__lpTarget = آخرین متنی که خود صفحه نوشته (عدد درست)  
  el.__lpShown  = عددی که الان روی صفحه دیده می‌شه (وسط شمارش)  
  el.__lpRun    = شماره‌ی اجرای فعلی؛ با شروع اجرای جدید، اجرای قبلی خودش متوقف می‌شه
- کنار `if (run !== el.__lpRun) return;`
  یه اجرای جدیدتر شروع شده
- کنار `const e = 1 - Math.pow(1 - t, 3);`
  آروم شدن در پایان
- کنار `write(finalText);`
  متن دقیق اصلی، بدون هیچ تفاوتی
- `function onCounterText(el) {`
  وقتی خود صفحه عدد رو عوض کرد (مثلاً بازه‌ی ۷ به ۳۰ روز)، از عدد فعلی تا عدد جدید بشمار
- کنار `if (el.textContent === el.__lpWritten) return;`
  این تغییر کار خودمون بود
- کنار `if (el.__lpSeen) runCounter(el);`
  اگه هنوز دیده نشده، IntersectionObserver شروعش می‌کنه
- `let chartObserver = null;`
  ۶) کشیدن نمودارها
- `function hideChart(el) {`
  قبل از دیده شدن، خط‌ها رو «نکشیده» نگه دار
- کنار `if (p.getAttribute('stroke-dasharray')) { p.style.opacity = '0'; return; }`
  خط‌چین ۴۰۴
- `const a = p.animate([{ strokeDashoffset: p.__lpLen }, { strokeDashoffset: 0 }], { duration: isSpark ? 600 :…`
  خط از نقطه‌ی اولش (قدیمی‌ترین روز = سمت راست) کشیده می‌شه
- `function prepareSegs(root) {`
  ۷) انتخاب بازه: نشانگر سُرخورنده
- `function shake(field) {`
  ۸) واکنش‌ها: لرزش خطا، تعویض آیکون
- کنار `void icon.offsetWidth;`
  شروع دوباره‌ی انیمیشن
- `function init() {`
  ۹) راه‌اندازی
- `counterObserver = new IntersectionObserver((entries) => entries.forEach((en) => {`
  عددها و نمودارها وقتی واقعاً دیده شدن شروع می‌شن (کمی دیرتر از ظاهر شدن کارت)
- `let pending = new Set();`
  صفحه‌های پنل محتوا رو بعداً با جاوااسکریپت می‌سازن؛ تغییرها رو دنبال کن
- `if (el.classList.contains('field') && el.classList.contains('has-error') && !(m.oldValue || '').includes('h…`
  فیلد خطا گرفت → لرزش
- `if (el.matches('.seg button') && el.classList.contains('is-active') && !(m.oldValue || '').includes('is-act…`
  گزینه‌ی فعال بازه عوض شد → سُر خوردن نشانگر
- `const counter = t.nodeType === 1 && t.matches(COUNTERS) ? t : (t.parentElement && t.parentElement.matches &…`
  متن عدد عوض شد
- `const icon = t.nodeType === 1 && t.classList && t.classList.contains('icon') ? t : (t.parentElement && t.pa…`
  متن آیکون عوض شد (مثلاً content_copy → check)

#### `frontend/js/api.js`

- `(function () {`
  api.js — ارتباط با بک‌اند (fetch) + نگه‌داری توکن ورود  
  همه‌ی صفحه‌ها فقط از LP.api و LP.session استفاده می‌کنن؛ هیچ صفحه‌ای مستقیم fetch نمی‌زنه.
- `const origin = cfg.apiBase || (window.location.protocol === 'file:' ? 'http://localhost:5000' : '');`
  اگه فایل با دوبار کلیک (file://) باز شده، آدرس لوکال پیش‌فرض رو می‌گیریم
- `LP.shortHost = (origin ? origin.replace(/^https?:\/\//, '') : window.location.host).replace(/\/+$/, '') || …`
  دامنه‌ای که توی پیشوند اسلاگ نشون می‌دیم (فقط ظاهریه؛ آدرس واقعی لینک رو سرور می‌ده)
- `class ApiError extends Error {`
  خطای API: پیام فارسی سرور + کد + خطای هر فیلد
- `const token = {`
  توکن
- `async function request(method, path, { query, body, auth = true, raw = false } = {}) {`
  درخواست
- کنار `try { json = await res.json(); } catch (e) {`
  بدنه‌ی خالی یا غیر JSON
- `if (res.status === 401 && auth && (err.code === 'TOKEN_INVALID' || err.code === 'UNAUTHORIZED')) kickToLogi…`
  توکن نامعتبر یا منقضی: کاربر رو به صفحه‌ی ورود می‌بریم
- `const session = (LP.session = { user: null });`
  نشست (Session): کاربر فعلی  
  داخل صفحه‌های پنل (data-shell="app") اگه توکن نباشه، همون اول می‌ره صفحه‌ی ورود.  
  LP.ready یه Promise ـه که وقتی کاربر از سرور خونده شد حل می‌شه؛ هر صفحه کارش رو بعد از اون شروع می‌کنه.
- کنار `try { await LP.api.post('/auth/logout', undefined, {}); } catch (e) {`
  مهم نیست؛ توکن رو هر حال پاک می‌کنیم
- کنار `LP.ready = new Promise(() => {});`
  هیچ‌وقت حل نمی‌شه؛ صفحه در حال رفتنه
- `if (e.status !== 401) showFatal(e.message);`
  خطای شبکه: به‌جای صفحه‌ی سفید، یه پیام می‌ذاریم

#### `frontend/js/background.js`

- `(function () {`
  background.js — پس‌زمینه‌ی زنده: خط‌های کم‌رنگ دفتر + موج «پالس»  
  روی هر بخشی که توی TARGETS اومده یه &lt;canvas&gt; پشت محتوا می‌سازه.  
  هر چند ثانیه یه موج به شکل لوگو از راست به چپ روی یکی از خط‌ها رد می‌شه؛  
  انگار یه کلیک ثبت شده.
- `const TARGETS = [`
  کجا پس‌زمینه داشته باشیم؟  broken = موج وسط راه قطع می‌شه (برای ۴۰۴)
- `const CONFIG = {`
  تنظیمات ظاهری (برای کم و زیاد کردن شدت، همین‌ها رو عوض کن)
- کنار `lineGap: 42,`
  فاصله‌ی خط‌ها (پیکسل)
- کنار `lineAlpha: 0.05,`
  پررنگی خط‌ها (۰ تا ۱)
- کنار `pulseAlpha: 0.55,`
  پررنگی موج
- کنار `pulseWidth: 96,`
  پهنای شکل موج
- کنار `pulseHeight: 15,`
  ارتفاع موج
- کنار `trail: 280,`
  طول دنباله‌ی پشت موج
- کنار `speed: 150,`
  سرعت (پیکسل در ثانیه)
- کنار `every: 2.2,`
  هر چند ثانیه یه موج جدید
- کنار `maxPulses: 3,`
  حداکثر موج هم‌زمان
- `const WAVE = [[0, 0], [0.21, 0], [0.36, -0.58], [0.6, 0.42], [0.76, -0.29], [0.83, 0], [1, 0]];`
  شکل موج = همون خط لوگو، به‌صورت نقطه‌های نرمال‌شده (x از ۰ تا ۱، y از -۱ تا ۱)
- `function rgb(name, fallback) {`
  رنگ‌ها از متغیرهای CSS
- `function resize() {`
  اندازه‌ی واقعی کانواس با توجه به وضوح صفحه (devicePixelRatio)
- `function fadeAt(x) {`
  قطع شدن موج برای ۴۰۴: وقتی از وسط صفحه رد شد، کم‌کم محو و صاف می‌شه
- کنار `const dt = Math.min(0.05, (now - (last || now)) / 1000);`
  حداکثر ۵۰ms، تا بعد از برگشت به تب پرش نکنه
- `function start() {`
  فقط وقتی کانواس توی صفحه‌ست و تب باز و فعاله، انیمیشن اجرا می‌شه
- `pulses = [];`
  «حرکت کمتر»: یه تصویر ثابت با یه موج وسط صفحه

#### `frontend/js/charts.js`

- `(function () {`
  charts.js — نمودارهای SVG بدون هیچ کتابخونه‌ی بیرونی  
  line:   نمودار خطی با tooltip  
  donut:  نمودار دایره‌ای  
  spark:  نمودار کوچیک داخل ردیف‌ها  
  نکته: چون سایت راست‌به‌چپه، قدیمی‌ترین نقطه سمت راست و  
  جدیدترین نقطه سمت چپ قرار می‌گیره.
- `const css = getComputedStyle(document.documentElement);`
  رنگ‌ها مستقیم از متغیرهای CSS (base.css) خونده می‌شن تا همیشه با ظاهر سایت یکی باشن
- `charts.series = [charts.colors.primary, charts.colors.secondary, charts.colors.outline, v('--paper-deep', '…`
  رنگ‌های سری برای نمودار دایره‌ای: تأکید، جوهر، و دو خاکستری گرم
- `function smoothPath(pts, minY, maxY) {`
  مسیر نرم (منحنی) از بین نقطه‌ها
- `function niceMax(v) {`
  بالاترین عدد «قشنگ» برای محور عمودی
- `charts.line = (mount, { labels, tips, values, unit = 'کلیک', color = charts.colors.primary, ariaLabel = 'نم…`
  نمودار خطی
- کنار `x: n === 1 ? W / 2 : W - PX - (i * innerW) / (n - 1),`
  ایندکس ۰ = قدیمی‌ترین = سمت راست
- `const tickCount = Math.min(n, 7);`
  برچسب‌های محور افقی (حداکثر ۷ تا)
- `const left = Math.min(88, Math.max(12, (p.x / W) * 100));`
  موقعیت tooltip بر حسب درصد، تا با تغییر اندازه‌ی نمودار هم درست بمونه
- `charts.donut = (mount, { items, centerValue, centerLabel, ariaLabel = 'نمودار دایره‌ای' }) => {`
  نمودار دایره‌ای
- `charts.spark = (values, color = charts.colors.secondary, w = 80, h = 22) => {`
  نمودار کوچیک (Sparkline)

#### `frontend/js/config.js`

- `window.LP_CONFIG = {`
  config.js — تنظیمات اتصال به بک‌اند  
  فرانت رو از خود سرور (مثلاً http://localhost:5000) باز کنی، هیچ تغییری لازم نیست.  
  اگه فرانت رو جدا میزبانی می‌کنی (مثلاً Netlify) یا با دوبار کلیک روی فایل HTML (file://) باز می‌کنی،  
  آدرس سرور API رو اینجا بنویس. بدون «/» آخر و بدون «/api»:  
  window.LP_CONFIG = { apiBase: 'https://api.example.com' };
- کنار `apiBase: '',`
  خالی = همین دامنه‌ای که صفحه از اون باز شده

#### `frontend/js/data.js`

- `(function () {`
  data.js — «مخزن داده»: تنها جایی که با API حرف می‌زنه  
  صفحه‌ها هیچ‌وقت آدرس API یا ساختار پاسخ سرور رو نمی‌دونن؛ فقط LP.data رو صدا می‌زنن.  
  اینجا پاسخ‌های سرور به چیزی تبدیل می‌شن که صفحه‌ها راحت نمایش بدن  
  (برچسب فارسی، تاریخ شمسی و ...).
- `data.STATUS_LABEL = { active: 'فعال', expired: 'منقضی‌شده', archived: 'آرشیو' };`
  برچسب‌های فارسی
- کنار `try { regionNames = new Intl.DisplayNames(['fa'], { type: 'region' }); } catch (e) {`
  مرورگر قدیمی
- `const DEFAULT_SETTINGS = { defaultExpiry: 'none', pageSize: 6, notifyMilestone: true, notifyExpiry: true, n…`
  کاربر، پروفایل و تنظیمات
- کنار `LP.session.start(res.data);`
  توکن تازه (توکن قبلی باطل شده)
- `data.status = (l) => l.status;`
  کمک‌های نمایشی لینک
- `data.list = async (query) => {`
  لینک‌ها  
  query: { q, status, sort, page, limit }  →  { links, summary, meta }
- `data.exportCsv = async (query) => {`
  دانلود CSV ساخته‌شده توسط سرور (با همون فیلترهای لیست)
- `const dayDate = (key) => new Date(key + 'T12:00:00');`
  آمار
- کنار `const dayDate = (key) => new Date(key + 'T12:00:00');`
  ظهر؛ تا اختلاف ساعت، روز رو عوض نکنه
- `function formatSeries(series) {`
  نقطه‌های سری زمانی سرور → برچسب فارسی برای نمودار
- `const notifText = (n) => {`
  اعلان‌ها  
  سرور اعلان‌ها رو از روی لینک‌ها می‌سازه؛ «خونده‌شده» بودن فقط توی همین مرورگر نگه‌داری می‌شه

#### `frontend/js/layout.js`

- `(function () {`
  layout.js — ساخت «قاب» صفحه‌های داخل پنل (منوی کناری + نوار بالا)  
  به‌جای اینکه توی ۵ فایل HTML یه منو رو کپی کنیم، یک‌بار اینجا  
  ساخته می‌شه. هر صفحه فقط باید این‌ها رو داشته باشه:  
  &lt;body data-shell="app" data-page="dashboard" data-title="داشبورد"&gt;  
  &lt;main id="main" class="page"&gt; ... &lt;/main&gt;
- `function toggleMenu(force) {`
  باز و بسته شدن منو در موبایل
- `function mount() {`
  سوار کردن همه‌چیز روی صفحه (بعد از آماده شدن کاربر)

#### `frontend/js/link-modal.js`

- `(function () {`
  link-modal.js — پنجره‌ی «ساخت لینک» و «ویرایش لینک»  
  هر جا لازمش داشتی: LP.linkModal.open()            ← ساخت  
  LP.linkModal.open({ link })    ← ویرایش  
  LP.linkModal.open({ url })     ← ساخت با آدرس از پیش پرشده  
  بعد از ذخیره، رویداد lp:links-changed ارسال می‌شه و صفحه‌ها  
  خودشون رو دوباره می‌کشن.
- `}`
  تکراری بودن slug رو خود سرور (با ایندکس یکتای دیتابیس) تشخیص می‌ده
- `const fields = { url, title: titleEl, slug, expiresAt: expiry };`
  خطای هر فیلد رو کنار همون فیلد نشون می‌دیم؛ بقیه‌ی خطاها به‌صورت پیام
- `function showSuccess(created) {`
  بعد از ساخت لینک: نمایش نتیجه به‌جای بستن ناگهانی پنجره

#### `frontend/js/pages/auth.js`

- `(function () {`
  auth.js — صفحه‌های ورود و ثبت‌نام  
  با سرور حرف می‌زنه: /auth/login و /auth/register
- `function showServerError(form, err, fields) {`
  خطای هر فیلد کنار همون فیلد؛ بقیه‌ی خطاها به‌صورت پیام
- `if (LP.session.isLoggedIn() && !LP.query('out') && !LP.query('expired')) {`
  اگه قبلاً وارد شده، مستقیم بره پنل (به‌جز بعد از خروج)
- `const loginForm = $('#loginForm');`
  ورود
- `const regForm = $('#registerForm');`
  ثبت‌نام

#### `frontend/js/pages/dashboard.js`

- `(function () {`
  dashboard.js — منطق صفحه‌ی داشبورد  
  داده‌ها از سرور میان: /analytics/overview و /links
- کنار `let overview = null;`
  آخرین پاسخ نمای کلی
- کنار `let recent = [];`
  لینک‌های جدول
- کنار `let loadSeq = 0;`
  برای نادیده گرفتن پاسخ‌های قدیمی (وقتی کاربر سریع فیلتر عوض می‌کنه)
- `function renderGreeting() {`
  سلام
- `function renderKpis() {`
  کارت‌های آمار
- `function renderChart() {`
  نمودار
- `function renderTop() {`
  پرکلیک‌ترین‌ها (بر اساس کل کلیک‌ها؛ نمودار کوچک: ۷ روز اخیر)
- `function recentRow(l) {`
  جدول آخرین لینک‌ها
- `async function fetchRecent() {`
  دریافت داده‌ها
- `$('#createBtn').addEventListener('click', () => LP.linkModal.open());`
  رویدادها
- `document.addEventListener('lp:links-changed', loadAll);`
  هر وقت لینکی ساخته/ویرایش/حذف شد، صفحه خودش رو دوباره می‌کشه
- `const pending = LP.store.get('pending-url', null);`
  اگه کاربر از صفحه‌ی اصلی با یه آدرس اومده، پنجره‌ی ساخت لینک با همون آدرس باز می‌شه

#### `frontend/js/pages/landing.js`

- `(function () {`
  landing.js — صفحه‌ی اصلی (لندینگ)  
  فرم کوتاه‌کننده: اگه وارد شده باشی لینک واقعی می‌سازه؛ وگرنه آدرس رو نگه می‌داره و می‌ره ثبت‌نام.
- `const form = $('#shortenForm');`
  فرم کوتاه‌کننده
- `if (!LP.session.isLoggedIn()) {`
  مهمان: آدرس رو نگه می‌داریم تا بعد از ثبت‌نام، پنجره‌ی ساخت لینک با همین آدرس باز بشه
- کنار `void resultBox.offsetWidth;`
  برای شروع دوباره‌ی انیمیشن
- `const demoValues = [212, 260, 241, 305, 288, 352, 330, 410, 372, 455, 421, 498, 470, 540];`
  نمودار نمونه
- `const toggle = $('#navToggle');`
  منوی موبایل
- `const header = $('#siteHeader');`
  سایه‌ی هدر هنگام اسکرول
- `const items = LP.$$('.reveal');`
  ظاهر شدن نرم بخش‌ها هنگام اسکرول

#### `frontend/js/pages/link-details.js`

- `(function () {`
  link-details.js — صفحه‌ی آمار و تحلیل یک لینک  
  آدرس: link-details.html?id=...   (اگه id نباشه، پرکلیک‌ترین لینک نشون داده می‌شه)
- کنار `let all = [];`
  لینک‌ها برای انتخاب‌گر بالای صفحه
- کنار `let stats = null;`
  آخرین پاسخ آمار
- `function renderLoading() {`
  حالت‌های خاص
- `async function renderPage() {`
  بدنه‌ی اصلی صفحه
- `const listRes = await LP.data.list({ sort: 'clicks', limit: 50 });`
  لینک انتخاب‌شده (یا پرکلیک‌ترین) + لیست برای انتخاب‌گر
- `async function changeRange(next) {`
  فقط بخش‌های وابسته به بازه (نمودار و تفکیک‌ها) دوباره ساخته می‌شن
- `const items = b.sources.map((s, i) => Object.assign({}, s, { color: SOURCE_COLORS[i % 4] }));`
  منبع بازدید
- `$('#deviceBars').innerHTML = b.devices.map((d) => {`
  دستگاه‌ها
- `` $('#countryList').innerHTML = b.countries.map((c) => ` ``
  کشورها
- `function wire() {`
  رویدادها
- `document.addEventListener('lp:links-changed', () => { if (link) renderPage(); });`
  بعد از ویرایش/آرشیو، صفحه دوباره ساخته می‌شه (اگه لینک حذف شده باشه صفحه‌ی «پیدا نشد» میاد)

#### `frontend/js/pages/my-links.js`

- `(function () {`
  my-links.js — صفحه‌ی «لینک‌های من»  
  جستجو، فیلتر وضعیت، مرتب‌سازی و صفحه‌بندی روی سرور انجام می‌شن  
  (سرور فقط همون چند لینک صفحه‌ی فعلی رو می‌فرسته). انتخاب گروهی، ویرایش،  
  آرشیو، حذف و خروجی CSV هم از همین‌جا.
- `async function load({ keepRows = false } = {}) {`
  دریافت از سرور
- `if (state.page > res.meta.pages) { state.page = res.meta.pages; return load({ keepRows: true }); }`
  اگه صفحه‌ی فعلی از آخرین صفحه بیشتره (مثلاً بعد از حذف)، می‌ریم آخرین صفحه
- `function renderStrip() {`
  کارت‌های خلاصه
- `function rowHtml(l) {`
  ردیف جدول
- `function render() {`
  رندر جدول و صفحه‌بندی
- `function filtersChanged() {`
  بعد از هر تغییر فیلتر، صفحه به اول برمی‌گرده و انتخاب‌ها پاک می‌شن
- `async function confirmDelete(ids) {`
  حذف (یکی یا گروهی)
- `async function exportCsv() {`
  خروجی CSV (سرور با همون فیلترها می‌سازه)
- `const statusDd = LP.ui.dropdown($('#statusDd'), { options: STATUSES, value: 'all', icon: 'filter_alt', aria…`
  رویدادها
- `render();`
  شروع
- کنار `render();`
  اول اسکلت بارگذاری

#### `frontend/js/pages/profile.js`

- `(function () {`
  profile.js — صفحه‌ی پروفایل
- `function renderCard() {`
  کارت کناری
- `function renderActivity() {`
  فعالیت اخیر (از روی لینک‌های ساخته‌شده)
- کنار `} catch (err) {`
  کارت با صفرها نشون داده می‌شه؛ خطای اصلی صفحه نیست
- `function fillForm() {`
  فرم

#### `frontend/js/pages/settings.js`

- `(function () {`
  settings.js — صفحه‌ی تنظیمات
- `const FIELDS = [`
  ترجیح‌ها و اعلان‌ها (ذخیره‌ی خودکار روی سرور)
- کنار `fillSettings();`
  برگردوندن به مقدار قبلی
- `const form = $('#passForm');`
  تغییر رمز (فقط اعتبارسنجی؛ هیچ رمزی ذخیره نمی‌شه)
- `$('#deleteLinks').addEventListener('click', async () => {`
  بخش خطرناک
- `$('#deleteAccount').addEventListener('click', () => {`
  حذف حساب: هم رمز عبور لازمه (امنیت)، هم نوشتن کلمه‌ی «حذف» (جلوگیری از کلیک اشتباهی)

#### `frontend/js/ui.js`

- `(function () {`
  ui.js — اجزای رابط کاربری مشترک  
  پیام (toast)، پنجره (modal)، تأیید (confirm)، منوی کشویی،  
  خطای فرم، صفحه‌بندی و حالت‌های خالی/خطا/بارگذاری
- `ui.toast = (message, type = 'success', ms = 3200) => {`
  پیام کوتاه (Toast)
- `let modalSeq = 0;`
  پنجره (Modal)
- کنار `if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) {`
  مهم نیست
- کنار `if (all[all.length - 1] !== backdrop) return;`
  فقط بالاترین پنجره
- `ui.confirm = ({ title, message, messageHtml, confirmText = 'باشه', cancelText = 'انصراف', danger = false, i…`
  پنجره‌ی تأیید  
  خروجی یه Promise هست: true اگه کاربر تأیید کرد، وگرنه false
- `ui.dropdown = (mount, { options, value, icon, onChange, ariaLabel } = {}) => {`
  منوی کشویی (Dropdown)
- `ui.popover = (trigger, panel) => {`
  منوی ساده برای هر دکمه (مثل اعلان‌ها): فقط باز و بسته می‌کنه
- `ui.busy = (btn, on, label) => {`
  دکمه در حالت «در حال انجام»
- `ui.setError = (input, msg) => {`
  خطای فرم
- `ui.liveClear = (form) => {`
  وقتی کاربر تایپ می‌کنه، خطای همون فیلد پاک می‌شه
- `ui.focusFirstError = (form) => {`
  اولین فیلد خطادار رو فوکوس می‌کنه
- `ui.emptyState = ({ icon = 'link_off', title, text, action = '' }) =>`
  حالت‌های خالی، خطا و بارگذاری
- `ui.pager = (mount, { page, pages, total, pageSize, noun = 'مورد', onChange }) => {`
  صفحه‌بندی
- `ui.wirePasswordToggles = (root = document) => {`
  نمایش/مخفی کردن رمز عبور
- `` ui.statusBadge = (status) => `<span class="badge badge-${status}">${esc(LP.data.STATUS_LABEL[status])}</spa… ``
  نمایش وضعیت لینک به‌صورت نشان
- `ui.delta = (v) => {`
  نمایش درصد تغییر (مثلاً +۱۸٫۴٪)

#### `frontend/js/utils.js`

- `(function () {`
  utils.js — ابزارهای کوچک و مشترک  
  همه‌چیز زیر یک «فضای نام» (namespace) به اسم LP قرار می‌گیره  
  تا با بقیه‌ی کدها قاطی نشه.
- `LP.$ = (sel, root = document) => root.querySelector(sel);`
  انتخاب عنصر
- `const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };`
  امن‌سازی متن قبل از innerHTML (جلوگیری از XSS)
- `const memory = {};`
  ذخیره‌سازی (localStorage با پشتیبان در حافظه)
- کنار `try { localStorage.removeItem('lp:' + key); } catch (e) {`
  مهم نیست
- `const nf = new Intl.NumberFormat('fa-IR');`
  عدد و تاریخ فارسی
- `LP.normalizeUrl = (raw) => {`
  آدرس و اسلاگ  
  آدرس رو تمیز می‌کنه. فقط http و https قبول می‌شه. اگه معتبر نبود null برمی‌گردونه.
- `LP.copy = async (text) => {`
  کلیپ‌بورد، دانلود، CSV
- کنار `try { ok = document.execCommand('copy'); } catch (_) {`
  مهم نیست
- `const csvCell = (c) => {`
  اگه سلولی با = + - @ شروع بشه، اکسل ممکنه فرمولش کنه؛ جلوش یه ' می‌ذاریم.
- `LP.debounce = (fn, ms = 200) => {`
  کمکی‌های عمومی
- `LP.go = (url) => { window.location.href = url; };`
  رفتن به یه صفحه
- `LP.toEnDigits = (s) =>`
  تبدیل رقم‌های فارسی/عربی به انگلیسی (برای خوندن ورودی کاربر)
- `LP.initial = (name) => (String(name || '').trim()[0] || '؟');`
  حرف اول اسم برای آواتار
- `LP.greeting = () => {`
  سلام بر اساس ساعت

#### `frontend/link-details.html`

- `<main id="main" class="page" aria-live="polite"></main>`
  محتوای این صفحه توسط js/pages/link-details.js ساخته می‌شه

#### `frontend/my-links.html`

- `<section class="kpis kpis-4" id="strip" aria-label="خلاصه‌ی لینک‌ها"></section>`
  خلاصه‌ی آمار
- `<section class="card toolbar-card" aria-label="جستجو و فیلتر">`
  نوار جستجو و فیلتر
- `<section class="card table-card">`
  جدول

#### `frontend/profile.html`

- `<aside class="card profile-card">`
  کارت خلاصه‌ی پروفایل
- `<section class="card">`
  فرم ویرایش  
  فعالیت اخیر

#### `frontend/settings.html`

- `<section class="card" id="sec-prefs">`
  ترجیح‌ها
- `<section class="card" id="sec-notify">`
  اعلان‌ها
- `<section class="card" id="sec-password">`
  رمز عبور
- `<section class="card danger-zone" id="sec-data">`
  داده‌ها و حساب

