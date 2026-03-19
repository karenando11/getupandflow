import { createContext, useContext, useState } from "react";

const CalendarControlsContext = createContext(null);

export function CalendarControlsProvider({ children }) {
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const value = {
    currentDate,
    setCurrentDate,
    view,
    setView,
    goToToday() {
      setCurrentDate(new Date());
    },
  };

  return <CalendarControlsContext.Provider value={value}>{children}</CalendarControlsContext.Provider>;
}

export function useCalendarControls() {
  const context = useContext(CalendarControlsContext);
  if (!context) {
    throw new Error("useCalendarControls must be used within a CalendarControlsProvider");
  }
  return context;
}
