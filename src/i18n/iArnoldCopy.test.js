import { describe, it, expect } from 'vitest';
import ptBR from './locales/pt-BR';
import en from './locales/en';
import { translateError } from './index';

// Lists the dotted paths of every string leaf under a node.
const leafPaths = (node, prefix = '') =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) return [];
    return value && typeof value === 'object' ? leafPaths(value, path) : [path];
  });

describe('iArnold copy', () => {
  it('has every pt-BR iArnold string (except the skeleton phrase pool) in en too', () => {
    const missing = leafPaths(ptBR.iArnold).filter((path) => !path.startsWith('skeleton.') && !leafPaths(en.iArnold).includes(path));
    expect(missing).toEqual([]);
  });

  it('translates the date groups and the floating-button labels', () => {
    expect(ptBR.iArnold.history.groups.today).toBe('Hoje');
    expect(en.iArnold.history.groups.today).toBe('Today');
    expect(ptBR.iArnold.fab.replied).toBe('Assistente IA respondeu');
    expect(en.iArnold.fab.processing).toBeTruthy();
  });

  it('translates ai.timeout in both locales', () => {
    expect(ptBR.messageCodes['ai.timeout']).toBe('O iArnold demorou demais para responder. Tente novamente ou divida o pedido.');
    expect(en.messageCodes['ai.timeout']).toBeTruthy();
  });

  it('translateError resolves an AI_TIMEOUT 504 from the messageCode, not the raw server text', () => {
    const error = new Error('Request failed');
    error.response = { status: 504, data: { error: 'AI_TIMEOUT', messageCode: 'ai.timeout', message: 'RAW SERVER MESSAGE' } };

    expect(translateError(error)).toBe(ptBR.messageCodes['ai.timeout']);
  });

  it('knows student.notLinked in en', () => {
    expect(en.messageCodes['student.notLinked']).toBeTruthy();
  });
});

const REAL_AI_TOOLS = [
  'import_from_template',
  'add_training_to_protocol',
  'add_exercises_to_training',
  'create_exercise_template',
  'create_training_template',
  'create_protocol_template',
  'update_protocol_template',
  'update_training_template',
  'update_exercise_template',
  'update_protocol',
  'update_training',
  'update_exercise',
  'get_student_performance',
];

describe('iArnold action labels', () => {
  it.each([['pt-BR', ptBR], ['en', en]])('labels every real tool in %s', (_locale, locale) => {
    REAL_AI_TOOLS.forEach((tool) => {
      expect(locale.iArnold.actions[tool], tool).toEqual(expect.any(String));
    });
    expect(locale.iArnold.actions.generic).toBeTruthy();
    expect(locale.iArnold.actions.many).toContain('{count}');
  });

  it.each([['pt-BR', ptBR], ['en', en]])('mentions no diet or nutrition capability in %s', (_locale, locale) => {
    expect(JSON.stringify(locale.iArnold)).not.toMatch(/dieta|nutri|alimentar|cutting|\bdiets?\b|meal plan|nutrition/i);
  });
});
