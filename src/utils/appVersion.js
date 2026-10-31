// Splits a dotted version into numeric parts; non-numeric parts count as 0.
const toParts = (version) => String(version).split('.').map((part) => Number.parseInt(part, 10) || 0);

// Compares two dotted versions numerically: negative when a < b, 0 when equal, positive when a > b.
export function compareVersions(a, b) {
  const left = toParts(a);
  const right = toParts(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

// Tells whether the running version is below the minimum; a missing minimum never blocks.
export function isBelowMinimum(current, minimum) {
  if (!minimum || !current) return false;
  return compareVersions(current, minimum) < 0;
}
