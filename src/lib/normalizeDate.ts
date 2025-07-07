// Utility to safely convert various date representations to a proper Date instance
// Inspired by: https://github.com/you/yourproject (MIT)
// Accepts:
//   * Date instances ‑ returned as is
//   * epoch seconds (10-digit numeric string / number)
//   * strings in the form "YYYY-MM-DD HH:MM:SS+00" (Supabase default)
//   * any ISO-8601 string (passed straight to Date ctor)
// Returns a Date  object when successful, otherwise null.
export function parseToDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;

  // Accept numeric epoch seconds
  if (/^\d{10}$/.test(String(val))) {
    const ts = Number(val) * 1000;
    return new Date(ts);
  }

  if (typeof val === 'string') {
    // Replace first space with 'T' to make it ISO compliant
    if (val.includes(' ')) {
      const isoCandidate = val.replace(' ', 'T');
      // If string already ends with an offset/Z keep it, otherwise append Z (UTC)
      const withOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(isoCandidate)
        ? isoCandidate
        : isoCandidate + 'Z';
      const d = new Date(withOffset);
      return isNaN(d.getTime()) ? null : d;
    }
    // Already looks ISO-ish
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback – attempt direct construction
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}
