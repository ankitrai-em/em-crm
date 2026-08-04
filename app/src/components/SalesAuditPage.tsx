import { useMemo, useState, type CSSProperties } from 'react';
import { useApp } from '../store/AppStore';
import { formatDate } from '../data/format';

export function SalesAuditPage() {
  const { state, auditSale, openLead, exportSalesCsv } = useApp();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const canExport = state.currentUser?.role === 'Admin' || !!state.rolePermissions?.[state.currentUser?.role as 'Manager' | 'Agent']?.exportData;

  const sales = useMemo(() => state.leads.filter((l) => l.sale).sort((a, b) => (b.sale!.saleDate || 0) - (a.sale!.saleDate || 0)), [state.leads]);

  if (state.currentUser?.role !== 'Admin') {
    return (
      <div style={{ padding: '12px 48px 40px' }}>
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Only Admins can audit sales.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Sales Audit">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Sales Audit</h2>
        {canExport && (
          <button
            style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={exportSalesCsv}
          >
            ↓ Export CSV
          </button>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {['Lead', 'Model', 'Amount', 'Date', 'Source', 'Status', ''].map((h) => (
              <th key={h} style={headStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sales.map((l) => {
            const sale = l.sale!;
            const pending = sale.auditStatus === 'pending' || !sale.auditStatus;
            return (
              <tr key={l.id}>
                <td style={cellStyle}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--color-accent-700)', cursor: 'pointer', padding: 0, fontSize: 14 }} onClick={() => openLead(l.id)}>
                    {l.name || l.phone}
                  </button>
                </td>
                <td style={cellStyle}>{sale.modelRange} / {sale.modelSku} / {sale.modelColour}</td>
                <td style={cellStyle}>₹{sale.amount} × {sale.quantity}</td>
                <td style={cellStyle}>{sale.saleDate ? formatDate(sale.saleDate) : '—'}</td>
                <td style={cellStyle}>{sale.saleSource}{sale.sourceName ? ` — ${sale.sourceName}` : ''}</td>
                <td style={cellStyle}>
                  <span style={{ color: pending ? 'var(--color-neutral-600)' : sale.auditStatus === 'successful' ? 'var(--color-accent-700)' : 'var(--color-accent-2-700)', fontWeight: 600 }}>
                    {pending ? 'Pending' : sale.auditStatus === 'successful' ? 'Successful' : 'Rejected'}
                  </span>
                  {sale.auditStatus === 'rejected' && sale.auditNote && <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{sale.auditNote}</div>}
                </td>
                <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                  {pending && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                        onClick={() => auditSale(l.id, 'successful', '')}
                      >
                        Mark Successful
                      </button>
                      <input
                        type="text"
                        placeholder="Rejection note…"
                        value={noteDrafts[l.id] || ''}
                        onChange={(e) => setNoteDrafts((d) => ({ ...d, [l.id]: e.target.value }))}
                        style={{ fontSize: 12, padding: '5px 8px', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', width: 140 }}
                      />
                      <button
                        style={{ background: 'transparent', color: 'var(--color-accent-2-700)', border: '1px solid var(--color-accent-2)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                        onClick={() => auditSale(l.id, 'rejected', noteDrafts[l.id] || '')}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {sales.length === 0 && (
            <tr>
              <td style={cellStyle} colSpan={7}>
                No sales recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const headStyle: CSSProperties = {
  textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', padding: 10, borderBottom: '1px solid var(--color-divider)',
};

const cellStyle: CSSProperties = { padding: '12px 10px', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' };
