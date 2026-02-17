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


export const formatFrontendDate = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDate();
  const month = MONTH_SHORT_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};


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


  const mdyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const day = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx <= 11 && day >= 1 && day <= 31) {
      return `${day} ${MONTH_SHORT_NAMES[monthIdx]} ${y}`;
    }
  }


  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return `${date.getDate()} ${MONTH_SHORT_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  }

  return str;
};


export const parseDueDate = (value) => {
  if (!value || String(value).trim() === '' || String(value).trim().toLowerCase() === 'n/a') return null;
  let due = new Date(value);
  if (!Number.isNaN(due.getTime())) return due;
  const str = String(value).trim();
  const parts = str.split(/[/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      due = new Date(year, month, day);
      if (!Number.isNaN(due.getTime())) return due;
    }
  }
  return null;
};


export const getDueDaysText = (dueDateValue) => {
  const due = parseDueDate(dueDateValue);
  if (!due) return '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return daysOverdue === 1 ? '1 day Overdue' : `${daysOverdue} days Overdue`;
  }
  if (diffDays === 0) return 'Due today';
  return diffDays === 1 ? '1 day left' : `${diffDays} days left`;
};


export const formatDDMMYYYY = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};


export const formatYYYYMMDD = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
