// Utility: returns today's date as an ISO "YYYY-MM-DD" string.
// Kept in its own module so it can be exported alongside the default component
// export without triggering react-refresh/only-export-components.
export const todayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
