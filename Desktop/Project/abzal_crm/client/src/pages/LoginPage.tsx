import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@crm.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.login(email, password);
      setSession(result.token, result.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
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
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Пароль
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary-button" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
