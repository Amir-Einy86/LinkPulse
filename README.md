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
