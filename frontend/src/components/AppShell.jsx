import { Outlet } from "react-router-dom";

import { CALENDAR_VIEWS } from "../calendar/calendarUtils";
import { CalendarControlsProvider, useCalendarControls } from "../calendar/CalendarControlsContext";
import { HamburgerMenu } from "./HamburgerMenu";
import { ClientFilterProvider } from "../filters/ClientFilterContext";

function ShellHeader() {
  const { goToToday, view, setView } = useCalendarControls();

  return (
    <header className="shell-header">
      <div className="shell-branding">
        <p className="eyebrow">Get Up and Flow</p>
      </div>
      <div className="shell-header-actions">
        <div className="shell-calendar-controls">
          <button className="calendar-today-button" onClick={goToToday} type="button">
            Today
          </button>
          <label className="shell-view-select">
            <span className="visually-hidden">Calendar view</span>
            <select value={view} onChange={(event) => setView(event.target.value)}>
              {CALENDAR_VIEWS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <HamburgerMenu />
      </div>
    </header>
  );
}

export function AppShell() {
  return (
    <ClientFilterProvider>
      <CalendarControlsProvider>
        <div className="shell-root">
          <ShellHeader />
          <Outlet />
        </div>
      </CalendarControlsProvider>
    </ClientFilterProvider>
  );
}
