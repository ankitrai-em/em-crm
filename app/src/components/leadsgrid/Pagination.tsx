import { useApp } from '../../store/AppStore';

interface Props {
  totalCount: number;
}

export function Pagination({ totalCount }: Props) {
  const { state, prevPage, nextPage, setPage, setPageSize } = useApp();
  const totalPages = Math.max(1, Math.ceil(totalCount / state.pageSize));
  const page = Math.min(state.page, totalPages);
  const startIdx = (page - 1) * state.pageSize;
  const pageStartDisplay = totalCount === 0 ? 0 : startIdx + 1;
  const pageEndDisplay = Math.min(startIdx + state.pageSize, totalCount);

  let start = Math.max(1, page - 1);
  let end = Math.min(totalPages, start + 2);
  start = Math.max(1, end - 2);
  const pageNums: number[] = [];
  for (let n = start; n <= end; n++) pageNums.push(n);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>
          Showing {pageStartDisplay}–{pageEndDisplay} of {totalCount}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>Show</label>
          <select
            value={state.pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            style={{ minHeight: 30, padding: '4px 8px', fontSize: 12, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}
          onClick={prevPage}
        >
          ←
        </button>
        {pageNums.map((n) => (
          <button
            key={n}
            style={{
              minWidth: 32, borderRadius: 'var(--radius-md)', padding: '7px 10px', fontSize: 13, cursor: 'pointer',
              background: n === page ? 'var(--color-accent)' : 'var(--color-bg)', color: n === page ? 'var(--color-bg)' : 'var(--color-text)',
              border: '1px solid var(--color-divider)',
            }}
            onClick={() => setPage(n)}
          >
            {n}
          </button>
        ))}
        <button
          style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}
          onClick={nextPage}
        >
          →
        </button>
      </div>
    </div>
  );
}
