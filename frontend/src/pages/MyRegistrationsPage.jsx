import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import RegistrationCard from '../components/RegistrationCard';
import { registrationService } from '../services/registrationService';

const MyRegistrationsPage = () => {
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cancelingId, setCancelingId] = useState(null);

  const loadRegistrations = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await registrationService.getMyRegistrations();
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить регистрации.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const handleCancelRegistration = async (registrationId) => {
    try {
      setError('');
      setMessage('');
      setCancelingId(registrationId);
      await registrationService.cancelRegistration(registrationId);
      setRegistrations((prev) =>
        prev.map((item) => (item.registrationId === registrationId ? { ...item, status: 'CANCELLED' } : item))
      );
      setMessage('Регистрация успешно отменена.');
    } catch (err) {
      setError(err.message || 'Не удалось отменить регистрацию.');
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <section className="container page">
      <h1>Мои регистрации</h1>

      {isLoading && <Loader text="Загружаем ваши регистрации..." />}
      {error && <ErrorMessage message={error} />}
      {message && <p className="page-note page-note--success">{message}</p>}

      {!isLoading && !error && registrations.length === 0 && <EmptyState message="У вас пока нет регистраций." />}

      {!isLoading && !error && registrations.length > 0 && (
        <div className="registrations-list">
          {registrations.map((registration) => (
            <RegistrationCard
              key={registration.registrationId}
              registration={registration}
              onCancel={handleCancelRegistration}
              isCancelling={cancelingId === registration.registrationId}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default MyRegistrationsPage;

