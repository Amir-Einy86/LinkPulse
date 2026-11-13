# توضیح انیمیشن‌های لینک‌پالس

این فایل توضیح می‌ده انیمیشن‌های سایت چطوری کار می‌کنن، تا اگه جایی خراب شد یا خواستی عوضش کنی، خودت بتونی.

مفهوم کلی اسمش **«جوهر و پالس»** هست:
- **جوهر:** خط‌ها کشیده می‌شن، تیترها از پشت یه لبه بالا میان، عددها می‌شمارن. حرکت‌ها سریع و دقیقن، مثل نوشتن با قلم.
- **پالس:** یه موج به شکل لوگو، آروم توی پس‌زمینه رد می‌شه؛ انگار یه کلیک ثبت شده.

> همه‌ی کدهای انیمیشن روی برنچ (branch، یعنی شاخه) `feature/animations` هستن. نسخه‌ی بدون انیمیشن روی `main` مونده. برای برگشتن: `git checkout main`

---

## فهرست

1. [کدوم فایل‌ها اضافه یا عوض شدن؟](#۱-کدوم-فایلها-اضافه-یا-عوض-شدن)
2. [css/animations.css](#۲-cssanimationscss)
3. [js/animations.js](#۳-jsanimationsjs)
4. [js/background.js](#۴-jsbackgroundjs)
5. [تغییر سرعت و شدت](#۵-تغییر-سرعت-و-شدت)
6. [خاموش کردن هر انیمیشن](#۶-خاموش-کردن-هر-انیمیشن)
7. [عیب‌یابی (Debug)](#۷-عیبیابی-debug)

---

## ۱) کدوم فایل‌ها اضافه یا عوض شدن؟

### فایل‌های جدید

| فایل | کارش |
|---|---|
| `frontend/css/animations.css` | توکن‌های حرکت، سیستم ظاهر شدن، همه‌ی انیمیشن‌های CSS و کی‌فریم‌ها (keyframe، یعنی انیمیشن تعریف‌شده در CSS) |
| `frontend/js/animations.js` | تشخیص ورود عنصرها به صفحه، شمارش عددها، کشیدن نمودارها، لرزش خطا، نشانگر انتخاب بازه |
| `frontend/js/background.js` | پس‌زمینه‌ی زنده با `<canvas>` (بوم نقاشی جاوااسکریپت) |

### فایل‌هایی که فقط چیزی بهشون **اضافه** شد

**هر ۹ صفحه‌ی HTML**، این دو خط قبل از `</head>`:
```html
<link rel="stylesheet" href="css/animations.css">
<script src="js/animations.js"></script>
```
- خط اول فایل CSS انیمیشن‌ها رو لود می‌کنه.
- خط دوم فایل JS رو **داخل `<head>`** لود می‌کنه، نه آخر صفحه. دلیلش: این فایل باید کلاس `js` رو **قبل از اینکه صفحه نمایش داده بشه** به `<html>` اضافه کنه. اگه آخر صفحه بود، محتوا یه لحظه دیده می‌شد، بعد مخفی می‌شد و دوباره ظاهر می‌شد (پرش).
- چرا اسکریپت یه‌خطی داخل HTML نذاشتیم؟ سرورت (توی `backend/src/app.js`) با تنظیم امنیتی `script-src 'self'` اسکریپت‌های درون‌خطی (inline) رو مسدود می‌کنه. این تنظیم خوبیه و بهش دست نزدیم.

**۴ صفحه‌ی عمومی** (`index.html`، `login.html`، `register.html`، `404.html`)، این خط قبل از `</body>`:
```html
<script src="js/background.js"></script>
```
پس‌زمینه‌ی زنده فقط توی این صفحه‌هاست. توی پنل نیست، چون صفحه‌ی پر از عدد نباید پس‌زمینه‌ی متحرک داشته باشه.

**`index.html`**: ویژگی `data-stagger` به دو تا فهرست اضافه شد:
```html
<ol class="feature-list" data-stagger>
<ol class="steps" data-stagger>
```
یعنی «بچه‌های این فهرست پشت سر هم ظاهر بشن، نه همه با هم».

**به بک‌اند، کلاس‌ها، idها، متن‌ها و رنگ‌ها دست نخورده.** فایل‌های JS صفحه‌ها (`dashboard.js` و بقیه) هم عوض نشدن. همه‌ی اتصال‌ها از بیرون انجام می‌شن.

---

## ۲) `css/animations.css`

فایل ۸ بخش داره. بخش به بخش:

### بخش ۱: توکن‌های حرکت

```css
:root {
  --dur-fast: 160ms;
  --dur-base: 320ms;
  --dur-slow: 640ms;
```
- `:root` یعنی تگ `<html>`. متغیرهایی که اینجا تعریف بشن، همه‌جای سایت در دسترسن.
- `--dur-fast` (۱۶۰ میلی‌ثانیه): بازخوردهای فوری مثل هاور (hover، رفتن موس روی چیزی)، کلیک، فوکوس.
- `--dur-base` (۳۲۰): باز و بسته شدن مودال (modal، پنجره‌ی وسط صفحه)، منو، توست (toast، پیام کوچیک پایین صفحه).
- `--dur-slow` (۶۴۰): ظاهر شدن بخش‌ها و کشیده شدن خط‌ها.

```css
  --ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
```
اینها منحنی‌های سرعت (easing) هستن، یعنی حرکت چطوری شتاب بگیره:
- `--ease-out`: سریع شروع می‌شه و آروم می‌ایسته. برای ورود چیزها.
- `--ease-in-out`: آروم شروع، سریع وسط، آروم پایان. مثل حرکت قلم. برای کشیدن خط‌ها.
- `--ease-spring`: عدد `1.4` بزرگ‌تر از ۱ هست، پس حرکت کمی **از مقصد رد می‌شه و برمی‌گرده**، مثل فنر. فقط برای بازخوردهای کوچیک مثل تیک کپی و سوییچ.

```css
  --stagger: 60ms;
  --reveal-distance: 14px;
}
```
- `--stagger`: فاصله‌ی زمانی بین آیتم‌های یه فهرست پله‌ای.
- `--reveal-distance`: موقع ظاهر شدن، عنصر چند پیکسل پایین‌تر شروع کنه.

```css
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 450ms; --stagger: 40ms; --reveal-distance: 0px; }
  html.js .reveal, html.js [data-reveal] { transition-property: opacity !important; transition-duration: var(--dur-slow) !important; ... }
  html.js .reveal:not(.is-in), html.js [data-reveal]:not(.is-in) { transform: none !important; }
  html.js .reveal:not(.is-in):not(.line-host):not(.faq):not(.cta) { opacity: 0; }
  html.js .line-host .line-inner, html.js .kicker::before, ... { transform: none !important; transition: none !important; animation: none !important; }
}
```
- `prefers-reduced-motion` یعنی کاربر «حرکت کمتر» رو خواسته. **مهم:** وقتی توی ویندوز انیمیشن‌ها خاموش باشن (تنظیم «Adjust for best performance»)، مرورگر هم خودکار همین حالت رو اعلام می‌کنه. روی سیستم خودت همین‌طوره.
- توی این حالت **هیچ چیزی جابه‌جا نمی‌شه** (`--reveal-distance: 0px` و `transform: none`)، ولی بخش‌ها موقع اسکرول با ۴۵۰ میلی‌ثانیه **محو ظاهر می‌شن**. محو شدن حرکت نیست و سرگیجه نمی‌آره.
- `base.css` توی این حالت همه‌ی `transition`ها رو صفر می‌کنه؛ خط دوم با `!important` و دقیق‌تر بودن (specificity) فقط محو شدن رو برمی‌گردونه.
- `site.css` توی این حالت `.reveal` رو همیشه نمایش می‌ده؛ خط چهارم قبل از دیده شدن مخفیش می‌کنه تا محو بشه.
- خط‌هایی که کشیده می‌شن و تیترهای خط به خط، از اول سر جاشون هستن.
- عددها نمی‌شمارن، نمودارها کشیده نمی‌شن و پس‌زمینه ثابته.

### بخش ۲: ایمنی

```css
html:not(.js) .reveal,
html:not(.js) [data-reveal] { opacity: 1 !important; transform: none !important; }
```
- `html:not(.js)` یعنی «وقتی `<html>` کلاس `js` **نداره**»، یعنی جاوااسکریپت اجرا نشده.
- اون موقع همه‌ی عنصرهای ظاهرشونده کاملاً دیده می‌شن (`opacity: 1`) و جابه‌جا هم نیستن (`transform: none`).
- `!important` یعنی «این قانون از همه قوی‌تره». لازمه، چون `site.css` قبلاً `.reveal` رو همیشه مخفی می‌کرد.

### بخش ۳: سیستم ظاهر شدن

```css
html.js [data-reveal] {
  transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out);
  transition-delay: calc(var(--i, 0) * var(--stagger));
}
```
- هر عنصری که ویژگی `data-reveal` داره، تغییر شفافیت (`opacity`) و جابه‌جایی‌اش (`transform`) نرم انجام می‌شه.
- `transition-delay`: تأخیر شروع. `--i` شماره‌ی عنصر توی گروهه (۰، ۱، ۲…) که `animations.js` می‌ذاره. `var(--i, 0)` یعنی «اگه `--i` نبود، صفر». پس عنصر سوم `2 × 60 = 120ms` دیرتر شروع می‌کنه.

```css
html.js [data-reveal]:not(.is-in) { opacity: 0; }
```
تا وقتی کلاس `is-in` رو نگرفته (یعنی هنوز وارد صفحه نشده)، نامرئیه.

```css
html.js [data-reveal='up']:not(.is-in) { transform: translateY(var(--reveal-distance)); }
html.js [data-reveal='fade']:not(.is-in) { transform: none; }
html.js [data-reveal='scale']:not(.is-in) { transform: scale(0.97); }
html.js [data-reveal='lines']:not(.is-in) { opacity: 1; transform: none; }
```
چهار نوع ظاهر شدن:
- `up`: ۱۴ پیکسل پایین‌تر شروع می‌کنه و بالا میاد (پیش‌فرض).
- `fade`: فقط محو.
- `scale`: کمی کوچیک‌تر شروع می‌کنه.
- `lines`: خود عنصر مخفی نمی‌شه؛ فقط خط‌های داخلش حرکت می‌کنن (برای تیترها، بخش ۵).

```css
html.js .reveal { transition-duration: var(--dur-slow); ... transition-delay: calc(var(--i, 0) * var(--stagger)); }
html.js .reveal:not(.is-in) { transform: translateY(var(--reveal-distance)); }
```
کلاس قدیمی `.reveal` که توی لندینگ بود حذف نشده؛ فقط به همین توکن‌ها و تأخیر پله‌ای وصل شده.

### بخش ۴: پس‌زمینه‌ی زنده

```css
.lp-bg-host { position: relative; isolation: isolate; }
```
- `background.js` به بخشی که پس‌زمینه می‌گیره کلاس `lp-bg-host` می‌ده.
- `position: relative`: کانواس که `absolute` هست، نسبت به همین بخش جای‌گذاری بشه.
- `isolation: isolate`: یه «لایه‌ی جدا» می‌سازه تا `z-index: -1` کانواس فقط پشت محتوای همین بخش بره، نه پشت کل صفحه.

```css
.lp-bg {
  position: absolute; inset: 0; z-index: -1;
  width: 100%; height: 100%;
  pointer-events: none;
```
- `inset: 0`: کل بخش رو می‌پوشونه.
- `z-index: -1`: پشت متن‌ها.
- `pointer-events: none`: **مهم.** کلیک‌ها از کانواس رد می‌شن و به دکمه‌ها می‌رسن.

```css
  mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 72%, transparent);
```
ماسک (mask، یعنی پوشش شفافیت): بالا و پایین کانواس محو می‌شه تا لبه‌اش دیده نشه. جاهایی که ماسک `#000` (سیاه) هست کاملاً دیده می‌شه و جاهایی که `transparent` هست نامرئیه.

```css
  opacity: 0;
  animation: lp-fade var(--dur-slow) var(--ease-out) 200ms forwards;
}
```
پس‌زمینه با ۲۰۰ میلی‌ثانیه تأخیر نرم ظاهر می‌شه. `forwards` یعنی بعد از تموم شدن انیمیشن، روی حالت آخر (دیده‌شده) بمونه.

```css
.hero > .lp-bg { left: 50%; right: auto; width: 100vw; transform: translateX(-50%); }
```
هیرو داخل `.container` هست که حداکثر عرضش محدوده. این خط کانواس رو هم‌عرض کل صفحه (`100vw`) می‌کنه و وسطش می‌ذاره (`left: 50%` + `translateX(-50%)`).
> نکته‌ی باگ: اول با `inset-inline` امتحان کردم و کار نکرد، چون `<canvas>` یه «عنصر جایگزین‌شونده» (replaced element) هست و با دو لبه‌ی چپ و راست کش نمیاد. برای همین `width` رو صریح دادم.

### بخش ۵: ورود صفحه

```css
html.js .site-header { animation: lp-fade var(--dur-base) var(--ease-out) both; }
```
هدر سایت موقع لود محو وارد می‌شه. `both` یعنی قبل از شروع روی حالت اول (نامرئی) و بعدش روی حالت آخر بمونه.

```css
.hero-copy { --stagger: 110ms; }
```
توی هیرو آیتم‌ها با فاصله‌ی بیشتر (۱۱۰ به‌جای ۶۰) پشت سر هم میان، چون تیتر بزرگه و چشم وقت لازم داره.

```css
html.js .kicker::before { transform: scaleX(0); transform-origin: right; transition: transform var(--dur-slow) var(--ease-in-out) 120ms; }
html.js .kicker.is-in::before, html.js .is-in .kicker::before { transform: none; }
```
- `.kicker::before` همون خط کوچیک کنار برچسب‌هاست (مثل «—— امکانات»).
- `scaleX(0)` یعنی عرضش صفر شده (با `transform`، نه با `width`، که سریع‌تره).
- `transform-origin: right`: از سمت **راست** باز می‌شه، چون سایت راست‌به‌چپه.
- وقتی خودش یا والدش `is-in` گرفت، به اندازه‌ی کامل برمی‌گرده؛ یعنی «کشیده می‌شه».

```css
html.js .eyebrow::before { transform-origin: right; animation: lp-draw ... 150ms both; }
```
همین کار برای برچسب صفحه‌های پنل، که موقع لود (نه اسکرول) انجام می‌شه.

**تیترهای خط به خط:**
```css
.line-mask { display: block; overflow: hidden; padding-block: 0.12em; margin-block: -0.12em; }
```
- `animations.js` هر خط تیتر رو داخل `<span class="line-mask"><span class="line-inner">` می‌ذاره.
- `.line-mask` پوششه: `overflow: hidden` یعنی هر چیزی بیرونش باشه دیده نمی‌شه.
- `padding-block` و `margin-block` منفی: پوشش کمی بلندتر می‌شه تا نقطه‌ها و دنباله‌ی حروف فارسی بریده نشن، ولی جای کلی تیتر عوض نشه.

```css
html.js .line-host .line-inner {
  transform: translateY(110%);
  transition: transform var(--dur-slow) var(--ease-out);
  transition-delay: calc(var(--line, 0) * 90ms + 60ms);
}
html.js .line-host.is-in .line-inner, html.js .is-in .line-host .line-inner { transform: none; }
```
- متن هر خط ۱۱۰٪ پایین‌تر از پوشش شروع می‌کنه (یعنی کاملاً زیرش و نامرئی).
- `--line` شماره‌ی خطه، پس هر خط ۹۰ میلی‌ثانیه دیرتر از خط قبلی بالا میاد.
- وقتی تیتر یا والدش `is-in` گرفت، متن به جای اصلیش برمی‌گرده.

```css
html.js .line-host.reveal:not(.is-in), html.js .line-host[data-reveal]:not(.is-in) { opacity: 1; transform: none; }
```
اگه تیتر خودش `.reveal` باشه (مثل تیتر هیرو)، نباید خودش محو بشه، چون خط‌هاش دارن حرکت می‌کنن. وگرنه دو انیمیشن روی هم می‌افتادن.

**کارت «قبل و بعد» (برگه‌ای که روی میز گذاشته می‌شه):**
```css
html.js .specimen.reveal {
  transition: opacity var(--dur-slow) var(--ease-out) 420ms, transform 900ms cubic-bezier(0.3, 1.25, 0.5, 1) 420ms;
}
html.js .specimen.reveal:not(.is-in) { transform: translateY(-22px) rotate(0deg) scale(1.02); }
```
- با ۴۲۰ میلی‌ثانیه تأخیر (بعد از تیتر) شروع می‌شه.
- اول ۲۲ پیکسل **بالاتر**، صاف (بدون کجی) و کمی بزرگ‌تره؛ بعد پایین میاد و به کجی `-1.2deg` (که توی `site.css` تعریف شده) می‌رسه.
- منحنی `1.25` باعث می‌شه کمی از جاش رد بشه و برگرده، مثل برگه‌ای که روی میز می‌افته.

```css
html.js .specimen:not(.is-in) .is-before { opacity: 0; }
html.js .specimen:not(.is-in) .specimen-arrow { opacity: 0; transform: translateY(-8px); }
html.js .specimen:not(.is-in) .is-after { opacity: 0; transform: scale(0.94); }
html.js .specimen.is-in .is-before { transition-delay: 700ms; }
html.js .specimen.is-in .specimen-arrow { transition-delay: 900ms; }
html.js .specimen.is-in .is-after { transition: ... 1050ms, transform ... var(--ease-spring) 1050ms; }
```
داخل کارت، به ترتیب: آدرس طولانی (۷۰۰ms)، فلش که پایین میاد (۹۰۰ms)، و لینک کوتاه که با فنر مثل مُهر ظاهر می‌شه (۱۰۵۰ms). این ترتیب کار سایت رو تعریف می‌کنه: «اینو دادی، اینو گرفتی».

```css
html.js .auth-mini[data-reveal] { ... }
html.js .auth-mini[data-reveal]:not(.is-in) { transform: translateY(-18px) rotate(0deg); }
```
همین «گذاشتن برگه» برای کارت نمونه‌ی صفحه‌ی ورود و ثبت‌نام.

```css
html.js .mock.reveal:not(.is-in) { transform: translateY(28px) scale(0.985); }
.bar-fill { transform-origin: right; }
.donut svg { transform-origin: center; }
```
- نمونه‌ی پنل لندینگ کمی بیشتر بالا میاد و کمی بزرگ می‌شه.
- نوارهای پیشرفت از راست پر می‌شن (RTL).
- نمودار دایره‌ای حول مرکزش می‌چرخه.

### بخش ۶: انیمیشن‌های اسکرول

**فهرست امکانات، خط زیر هر آیتم:**
```css
.feature-list { --stagger: 90ms; }
html.js .feature { position: relative; border-bottom-color: transparent; }
html.js .feature::after {
  content: ''; position: absolute; inset-inline: 0; bottom: -1px; height: 1px; background: var(--line);
  transform: scaleX(0); transform-origin: right; ...
}
html.js .feature.is-in::after { transform: none; }
```
- حاشیه‌ی واقعی (`border-bottom`) شفاف می‌شه و یه خط جعلی (`::after`) دقیقاً جای همون حاشیه با همون رنگ (`--line`) کشیده می‌شه.
- چرا؟ چون `border` رو نمی‌شه با `transform` «کشید»، ولی یه عنصر جدا رو می‌شه. نتیجه‌ی آخر دقیقاً شبیه قبله.
- `position: absolute` باعث می‌شه این خط جای یه ستون از گرید (`grid`) رو نگیره.

**سه قدم، مثل نوار پیشرفت:**
```css
.steps { --stagger: 240ms; }
html.js .step::before { ... top: -2px; height: 2px; background: var(--line-strong); ... }
html.js .step:first-child::before { background: var(--ink); }
html.js .step.reveal:not(.is-in) { transform: none; }
```
همون ترفند برای خط بالای قدم‌ها، با ۲۴۰ میلی‌ثانیه فاصله تا حس «۱، بعد ۲، بعد ۳» بده. قدم اول خطش جوهری (پررنگه)، مثل طراحی اصلی. خود قدم‌ها جابه‌جا نمی‌شن، فقط محو میان، چون حرکت اصلی همون خطه.

**سؤال‌ها و دعوت نهایی:**
```css
html.js .faq.reveal:not(.is-in) { opacity: 1; transform: none; }
```
کادر سؤال‌ها خودش فوراً دیده می‌شه، چون جفت‌های داخلش جدا جدا و پله‌ای ظاهر می‌شن (با دستور `.faq` توی `animations.js`).

```css
html.js .cta::before { ... transform: scaleX(0); transition: transform 900ms ...; }
html.js .cta.is-in::before { transform: none; }
html.js .cta.reveal:not(.is-in) { opacity: 1; transform: none; }
```
خط بالای دعوت نهایی کشیده می‌شه و تیترش خط به خط بالا میاد.

```css
.page { --stagger: 70ms; }
```
توی پنل، بخش‌های اصلی صفحه با ۷۰ میلی‌ثانیه فاصله.

### بخش ۷: واکنش‌های کوچیک (Micro-interactions)

```css
.btn:active { transform: scale(0.98); }
.btn-icon:active { transform: scale(0.92); }
```
موقع کلیک، دکمه کمی فشرده می‌شه. `:active` یعنی «همین لحظه که دکمه‌ی موس پایینه».

```css
html.js .nav-text, html.js .link, ... { position: relative; text-decoration: none !important; }
html.js .nav-text::after, ... { ... height: 1px; background: currentColor; transform: scaleX(0); transform-origin: right; ... }
html.js .nav-text:hover::after, ... { transform: none; }
```
- خط زیر لینک‌های متنی، به‌جای ظاهر شدن یهویی، از راست کشیده می‌شه.
- `currentColor` یعنی «همون رنگ متن لینک».
- `text-decoration: none !important`: خط زیر پیش‌فرض خاموش می‌شه تا دو خط نیفته روی هم.

```css
.back-link:hover .icon { transform: translateX(3px); }
.top-item:hover { transform: translateX(-3px); }
```
- فلش «برگشت» به سمت مقصدش (راست) حرکت می‌کنه.
- ردیف‌های «پرکلیک‌ترین‌ها» کمی به سمت جهت خوندن (چپ) می‌رن، یعنی «اینو کلیک کن».

```css
.field-error { animation: lp-drop var(--dur-base) var(--ease-out); }
```
پیام خطای فرم از بالا سُر می‌خوره. انیمیشن CSS **خودکار** وقتی عنصر به صفحه اضافه می‌شه اجرا می‌شه، پس JS لازم نداره. (لرزش فیلد با JS انجام می‌شه.)

```css
.result.flash .result-link { display: inline-block; animation: lp-stamp 520ms var(--ease-spring) 120ms both; }
.result.flash .result-ic { animation: lp-pop var(--dur-base) var(--ease-spring) both; }
```
بعد از کوتاه کردن لینک توی لندینگ، لینک جدید مثل مُهر ظاهر می‌شه و تیک سبز با فنر میاد. `display: inline-block` لازمه، چون `transform` روی عنصرهای `inline` کار نمی‌کنه.

```css
.icon.lp-swap { animation: lp-swap var(--dur-base) var(--ease-spring); }
```
وقتی یه آیکون عوض می‌شه (مثلاً «کپی» به «تیک»)، JS این کلاس رو می‌ده و آیکون با یه چرخش کوچیک و فنر ظاهر می‌شه.

```css
.switch .track::after { transition: transform var(--dur-base) var(--ease-spring), ...; }
```
دکمه‌ی گرد سوییچ‌های تنظیمات با فنر جابه‌جا می‌شه.

```css
.modal { animation: lp-modal-in var(--dur-base) var(--ease-out); }
.modal-backdrop.out .modal { transform: translateY(8px) scale(0.98); transition: transform var(--dur-fast) var(--ease-out); }
```
- مودال موقع باز شدن کمی از پایین بالا میاد.
- موقع بسته شدن، `ui.js` کلاس `out` رو به پس‌زمینه می‌ده. حالا خود پنجره هم کمی پایین می‌ره و کوچیک می‌شه (قبلاً فقط محو می‌شد).

```css
.dd-menu { transform-origin: top right; animation: lp-menu ...; }
.popover { transform-origin: top left; animation: lp-menu ...; }
```
- منوی کشویی (dropdown) زیر سمت راست دکمه‌اش باز می‌شه، پس از گوشه‌ی بالا-راست بزرگ می‌شه.
- پاپ‌اور اعلان‌ها (popover، پنجره‌ی کوچیک بازشونده) سمت چپ دکمه‌ست، پس از بالا-چپ.
- این‌طوری معلومه «از کجا اومد».

```css
.toast { animation: lp-toast var(--dur-base) var(--ease-spring); }
.bulk:not([hidden]) { animation: lp-rise var(--dur-base) var(--ease-out); }
.sidebar { transition-duration: var(--dur-base); transition-timing-function: var(--ease-out); }
```
- توست از پایین با فنر خفیف میاد.
- نوار «انتخاب گروهی» توی «لینک‌های من» وقتی ظاهر می‌شه بالا میاد. انیمیشن CSS هر بار که `hidden` برداشته بشه از اول اجرا می‌شه.
- سایدبار موبایل با سرعت و منحنی توکن‌ها باز و بسته می‌شه.

```css
.notif-dot::after { ... animation: lp-ping 1.4s var(--ease-out) 600ms 2 both; }
```
یه حلقه دور نقطه‌ی اعلان، **دو بار** (`2`) پخش می‌شه و تموم. بی‌نهایت تکرار نمی‌شه، چون حواس‌پرتی می‌آورد.

```css
.seg.has-indicator button.is-active { background: transparent; box-shadow: none; }
.seg-indicator { position: absolute; top: 0.2rem; bottom: 0.2rem; right: 0; ... transition: transform var(--dur-base) var(--ease-out); }
```
- توی «جزئیات لینک»، دکمه‌های بازه (۲۴ ساعت، ۷ روز…) یه نشانگر سفید مشترک دارن که بین گزینه‌ها سُر می‌خوره.
- پس‌زمینه‌ی خود دکمه‌ی فعال شفاف شده، چون حالا نشانگر اون نقش رو داره.
- `right: 0` + `translateX` (که JS حساب می‌کنه) جای نشانگر رو تعیین می‌کنه.

### بخش ۸: کی‌فریم‌ها

| اسم | کارش |
|---|---|
| `lp-fade` | محو از ۰ به ۱ |
| `lp-draw` | کشیده شدن افقی (`scaleX` از ۰ به ۱) |
| `lp-drop` | کمی از بالا پایین آمدن + محو (پیام خطا) |
| `lp-rise` | کمی از پایین بالا آمدن + محو |
| `lp-pop` | بزرگ شدن از ۶۰٪ |
| `lp-swap` | چرخش و بزرگ شدن (تعویض آیکون) |
| `lp-stamp` | بزرگ‌تر شروع، کمی کوچیک‌تر، بعد اندازه‌ی واقعی (مُهر) |
| `lp-modal-in` | ورود مودال |
| `lp-menu` | باز شدن منو |
| `lp-toast` | ورود توست |
| `lp-ping` | حلقه‌ی پخش‌شونده |

آخر فایل:
```css
@media (prefers-reduced-motion: reduce) {
  .lp-bg { opacity: 1; animation: none; }
  .notif-dot::after { display: none; }
  .top-item:hover, .back-link:hover .icon { transform: none; }
}
```
برای «حرکت کمتر»: پس‌زمینه بدون انیمیشن ورود دیده می‌شه، حلقه‌ی اعلان کلاً خاموشه، و حرکت‌های هاور حذف می‌شن.

---

## ۳) `js/animations.js`

کل فایل داخل `(function () { ... })();` هست. به این می‌گن IIFE (تابعی که بلافاصله اجرا می‌شه). متغیرهای داخلش با بقیه‌ی فایل‌های سایت قاطی نمی‌شن. `'use strict'` جاوااسکریپت رو سخت‌گیرتر می‌کنه تا خطاها زودتر پیدا بشن.

### بخش ۱: علامت «JS کار می‌کنه»

```js
const html = document.documentElement;
html.classList.add('js');
```
اولین کار: کلاس `js` به `<html>`. همه‌ی قانون‌های CSS که با `html.js` شروع می‌شن، از این لحظه فعال می‌شن.

```js
const motion = (window.LPMotion = window.LPMotion || {});
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = (motion.reduced = () => reduceQuery.matches);
```
- `window.LPMotion`: یه شیء عمومی که از کنسول (console، بخش پیام‌های مرورگر) هم در دسترسه، برای عیب‌یابی.
- `reduced()`: جواب می‌ده که آیا «حرکت کمتر» روشنه یا نه.

```js
const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
```
همون منحنی‌های CSS، برای انیمیشن‌هایی که با جاوااسکریپت (Web Animations API) ساخته می‌شن. اگه توکن‌های CSS رو عوض کردی، اینها رو هم هماهنگ کن.

### بخش ۲: دستورهای صحنه (Recipes)

```js
const RECIPES = [
  { group: '.hero-copy', variant: 'up' },
  { group: '.faq', variant: 'up' },
  { group: '.auth-box', variant: 'up' },
  ...
  { group: '.page', variant: 'up' },
  ...
];
```
این مهم‌ترین قسمت برای تو هست. هر خط می‌گه «بچه‌های این ظرف (`group`) پشت سر هم با این حالت (`variant`) ظاهر بشن». به این شکل لازم نشد به HTML صفحه‌ها `data-reveal` اضافه کنیم.
- **می‌خوای یه بخش جدید انیمیشن بگیره؟** یه خط اضافه کن، مثلاً `{ group: '.my-new-list', variant: 'fade' }`.
- **می‌خوای یه بخش انیمیشن نداشته باشه؟** خطش رو پاک کن.

```js
const LINE_HEADINGS = '.hero-title, .section-head h2, .split-head h2, .cta h2, .auth-box h1, .auth-aside h2, .nf-body h1, .page-head h1';
```
تیترهایی که خط به خط بالا میان.

```js
const SELECTOR = '.reveal, [data-reveal]';
const MAX_INDEX = 8;
```
- `SELECTOR`: چه عنصرهایی «ظاهرشونده» حساب بشن.
- `MAX_INDEX`: آیتم نهم به بعد تأخیر بیشتری نمی‌گیرن، وگرنه توی فهرست‌های بلند آیتم‌های آخر خیلی دیر میومدن.

```js
function all(root, sel) {
  const list = Array.from(root.querySelectorAll(sel));
  if (root.nodeType === 1 && root.matches(sel)) list.unshift(root);
  return list;
}
```
`querySelectorAll` فقط **داخل** یه عنصر رو می‌گرده، نه خودش رو. این تابع خود عنصر رو هم چک می‌کنه.
> نکته‌ی باگ: بدون این تابع، وقتی داشبورد فهرست «پرکلیک‌ترین‌ها» رو از نو می‌ساخت، خود ظرف `.top-links` پیدا نمی‌شد و آیتم‌های جدید انیمیشن نمی‌گرفتن.

### بخش ۳: سیستم ظاهر شدن

```js
function reveal(el) {
  el.classList.add('is-in');
  if (observer) observer.unobserve(el);
}
```
کلاس `is-in` رو می‌ده (CSS بقیه‌ی کار رو می‌کنه) و دیگه دنبال این عنصر نمی‌ره. یعنی **هر انیمیشن فقط یک بار**.

```js
function numberGroup(group) {
  let i = 0;
  Array.from(group.children).forEach((child) => {
    if (child.matches(SELECTOR)) child.style.setProperty('--i', Math.min(i++, MAX_INDEX));
  });
}
```
به بچه‌های ظاهرشونده‌ی یه گروه به ترتیب شماره می‌ده (`--i: 0`، `--i: 1`…). بچه‌هایی که ظاهرشونده نیستن (مثل کانواس پس‌زمینه) شماره نمی‌گیرن.

```js
function applyRecipes(root) {
  RECIPES.forEach((r) => {
    all(root, r.group).forEach((group) => {
      group.setAttribute('data-stagger', '');
      Array.from(group.children).forEach((child) => {
        if (child.matches(SELECTOR) || child.matches('script, template, .lp-bg, .seg-indicator')) return;
        child.setAttribute('data-reveal', r.variant);
      });
    });
  });
```
دستورها رو اجرا می‌کنه: به ظرف `data-stagger` و به بچه‌هاش `data-reveal` می‌ده. بچه‌هایی که از قبل ظاهرشونده‌ان، یا کانواس و نشانگر هستن، دست نمی‌خورن.

```js
  all(root, '.table tbody').forEach((tbody) => {
    const card = tbody.closest('.card') || tbody.parentElement;
    if (card.hasAttribute('data-rows-done')) return;
    card.setAttribute('data-rows-done', '');
    tbody.setAttribute('data-stagger', '');
    tbody.style.setProperty('--stagger', '35ms');
    Array.from(tbody.children).slice(0, 10).forEach((tr) => tr.setAttribute('data-reveal', 'fade'));
  });
```
ردیف‌های جدول:
- `data-rows-done` روی کارت جدول یعنی «این جدول یه بار انیمیشن گرفته». دفعه‌های بعد (موقع جستجو یا فیلتر) دیگه انیمیشن نمی‌گیره، چون تکرارش آزاردهنده‌ست.
- `slice(0, 10)`: فقط ۱۰ ردیف اول.

```js
function watch(scope) {
  const root = scope || document;
  if (root !== document && root.nodeType !== 1) return;
  applyRecipes(root === document ? document : root.parentElement || root);
```
`watch` تابع اصلیه. یه قسمت از صفحه رو می‌گیره و همه‌ی انیمیشن‌هاش رو آماده می‌کنه.
- `nodeType !== 1` یعنی اگه «عنصر» نیست (مثلاً یه تیکه متن خالیه)، کاری نکن.
- دستورها روی **والد** اجرا می‌شن، چون ممکنه خود عنصر جدید بچه‌ی یه گروه باشه.

```js
  const groups = new Set(root.querySelectorAll('[data-stagger]'));
  if (root !== document) {
    if (root.matches('[data-stagger]')) groups.add(root);
    const parentGroup = root.parentElement && root.parentElement.closest('[data-stagger]');
    if (parentGroup) groups.add(parentGroup);
  }
  groups.forEach(numberGroup);
```
همه‌ی گروه‌های پله‌ای مرتبط رو پیدا می‌کنه و دوباره شماره‌گذاری می‌کنه. `Set` جلوی تکراری شدن رو می‌گیره.

```js
  items.forEach((el) => {
    if (el.classList.contains('is-in') || el.hasAttribute('data-reveal-bound')) return;
    el.setAttribute('data-reveal-bound', '');
    if (!observer || reduced()) reveal(el);
    else observer.observe(el);
  });
```
- `data-reveal-bound`: علامت «این عنصر رو قبلاً زیر نظر گرفتیم».
- اگه مرورگر IntersectionObserver نداره، یا «حرکت کمتر» روشنه، عنصر **فوراً** نمایش داده می‌شه.
- وگرنه `observer.observe(el)` یعنی «وقتی وارد صفحه شد خبرم کن».

```js
  prepareCharts(root);
  prepareCounters(root);
  prepareSegs(root);
}
motion.watch = watch;
```
نمودارها، عددها و دکمه‌های بازه رو هم آماده می‌کنه.

### بخش ۴: تیترها

```js
function splitLines(root) {
  all(root, LINE_HEADINGS).forEach((h) => {
    if (h.classList.contains('line-host') || !h.textContent.trim()) return;
    const parts = h.innerHTML.split(/<br\s*\/?>/i);
```
- اگه تیتر قبلاً تقسیم شده (`line-host`) یا خالیه، ردش کن.
- محتوای تیتر رو از جاهایی که `<br>` (شکست خط) داره تکه‌تکه می‌کنه. `/<br\s*\/?>/i` یه الگوی جستجو (regex) هست که `<br>` و `<br/>` و `<BR>` رو پیدا می‌کنه.

```js
    h.innerHTML = parts
      .map((p, i) => `<span class="line-mask"><span class="line-inner" style="--line:${i}">${p.trim()}</span></span>`)
      .join('');
    h.classList.add('line-host');
```
هر تکه رو داخل پوشش و متن داخلی می‌ذاره و شماره‌ی خطش (`--line`) رو ست می‌کنه. تگ‌های داخل تیتر (مثل `<em>کی</em>`) حفظ می‌شن.

```js
    if (!h.closest(SELECTOR)) h.setAttribute('data-reveal', 'lines');
```
اگه تیتر هیچ والد ظاهرشونده‌ای نداره، خودش «ماشه»ی حرکت می‌شه.

### بخش ۵: شمارش عددها

```js
const FA = '۰۱۲۳۴۵۶۷۸۹';
const toLatin = (s) => s.replace(/[۰-۹]/g, (d) => FA.indexOf(d));
```
رقم‌های فارسی رو به انگلیسی تبدیل می‌کنه تا جاوااسکریپت بتونه حسابشون کنه. مثلاً `'۴'` جای ۴ توی رشته‌ی `FA` هست، پس می‌شه `4`.

```js
const NUMBER_RE = /^[\d۰-۹٬,]+([٫.][\d۰-۹]+)?(٪)?$/;
const COUNTERS = '.kpi-value, .mock-stat b, .profile-stats b';
```
- `NUMBER_RE` چک می‌کنه یه متن «فقط عدد» هست یا نه: رقم‌ها، جداکننده‌ی هزارگان `٬`، اعشار اختیاری `٫`، و درصد اختیاری `٪`. متن‌هایی مثل «شبکه‌های اجتماعی» یا «—» رد می‌شن و نمی‌شمارن.
- `COUNTERS`: کدوم عنصرها عدد شمارشی دارن.

```js
function parseNumber(text) { ... return { value, decimals, pct }; }
```
متن رو به عدد تبدیل می‌کنه و یادش می‌مونه چند رقم اعشار داشت و درصد بود یا نه، تا موقع شمارش همون شکل حفظ بشه.

```js
function runCounter(el) {
  const finalText = el.__lpTarget;
  const n = parseNumber(finalText || '');
  const run = (el.__lpRun = (el.__lpRun || 0) + 1);
```
سه متغیر مهم که روی خود عنصر ذخیره می‌شن:
- `__lpTarget`: آخرین متنی که **خود صفحه** نوشته؛ یعنی عدد درست.
- `__lpShown`: عددی که الان روی صفحه دیده می‌شه (وسط شمارش).
- `__lpRun`: شماره‌ی اجرا. هر بار شمارش جدید شروع بشه، یکی اضافه می‌شه.

> **نکته‌ی باگ (مهم):** نسخه‌ی اول این قسمت باگ داشت. دو شمارنده هم‌زمان روی یه عدد اجرا می‌شدن و یکیشون یه عدد نصفه رو به‌عنوان «عدد نهایی» برمی‌داشت. نتیجه این بود که داشبورد به‌جای ۳ لینک، ۱ نشون می‌داد. حالا با `__lpRun` هر اجرای قدیمی خودش متوقف می‌شه و عدد آخر همیشه `__lpTarget` هست.

```js
  if (!n || reduced()) { el.__lpShown = n ? n.value : null; return; }
  const from = el.__lpShown != null ? el.__lpShown : 0;
  if (from === n.value) return;
```
- عدد نیست یا «حرکت کمتر» روشنه؟ شمارش نکن.
- شمارش از عدد فعلی شروع می‌شه (بار اول صفر). اگه بازه رو از ۷ به ۳۰ روز عوض کنی، از عدد قبلی تا جدید می‌شمره، نه از صفر.

```js
  const fmt = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: n.decimals, maximumFractionDigits: n.decimals });
```
`Intl.NumberFormat('fa-IR')` عدد رو با رقم و جداکننده‌ی فارسی می‌نویسه (مثلاً `۴٬۲۱۷`)، همون کاری که `LP.fa` توی `utils.js` می‌کنه.

```js
  function step(now) {
    if (run !== el.__lpRun) return;
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 3);
```
- `step` هر فریم (حدود ۶۰ بار در ثانیه) اجرا می‌شه.
- اگه اجرای جدیدتری شروع شده، این یکی متوقف می‌شه.
- `t` پیشرفت زمانه، از ۰ تا ۱.
- `e` همون پیشرفت با منحنی «آروم شدن در پایان» (ease-out cubic): اول سریع می‌شمره، آخرش آروم.

```js
    if (t < 1) {
      el.__lpShown = from + (n.value - from) * e;
      write(fmt.format(el.__lpShown) + (n.pct ? '٪' : ''));
      requestAnimationFrame(step);
    } else {
      el.__lpShown = n.value;
      write(finalText);
    }
```
- وسط کار: عدد میانی رو می‌نویسه و فریم بعدی رو درخواست می‌کنه. `requestAnimationFrame` یعنی «فریم بعدی که مانیتور نشون می‌ده».
- آخر کار: **متن دقیق اصلی** رو می‌نویسه، نه عدد محاسبه‌شده، تا هیچ فرقی با چیزی که صفحه نوشته نباشه.

```js
function prepareCounters(root) { ... el.__lpTarget = el.textContent; ... counterObserver.observe(el); }
```
هر عدد رو زیر نظر می‌گیره. وقتی **واقعاً دیده شد**، شمارش شروع می‌شه. عددی که پایین صفحه‌ست تا بهش نرسیدی منتظر می‌مونه.

```js
function onCounterText(el) {
  if (el.textContent === el.__lpWritten) return;
  el.__lpTarget = el.textContent;
  if (el.__lpSeen) runCounter(el);
}
```
وقتی متن عدد عوض شد:
- اگه کار خودمون بود (`__lpWritten`)، نادیده بگیر.
- اگه کار صفحه بود (مثلاً داده‌ی جدید از سرور رسید)، اون عدد جدید هدف می‌شه و شمارش از نو شروع می‌شه.

### بخش ۶: کشیدن نمودارها

```js
function prepareCharts(root) {
  all(root, '.chart svg, svg.spark, .donut svg, .bar-fill, .nf-line').forEach((el) => {
    if (el.__lpChart) return;
    el.__lpChart = true;
    if (reduced()) return;
    hideChart(el);
    if (chartObserver) chartObserver.observe(el); else drawChart(el);
  });
}
```
همه‌ی نمودارها (خطی، کوچیک، دایره‌ای، نوارها، خط ۴۰۴) رو پیدا می‌کنه، اول «نکشیده» نگهشون می‌داره، و وقتی دیده شدن می‌کشه.

```js
function hideChart(el) {
  if (el.matches('.bar-fill')) { el.style.transform = 'scaleX(0)'; return; }
  if (el.matches('.donut svg')) { el.style.opacity = '0'; return; }
  el.querySelectorAll('path').forEach((p) => {
    if (p.getAttribute('fill') && p.getAttribute('fill') !== 'none') { p.style.opacity = '0'; return; }
    if (p.getAttribute('stroke-dasharray')) { p.style.opacity = '0'; return; }
    const len = p.getTotalLength ? p.getTotalLength() : 0;
    if (!len) return;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.__lpLen = len;
  });
}
```
- نوارها: عرض صفر با `scaleX(0)`.
- دایره‌ای: نامرئی.
- مسیرهای SVG (`path`):
  - اگه پرشده‌ست (`fill`، یعنی سایه‌ی زیر نمودار)، فقط نامرئی می‌شه.
  - اگه از قبل خط‌چینه (نقطه‌های خط ۴۰۴)، فقط نامرئی می‌شه.
  - وگرنه **ترفند کشیدن خط**: `getTotalLength()` طول کل خط رو می‌ده. `strokeDasharray = طول` یعنی «خط‌چینی که هر تیکه‌اش هم‌اندازه‌ی کل خطه». `strokeDashoffset = طول` اون تیکه رو کامل جابه‌جا می‌کنه، پس خط نامرئی می‌شه. وقتی `offset` رو به صفر برسونیم، خط «کشیده» می‌شه.

```js
function drawChart(el) {
  if (el.matches('.bar-fill')) {
    const i = Array.from(document.querySelectorAll('.bar-fill')).indexOf(el);
    el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 700, delay: 80 * Math.max(0, i), easing: EASE_OUT, fill: 'backwards' })
```
- `el.animate(...)` همون Web Animations API هست، یعنی انیمیشن با جاوااسکریپت ولی با موتور خود مرورگر.
- هر نوار ۸۰ میلی‌ثانیه دیرتر از قبلی.
- `fill: 'backwards'`: توی مدت تأخیر، روی حالت اول (عرض صفر) بمونه.

```js
  if (el.matches('.donut svg')) {
    el.animate([{ opacity: 0, transform: 'rotate(-40deg) scale(0.92)' }, { opacity: 1, transform: 'none' }], { duration: 800, easing: EASE_OUT });
```
نمودار دایره‌ای در حالی که ظاهر می‌شه ۴۰ درجه می‌چرخه.

```js
  el.querySelectorAll('path').forEach((p) => {
    if (p.__lpLen) {
      const a = p.animate([{ strokeDashoffset: p.__lpLen }, { strokeDashoffset: 0 }], { duration: isSpark ? 600 : 1100, easing: EASE_IN_OUT, delay: 100 });
      a.finished.then(() => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }).catch(() => {});
```
- خط از نقطه‌ی **اولش** کشیده می‌شه. توی `charts.js` نقطه‌ی اول قدیمی‌ترین روزه که سمت راسته، پس خط از راست به چپ کشیده می‌شه، هم‌جهت با زمان.
- بعد از تموم شدن، تنظیمات خط‌چین پاک می‌شه تا نمودار دقیقاً مثل قبل بشه.
- `.catch(() => {})`: اگه نمودار وسط انیمیشن از صفحه حذف شد (مثلاً بازه عوض شد)، خطا نده.

```js
    } else if (p.style.opacity === '0') {
      p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: isSpark ? 0 : 700, ... });
```
سایه‌ی زیر نمودار ۷۰۰ میلی‌ثانیه بعد محو ظاهر می‌شه، یعنی بعد از اینکه خط تقریباً کشیده شد.

### بخش ۷: نشانگر انتخاب بازه

```js
function prepareSegs(root) {
  all(root, '.seg').forEach((seg) => {
    if (seg.querySelector('.seg-indicator')) return;
    const ind = document.createElement('span');
    ind.className = 'seg-indicator';
    ind.setAttribute('aria-hidden', 'true');
    seg.prepend(ind);
    seg.classList.add('has-indicator');
    placeSeg(seg, true);
  });
}
```
یه `<span>` برای نشانگر می‌سازه و اولِ دکمه‌ها می‌ذاره. `aria-hidden` یعنی صفحه‌خوان‌ها (نرم‌افزار نابیناها) نادیده‌اش بگیرن، چون فقط تزئینیه.

```js
function placeSeg(seg, instant) {
  ...
  const sr = seg.getBoundingClientRect(), br = active.getBoundingClientRect();
  if (instant) ind.style.transition = 'none';
  ind.style.width = br.width + 'px';
  ind.style.transform = `translateX(${br.right - sr.right}px)`;
  if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
}
```
- `getBoundingClientRect` جای دقیق عنصر روی صفحه رو می‌ده.
- فاصله‌ی لبه‌ی راست دکمه‌ی فعال تا لبه‌ی راست کل گروه حساب می‌شه، و نشانگر به همون اندازه جابه‌جا می‌شه (با `transform`، که روان‌تره).
- `instant`: بار اول یا وقتی اندازه‌ی پنجره عوض شد، بدون انیمیشن بپره سر جاش.
- `void ind.offsetWidth`: مرورگر رو مجبور می‌کنه همین الان جای جدید رو اعمال کنه، قبل از اینکه انیمیشن دوباره روشن بشه.

### بخش ۸: لرزش خطا و تعویض آیکون

```js
function shake(field) {
  const target = field.querySelector('.input, .select, .textarea, .slug-input') || field;
  if (reduced() || !target.animate) return;
  target.animate([{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }], { duration: 320, easing: 'ease-out' });
}
```
فیلدِ خطادار ۳۲۰ میلی‌ثانیه چپ و راست می‌لرزه و هر بار کمتر. به جهت چپ‌به‌راست یا راست‌به‌چپ ربطی نداره، چون متقارنه.

```js
function swapIcon(icon) {
  if (reduced()) return;
  icon.classList.remove('lp-swap');
  void icon.offsetWidth;
  icon.classList.add('lp-swap');
}
```
کلاس رو برمی‌داره، مرورگر رو مجبور به محاسبه‌ی دوباره می‌کنه و کلاس رو دوباره می‌ذاره. این ترفند باعث می‌شه انیمیشن CSS حتی اگه پشت سر هم اتفاق بیفته، **از اول** اجرا بشه.

### بخش ۹: راه‌اندازی

```js
observer = new IntersectionObserver(
  (entries) => entries.forEach((en) => { if (en.isIntersecting) reveal(en.target); }),
  { threshold: 0, rootMargin: '0px 0px -8% 0px' }
);
```
- IntersectionObserver (ناظر ورود به صفحه) به مرورگر می‌گه «هر وقت این عنصرها وارد صفحه شدن خبرم کن». خیلی سبک‌تر از گوش دادن به اسکرول هست.
- `rootMargin: '... -8% ...'`: لبه‌ی پایین صفحه ۸٪ بالاتر حساب می‌شه، پس عنصر کمی بعد از ورود ظاهر می‌شه، نه دقیقاً لب صفحه.

```js
counterObserver = new IntersectionObserver(...);
chartObserver = new IntersectionObserver(...);
```
دو ناظر جدا برای عددها و نمودارها، با همون منطق.

```js
watch(document);
```
بار اول کل صفحه رو آماده می‌کنه.

```js
new MutationObserver((mutations) => { ... }).observe(document.body, {
  childList: true, subtree: true, characterData: true,
  attributes: true, attributeFilter: ['class'], attributeOldValue: true
});
```
MutationObserver (ناظر تغییرات صفحه) هر تغییری توی صفحه رو گزارش می‌ده. این تنها راهیه که بدون دست زدن به `dashboard.js` و بقیه بفهمیم کی چیزی عوض شده:
- `childList` + `subtree`: عنصر جدید اضافه شد، جایی توی صفحه. مثلاً جدول ساخته شد، پس انیمیشن‌هاش آماده می‌شه.
- `characterData`: متنی عوض شد. مثلاً عدد KPI یا متن آیکون.
- `attributes` + `attributeFilter: ['class']`: فقط تغییر کلاس‌ها:
  - فیلدی `has-error` گرفت؟ لرزش.
  - دکمه‌ی بازه `is-active` گرفت؟ سُر خوردن نشانگر.
- `attributeOldValue`: کلاس‌های قبلی رو هم بده، تا بفهمیم کلاس **تازه** اضافه شده یا از قبل بوده.

```js
if (pending.size && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
```
عنصرهای جدید جمع می‌شن و **یک بار در هر فریم** پردازش می‌شن، نه برای هر تغییر کوچیک جدا. این برای سرعته.

```js
window.addEventListener('resize', ...placeSeg(s, true));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(...placeSeg(s, true));
```
وقتی اندازه‌ی پنجره عوض شد، یا فونت‌ها لود شدن (که عرض دکمه‌ها رو عوض می‌کنه)، نشانگر بازه دوباره جاگذاری می‌شه.

```js
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
```
چون این فایل توی `<head>` لود می‌شه، هنوز `<body>` وجود نداره. پس `init` صبر می‌کنه تا HTML کامل خونده بشه (`DOMContentLoaded`).

---

## ۴) `js/background.js`

```js
const TARGETS = [
  { selector: '.hero', broken: false },
  { selector: '.auth-aside', broken: false },
  { selector: '.nf-main', broken: true },
];
```
کدوم بخش‌ها پس‌زمینه دارن. `broken: true` یعنی موج‌ها وسط صفحه قطع می‌شن (برای ۴۰۴: «این لینک جایی نمی‌رسه»).

```js
const CONFIG = {
  lineGap: 42, lineAlpha: 0.05, pulseAlpha: 0.55, pulseWidth: 96, pulseHeight: 15,
  trail: 280, speed: 150, every: 2.2, maxPulses: 3,
};
const MOBILE = { lineGap: 50, every: 3.4, maxPulses: 2 };
```
همه‌ی تنظیمات ظاهری (توضیح هر کدوم توی بخش ۵ همین فایل هست). توی موبایل خط‌ها با فاصله‌ی بیشتر، موج‌ها کمتر و با فاصله‌ی زمانی بیشتر، تا باتری کمتری مصرف بشه.

```js
const WAVE = [[0, 0], [0.21, 0], [0.36, -0.58], [0.6, 0.42], [0.76, -0.29], [0.83, 0], [1, 0]];
```
شکل موج = همون خط لوگو (`assets/logo.svg`)، به‌صورت نقطه‌های نرمال‌شده. x از ۰ تا ۱ یعنی از اول تا آخر موج، و y از -۱ تا ۱ یعنی بالا و پایین. منفی یعنی بالا، چون توی کانواس y به سمت پایین زیاد می‌شه.

```js
function rgb(name, fallback) { ... return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
```
رنگ رو از متغیر CSS (مثل `--accent`) می‌خونه و از کد هگز (`#c2512b`) به سه عدد قرمز، سبز و آبی تبدیل می‌کنه. `>>` و `&` عملگرهای بیتی هستن که هر دو رقم هگز رو جدا می‌کنن. این‌طوری اگه رنگ سایت رو عوض کنی، پس‌زمینه هم عوض می‌شه.

```js
function create(host, broken) {
  const canvas = document.createElement('canvas');
  canvas.className = 'lp-bg';
  canvas.setAttribute('aria-hidden', 'true');
  host.classList.add('lp-bg-host');
  host.prepend(canvas);
```
کانواس رو می‌سازه و **اولِ** بخش می‌ذاره. `aria-hidden` یعنی صفحه‌خوان‌ها نادیده‌اش بگیرن.

```js
function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = Math.max(1, Math.round(r.width));
  h = Math.max(1, Math.round(r.height));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```
- `devicePixelRatio`: نسبت پیکسل‌های واقعی صفحه به پیکسل‌های CSS. روی گوشی و لپ‌تاپ‌های جدید ۲ یا ۳ هست.
- کانواس با همین نسبت ساخته می‌شه تا خط‌ها **تار نباشن**. سقفش ۲ هست، چون بیشتر از اون فرقی دیده نمی‌شه و فقط کند می‌کنه.
- `setTransform(dpr...)`: بعدش می‌شه با همون واحدهای CSS نقاشی کرد.

```js
function lineYs() {
  const ys = [];
  for (let y = opts.lineGap * 0.75; y < h; y += opts.lineGap) ys.push(Math.round(y) + 0.5);
  return ys;
}
```
جای خط‌های افقی. `+ 0.5` ترفند کانواسه: خط ۱ پیکسلی که دقیقاً وسط پیکسل باشه تیز دیده می‌شه، نه تار و دوپیکسلی.

```js
function fadeAt(x) {
  if (!broken) return 1;
  const t = (x - w * 0.38) / (w * 0.18);
  return Math.max(0, Math.min(1, t));
}
```
فقط برای ۴۰۴: وقتی موج از ۵۶٪ عرض صفحه رد شد، کم‌کم محو و صاف می‌شه تا ۳۸٪ که کاملاً قطع می‌شه. `Math.max(0, Math.min(1, t))` عدد رو بین ۰ و ۱ نگه می‌داره.

```js
function drawPulse(p) {
  const g = ctx.createLinearGradient(p.x, 0, p.x + W + T, 0);
  g.addColorStop(0, `rgba(${accent},${a})`);
  g.addColorStop(W / (W + T), `rgba(${accent},${a * 0.6})`);
  g.addColorStop(1, `rgba(${accent},0)`);
```
یه گرادیان (gradient، یعنی رنگ تدریجی) افقی: سر موج پررنگه و دنباله‌اش کم‌کم محو می‌شه. شبیه دنباله‌ی خطی که روی مانیتور ضربان قلب می‌بینی.

```js
  WAVE.forEach(([nx, ny], i) => {
    const x = p.x + nx * W, y = p.y + ny * A;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(p.x + W + T, p.y);
  ctx.stroke();
```
نقطه‌های موج رو به اندازه‌ی واقعی تبدیل می‌کنه و با خط به هم وصل می‌کنه، بعد دنباله‌ی صاف رو اضافه می‌کنه و می‌کشه.

```js
function draw() {
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  lineYs().forEach((y) => { ctx.moveTo(0, y); ctx.lineTo(w, y); });
  ctx.strokeStyle = `rgba(${ink},${opts.lineAlpha})`;
  ctx.stroke();
  pulses.forEach(drawPulse);
}
```
هر فریم: کانواس پاک می‌شه، همه‌ی خط‌ها **با یک دستور** کشیده می‌شن (سریع‌تر از تک‌تک کشیدن)، بعد موج‌ها.

```js
function frame(now) {
  raf = 0;
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
```
- `dt` زمان گذشته از فریم قبلی، به ثانیه. حرکت‌ها بر اساس زمان واقعی‌ان، نه تعداد فریم، پس روی مانیتور ۶۰ و ۱۴۴ هرتز سرعت یکیه.
- `Math.min(0.05, ...)`: اگه تب مدتی پنهان بوده، موج‌ها یهو جلو نپرن.

```js
  spawnIn -= dt;
  if (spawnIn <= 0 && pulses.length < opts.maxPulses) {
    spawn();
    spawnIn = opts.every * (0.7 + Math.random() * 0.6);
  }
```
شمارش معکوس تا موج بعدی. فاصله کمی تصادفیه (بین ۷۰٪ تا ۱۳۰٪ مقدار `every`) تا ریتم ماشینی نباشه.

```js
  pulses.forEach((p) => { p.x -= opts.speed * dt; });
  pulses = pulses.filter((p) => p.x + opts.pulseWidth + opts.trail > 0);
```
همه‌ی موج‌ها به سمت چپ حرکت می‌کنن، و موج‌هایی که کاملاً از صفحه بیرون رفتن حذف می‌شن.

```js
function start() {
  if (!raf && onScreen && !document.hidden && !reduced()) raf = requestAnimationFrame(frame);
}
function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
```
انیمیشن **فقط وقتی** اجرا می‌شه که:
- کانواس توی صفحه دیده بشه (`onScreen`)
- تب مرورگر باز و فعال باشه (`!document.hidden`)
- «حرکت کمتر» خاموش باشه

وگرنه هیچ پردازشی انجام نمی‌شه.

```js
if (reduced()) { pulses = []; spawn(w * 0.55); draw(); }
```
«حرکت کمتر»: فقط یه تصویر ثابت، با خط‌ها و یه موج وسط صفحه.

```js
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; ... }).observe(canvas);
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
```
- ResizeObserver (ناظر تغییر اندازه): اندازه‌ی کانواس عوض شد؟ دوباره تنظیم کن.
- IntersectionObserver: کانواس از صفحه بیرون رفت؟ متوقف کن. برگشت؟ ادامه بده.
- `visibilitychange`: تب عوض شد؟ متوقف کن.

---

## ۵) تغییر سرعت و شدت

### سرعت کل سایت
توی `css/animations.css`، بالای فایل:

| می‌خوای… | تغییر بده |
|---|---|
| همه‌چیز سریع‌تر | `--dur-slow: 640ms` رو به `480ms` و `--dur-base` رو به `240ms` |
| همه‌چیز آروم‌تر و نرم‌تر | `--dur-slow` رو به `850ms` |
| فهرست‌ها کمتر پله‌ای | `--stagger: 60ms` رو به `30ms` |
| ظاهر شدن با حرکت کمتر | `--reveal-distance: 14px` رو به `6px` |
| بدون فنر | `--ease-spring` رو برابر `--ease-out` بذار |

> اگه منحنی‌ها رو عوض کردی، `EASE_OUT` و `EASE_IN_OUT` بالای `js/animations.js` رو هم هماهنگ کن.

### فاصله‌ی پله‌ای هر بخش جدا
توی `animations.css`: `.hero-copy { --stagger: 110ms; }`، `.feature-list { --stagger: 90ms; }`، `.steps { --stagger: 240ms; }`، `.page { --stagger: 70ms; }`

### پس‌زمینه
توی `js/background.js`، شیء `CONFIG`:

| تنظیم | کارش | کم‌رنگ‌تر یا آروم‌تر | پررنگ‌تر یا شلوغ‌تر |
|---|---|---|---|
| `lineAlpha` | پررنگی خط‌ها | `0.03` | `0.08` |
| `pulseAlpha` | پررنگی موج | `0.3` | `0.8` |
| `speed` | سرعت موج (پیکسل در ثانیه) | `90` | `220` |
| `every` | هر چند ثانیه یه موج | `4` | `1.2` |
| `maxPulses` | حداکثر موج هم‌زمان | `1` | `5` |
| `lineGap` | فاصله‌ی خط‌ها | `60` | `30` |
| `pulseHeight` | ارتفاع موج | `8` | `22` |

### سرعت شمارش عددها
توی `js/animations.js`، تابع `runCounter`: خط `const dur = 700;`

### سرعت کشیدن نمودار
توی `js/animations.js`، تابع `drawChart`: `duration: isSpark ? 600 : 1100`

---

## ۶) خاموش کردن هر انیمیشن

| می‌خوای خاموش کنی… | کار |
|---|---|
| **همه‌ی انیمیشن‌ها** | `git checkout main`، یا از هر ۹ فایل HTML دو خط `animations.css` و `animations.js` رو پاک کن |
| **فقط پس‌زمینه** | از ۴ صفحه‌ی عمومی خط `<script src="js/background.js">` رو پاک کن |
| پس‌زمینه‌ی فقط یه صفحه | توی `background.js`، خطش رو از `TARGETS` پاک کن |
| ظاهر شدن یه بخش | توی `animations.js`، خطش رو از `RECIPES` پاک کن |
| تیتر خط به خط | توی `animations.js`، اون تیتر رو از `LINE_HEADINGS` پاک کن (یا کل رشته رو `''` کن) |
| شمارش عددها | توی `animations.js`، `COUNTERS` رو `''` کن |
| کشیدن نمودارها | توی `animations.js`، اولین خط داخل `prepareCharts` رو بکن `return;` |
| ردیف‌های جدول | توی `animations.js`، کل بلوک `all(root, '.table tbody')` رو پاک کن |
| لرزش خطا | توی `animations.js`، اولین خط داخل `shake` رو بکن `return;` |
| نشانگر بازه | توی `animations.js`، اولین خط داخل `prepareSegs` رو بکن `return;` |
| خط زیر لینک‌ها | توی `animations.css`، بلوک «لینک‌های متنی» رو پاک کن |
| کارت «قبل و بعد» | توی `animations.css`، بلوک‌هایی که با `html.js .specimen` شروع می‌شن رو پاک کن |
| حلقه‌ی اعلان | توی `animations.css`، بلوک `.notif-dot::after` رو پاک کن |
| هر چیز دیگه توی CSS | بلوکش رو کامنت کن: `/* ... */` |

---

## ۷) عیب‌یابی (Debug)

**یه بخش ظاهر نمی‌شه و خالی مونده:**
1. `F12`، تب Elements، عنصر رو پیدا کن.
2. اگه `data-reveal` داره ولی کلاس `is-in` نداره، یعنی ناظر خبردار نشده.
3. توی Console (کنسول) بنویس: `LPMotion.watch(document)` و Enter.
4. برای اینکه موقتاً همه‌چیز رو نشون بدی:
   `document.querySelectorAll('[data-reveal],.reveal').forEach(e => e.classList.add('is-in'))`

**تست بدون جاوااسکریپت:** `F12`، بعد `Ctrl+Shift+P`، تایپ کن `Disable JavaScript` و صفحه رو رفرش کن. همه‌چیز باید دیده بشه.

**تست «حرکت کمتر»:** `F12`، بعد `Ctrl+Shift+P`، تایپ کن `Emulate CSS prefers-reduced-motion` و `reduce` رو انتخاب کن. همه‌چیز باید بی‌درنگ ظاهر بشه و پس‌زمینه ثابت باشه.

**عدد اشتباه نشون داده می‌شه:** یه بار `animations.css` و `animations.js` رو از HTML پاک کن و ببین عدد درست می‌شه یا نه. اگه درست شد، مشکل از شمارنده‌ست (بخش ۵ همین فایل). اگه نه، مشکل از داده‌ست.

**کند شدن صفحه:** `F12`، تب Performance، دکمه‌ی ضبط رو بزن و چند ثانیه اسکرول کن. اگه `background.js` زیاد دیده می‌شه، `lineGap` رو بیشتر و `maxPulses` رو کمتر کن.

**نکته‌هایی که از قبل توی کد بودن:** نوار قدرت رمز و نوارهای آمار با `width` انیمیشن دارن (توی `components.css`، `app.css` و `site.css`). این انیمیشن‌ها قبل از این کار وجود داشتن و بهشون دست نزدیم.
