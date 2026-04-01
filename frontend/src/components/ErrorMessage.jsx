import AlertMessage from './AlertMessage';

const ErrorMessage = ({ message = 'Что-то пошло не так.', onClose }) => {
  return <AlertMessage type="error" message={message} onClose={onClose} />;
};

export default ErrorMessage;
