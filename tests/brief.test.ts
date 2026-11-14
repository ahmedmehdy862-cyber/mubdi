import { describe, it, expect } from 'vitest';
import { parseBrief, parseSeriesPlan, isEditRequest } from '../packages/core/src/brief';

const fixtures = [
  'تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي',
  'بوست انستجرام عن فوائد التطوع',
  'ستوري رمضان كريم',
  'إعلان فعالية جامعية',
  'اقتباس تحفيزي',
  'كاروسيل 3 شرائح عن التغذية',
  'كاروسيل 6 شرائح عن فوائد التطوع',
  'منشور X عن إطلاق منتج',
  'غلاف فيسبوك للشركة',
  'صورة مصغرة يوتيوب',
  'post on instagram about coffee',
  'LinkedIn post about hiring',
  'TikTok cover for dance',
  'YouTube thumbnail gaming',
  'announcement for graduation',
  'quote of the day',
  'infographic about water',
  'before after fitness',
  'event invitation wedding',
  'ad for shoes sale',
  'تصميم بوست أزرق',
  'منشور with mixed العربية and English',
  'ستوري عيد الفطر',
  'إعلان Ramadan offer',
  'كاروسيل 7 صفحات',
  'بوست انستجرام أخضر',
  'منشور X header',
  'غلاف linkedin banner',
  'إعلان تطوعي',
  'quote card minimal',
  'announcement exams',
  'infographic climate',
  'event volunteering',
  'ad coffee shop',
  'post facebook square',
  'story tiktok',
  'thumbnail youtube',
  'carousel instagram',
  'cover facebook',
  'announcement national day',
];

describe('brief parser fixtures', () => {
  it('parses 40+ fixtures without throwing', () => {
    for (const f of fixtures) {
      const b = parseBrief(f);
      expect(b).toBeDefined();
      expect(b.platforms.length).toBeGreaterThan(0);
      expect(b.copy.headline).toBeTruthy();
    }
  });
  it('at least 40 fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(40);
  });
  it('detects arabic language', () => {
    expect(parseBrief('تصميم بوست').language).toBe('ar');
  });
  it('detects english language', () => {
    expect(parseBrief('instagram post about coffee').language).toBe('en');
  });
  it('detects mixed', () => {
    expect(parseBrief('بوست about coffee').language).toBe('mixed');
  });
  it('carousel series plan count', () => {
    const sp = parseSeriesPlan('كاروسيل 6 شرائح عن فوائد التطوع');
    expect(sp?.count).toBe(6);
    expect(sp?.briefs.length).toBe(6);
  });
  it('edit request detection', () => {
    expect(isEditRequest('كبّر العنوان')).toBe(true);
    expect(isEditRequest('new post')).toBe(false);
  });
  it('acceptance prompt colors', () => {
    const b = parseBrief(fixtures[0]);
    expect(b.visualDirection.colorIntent).toContain('#1f7a3d');
    expect(b.visualDirection.colorIntent).toContain('#c9a227');
  });
});