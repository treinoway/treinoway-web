const LINE_BREAK = /\r\n|\n|\r/;

// Strips the single optional space that follows the colon of an SSE field.
const fieldValue = (line, name) => {
  const value = line.slice(name.length + 1);
  return value.startsWith(' ') ? value.slice(1) : value;
};

// Builds a stateful SSE parser: push(chunk) returns the complete events, flush() drains the unterminated tail.
export const createSseParser = () => {
  let buffer = '';
  let eventName = null;
  let dataLines = [];

  const dispatch = (events) => {
    const name = eventName;
    const raw = dataLines.join('\n');
    const hasData = dataLines.length > 0;
    eventName = null;
    dataLines = [];
    if (!name || !hasData) return;
    try {
      events.push({ event: name, data: JSON.parse(raw) });
    } catch {
      return;
    }
  };

  const handleLine = (line, events) => {
    if (line === '') dispatch(events);
    else if (line.startsWith(':')) return;
    else if (line.startsWith('event:')) eventName = fieldValue(line, 'event');
    else if (line.startsWith('data:')) dataLines.push(fieldValue(line, 'data'));
  };

  const takeLine = () => {
    const match = LINE_BREAK.exec(buffer);
    if (!match) return null;
    if (match[0] === '\r' && match.index === buffer.length - 1) return null;
    const line = buffer.slice(0, match.index);
    buffer = buffer.slice(match.index + match[0].length);
    return line;
  };

  const push = (chunk) => {
    const events = [];
    buffer += chunk;
    for (let line = takeLine(); line !== null; line = takeLine()) handleLine(line, events);
    return events;
  };

  const flush = () => {
    const events = [];
    if (buffer.endsWith('\r')) buffer = buffer.slice(0, -1);
    if (buffer !== '') handleLine(buffer, events);
    buffer = '';
    dispatch(events);
    return events;
  };

  return { push, flush };
};
