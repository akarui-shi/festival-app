import { useNotification } from '../context/NotificationContext';
import AlertMessage from './AlertMessage';

const NotificationCenter = () => {
  const { notifications, dismiss } = useNotification();

  if (!notifications.length) {
    return null;
  }

  return (
    <div className="notification-center" aria-live="polite" aria-label="Уведомления">
      {notifications.map((item) => (
        <AlertMessage
          key={item.id}
          type={item.type}
          title={item.title}
          message={item.message}
          onClose={() => dismiss(item.id)}
          className="notification-center__item"
        />
      ))}
    </div>
  );
};

export default NotificationCenter;
