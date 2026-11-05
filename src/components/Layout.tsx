import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Logo } from './Logo';

export function RequireAuth() {
  const { isAuthed } = useAuth(); const loc = useLocation();
  return isAuthed ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}

export function AppLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="topbar-logo" aria-label="Presento 홈"><Logo size={24} /></NavLink>
        <nav className="topbar-nav" aria-label="주 메뉴">
          <NavLink to="/" end className={({ isActive }) => `topnav${isActive ? ' on' : ''}`}>내 발표</NavLink>
          <NavLink to="/presentations/new" className={({ isActive }) => `topnav${isActive ? ' on' : ''}`}>새 발표</NavLink>
          <NavLink to="/mypage" className={({ isActive }) => `topnav${isActive ? ' on' : ''}`}>마이페이지</NavLink>
        </nav>
        <div className="topbar-user">
          <span className="t-body-strong">{user?.nickname ?? ''}</span>
          <button className="link link-plain link-muted t-small" onClick={signOut}>로그아웃</button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export function BackLink({ to, children }: { to: string; children: string }) {
  return <NavLink to={to} className="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>{children}</NavLink>;
}

export function Loading({ label = '불러오는 중' }: { label?: string }) {
  return <div className="state" role="status"><span className="t-small c-3">{label}</span></div>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <p className="t-body c-err">{message}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>다시 불러오기</button>}
    </div>
  );
}
