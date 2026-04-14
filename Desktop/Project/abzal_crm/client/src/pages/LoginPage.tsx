import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result =
        mode === 'login'
          ? await api.login(username, password)
          : await api.register(name, username, password);

      setSession(result.token, result.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <div>
          <p className="eyebrow">Внутренняя CRM</p>
          <h1>Финансовые управляющие</h1>
          <p>Работа по делам, контрольные даты и Telegram-подтверждения.</p>
        </div>

        <div className="auth-switcher">
          <button type="button" className={mode === 'login' ? 'primary-button' : 'ghost-button'} onClick={() => setMode('login')}>
            Вход
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'primary-button' : 'ghost-button'}
            onClick={() => {
              setMode('register');
              setName('');
              setUsername('');
              setPassword('');
            }}
          >
            Регистрация
          </button>
        </div>

        {mode === 'register' && (
          <label>
            ФИО
            <input value={name} onChange={(event) => setName(event.target.value)} type="text" placeholder="Введите ФИО" />
          </label>
        )}

        <label>
          Логин
          <input value={username} onChange={(event) => setUsername(event.target.value)} type="text" placeholder="Например, almaz" />
        </label>

        <label>
          Пароль
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>

        {error && <div className="error">{error}</div>}
        <button className="primary-button" disabled={loading}>
          {loading ? (mode === 'login' ? 'Вход...' : 'Регистрация...') : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>
    </main>
  );
}
