import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AlertMessage from '../components/AlertMessage';
import { toUserErrorMessage } from '../utils/errorMessages';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    login: '',
    email: '',
    password: '',
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
      await register(formData);
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
      <h1>Регистрация</h1>
      <form className="panel form" onSubmit={onSubmit}>
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
          {isSubmitting ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
        </button>

        <p>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </section>
  );
};

export default RegisterPage;
