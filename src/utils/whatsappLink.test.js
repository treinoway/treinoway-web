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

  it('PAN-58 opens WhatsApp without a number', () => {
    expect(buildWhatsappUrl(null, text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
    expect(buildWhatsappUrl('', text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
    expect(buildWhatsappUrl('abc', text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
  });
});
