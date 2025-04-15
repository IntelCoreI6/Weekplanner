/**
 * Gets the days of the week for a given date
 * @param {Date} date - A date within the desired week
 * @returns {Date[]} Array of dates representing each day of the week
 */
export const getWeekDays = (date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  
  const monday = new Date(date);
  monday.setDate(diff);
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);
    weekDays.push(currentDay);
  }
  
  return weekDays;
};

/**
 * Format time from hours and optional minutes
 * @param {number} hours - Hours (0-23)
 * @param {number} minutes - Minutes (0-59)
 * @returns {string} Formatted time string (HH:MM)
 */
export const formatTime = (hours, minutes = 0) => {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Format a date in DD/MM/YYYY format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateEU = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format time in 24-hour format (HH:MM)
 * @param {number} hours - Hours (0-23)
 * @param {number} minutes - Minutes (0-59)
 * @returns {string} Formatted time string
 */
export const formatTime24h = (hours, minutes = 0) => {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const defaultTypeColors = {
  'Grote toets': '#ff6347',
  'Kleine toets': '#ffa500',
  'Huiswerk': '#6495ed',
  'Taak': '#90ee90',
  'Meebrengen': '#6f42c1',
  'Opdracht': '#17a2b8',
  'other': '#357ae8',
};
