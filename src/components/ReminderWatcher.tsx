import { useEffect } from "react";
import { checkTaskReminders } from "../services/reminderService";

const CHECK_INTERVAL_MS = 60 * 1000;

export default function ReminderWatcher() {
  useEffect(() => {
    void checkTaskReminders();

    const intervalId = window.setInterval(() => {
      void checkTaskReminders();
    }, CHECK_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkTaskReminders();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, []);

  return null;
}