import { useCallback, useState } from 'react';
import { useApp } from '../store/AppStore';
import { initials } from '../data/format';
import { useClickOutside } from '../hooks/useClickOutside';
import type { View } from '../types';

export function Nav() {
  const { state, goDashboard, goLeads, goImportLeads, goUsers, goInventory, goAccessories, goIntegrations, goDispositions, goDealers, goAuditLog, goSalesAudit, goPermissions, logout, openChangePassword } = useApp();
  const [adminOpen, setAdminOpen] = useState(false);
  const closeAdminMenu = useCallback(() => setAdminOpen(false), []);
  const adminMenuRef = useClickOutside<HTMLDivElement>(closeAdminMenu, adminOpen);
  const view = state.view;
  const user = state.currentUser;
  const isAdmin = user?.role === 'Admin';

  const linkStyle = (active: boolean) => ({ fontSize: 14, color: active ? 'var(--color-accent-700)' : 'var(--color-text)', fontWeight: active ? 600 : 400 });
  const adminViews: View[] = ['integrations', 'dispositions', 'dealers', 'audit-log', 'sales-audit', 'permissions'];
  const adminActive = adminViews.includes(view);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '20px 48px', position: 'relative' }}>
      <div
        style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, letterSpacing: '-0.01em', cursor: 'pointer' }}
        onClick={goDashboard}
      >
        EM Leads
      </div>
      <div style={{ display: 'flex', gap: 26, marginRight: 'auto', alignItems: 'center' }}>
        <a href="#" style={linkStyle(view === 'dashboard')} onClick={(e) => { e.preventDefault(); goDashboard(); }}>
          Dashboard
        </a>
        <a href="#" style={linkStyle(view === 'leads' || view === 'detail')} onClick={(e) => { e.preventDefault(); goLeads(); }}>
          Leads
        </a>
        <a href="#" style={linkStyle(view === 'import-leads')} onClick={(e) => { e.preventDefault(); goImportLeads(); }}>
          Import Leads
        </a>
        <a href="#" style={linkStyle(view === 'users')} onClick={(e) => { e.preventDefault(); goUsers(); }}>
          Users
        </a>
        <a href="#" style={linkStyle(view === 'inventory')} onClick={(e) => { e.preventDefault(); goInventory(); }}>
          Inventory
        </a>
        <a href="#" style={linkStyle(view === 'accessories')} onClick={(e) => { e.preventDefault(); goAccessories(); }}>
          Accessories
        </a>
        {isAdmin && (
          <div ref={adminMenuRef} style={{ position: 'relative' }}>
            <a href="#" style={linkStyle(adminActive)} onClick={(e) => { e.preventDefault(); setAdminOpen((o) => !o); }}>
              Admin ▾
            </a>
            {adminOpen && (
              <div
                style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-md)', padding: 8, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160, zIndex: 40 }}
              >
                {[
                  { label: 'Integrations', view: 'integrations' as View, go: goIntegrations },
                  { label: 'Dispositions', view: 'dispositions' as View, go: goDispositions },
                  { label: 'Dealers', view: 'dealers' as View, go: goDealers },
                  { label: 'Audit Log', view: 'audit-log' as View, go: goAuditLog },
                  { label: 'Sales Audit', view: 'sales-audit' as View, go: goSalesAudit },
                  { label: 'Permissions', view: 'permissions' as View, go: goPermissions },
                ].map((item) => (
                  <a
                    key={item.view}
                    href="#"
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 4, color: view === item.view ? 'var(--color-accent-700)' : 'var(--color-text)', fontWeight: view === item.view ? 600 : 400 }}
                    onClick={(e) => { e.preventDefault(); item.go(); setAdminOpen(false); }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
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
        <a href="#" style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginLeft: 4 }} onClick={(e) => { e.preventDefault(); openChangePassword(); }}>
          Change Password
        </a>
        <a href="#" style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginLeft: 4 }} onClick={(e) => { e.preventDefault(); logout(); }}>
          Log out
        </a>
      </div>
    </div>
  );
}
