import { LayoutDashboard, LogOut, Plus, RefreshCw, TableProperties } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, clearSession, getCurrentUser } from '../api/client';

export function AppLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  async function runNotifications() {
    await api.runNotifications();
    alert('Проверка уведомлений выполнена');
  }

  function logout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span>Абзал СРМ</span>
          <small>Сводник</small>
        </Link>
        <nav className="nav">
          <NavLink to="/">
            <LayoutDashboard size={16} /> Дашборд
          </NavLink>
          <NavLink to="/cases">
            <TableProperties size={16} /> Дела
          </NavLink>
          <NavLink to="/cases/new">
            <Plus size={16} /> Новая запись
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="ghost-button" onClick={runNotifications}>
            <RefreshCw size={16} /> Проверить уведомления
          </button>
          <div className="userbox">
            <strong>{user?.name || 'Пользователь'}</strong>
            <span>@{user?.username || 'user'}</span>
          </div>
          <button className="ghost-button" onClick={logout}>
            <LogOut size={16} /> Выйти
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
