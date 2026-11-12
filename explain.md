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
├── explain.md                 همین فایل
├── .gitignore / .dockerignore
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
    ├── css/                   base, components, app, site
    ├── js/                    config, utils, api, data, ui, charts, layout, link-modal
    ├── js/pages/              یک فایل برای هر صفحه
    └── assets/logo.svg
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
