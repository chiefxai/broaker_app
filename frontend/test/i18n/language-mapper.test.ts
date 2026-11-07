import { describe, expect, it } from '@jest/globals';

import { mapLanguageText } from '@/i18n/language-mapper';

describe('language mapper', () => {
  it('maps fixed screen and component text to Tamil', () => {
    expect(mapLanguageText('No matching properties', 'ta')).toBe('பொருந்தும் சொத்துகள் இல்லை');
    expect(mapLanguageText('Generate Share Link', 'ta')).toBe('பகிர்வு இணைப்பை உருவாக்குக');
  });

  it('maps core fixed UI text to Telugu and Malayalam', () => {
    expect(mapLanguageText('Home', 'te')).toBe('హోమ్');
    expect(mapLanguageText('Generate Share Link', 'te')).toBe('షేర్ లింక్‌ను రూపొందించండి');
    expect(mapLanguageText('Home', 'ml')).toBe('ഹോം');
    expect(mapLanguageText('Generate Share Link', 'ml')).toBe('പങ്കിടൽ ലിങ്ക് സൃഷ്ടിക്കുക');
  });

  it('leaves dynamic or unknown content intact and preserves surrounding whitespace', () => {
    expect(mapLanguageText('  Customer supplied property name  ', 'ta')).toBe('  Customer supplied property name  ');
    expect(mapLanguageText('5 photos', 'ta')).toBe('5 புகைப்படங்கள்');
    expect(mapLanguageText('1 link', 'ta')).toBe('1 இணைப்பு');
    expect(mapLanguageText('No matching properties', 'en')).toBe('No matching properties');
  });
});
