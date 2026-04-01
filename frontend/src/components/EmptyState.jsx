const EmptyState = ({ message = 'Пока ничего нет.' }) => {
  return <div className="empty-state">{message}</div>;
};

export default EmptyState;
