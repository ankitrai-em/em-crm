import { useMemo, type CSSProperties } from 'react';
import { useApp } from '../../store/AppStore';
import { getStage } from '../../data/constants';
import { formatDate, formatDateTime, followupStatus, rangeCaption } from '../../data/format';
import { MultiSelectFilterHeader } from './MultiSelectFilterHeader';
import { DateRangeFilterHeader } from './DateRangeFilterHeader';
import { Pagination } from './Pagination';
import { PhoneIcon } from '../icons/Icons';

export function LeadsGrid() {
  const {
    state,
    filteredLeads,
    setSearch,
    resetFilters,
    openQuickAdd,
    openAddLead,
    openLead,
    callLead,
    toggleArrayFilter,
    clearArrayFilter,
    setDateRange,
    clearDateRange,
    setRtOnly,
    exportLeadsCsv,
    STAGE_ORDER,
    SOURCE_LIST,
    CITY_LIST,
    AGENT_LIST,
  } = useApp();
  const canExport = state.currentUser?.role === 'Admin' || !!state.rolePermissions?.[state.currentUser?.role as 'Manager' | 'Agent']?.exportData;

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / state.pageSize));
  const page = Math.min(state.page, totalPages);
  const startIdx = (page - 1) * state.pageSize;
  const pagedRows = useMemo(() => filteredLeads.slice(startIdx, startIdx + state.pageSize), [filteredLeads, startIdx, state.pageSize]);

  const stageOptions = STAGE_ORDER.map((id) => ({
    id: String(id),
    label: getStage(id).label,
    checked: state.stageFilter.includes(String(id)),
    onToggle: () => toggleArrayFilter('stageFilter', String(id)),
  }));
  const sourceOptions = SOURCE_LIST.map((src) => ({
    id: src,
    label: src,
    checked: state.sourceFilter.includes(src),
    onToggle: () => toggleArrayFilter('sourceFilter', src),
  }));
  const cityOptions = CITY_LIST.map((c) => ({
    id: c,
    label: c,
    checked: state.cityFilter.includes(c),
    onToggle: () => toggleArrayFilter('cityFilter', c),
  }));
  const ownerOptions = AGENT_LIST.map((a) => ({
    id: a,
    label: a,
    checked: state.ownerFilter.includes(a),
    onToggle: () => toggleArrayFilter('ownerFilter', a),
  }));

  const stageActiveLabel = state.stageFilter.map((id) => getStage(parseInt(id, 10)).label).join(', ');

  return (
    <div style={{ padding: '12px 48px 8px' }} data-screen-label="Leads Grid">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '14px 18px', marginBottom: 22 }}>
        <div style={{ flex: 'none' }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>Leads</h1>
          <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 3 }}>{filteredLeads.length} match</div>
        </div>

        <div style={{ minWidth: 240 }}>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Search</label>
          <input
            type="text"
            placeholder="Name, phone, city…"
            value={state.search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', minHeight: 34, padding: '6px 10px', fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 5 }}>&nbsp;</label>
          <button
            style={{ background: 'transparent', color: 'var(--color-accent)', border: 'none', padding: '8px 4px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignSelf: 'flex-end' }}>
          {canExport && (
            <button
              style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={exportLeadsCsv}
            >
              ↓ Export CSV
            </button>
          )}
          <button
            style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={openQuickAdd}
          >
            + Quick Add Lead
          </button>
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={openAddLead}
          >
            Add New Lead
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', padding: 10, borderBottom: '1px solid var(--color-divider)' }}>
              Lead
            </th>

            <MultiSelectFilterHeader
              label="Stage"
              filterKey="stage"
              options={stageOptions}
              activeLabel={stageActiveLabel}
              hasActive={state.stageFilter.length > 0}
              onClear={() => clearArrayFilter('stageFilter')}
              width={230}
            />

            <DateRangeFilterHeader
              label="Task Date"
              filterKey="task"
              from={state.taskFrom}
              to={state.taskTo}
              onFromChange={(v) => setDateRange('task', v, state.taskTo)}
              onToChange={(v) => setDateRange('task', state.taskFrom, v)}
              caption={rangeCaption(state.taskFrom, state.taskTo)}
              hasActive={!!(state.taskFrom || state.taskTo)}
              onClear={() => clearDateRange('task')}
            />

            <DateRangeFilterHeader
              label="Follow-up"
              filterKey="followup"
              from={state.followupFrom}
              to={state.followupTo}
              onFromChange={(v) => setDateRange('followup', v, state.followupTo)}
              onToChange={(v) => setDateRange('followup', state.followupFrom, v)}
              caption={rangeCaption(state.followupFrom, state.followupTo)}
              hasActive={!!(state.followupFrom || state.followupTo)}
              onClear={() => clearDateRange('followup')}
            />

            <MultiSelectFilterHeader
              label="Owner"
              filterKey="owner"
              options={ownerOptions}
              activeLabel={state.ownerFilter.join(', ')}
              hasActive={state.ownerFilter.length > 0}
              onClear={() => clearArrayFilter('ownerFilter')}
              width={200}
            />

            <MultiSelectFilterHeader
              label="Source / Campaign"
              filterKey="source"
              options={sourceOptions}
              activeLabel={state.sourceFilter.join(', ')}
              hasActive={state.sourceFilter.length > 0}
              onClear={() => clearArrayFilter('sourceFilter')}
              width={220}
            />

            <MultiSelectFilterHeader
              label="City / Pin"
              filterKey="city"
              options={cityOptions}
              activeLabel={state.cityFilter.join(', ')}
              hasActive={state.cityFilter.length > 0}
              onClear={() => clearArrayFilter('cityFilter')}
              width={200}
            />

            <DateRangeFilterHeader
              label="Created"
              filterKey="created"
              from={state.dateFrom}
              to={state.dateTo}
              onFromChange={(v) => setDateRange('created', v, state.dateTo)}
              onToChange={(v) => setDateRange('created', state.dateFrom, v)}
              caption={rangeCaption(state.dateFrom, state.dateTo)}
              hasActive={!!(state.dateFrom || state.dateTo)}
              onClear={() => clearDateRange('created')}
            />

            <th style={{ textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', padding: 10, borderBottom: '1px solid var(--color-divider)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '2px 6px', borderRadius: 3, background: state.rtOnly ? 'color-mix(in srgb, var(--color-process-yellow) 45%, var(--color-bg))' : 'transparent', width: 'fit-content' }}>
                <input type="checkbox" checked={state.rtOnly} onChange={(e) => setRtOnly(e.target.checked)} style={{ width: 13, height: 13, accentColor: 'var(--color-accent-2)' }} />
                RT
              </label>
            </th>
            <th style={{ textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', padding: 10, borderBottom: '1px solid var(--color-divider)' }}></th>
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((l) => {
            const st = getStage(l.stage);
            const tag = followupStatus(l.followupAt, l.stage);
            const tagText = tag === 'overdue' ? 'Overdue' : tag === 'today' ? 'Due today' : tag === 'upcoming' ? 'Upcoming' : '';
            const tagColor = tag === 'overdue' ? 'var(--color-accent-2-700)' : tag === 'today' ? 'var(--color-accent-700)' : 'var(--color-neutral-600)';
            return (
              <tr
                key={l.id}
                style={{ cursor: 'pointer' }}
                onClick={() => openLead(l.id)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text) 4%, transparent)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={cellStyle}>
                  <div style={{ fontWeight: 600 }}>{l.name || '[No Name]'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{l.phone}</span>
                    <button
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--color-accent)', background: 'var(--color-accent-100)', color: 'var(--color-accent-700)', cursor: 'pointer', padding: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        callLead(l.id);
                      }}
                      title="Call"
                    >
                      <PhoneIcon size={11} />
                    </button>
                  </div>
                </td>
                <td style={cellStyle}>
                  <span style={{ display: 'inline-flex', fontSize: 11, padding: '3px 10px', borderRadius: 3, background: st.bg, color: st.color }}>{st.label}</span>
                </td>
                <td style={cellStyle}>{l.taskDate ? formatDateTime(l.taskDate) : '—'}</td>
                <td style={cellStyle}>
                  <div>{l.followupAt ? formatDateTime(l.followupAt) : '—'}</div>
                  {tag && <div style={{ fontSize: 11, fontWeight: 600, color: tagColor, marginTop: 2 }}>{tagText}</div>}
                </td>
                <td style={cellStyle}>{l.owner}</td>
                <td style={cellStyle}>
                  <div>{l.source}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>{l.campaign}</div>
                </td>
                <td style={cellStyle}>
                  <div>{l.city}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>{l.pin}</div>
                </td>
                <td style={cellStyle}>{formatDate(l.createdOn)}</td>
                <td style={cellStyle}>
                  {l.reTriggered && (
                    <span style={{ display: 'inline-flex', fontSize: 10, fontWeight: 700, letterSpacing: '.03em', padding: '3px 8px', borderRadius: 3, border: '1px solid var(--color-accent-2)', color: 'var(--color-accent-2-700)' }}>
                      Repeat User
                    </span>
                  )}
                </td>
                <td style={{ ...cellStyle, color: 'var(--color-accent)', fontSize: 13 }}>View →</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Pagination totalCount={filteredLeads.length} />
    </div>
  );
}

const cellStyle: CSSProperties = { padding: '12px 10px', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' };
