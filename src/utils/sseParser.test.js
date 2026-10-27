import { describe, it, expect } from 'vitest';
import { createSseParser } from './sseParser';

// Serialises one SSE event.
const evt = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe('createSseParser', () => {
  it('parses a complete event delivered in a single chunk', () => {
    const parser = createSseParser();

    const events = parser.push(evt('text_delta', { content: 'Olá' }));

    expect(events).toEqual([{ event: 'text_delta', data: { content: 'Olá' } }]);
  });

  it('parses several events from one chunk, in order', () => {
    const parser = createSseParser();

    const events = parser.push(evt('status', { message: 'a' }) + evt('text_delta', { content: 'b' }));

    expect(events.map((e) => e.event)).toEqual(['status', 'text_delta']);
  });

  it('holds back an event split mid-line and emits it once the rest arrives', () => {
    const parser = createSseParser();
    const full = evt('text_delta', { content: 'Treino completo' });
    const cut = full.indexOf('Treino') + 3;

    expect(parser.push(full.slice(0, cut))).toEqual([]);
    expect(parser.push(full.slice(cut))).toEqual([
      { event: 'text_delta', data: { content: 'Treino completo' } },
    ]);
  });

  it('holds back an event split between the event line and the data line', () => {
    const parser = createSseParser();

    expect(parser.push('event: done\n')).toEqual([]);
    expect(parser.push('data: {"conversationId":"c1"}\n\n')).toEqual([
      { event: 'done', data: { conversationId: 'c1' } },
    ]);
  });

  it('handles a chunk boundary between the two newlines that end an event', () => {
    const parser = createSseParser();

    expect(parser.push('event: done\ndata: {"ok":true}\n')).toEqual([]);
    expect(parser.push('\n')).toEqual([{ event: 'done', data: { ok: true } }]);
  });

  it('handles every possible single split point of a stream', () => {
    const full = evt('status', { message: 'x' }) + evt('done', { conversationId: 'c1' });
    for (let cut = 1; cut < full.length; cut += 1) {
      const parser = createSseParser();
      const events = [...parser.push(full.slice(0, cut)), ...parser.push(full.slice(cut))];
      expect(events.map((e) => e.event)).toEqual(['status', 'done']);
    }
  });

  it('supports CRLF line endings', () => {
    const parser = createSseParser();

    const events = parser.push('event: text_delta\r\ndata: {"content":"oi"}\r\n\r\n');

    expect(events).toEqual([{ event: 'text_delta', data: { content: 'oi' } }]);
  });

  it('supports a CRLF pair split across chunks', () => {
    const parser = createSseParser();

    expect(parser.push('event: done\r')).toEqual([]);
    expect(parser.push('\ndata: {"a":1}\r\n\r')).toEqual([]);
    expect(parser.push('\n')).toEqual([{ event: 'done', data: { a: 1 } }]);
  });

  it('joins multi-line data fields with a newline before parsing', () => {
    const parser = createSseParser();

    const events = parser.push('event: done\ndata: {"message":\ndata: "linha"}\n\n');

    expect(events).toEqual([{ event: 'done', data: { message: 'linha' } }]);
  });

  it('accepts "data:" without the optional space', () => {
    const parser = createSseParser();

    expect(parser.push('event:status\ndata:{"message":"ok"}\n\n')).toEqual([
      { event: 'status', data: { message: 'ok' } },
    ]);
  });

  it('ignores comment lines (": heartbeat")', () => {
    const parser = createSseParser();

    const events = parser.push(`: keep-alive\n\n${evt('status', { message: 'ok' })}`);

    expect(events).toEqual([{ event: 'status', data: { message: 'ok' } }]);
  });

  it('skips an event with malformed JSON and keeps parsing the next one', () => {
    const parser = createSseParser();

    const events = parser.push(`event: status\ndata: {nope\n\n${evt('done', { conversationId: 'c1' })}`);

    expect(events).toEqual([{ event: 'done', data: { conversationId: 'c1' } }]);
  });

  it('does not leak the previous event name into an event without one', () => {
    const parser = createSseParser();

    const events = parser.push(`${evt('status', { message: 'a' })}data: {"x":1}\n\n`);

    expect(events.map((e) => e.event)).toEqual(['status']);
  });

  it('flush() emits a trailing event that was never terminated by a blank line', () => {
    const parser = createSseParser();

    expect(parser.push('event: done\ndata: {"conversationId":"c9"}')).toEqual([]);

    expect(parser.flush()).toEqual([{ event: 'done', data: { conversationId: 'c9' } }]);
  });

  it('flush() emits a trailing event terminated by a single newline only', () => {
    const parser = createSseParser();

    parser.push('event: done\ndata: {"conversationId":"c9"}\n');

    expect(parser.flush()).toEqual([{ event: 'done', data: { conversationId: 'c9' } }]);
  });

  it('flush() returns nothing when the stream ended cleanly', () => {
    const parser = createSseParser();
    parser.push(evt('done', { conversationId: 'c1' }));

    expect(parser.flush()).toEqual([]);
  });

  it('flush() drops a trailing event whose JSON is incomplete', () => {
    const parser = createSseParser();
    parser.push('event: done\ndata: {"conversationId":');

    expect(parser.flush()).toEqual([]);
  });

  it('keeps independent state per parser instance', () => {
    const a = createSseParser();
    const b = createSseParser();
    a.push('event: done\ndata: {"a"');

    expect(b.push(evt('status', { message: 'b' }))).toEqual([
      { event: 'status', data: { message: 'b' } },
    ]);
  });
});
