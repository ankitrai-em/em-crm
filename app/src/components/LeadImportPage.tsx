import { useState } from 'react';
import { useApp } from '../store/AppStore';
import { api, apiBaseUrl } from '../lib/api';
import type { LeadImportResult } from '../types';

export function LeadImportPage() {
  const { showToast, refreshLeads } = useApp();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<LeadImportResult | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await api.importLeads(file);
      setResult(res);
      showToast(`Imported ${res.created} lead${res.created === 1 ? '' : 's'}${res.merged ? `, merged ${res.merged} repeat${res.merged === 1 ? '' : 's'}` : ''}`);
      refreshLeads();
    } catch (err) {
      showToast('Import failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Import Leads">
      <h2 style={{ margin: '0 0 20px' }}>Import Leads</h2>

      <div style={{ padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', maxWidth: 560 }}>
        <p style={{ marginTop: 0, fontSize: 13, color: 'var(--color-neutral-600)' }}>
          Upload a CSV of leads — the columns match what you see in the Leads grid. <strong>Phone number is the only required column</strong>; everything else is optional. Rows missing a phone
          number are skipped and reported below, not silently dropped.
        </p>

        <a
          href={`${apiBaseUrl}/api/leads/import/sample`}
          download
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-accent-700)', marginBottom: 18 }}
        >
          ↓ Download sample CSV
        </a>

        <div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-divider)', cursor: 'pointer', fontSize: 13 }}>
            {uploading ? 'Importing…' : 'Choose CSV file…'}
            <input type="file" accept=".csv" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} style={{ display: 'none' }} />
          </label>
        </div>

        {result && (
          <div style={{ marginTop: 20, fontSize: 13 }}>
            <p style={{ fontWeight: 600, color: 'var(--color-accent-700)' }}>
              {result.created} lead{result.created === 1 ? '' : 's'} created.
              {result.merged > 0 && ` ${result.merged} repeat submission${result.merged === 1 ? '' : 's'} merged into existing leads.`}
            </p>
            {result.errors.length > 0 && (
              <>
                <p style={{ fontWeight: 600, color: 'var(--color-accent-2-700)', marginBottom: 6 }}>
                  {result.errors.length} row{result.errors.length === 1 ? '' : 's'} skipped:
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-neutral-600)' }}>
                  {result.errors.map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
