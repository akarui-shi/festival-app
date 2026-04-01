const ErrorMessage = ({ message = 'Что-то пошло не так.' }) => {
  return <div className="error-message">{message}</div>;
};

export default ErrorMessage;
