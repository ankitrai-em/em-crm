import type { Lead } from '../../types';
import { useApp } from '../../store/AppStore';
import { apiBaseUrl } from '../../lib/api';
import { UploadIcon } from '../icons/Icons';

export function SaleCard({ lead }: { lead: Lead }) {
  const { state, openSaleForm, cancelSaleForm, setSaleDocs, updateSaleForm, onInvoiceFile, saveSale } = useApp();
  const form = state.saleForm;
  const hasInvoice = !!(lead.sale && lead.sale.invoiceNo);
  const missingInvoice = !!(lead.sale && !lead.sale.invoiceNo);

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22 }}>
      <h5 style={{ margin: '0 0 14px' }}>Sale</h5>
      {lead.sale && (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Model:</span> {lead.sale.model}
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Amount:</span> ₹{lead.sale.amount}
          </div>
          {hasInvoice && (
            <div>
              <span style={{ color: 'var(--color-neutral-600)' }}>Invoice:</span> {lead.sale.invoiceNo} —{' '}
              {lead.sale.fileUrl ? (
                <a href={`${apiBaseUrl}${lead.sale.fileUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent-700)' }}>
                  {lead.sale.fileName}
                </a>
              ) : (
                lead.sale.fileName
              )}
            </div>
          )}
          {missingInvoice && <div style={{ color: 'var(--color-accent-2-700)', fontWeight: 600 }}>Documents pending</div>}
        </div>
      )}
      {!form.open && (
        <button
          style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onClick={openSaleForm}
        >
          {lead.sale ? 'Update Sale' : 'Mark as Sold'}
        </button>
      )}
      {form.open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: 'fit-content' }}>
            <button
              style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', border: 'none', background: form.docs === 'no' ? 'var(--color-accent-2-600)' : 'var(--color-bg)', color: form.docs === 'no' ? 'var(--color-bg)' : 'var(--color-text)' }}
              onClick={() => setSaleDocs('no')}
            >
              Without docs
            </button>
            <button
              style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', border: 'none', borderLeft: '1px solid var(--color-divider)', background: form.docs === 'yes' ? 'var(--color-accent-600)' : 'var(--color-bg)', color: form.docs === 'yes' ? 'var(--color-bg)' : 'var(--color-text)' }}
              onClick={() => setSaleDocs('yes')}
            >
              With docs
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Vehicle model / variant</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => updateSaleForm({ model: e.target.value })}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Sale amount (₹)</label>
              <input
                type="text"
                value={form.amount}
                onChange={(e) => updateSaleForm({ amount: e.target.value })}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
          </div>
          {form.docs === 'yes' && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Invoice number</label>
                <input
                  type="text"
                  value={form.invoiceNo}
                  onChange={(e) => updateSaleForm({ invoiceNo: e.target.value })}
                  style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Upload invoice</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px dashed var(--color-divider)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>
                  <UploadIcon size={15} />
                  {form.uploading ? 'Uploading…' : form.fileName || 'Choose file…'}
                  <input type="file" accept=".pdf,.jpg,.png" disabled={form.uploading} onChange={(e) => onInvoiceFile(e.target.files?.[0])} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={saveSale}
            >
              Save Sale
            </button>
            <button
              style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}
              onClick={cancelSaleForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
