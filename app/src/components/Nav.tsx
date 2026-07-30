import { useApp } from '../store/AppStore';
import { initials } from '../data/format';

export function Nav() {
  const { state, goDashboard, goLeads, goUsers, logout } = useApp();
  const view = state.view;
  const user = state.currentUser;
  const dashboardColor = view === 'dashboard' ? 'var(--color-accent-700)' : 'var(--color-text)';
  const leadsColor = view === 'leads' || view === 'detail' ? 'var(--color-accent-700)' : 'var(--color-text)';
  const usersColor = view === 'users' ? 'var(--color-accent-700)' : 'var(--color-text)';
  const dashboardWeight = view === 'dashboard' ? 600 : 400;
  const leadsWeight = view === 'leads' || view === 'detail' ? 600 : 400;
  const usersWeight = view === 'users' ? 600 : 400;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '20px 48px' }}>
      <div
        style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, letterSpacing: '-0.01em', cursor: 'pointer' }}
        onClick={goDashboard}
      >
        EM Leads
      </div>
      <div style={{ display: 'flex', gap: 26, marginRight: 'auto' }}>
        <a href="#" style={{ fontSize: 14, color: dashboardColor, fontWeight: dashboardWeight }} onClick={(e) => { e.preventDefault(); goDashboard(); }}>
          Dashboard
        </a>
        <a href="#" style={{ fontSize: 14, color: leadsColor, fontWeight: leadsWeight }} onClick={(e) => { e.preventDefault(); goLeads(); }}>
          Leads
        </a>
        <a href="#" style={{ fontSize: 14, color: usersColor, fontWeight: usersWeight }} onClick={(e) => { e.preventDefault(); goUsers(); }}>
          Users
        </a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: '50%', background: 'var(--color-accent-100)', color: 'var(--color-accent-800)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flex: 'none',
          }}
        >
          {initials(user?.name ?? null)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.2 }}>{user?.role}</div>
        </div>
        <a href="#" style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginLeft: 4 }} onClick={(e) => { e.preventDefault(); logout(); }}>
          Log out
        </a>
      </div>
    </div>
  );
}
