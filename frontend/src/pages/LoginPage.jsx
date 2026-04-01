import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginOrEmail, setLoginOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from || '/profile';

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ loginOrEmail, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Не удалось выполнить вход.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="container page page--narrow">
      <h1>Вход</h1>
      <form className="panel form" onSubmit={onSubmit}>
        <label>
          Логин или электронная почта
          <input
            type="text"
            value={loginOrEmail}
            onChange={(e) => setLoginOrEmail(e.target.value)}
            placeholder="Введите логин или электронную почту"
            required
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            required
          />
        </label>

        {error && <ErrorMessage message={error} />}

        <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Выполняем вход...' : 'Войти'}
        </button>

        <p>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </section>
  );
};

export default LoginPage;
