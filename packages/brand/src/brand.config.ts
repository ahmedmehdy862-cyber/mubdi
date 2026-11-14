// Single source of truth for all product/brand names. Change here; every surface updates.
export const brand = {
  studioName: 'مبدع',
  studioNameLatin: 'Mubdi',
  sectionSocial: 'مبدع سوشيال',
  sectionSocialLatin: 'Mubdi Social',
  aiDirector: 'ريشة',
  aiDirectorLatin: 'Reesha',
  tagline: 'استوديو تصميم بالذكاء الاصطناعي',
} as const;

export type Brand = typeof brand;
