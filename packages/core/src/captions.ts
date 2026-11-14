import type { DesignBrief } from '@mubdi/schemas';

export function generateCaption(brief: DesignBrief): { caption: string; hashtags: string[]; altText: string } {
  const hashtags = brief.copy.hashtags.length ? brief.copy.hashtags : [
    '#مبدع', '#تصميم', '#سوشيال', brief.occasion ? '#' + brief.occasion.replace(/\s/g, '') : '#حدث',
  ];
  const caption = `${brief.copy.headline}${brief.copy.subheadline ? '\n' + brief.copy.subheadline : ''}\n\n${brief.copy.cta || ''}\n\n${hashtags.join(' ')}`;
  const altText = `${brief.copy.headline} — ${brief.visualDirection.style} design, ${brief.visualDirection.colorIntent.join(', ')}`;
  return { caption, hashtags, altText };
}