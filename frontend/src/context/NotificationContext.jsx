import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const NotificationContext = createContext(null);

const SUCCESS_AUTO_HIDE_MS = 3500;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    ({ type = 'info', title = '', message = '', autoHideMs }) => {
      if (!message) {
        return null;
      }

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const next = { id, type, title, message };
      setNotifications((prev) => [...prev, next]);

      const resolvedAutoHideMs =
        typeof autoHideMs === 'number' ? autoHideMs : (type === 'success' ? SUCCESS_AUTO_HIDE_MS : 0);

      if (resolvedAutoHideMs > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, resolvedAutoHideMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      notify,
      notifySuccess: (message, options = {}) => notify({ ...options, type: 'success', message }),
      notifyError: (message, options = {}) => notify({ ...options, type: 'error', message }),
      notifyInfo: (message, options = {}) => notify({ ...options, type: 'info', message }),
      notifyWarning: (message, options = {}) => notify({ ...options, type: 'warning', message }),
      dismiss
    }),
    [notifications, notify, dismiss]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification должен использоваться внутри NotificationProvider');
  }
  return context;
};
