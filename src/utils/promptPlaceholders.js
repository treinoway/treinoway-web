// Placeholder rule shared by the starter cards and the composer: "{" + 1 to 40 chars with no braces or line breaks + "}".
// why: longer or multi-line brace blocks (JSON, code the trainer pastes) are ordinary text and must not block sending.
const PLACEHOLDER_SOURCE = '\\{[^{}\\n]{1,40}\\}';

// Lists every placeholder in the text with its position, in order of appearance.
export const findPlaceholders = (text) => {
  if (typeof text !== 'string') return [];
  return [...text.matchAll(new RegExp(PLACEHOLDER_SOURCE, 'g'))].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
};

// True when the text still has at least one unfilled placeholder.
export const hasPlaceholders = (text) => findPlaceholders(text).length > 0;
