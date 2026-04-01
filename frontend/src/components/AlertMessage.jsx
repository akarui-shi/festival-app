import { useEffect } from 'react';

const TITLES = {
  success: 'Успешно',
  error: 'Ошибка',
  info: 'Информация',
  warning: 'Внимание'
};

const AlertMessage = ({
  type = 'info',
  message = '',
  title,
  onClose,
  autoHideMs = 0,
  className = ''
}) => {
  useEffect(() => {
    if (!autoHideMs || autoHideMs <= 0 || !onClose) {
      return undefined;
    }

    const timer = setTimeout(() => {
      onClose();
    }, autoHideMs);

    return () => clearTimeout(timer);
  }, [autoHideMs, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className={`alert-message alert-message--${type} ${className}`.trim()} role={type === 'error' ? 'alert' : 'status'}>
      <div className="alert-message__content">
        <p className="alert-message__title">{title || TITLES[type] || TITLES.info}</p>
        <p className="alert-message__text">{message}</p>
      </div>
      {onClose && (
        <button type="button" className="alert-message__close" onClick={onClose} aria-label="Закрыть уведомление">
          ×
        </button>
      )}
    </div>
  );
};

export default AlertMessage;
