const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today" for the current session day, otherwise "16 Nov 2026". Dates are local calendar days, so no time zone maths. */
export function formatSessionDay(sessionDate: string, today: string): string {
  if (sessionDate === today) return 'Today';
  const [year, month, day] = sessionDate.split('-');
  const name = MONTHS[Number(month) - 1];
  return name === undefined || !year || !day ? sessionDate : `${Number(day)} ${name} ${year}`;
}
