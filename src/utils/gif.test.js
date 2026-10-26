import { describe, it, expect } from 'vitest';
import { isHttpUrl } from './gif';

describe('isHttpUrl', () => {
  it('accepts http and https URLs, ignoring surrounding spaces', () => {
    expect(isHttpUrl('https://media.example.com/a.gif')).toBe(true);
    expect(isHttpUrl(' http://media.example.com/a.gif ')).toBe(true);
  });

  it('rejects empty, non-string, non-http and malformed values', () => {
    expect(isHttpUrl('')).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl('ftp://example.com/a.gif')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('not a url')).toBe(false);
  });
});
