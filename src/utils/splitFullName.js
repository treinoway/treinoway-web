// Splits a full name on the first space into firstName and (when present) lastName.
export const splitFullName = (fullName) => {
  const normalized = (fullName || '').trim().replace(/\s+/g, ' ');
  const separatorIndex = normalized.indexOf(' ');
  if (separatorIndex === -1) return { firstName: normalized };
  return {
    firstName: normalized.slice(0, separatorIndex),
    lastName: normalized.slice(separatorIndex + 1),
  };
};

export default splitFullName;
