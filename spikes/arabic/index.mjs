import { chromium } from 'playwright';
import fs from 'node:fs';

const samples = [
  { name: 'basic-rtl', text: 'مرحباً بالعالم — تصميم احترافي' },
  { name: 'diacritics', text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ' },
  { name: 'mixed', text: 'ملتقى Mubdi 2026 — Social Design' },
  { name: 'arabic-indic-numerals', text: 'التاريخ: ٢٠٢٦/١١/١٤ — الساعة ٥ مساءً' },
  { name: 'western-numerals', text: 'السعر: 49.99 ر.س — خصم 20%' },
  {
    name: 'long-paragraph',
    text: 'التطوع عطاء بلا مقابل، وهو سلوك إنساني يعزز الترابط المجتمعي وي build bonds.',
  },
  { name: 'ligatures', text: 'لا إله إلا الله محمد رسول الله' },
  { name: 'punctuation', text: '«مبدع»: studio — premium, calm, creative.' },
  { name: 'tashkeel-spacing', text: 'شَكَّلَ الْخَطَّ بِدِقَّةٍ' },
  {
    name: 'kashida',
    text: 'الـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ',
  },
];

const html = (text) => `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Tajawal:wght@400;700&display=swap');
  body { margin:0; padding:40px; background:#f5f5f5; font-family:'Cairo','Tajawal',sans-serif; }
  .card { background:#fff; border-radius:12px; padding:24px; box-shadow:0 2px 8px rgba(0,0,0,.08); max-width:900px; }
  .text { font-size:40px; line-height:1.4; color:#1a1a1a; direction:rtl; text-align:right; }
  .meta { font-size:14px; color:#888; margin-top:16px; font-family:monospace; direction:ltr; text-align:left; }
</style></head><body><div class="card"><div class="text">${text}</div><div class="meta">${text}</div></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 300 } });
fs.mkdirSync('out', { recursive: true });
for (const s of samples) {
  await page.setContent(html(s.text), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `out/${s.name}.png` });
  console.log('rendered', s.name);
}
await browser.close();
console.log('done');
