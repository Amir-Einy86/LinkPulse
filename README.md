# لینک‌پالس (LinkPulse)

کوتاه‌کننده‌ی لینک با آمار کلیک. لینک بلندت رو کوتاه کن و ببین چند نفر، از کجا و با چه دستگاهی بازش کردن.

> A URL shortener with click analytics. Vanilla HTML/CSS/JS frontend (RTL, Persian) + Node.js, Express, MongoDB and Mongoose backend.

## امکانات
- ساخت لینک کوتاه با اسلاگ دلخواه، تاریخ انقضا و آرشیو
- آمار هر لینک: کلیک در گذر زمان، منبع، دستگاه، مرورگر، کشور
- مدیریت لینک‌ها: جستجو، فیلتر، مرتب‌سازی، حذف گروهی، خروجی CSV
- ثبت‌نام و ورود با JWT، پروفایل و تنظیمات
- طراحی راست‌به‌چپ با فونت‌های داخل پروژه (بدون وابستگی به Google Fonts)
- انیمیشن‌های اسکرول و پس‌زمینه‌ی زنده، با رعایت تنظیم «حرکت کمتر» سیستم‌عامل
- مستندات API با Swagger و ۸۶ تست خودکار

## تکنولوژی‌ها
| بخش | ابزار |
|---|---|
| فرانت‌اند | HTML، CSS، JavaScript (ES6)؛ بدون فریم‌ورک |
| بک‌اند | Node.js (۱۸ به بالا)، Express، MongoDB، Mongoose |
| امنیت و اعتبارسنجی | helmet، cors، express-rate-limit، zod، bcryptjs، jsonwebtoken |
| تست | jest، supertest، mongodb-memory-server |

## اجرا
پیش‌نیاز: Node.js نسخه‌ی ۱۸ به بالا و MongoDB (لوکال یا Atlas).

```bash
cd backend
npm install
cp .env.example .env        # ویندوز (PowerShell): Copy-Item .env.example .env
npm run dev                 # http://localhost:5000
```

توی فایل `.env` حتماً `JWT_SECRET` رو پر کن (حداقل ۳۲ کاراکتر تصادفی):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

- مستندات API: `http://localhost:5000/docs`
- داده‌ی آزمایشی: `npm run seed`

## تست‌ها
```bash
cd backend
npm test
```
تست‌ها خودشون یه MongoDB موقت بالا میارن. بار اول، فایل MongoDB رو از اینترنت دانلود می‌کنن؛ اگه دانلود انجام نشد (مثلاً به‌خاطر فیلترینگ)، به MongoDB نصب‌شده روی سیستم اشاره کن:
```powershell
$env:MONGOMS_SYSTEM_BINARY = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
npm test
```

## ساختار پروژه
```
backend/    سرور Express، مدل‌ها، کنترلرها، تست‌ها
frontend/   ۹ صفحه‌ی HTML، استایل‌ها، اسکریپت‌ها و فونت‌ها (سرور خودش این پوشه رو سرو می‌کنه)
```
توضیح کامل همه‌ی فایل‌ها: [explain.md](explain.md) — توضیح انیمیشن‌ها: [ANIMATIONS-EXPLAIN.md](ANIMATIONS-EXPLAIN.md)

## استقرار (Deploy)
1. `BASE_URL` رو آدرس عمومی سایت بذار (لینک‌های کوتاه از روی اون ساخته می‌شن).
2. `NODE_ENV=production`، یه `JWT_SECRET` تصادفی (حداقل ۳۲ کاراکتر)، و `MONGODB_URI` (مثلاً Atlas).
3. پشت پروکسی یا میزبان ابری، `TRUST_PROXY=1` بذار.
4. اگه فرانت جدا هاست می‌شه: `apiBase` توی `frontend/js/config.js` و `CORS_ORIGINS` رو تنظیم کن.
5. کشور بازدیدکننده فقط وقتی ثبت می‌شه که CDN هدر کشور بفرسته (مثل Cloudflare).
6. با Docker، از ریشه‌ی پروژه: `docker build -f backend/Dockerfile -t linkpulse .`
