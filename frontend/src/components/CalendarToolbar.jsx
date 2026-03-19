export function CalendarToolbar({
  currentTitle,
  isMiniCalendarOpen,
  onNavigate,
  onToggleMiniCalendar,
}) {
  return (
    <div className="calendar-toolbar">
      <div className="calendar-nav-group">
        <button className="calendar-nav-button" onClick={() => onNavigate(-1)} type="button">
          {"<"}
        </button>
        <button
          aria-expanded={isMiniCalendarOpen}
          className="calendar-title-button"
          onClick={onToggleMiniCalendar}
          type="button"
        >
          {currentTitle}
        </button>
        <button className="calendar-nav-button" onClick={() => onNavigate(1)} type="button">
          {">"}
        </button>
      </div>
    </div>
  );
}
