import { describe, it, expect } from 'vitest';
import { buildWhatsappUrl } from './whatsappLink';

describe('buildWhatsappUrl', () => {
  const text = 'Oi, João! Bora ajustar?';

  it('PAN-25 opens the student chat with the encoded text', () => {
    expect(buildWhatsappUrl('5511999998888', text)).toBe(`https://wa.me/5511999998888?text=${encodeURIComponent(text)}`);
  });

  it('PAN-25 keeps only the digits of a formatted number', () => {
    expect(buildWhatsappUrl('+55 (11) 99999-8888', text)).toBe(`https://wa.me/5511999998888?text=${encodeURIComponent(text)}`);
  });

  it('PAN-25 adds the Brazilian country code to a number typed in local format', () => {
    const expected = `https://wa.me/5511999998888?text=${encodeURIComponent(text)}`;

    expect(buildWhatsappUrl('(11) 99999-8888', text)).toBe(expected);
    expect(buildWhatsappUrl('11999998888', text)).toBe(expected);
    expect(buildWhatsappUrl('011 99999-8888', text)).toBe(expected);
    expect(buildWhatsappUrl('(11) 3333-4444', text)).toBe(`https://wa.me/551133334444?text=${encodeURIComponent(text)}`);
  });

  it('PAN-25 keeps a number that already carries a country code', () => {
    expect(buildWhatsappUrl('+55 11 99999-8888', text)).toBe(`https://wa.me/5511999998888?text=${encodeURIComponent(text)}`);
    expect(buildWhatsappUrl('+1 415 555 2671', text)).toBe(`https://wa.me/14155552671?text=${encodeURIComponent(text)}`);
    expect(buildWhatsappUrl('+351 912 345 678', text)).toBe(`https://wa.me/351912345678?text=${encodeURIComponent(text)}`);
  });

  it('PAN-58 opens WhatsApp without a number', () => {
    expect(buildWhatsappUrl(null, text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
    expect(buildWhatsappUrl('', text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
    expect(buildWhatsappUrl('abc', text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
  });
});
