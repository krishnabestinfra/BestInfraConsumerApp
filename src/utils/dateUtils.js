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
