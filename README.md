# لینک‌پالس (LinkPulse)

کوتاه‌کننده‌ی لینک با آمار کلیک. تکنولوژی: HTML/CSS/JS (فرانت) + Node.js، Express، MongoDB و Mongoose (بک‌اند).

## اجرا
```bash
cd backend
npm install
cp .env.example .env        # JWT_SECRET و MONGODB_URI را پر کن
npm run dev                 # http://localhost:5000
```
- مستندات API: `http://localhost:5000/docs`
- داده‌ی آزمایشی: `npm run seed`
- تست‌ها: `npm test` (خودش یک MongoDB موقت بالا می‌آورد)

## استقرار (Deploy)
1. `BASE_URL` را آدرس عمومی سایت بگذار (لینک‌های کوتاه از روی آن ساخته می‌شوند).
2. `NODE_ENV=production`، `JWT_SECRET` تصادفی ≥۳۲ کاراکتر، `MONGODB_URI` (مثلاً Atlas).
3. پشت پروکسی/میزبان ابری `TRUST_PROXY=1` بگذار.
4. اگر فرانت جدا هاست می‌شود: `apiBase` در `frontend/js/config.js` و `CORS_ORIGINS` را تنظیم کن.
5. کشور بازدیدکننده فقط وقتی ثبت می‌شود که CDN هدر کشور بفرستد (مثل Cloudflare).
6. با Docker: `docker build -f backend/Dockerfile -t linkpulse .` از ریشه‌ی پروژه.
