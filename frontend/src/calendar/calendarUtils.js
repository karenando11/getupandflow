const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addMonthsPreservingDay(date, amount) {
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(date.getDate(), lastDay));
}

export function startOfWeek(date) {
  return addDays(startOfDay(date), -date.getDay());
}

export function endOfWeek(date) {
  return addDays(startOfWeek(date), 6);
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatMonthYear(date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayHeader(date) {
  return `${WEEKDAY_LABELS[date.getDay()]} ${date.getDate()}`;
}

export function formatLongDate(date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function getWeekDays(date) {
  const weekStart = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function getMonthGrid(date) {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function parseEventDate(event) {
  const [year, month, day] = event.event_date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateForEvent(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextOccurrenceDate(date, recurrenceType) {
  if (recurrenceType === "daily") {
    return addDays(date, 1);
  }
  if (recurrenceType === "weekly") {
    return addDays(date, 7);
  }
  if (recurrenceType === "monthly") {
    return addMonthsPreservingDay(date, 1);
  }
  return null;
}

function expandSingleEventForRange(event, startDate, endDate) {
  const eventDate = parseEventDate(event);
  const recurrenceType = event.recurrence_type || "none";
  const recurrenceUntil = event.recurrence_until ? parseEventDate({ event_date: event.recurrence_until }) : null;

  if (recurrenceType === "none") {
    if (eventDate >= startOfDay(startDate) && eventDate <= startOfDay(endDate)) {
      return [{ ...event, occurrence_date: event.event_date }];
    }
    return [];
  }

  const occurrences = [];
  let current = eventDate;
  const lastDate = recurrenceUntil || eventDate;

  while (current <= startOfDay(endDate) && current <= lastDate) {
    if (current >= startOfDay(startDate)) {
      occurrences.push({
        ...event,
        occurrence_date: formatDateForEvent(current),
        parent_event_id: event.id,
      });
    }
    const nextDate = nextOccurrenceDate(current, recurrenceType);
    if (!nextDate || isSameDay(nextDate, current)) {
      break;
    }
    current = nextDate;
  }

  return occurrences;
}

export function getEventsForRange(events, startDate, endDate) {
  return events.flatMap((event) => expandSingleEventForRange(event, startDate, endDate));
}

export function getEventsForDate(events, date) {
  return getEventsForRange(events, date, date).filter((event) =>
    isSameDay(parseEventDate({ event_date: event.occurrence_date || event.event_date }), date),
  );
}

export function getViewTitle(view, currentDate) {
  if (view === "day") {
    return formatLongDate(currentDate);
  }
  if (view === "week") {
    const weekDays = getWeekDays(currentDate);
    const startLabel = `${MONTH_LABELS[weekDays[0].getMonth()]} ${weekDays[0].getDate()}`;
    const endLabel = `${MONTH_LABELS[weekDays[6].getMonth()]} ${weekDays[6].getDate()}`;
    return `${startLabel} - ${endLabel}, ${weekDays[6].getFullYear()}`;
  }
  return formatMonthYear(currentDate);
}

export const CALENDAR_VIEWS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export { WEEKDAY_LABELS };
