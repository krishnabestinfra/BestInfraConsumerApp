const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats a date to the frontend standard:
 * "11 Feb 2026, 6:01 PM"
 *
 * Accepts:
 * - Date instance
 * - anything that can be passed to `new Date(value)`
 */
export const formatFrontendDateTime = (value) => {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const day = date.getDate();
  const month = MONTH_SHORT_NAMES[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // convert 0–23 to 1–12

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
};

/**
 * Date only: "11 Feb 2026"
 */
export const formatFrontendDate = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDate();
  const month = MONTH_SHORT_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Format due date as "9 Feb 2026"
 * Handles: MM/DD/YYYY (month/date/year), YYYY-MM-DD, ISO, DD/MM/YYYY
 */
export const formatDueDateDisplay = (value) => {
  if (!value || String(value).trim() === '' || String(value).trim().toUpperCase() === 'N/A') {
    return 'N/A';
  }
  const str = String(value).trim();

  // YYYY-MM-DD or ISO (2026-02-09 or 2026-02-09T00:00:00Z)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const day = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx <= 11 && day >= 1 && day <= 31) {
      return `${day} ${MONTH_SHORT_NAMES[monthIdx]} ${y}`;
    }
  }

  // MM/DD/YYYY or MM-DD-YYYY (month/date/year e.g. 2/9/2026, 02/09/2026)
  const mdyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const day = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx <= 11 && day >= 1 && day <= 31) {
      return `${day} ${MONTH_SHORT_NAMES[monthIdx]} ${y}`;
    }
  }

  // Fallback: try Date parsing
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return `${date.getDate()} ${MONTH_SHORT_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  }

  return str;
};
