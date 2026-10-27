import { describe, it, expect } from 'vitest';
import { findPlaceholders, hasPlaceholders } from './promptPlaceholders';

describe('promptPlaceholders', () => {
  it('finds a placeholder with its position', () => {
    expect(findPlaceholders('Aplique a rotina {nome da rotina} hoje')).toEqual([
      { text: '{nome da rotina}', start: 17, end: 33 },
    ]);
  });

  it('finds multiple placeholders in order', () => {
    const found = findPlaceholders('A {um} e B {dois}');
    expect(found.map((item) => item.text)).toEqual(['{um}', '{dois}']);
  });

  it('ignores ordinary text with braces', () => {
    expect(hasPlaceholders('Olá, tudo bem?')).toBe(false);
    expect(hasPlaceholders('{}')).toBe(false);
    expect(hasPlaceholders('{ {aninhado} ')).toBe(true);
    expect(hasPlaceholders(`{${'a'.repeat(41)}}`)).toBe(false);
    expect(hasPlaceholders('{linha 1\nlinha 2}')).toBe(false);
    expect(hasPlaceholders('{"a": {"b": 1\n}}')).toBe(false);
  });

  it('handles non-string input', () => {
    expect(findPlaceholders(undefined)).toEqual([]);
    expect(hasPlaceholders(null)).toBe(false);
  });
});
