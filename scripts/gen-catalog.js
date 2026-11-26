#!/usr/bin/env node
// يحدّث فهرس الكتب books/extra.json من ملفات الحزم الموجودة في books/
// التشغيل من جذر المستودع:  node scripts/gen-catalog.js
//
// ماذا يفعل:
// 1) أي ملف .json.gz في books/ غير مذكور في catalog.json أو extra.json يُضاف إلى extra.json.
//    - الكتاب ذو الملف الواحد: تُقرأ بياناته (العنوان، المؤلف، الوفاة، التصنيف...) من داخل الملف.
//    - الكتاب متعدد الأجزاء (اسم-p1.json.gz، اسم-p2.json.gz...): ملفاته بلا بيانات وصفية،
//      فأضف عنوانه ومؤلفه وتصنيفه في الجدول MULTI أدناه قبل التشغيل، وإلا يُضاف بعنوان مؤقت ويُطبع تحذير.
// 2) يحسب حقل gz (الحجم بالبايت) لكل كتاب، وتستعمله الواجهة لتقسيم البحث الشامل إلى دفعات.
// لا يحذف شيئًا ولا يغيّر كتابًا موجودًا إلا حقل gz.

const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = path.join(__dirname, '..', 'books');

const CATS = ['quran', 'hadith', 'aqeeda', 'fiqh', 'lang', 'seera', 'raqaiq'];
const COL = { quran: '#1f5a4a', hadith: '#173a63', aqeeda: '#4a3a6b', fiqh: '#5a4a1d', lang: '#2d4a63', seera: '#5a2d3c', raqaiq: '#2d5a58' };

// بادئة ملفات الأجزاء ← [العنوان، المؤلف، التصنيف]
const MULTI = {
  ans279: ['أنساب الأشراف', 'البلاذري', 'seera'], dar728: ['درء تعارض العقل والنقل', 'ابن تيمية', 'aqeeda'],
  dur911: ['الدر المنثور في التفسير بالمأثور', 'السيوطي', 'quran'], fat255: ['فتح القدير', 'الشوكاني', 'quran'],
  fat795: ['فتح الباري شرح صحيح البخاري', 'ابن رجب الحنبلي', 'hadith'], fay031: ['فيض القدير شرح الجامع الصغير', 'المناوي', 'hadith'],
  hil430: ['حلية الأولياء وطبقات الأصفياء', 'أبو نعيم الأصبهاني', 'raqaiq'], ist463: ['الاستذكار', 'ابن عبد البر', 'fiqh'],
  lis852: ['لسان الميزان', 'ابن حجر العسقلاني', 'seera'], muc626: ['معجم البلدان', 'ياقوت الحموي', 'seera'],
  muh456: ['المحلى بالآثار', 'ابن حزم', 'fiqh'], qam817: ['القاموس المحيط', 'الفيروزآبادي', 'lang'],
  shu458: ['شعب الإيمان', 'البيهقي', 'hadith'], sub821: ['صبح الأعشى في صناعة الإنشا', 'القلقشندي', 'lang'],
  sul845: ['السلوك لمعرفة دول الملوك', 'المقريزي', 'seera'], tah370: ['تهذيب اللغة', 'الأزهري', 'lang'],
};

const p = f => path.join(DIR, f);
const readJSON = f => JSON.parse(fs.readFileSync(p(f), 'utf8'));
const readPack = f => JSON.parse(zlib.gunzipSync(fs.readFileSync(p(f))));
const refsOf = b => (b.parts && b.parts.length ? b.parts : ['books/' + b.id + '.json']).map(r => r.replace(/^books\//, '') + '.gz');
const lines = t => { const w = t.split(/\s+/); return w.length > 1 ? [w[0].slice(0, 14), w.slice(1).join(' ').slice(0, 14)] : [t.slice(0, 14)]; };

const catalog = readJSON('catalog.json');
const extra = readJSON('extra.json');
const ids = new Set([...catalog, ...extra].map(b => b.id));
const used = new Set([...catalog, ...extra].flatMap(refsOf));

const added = [], groups = {}, warnings = [];
for (const f of fs.readdirSync(DIR).sort()) {
  if (!f.endsWith('.json.gz') || used.has(f)) continue;
  const m = f.match(/^(.*)-p(\d+)\.json\.gz$/);
  if (m) { (groups[m[1]] = groups[m[1]] || []).push([+m[2], f]); continue; }
  const d = readPack(f);
  if (!d.id || !d.title) { warnings.push(`${f}: لا يحتوي id أو title، تجاهلته`); continue; }
  const cat = CATS.includes(d.category) ? d.category : 'seera';
  if (!CATS.includes(d.category)) warnings.push(`${d.id}: تصنيف غير معروف "${d.category}"، وُضع في seera`);
  const pages = d.pages_data.length;
  added.push({ id: d.id, title: d.title, author: d.author, authorShort: d.author, death: d.death, category: cat,
    edition: d.edition || 'OpenITI', volumes: d.volumes || Math.max(...d.pages_data.map(x => x.v)), pages,
    toc_items: (d.toc || []).length, ...(pages > 2500 ? { big: true } : {}), lines: lines(d.title), color: COL[cat] });
}
for (const [k, list] of Object.entries(groups)) {
  list.sort((a, b) => a[0] - b[0]);
  let pages = 0, toc = 0, vols = 0, id = '';
  for (const [, f] of list) {
    const d = readPack(f); pages += d.pages_data.length; toc += (d.toc || []).length;
    d.pages_data.forEach(x => { if (x.v > vols) vols = x.v; });
    if (!id) id = d.pages_data[0].ps[0].id.replace(/-\d+$/, '');
  }
  let [title, author, cat] = MULTI[k] || [];
  if (!title) { title = id; author = ''; cat = 'seera'; warnings.push(`${k}: كتاب متعدد الأجزاء بلا عنوان في MULTI؛ أُضيف بعنوان مؤقت "${id}"، صحّحه في extra.json`); }
  added.push({ id, title, author, authorShort: author, death: +id.slice(0, 4) || null, category: cat, edition: 'OpenITI',
    volumes: vols, pages, toc_items: toc, big: true, parts: list.map(([, f]) => 'books/' + f.replace(/\.gz$/, '')), lines: lines(title), color: COL[cat] });
}

const fresh = added.filter(b => !ids.has(b.id));
const all = extra.concat(fresh);
let missing = 0;
for (const b of [...catalog, ...all]) {
  b.gz = 0;
  for (const r of refsOf(b)) { if (fs.existsSync(p(r))) b.gz += fs.statSync(p(r)).size; else { missing++; warnings.push(`${b.id}: الملف ${r} غير موجود`); } }
}
fs.writeFileSync(p('catalog.json'), JSON.stringify(catalog));
fs.writeFileSync(p('extra.json'), JSON.stringify(all));

console.log(`أُضيف ${fresh.length} كتابًا. المجموع: ${catalog.length + all.length} كتابًا. ملفات ناقصة: ${missing}.`);
fresh.forEach(b => console.log('  +', b.title, `(${b.category})`));
warnings.forEach(w => console.log('  ! ' + w));
