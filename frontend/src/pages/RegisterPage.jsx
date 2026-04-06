import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AlertMessage from '../components/AlertMessage';
import { toUserErrorMessage } from '../utils/errorMessages';
import { ROLE } from '../utils/roles';

const REGISTRATION_MODE = {
  RESIDENT: 'resident',
  ORGANIZER: 'organizer'
};

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(REGISTRATION_MODE.RESIDENT);
  const isOrganizerMode = mode === REGISTRATION_MODE.ORGANIZER;

  const [formData, setFormData] = useState({
    login: '',
    email: '',
    password: '',
    companyName: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const [formNotice, setFormNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormNotice(null);
    setIsSubmitting(true);

    try {
      const payload = {
        login: formData.login,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: isOrganizerMode ? ROLE.ORGANIZER : ROLE.RESIDENT,
        ...(isOrganizerMode ? { companyName: formData.companyName } : {})
      };
      await register(payload);
      navigate('/profile', { replace: true });
    } catch (err) {
      setFormNotice({
        type: 'error',
        message: toUserErrorMessage(err, 'Не удалось завершить регистрацию.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="container page page--narrow">
      <h1>{isOrganizerMode ? 'Регистрация организатора' : 'Регистрация'}</h1>
      <form className="panel form" onSubmit={onSubmit}>
        {isOrganizerMode ? (
          <div className="register-mode-switch">
            <p className="register-mode-switch__text">Форма для организатора мероприятий</p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setMode(REGISTRATION_MODE.RESIDENT)}
            >
              Обычная регистрация
            </button>
          </div>
        ) : (
          <div className="register-mode-switch">
            <p className="register-mode-switch__text">Проводите события или конференции?</p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setMode(REGISTRATION_MODE.ORGANIZER)}
            >
              Зайти как организатор
            </button>
          </div>
        )}

        <label>
          Логин
          <input name="login" value={formData.login} onChange={onChange} placeholder="Придумайте логин" required />
        </label>

        <label>
          Электронная почта
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            placeholder="Введите электронную почту"
            required
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={onChange}
            placeholder="Введите пароль"
            required
          />
        </label>

        {isOrganizerMode && (
          <label>
            Компания
            <input
              name="companyName"
              value={formData.companyName}
              onChange={onChange}
              placeholder="ООО Пример Ивент"
              required
            />
          </label>
        )}

        <label>
          Имя
          <input name="firstName" value={formData.firstName} onChange={onChange} placeholder="Иван" />
        </label>

        <label>
          Фамилия
          <input name="lastName" value={formData.lastName} onChange={onChange} placeholder="Иванов" />
        </label>

        <label>
          Телефон
          <input name="phone" value={formData.phone} onChange={onChange} placeholder="+7 (900) 000-00-00" />
        </label>

        {formNotice && (
          <AlertMessage
            type={formNotice.type}
            message={formNotice.message}
            onClose={() => setFormNotice(null)}
          />
        )}

        <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Создаём аккаунт...'
            : isOrganizerMode
              ? 'Зарегистрироваться как организатор'
              : 'Зарегистрироваться'}
        </button>

        <p>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </section>
  );
};

export default RegisterPage;
