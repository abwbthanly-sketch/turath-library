# المكتبة التراثية

مكتبة إلكترونية للكتب التراثية: قراءة وفهرس وبحث وتظليل وملاحظات وباحث ذكي.
موقع ثابت بلا خادم ولا خطوة بناء، منشور على Firebase Hosting: https://turath-library-abw.web.app

## النشر
- كل دفعة إلى `main` تُنشر تلقائيًا عبر `.github/workflows/firebase-hosting-merge.yml`.
- كل طلب دمج (PR) يحصل على رابط معاينة عبر `firebase-hosting-pull-request.yml`.
- اعمل في فرع وافتح PR، ولا تدفع مباشرة إلى `main` إلا إذا طلب المستخدم ذلك صراحةً.
- لا تعدّل ملفات `.github/workflows/` ولا السر `FIREBASE_SERVICE_ACCOUNT_TURATH_LIBRARY_ABW`.

## البنية
- `index.html`: الواجهة كاملة (CSS وJavaScript في ملف واحد، بلا مكتبات ولا إطار عمل). أهم مواضعه:
  - `ORG`: اسم الجمعية وشعارها. `NAV`: عناصر القائمة. `CATS`: التصنيفات السبعة.
  - `SCANS`: روابط صور الطبعات. `SRC_NOTE`: نص الترخيص المعروض.
  - `loadCatalog` يقرأ `books/catalog.json` ثم `books/extra.json`. `loadBook` يحمّل كتابًا (ملفًا واحدًا أو أجزاء `parts`).
  - `loadAll` و`BATCH_BYTES`: البحث الشامل يحمّل دفعات من نحو ٢٠ ميغابايت فقط.
  - `AIP` و`makeAI`: الباحث الذكي، يتصل بـ Gemini أو Claude أو OpenAI بمفتاح يلصقه المستخدم في متصفحه.
  - `BOOKS_BASE`: عنوان اختياري لاستضافة مجلد `books` على مضيف آخر.
- `ai-config.js`: يجب أن يبقى `TURATH_KEY=""` فارغًا دائمًا.
- `books/`: الفهرسان `catalog.json` و`extra.json`، وملفات الكتب `*.json.gz` (مضغوطة gzip، تفكّها الواجهة بـ `DecompressionStream`).
- `scripts/gen-catalog.js`: يضيف إلى `extra.json` أي ملف كتاب غير مفهرس ويحسب حقل `gz`. التشغيل: `node scripts/gen-catalog.js`.
- `firebase.json`: الاستضافة والكاش. ما في `scripts/` وملفات `.md` لا يُنشر.

## صيغة الكتب
- ملف الكتاب: `{ pages_data: [{ v: الجزء, p: الصفحة, part?, ps: [{ id, x: النص, ch?: الباب, num?: رقم الحديث }] }], toc: [{ level, title, vol, page, part? }] }`.
- الكتاب ذو الملف الواحد يحمل أيضًا بياناته (`id`, `title`, `author`, `death`, `category`...)، والكتاب متعدد الأجزاء (`اسم-p1.json.gz`...) لا يحملها، فعنوانه يُضاف في `MULTI` داخل `scripts/gen-catalog.js`.
- مدخل الفهرس: `id`, `title`, `author`, `authorShort`, `death`, `category` (واحد من: quran, hadith, aqeeda, fiqh, lang, seera, raqaiq), `edition`, `volumes`, `pages`, `toc_items`, `lines` (سطرا الغلاف)، `color`، و`big: true` للكتب الكبيرة التي لا يشملها البحث الشامل، و`parts` للكتب متعددة الأجزاء، و`gz` (الحجم بالبايت).
- لإضافة كتاب: ضع ملفه في `books/` ثم شغّل `node scripts/gen-catalog.js` وراجع التحذيرات. أي ملف أكبر من ١٠٠ ميغابايت لا يقبله GitHub، فقسّمه إلى أجزاء.

## قواعد
- **لا تضع أي مفتاح API أو كلمة مرور أو توكن في أي ملف.** المستودع عام والموقع مكشوف لكل زائر.
- الواجهة عربية واتجاهها RTL. اكتب النصوص الظاهرة للمستخدم بالعربية، وحافظ على الأرقام العربية (`AR()`) والخطوط والألوان المعرّفة في `:root`.
- كل تعديل يجب أن يعمل في الوضعين الفاتح والداكن وعلى الجوال (القائمة تصير شريطًا سفليًا تحت ٨٢٠ بكسل).
- الاستضافة على خطة Firebase المجانية (نحو ٣٦٠ ميغابايت نقل يوميًا): لا تضف ما يحمّل كتبًا كثيرة تلقائيًا.
- النصوص من OpenITI بترخيص CC BY-NC-SA 4.0 (غير تجاري، مع النسبة)، فلا تحذف إشارة الترخيص.
- للتجربة محليًا: شغّل أي خادم ملفات ثابت من جذر المستودع، مثل `npx serve .`، ولا تفتح `index.html` مباشرة لأن `fetch` لا يعمل مع `file://`.
