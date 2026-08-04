import { useEffect, useState } from 'react';
import { useApp } from '../store/AppStore';
import { api, apiBaseUrl } from '../lib/api';

export function DealersPage() {
  const { state, showToast } = useApp();
  const [count, setCount] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (state.currentUser?.role !== 'Admin') return;
    api.getDealerCount().then((r) => setCount(r.count)).catch(() => {});
  }, [state.currentUser]);

  if (state.currentUser?.role !== 'Admin') {
    return (
      <div style={{ padding: '12px 48px 40px' }}>
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Only Admins can manage the dealer list.</p>
      </div>
    );
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.importDealers(file);
      setCount(result.count);
      showToast(`Imported ${result.count} dealers`);
    } catch (err) {
      showToast('Import failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Dealers">
      <h2 style={{ margin: '0 0 20px' }}>Dealers (Test Ride Locations)</h2>
      <div style={{ padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', maxWidth: 520 }}>
        <p style={{ marginTop: 0, fontSize: 13, color: 'var(--color-neutral-600)' }}>
          Uploading a CSV <strong>fully replaces</strong> the current dealer list. Expected columns: Name, City, State, PIN Code, Address, Primary Contact Number, Status, Franchise Code — same format as
          the franchise/dealer export.
        </p>
        <p style={{ fontSize: 13 }}>Currently loaded: <strong>{count ?? '—'}</strong> dealers.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-divider)', cursor: 'pointer', fontSize: 13 }}>
            {uploading ? 'Importing…' : 'Choose CSV file…'}
            <input type="file" accept=".csv" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} style={{ display: 'none' }} />
          </label>
          <a href={`${apiBaseUrl}/api/dealers/import/sample`} style={{ fontSize: 13, color: 'var(--color-accent-700)' }}>
            ↓ Download sample CSV
          </a>
        </div>
      </div>
    </div>
  );
}
