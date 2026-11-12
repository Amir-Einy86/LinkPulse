# ===== کپی کن به .env و مقدارها رو عوض کن (فایل .env رو هیچ‌وقت توی گیت نذار) =====

# محیط اجرا: development | production | test
NODE_ENV=development
PORT=5000

# آدرس MongoDB. لوکال: mongodb://127.0.0.1:27017/linkpulse
# اتلس (Atlas): mongodb+srv://USER:PASSWORD@cluster.mongodb.net/linkpulse
MONGODB_URI=mongodb://127.0.0.1:27017/linkpulse

# کلید امضای توکن. حداقل ۳۲ کاراکتر تصادفی. تولیدش:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=
JWT_EXPIRES_IN=7d

# آدرس عمومی همین سرور؛ لینک کوتاه از روی اون ساخته می‌شه (بدون / آخر)
BASE_URL=http://localhost:5000

# آدرس‌هایی که اجازه دارن از مرورگر به API درخواست بدن (با ویرگول جدا کن).
# اگه فرانت رو از خود سرور بالا میاری (پیش‌فرض)، لازم نیست چیزی اضافه کنی.
CORS_ORIGINS=http://localhost:5000,http://127.0.0.1:5000

# اگه پشت پروکسی/میزبان ابری هستی (Render, Railway, Nginx, ...) عدد ۱ بذار تا IP واقعی کاربر خونده بشه
TRUST_PROXY=0

# نگه‌داری آمار کلیک‌ها (روز). بعد از این مدت خودکار پاک می‌شن
CLICK_RETENTION_DAYS=365

# پوشه‌ی فرانت‌اند که سرور ازش سرو می‌کنه (خالی = پوشه‌ی ../frontend)
FRONTEND_DIR=
