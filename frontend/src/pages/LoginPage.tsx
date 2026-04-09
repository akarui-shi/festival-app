import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Заполните все поля'); return; }
    setLoading(true); setError('');
    try {
      await login(email, password);
      toast.success('Добро пожаловать!');
      navigate('/');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <PublicLayout>
      <div className="container max-w-md py-16">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold mb-2">Вход</h1>
          <p className="text-muted-foreground">Войдите в свой аккаунт</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ваш пароль" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Вход...' : 'Войти'}</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Нет аккаунта? <Link to="/register" className="text-primary hover:underline">Зарегистрироваться</Link>
        </p>

        <div className="mt-8 p-4 rounded-xl bg-muted text-sm">
          <p className="font-medium mb-2">Тестовые аккаунты:</p>
          <div className="space-y-1 text-muted-foreground text-xs">
            <p>👤 resident1@mail.com / Passw0rd123 (Житель)</p>
            <p>🎪 organizer1@mail.com / Passw0rd123 (Организатор)</p>
            <p>🛡️ admin1@mail.com / Passw0rd123 (Администратор)</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
