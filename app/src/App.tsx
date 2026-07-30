import { AppProvider, useApp } from './store/AppStore';
import { Nav } from './components/Nav';
import { Toast } from './components/Toast';
import { Dashboard } from './components/Dashboard';
import { LeadsGrid } from './components/leadsgrid/LeadsGrid';
import { LeadDetail } from './components/leaddetail/LeadDetail';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { AddLeadModal } from './components/modals/AddLeadModal';
import { UsersPage } from './components/UsersPage';
import { UserModal } from './components/modals/UserModal';
import { ResetPasswordModal } from './components/modals/ResetPasswordModal';
import { LoginPage } from './components/LoginPage';

function Screen() {
  const { state } = useApp();
  if (state.view === 'dashboard') return <Dashboard />;
  if (state.view === 'leads') return <LeadsGrid />;
  if (state.view === 'users') return <UsersPage />;
  return <LeadDetail />;
}

function AppShell() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
      <Nav />
      <Toast />
      <Screen />
      <QuickAddModal />
      <AddLeadModal />
      <UserModal />
      <ResetPasswordModal />
    </div>
  );
}

function Root() {
  const { state } = useApp();
  if (!state.authChecked) return null;
  if (!state.currentUser) return <LoginPage />;
  return <AppShell />;
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
