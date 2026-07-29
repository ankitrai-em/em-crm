import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActivityEntry, FilterKey, Lead, Role, StageId, User } from '../types';
import { CITY_LIST, CURRENT_AGENT, NOW, ROLE_LIST, ROLE_PERMISSIONS, SOURCE_LIST, STAGE_ORDER, getDisposition, getStage } from '../data/constants';
import { formatDateTime, parseDuration } from '../data/format';
import { api } from '../lib/api';
import type { AppState } from './types';
import { emptyCallForm, emptySaleForm, emptyTestRideForm, emptyUserForm, initialState } from './types';

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function useProviderValue() {
  const [state, setStateRaw] = useState<AppState>(() => initialState([]));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .listLeads()
      .then((leads) => setStateRaw((s) => ({ ...s, leads })))
      .catch((err) => showToast('Could not reach API: ' + err.message));
    api
      .listUsers()
      .then((users) => setStateRaw((s) => ({ ...s, users })))
      .catch((err) => showToast('Could not load users: ' + err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setState = (patch: Patch) => {
    setStateRaw((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  };

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setState({ toast: msg });
    toastTimer.current = setTimeout(() => setState({ toast: '' }), 2400);
  };

  const updateLead = async (id: string, patch: Partial<Lead>, activity: string | ActivityEntry) => {
    const activityField = typeof activity === 'string' ? { activityNote: activity } : { activityEntry: activity };
    try {
      const updated = await api.patchLead(id, { ...patch, ...activityField });
      setState((s) => ({ leads: s.leads.map((l) => (l.id === id ? updated : l)) }));
    } catch (err) {
      showToast('Update failed: ' + (err as Error).message);
    }
  };

  // ---- navigation ----
  const goDashboard = () => setState({ view: 'dashboard' });
  const goLeads = () => setState({ view: 'leads' });
  const goUsers = () => setState({ view: 'users' });
  const backToLeads = () => setState({ view: 'leads' });
  const openLead = (id: string) =>
    setState({
      view: 'detail',
      selectedId: id,
      callForm: emptyCallForm,
      testRideForm: emptyTestRideForm,
      saleForm: emptySaleForm,
      followupDraft: '',
    });

  // ---- search / filters ----
  const setSearch = (value: string) => setState({ search: value, page: 1 });
  const setDateRange = (key: 'created' | 'followup' | 'task', from: string, to: string) => {
    if (key === 'created') setState({ dateFrom: from, dateTo: to, page: 1 });
    else if (key === 'followup') setState({ followupFrom: from, followupTo: to, page: 1 });
    else setState({ taskFrom: from, taskTo: to, page: 1 });
  };
  const clearDateRange = (key: 'created' | 'followup' | 'task') => setDateRange(key, '', '');
  const toggleFilterPopover = (key: FilterKey) => setState((s) => ({ openFilter: s.openFilter === key ? null : key }));
  const toggleArrayFilter = (key: 'stageFilter' | 'sourceFilter' | 'cityFilter' | 'ownerFilter', value: string) =>
    setState((s) => {
      const arr = s[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { [key]: next, page: 1 } as Partial<AppState>;
    });
  const clearArrayFilter = (key: 'stageFilter' | 'sourceFilter' | 'cityFilter' | 'ownerFilter') => setState({ [key]: [], page: 1 } as Partial<AppState>);
  const setRtOnly = (checked: boolean) => setState({ rtOnly: checked, page: 1 });
  const resetFilters = () =>
    setState({
      search: '', stageFilter: [], sourceFilter: [], cityFilter: [], ownerFilter: [],
      dateFrom: '', dateTo: '', followupFrom: '', followupTo: '', taskFrom: '', taskTo: '', rtOnly: false, page: 1,
    });

  // ---- pagination ----
  const prevPage = () => setState((s) => ({ page: Math.max(1, s.page - 1) }));
  const nextPage = () => setState((s) => ({ page: s.page + 1 }));
  const setPage = (n: number) => setState({ page: n });
  const setPageSize = (n: number) => setState({ pageSize: n, page: 1 });

  const callLead = async (id: string) => {
    const lead = state.leads.find((l) => l.id === id);
    if (!lead) return;
    showToast('Calling ' + lead.phone + '…');
    try {
      const result = await api.callLead(id);
      setState((s) => ({ leads: s.leads.map((l) => (l.id === id ? result.lead : l)) }));
      showToast(result.message);
    } catch (err) {
      showToast('Call failed: ' + (err as Error).message);
    }
  };

  // ---- quick add ----
  const openQuickAdd = () => setState({ quickAddOpen: true });
  const closeQuickAdd = () => setState({ quickAddOpen: false });
  const updateQuickField = (field: 'quickName' | 'quickPhone' | 'quickCity' | 'quickPin', value: string) => setState({ [field]: value } as Partial<AppState>);
  const submitQuickAdd = async () => {
    const { quickName, quickPhone, quickCity, quickPin } = state;
    if (!quickName || !quickPhone) {
      showToast('Name and phone are required');
      return;
    }
    try {
      const lead = await api.createLead({
        name: quickName, phone: quickPhone, city: quickCity, pin: quickPin,
        source: 'Quick Add', owner: CURRENT_AGENT,
      });
      setState((s) => ({ leads: [lead, ...s.leads], quickAddOpen: false, quickName: '', quickPhone: '', quickCity: '', quickPin: '' }));
      showToast('Lead added');
    } catch (err) {
      showToast('Could not add lead: ' + (err as Error).message);
    }
  };

  // ---- add lead ----
  const openAddLead = () => setState({ addOpen: true });
  const closeAddLead = () => setState({ addOpen: false });
  const updateAddField = (field: 'addName' | 'addPhone' | 'addEmail' | 'addCity' | 'addPin' | 'addSource' | 'addCampaign', value: string) =>
    setState({ [field]: value } as Partial<AppState>);
  const submitAddLead = async () => {
    const { addName, addPhone, addEmail, addCity, addPin, addSource, addCampaign } = state;
    if (!addName || !addPhone) {
      showToast('Name and phone are required');
      return;
    }
    let lead: Lead;
    try {
      lead = await api.createLead({
        name: addName, phone: addPhone, email: addEmail, city: addCity, pin: addPin,
        source: addSource, campaign: addCampaign, owner: CURRENT_AGENT,
      });
    } catch (err) {
      showToast('Could not add lead: ' + (err as Error).message);
      return;
    }
    setState((s) => ({ leads: [lead, ...s.leads], addOpen: false, addName: '', addPhone: '', addEmail: '', addCity: '', addPin: '', addSource: 'Website', addCampaign: '' }));
    showToast('Lead added');
  };

  // ---- follow-up ----
  const updateFollowupDraft = (value: string) => setState({ followupDraft: value });
  const saveFollowup = () => {
    const val = state.followupDraft;
    if (!val || !state.selectedId) return;
    const ts = new Date(val).getTime();
    if (ts > NOW + 15 * 86400000) {
      showToast("Follow-up can't be more than 15 days out");
      return;
    }
    updateLead(state.selectedId, { followupAt: ts }, 'Follow-up scheduled for ' + formatDateTime(ts));
    showToast('Follow-up saved');
  };

  // ---- call / remarks form ----
  const openCallForm = () => setState({ callForm: { open: true, disposition: 'not_reachable', duration: '', remarks: '' } });
  const cancelCallForm = () => setState({ callForm: emptyCallForm });
  const updateCallForm = (patch: Partial<AppState['callForm']>) => setState((s) => ({ callForm: { ...s.callForm, ...patch } }));
  const saveCallOutcome = () => {
    const lead = state.leads.find((l) => l.id === state.selectedId);
    if (!lead) return;
    const { disposition, duration, remarks } = state.callForm;
    const dispo = getDisposition(disposition);
    let newStage: StageId;
    let attempts = lead.attempts;
    if (!dispo.connected) {
      attempts = attempts + 1;
      newStage = attempts >= 3 ? 5 : 2;
    } else {
      const sec = parseDuration(duration);
      newStage = sec >= 120 ? 4 : 3;
    }
    const entry: ActivityEntry = {
      ts: Date.now(), kind: 'call', connected: dispo.connected,
      text: 'Outbound Call: ' + (dispo.connected ? 'Was called' : 'Did not answer a call') + ' by ' + CURRENT_AGENT + ' through ' + lead.phone + '.',
      duration: dispo.connected ? parseDuration(duration) : null,
      remarks: dispo.label + (remarks ? ' — ' + remarks : ''),
    };
    updateLead(lead.id, { stage: newStage, attempts }, entry);
    setState({ callForm: emptyCallForm });
    showToast('Stage updated to "' + getStage(newStage).label + '"');
  };

  // ---- test ride ----
  const openTestRideForm = () => setState({ testRideForm: { open: true, date: '', store: '', dealer: '' } });
  const cancelTestRideForm = () => setState({ testRideForm: emptyTestRideForm });
  const updateTestRideForm = (patch: Partial<AppState['testRideForm']>) => setState((s) => ({ testRideForm: { ...s.testRideForm, ...patch } }));
  const saveTestRide = () => {
    const { date, store, dealer } = state.testRideForm;
    if (!date || !store) {
      showToast('Add date and store first');
      return;
    }
    if (!state.selectedId) return;
    updateLead(state.selectedId, { stage: 6, testRide: { date: new Date(date).getTime(), store, dealer } }, 'Test ride booked at ' + store);
    setState({ testRideForm: emptyTestRideForm });
    showToast('Test ride booked');
  };

  // ---- sale ----
  const openSaleForm = () => setState({ saleForm: { open: true, docs: 'no', invoiceNo: '', amount: '', model: '', fileName: '' } });
  const cancelSaleForm = () => setState({ saleForm: emptySaleForm });
  const setSaleDocs = (docs: 'yes' | 'no') => setState((s) => ({ saleForm: { ...s.saleForm, docs } }));
  const updateSaleForm = (patch: Partial<AppState['saleForm']>) => setState((s) => ({ saleForm: { ...s.saleForm, ...patch } }));
  const onInvoiceFile = (file: File | undefined) => {
    if (file) setState((s) => ({ saleForm: { ...s.saleForm, fileName: file.name } }));
  };
  const saveSale = () => {
    const { docs, invoiceNo, amount, model, fileName } = state.saleForm;
    const stage: StageId = docs === 'yes' ? 8 : 7;
    if (!state.selectedId) return;
    const patch = { stage, sale: { invoiceNo: docs === 'yes' ? invoiceNo : '', amount, model, fileName: docs === 'yes' ? fileName : '' } };
    updateLead(state.selectedId, patch, docs === 'yes' ? 'Sale marked complete with documents' : 'Sale marked complete — documents pending');
    setState({ saleForm: emptySaleForm });
    showToast('Sale recorded');
  };

  const manualStageChange = (id: StageId) => {
    if (!state.selectedId) return;
    updateLead(state.selectedId, { stage: id }, 'Stage manually changed to ' + getStage(id).label);
    showToast('Stage updated');
  };

  // ---- derived: filtered leads ----
  const filteredLeads = useMemo(() => {
    const { search, stageFilter, sourceFilter, cityFilter, ownerFilter, dateFrom, dateTo, followupFrom, followupTo, taskFrom, taskTo, rtOnly, leads } = state;
    return leads
      .filter((l) => {
        if (ownerFilter.length && !ownerFilter.includes(l.owner)) return false;
        if (stageFilter.length && !stageFilter.includes(String(l.stage))) return false;
        if (sourceFilter.length && !sourceFilter.includes(l.source)) return false;
        if (cityFilter.length && !cityFilter.includes(l.city)) return false;
        if (rtOnly && !l.reTriggered) return false;
        if (dateFrom && l.createdOn < new Date(dateFrom).getTime()) return false;
        if (dateTo && l.createdOn > new Date(dateTo).getTime() + 86399000) return false;
        if (followupFrom && (!l.followupAt || l.followupAt < new Date(followupFrom).getTime())) return false;
        if (followupTo && (!l.followupAt || l.followupAt > new Date(followupTo).getTime() + 86399000)) return false;
        if (taskFrom && (!l.taskDate || l.taskDate < new Date(taskFrom).getTime())) return false;
        if (taskTo && (!l.taskDate || l.taskDate > new Date(taskTo).getTime() + 86399000)) return false;
        if (search) {
          const q = search.toLowerCase();
          const hay = [l.name, l.phone, l.city, l.source].filter(Boolean).join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const at = a.taskDate == null ? Infinity : a.taskDate;
        const bt = b.taskDate == null ? Infinity : b.taskDate;
        if (at !== bt) return at - bt;
        return b.createdOn - a.createdOn;
      });
  }, [state]);

  const myLeads = useMemo(() => state.leads.filter((l) => l.owner === CURRENT_AGENT), [state.leads]);

  const AGENT_LIST = useMemo(() => state.users.map((u) => u.name), [state.users]);

  // ---- user management ----
  const openAddUser = () => setState({ userForm: { ...emptyUserForm, open: true } });
  const openEditUser = (id: string) => {
    const user = state.users.find((u) => u.id === id);
    if (!user) return;
    setState({ userForm: { open: true, editingId: id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  };
  const closeUserForm = () => setState({ userForm: emptyUserForm });
  const updateUserForm = (patch: Partial<User> & { role?: Role }) => setState((s) => ({ userForm: { ...s.userForm, ...patch } }));
  const submitUserForm = async () => {
    const { editingId, name, email, phone, role } = state.userForm;
    if (!name) {
      showToast('Name is required');
      return;
    }
    try {
      if (editingId) {
        const updated = await api.patchUser(editingId, { name, email, phone, role });
        setState((s) => ({ users: s.users.map((u) => (u.id === editingId ? updated : u)), userForm: emptyUserForm }));
        showToast('User updated');
      } else {
        const created = await api.createUser({ name, email, phone, role });
        setState((s) => ({ users: [...s.users, created], userForm: emptyUserForm }));
        showToast('User added');
      }
    } catch (err) {
      showToast('Could not save user: ' + (err as Error).message);
    }
  };
  const setUserRole = async (id: string, role: Role) => {
    try {
      const updated = await api.patchUser(id, { role });
      setState((s) => ({ users: s.users.map((u) => (u.id === id ? updated : u)) }));
    } catch (err) {
      showToast('Could not update role: ' + (err as Error).message);
    }
  };
  const removeUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      setState((s) => ({ users: s.users.filter((u) => u.id !== id) }));
      showToast('User removed');
    } catch (err) {
      showToast('Could not remove user: ' + (err as Error).message);
    }
  };

  return {
    state,
    setState,
    showToast,
    goDashboard,
    goLeads,
    goUsers,
    backToLeads,
    openLead,
    setSearch,
    setDateRange,
    clearDateRange,
    toggleFilterPopover,
    toggleArrayFilter,
    clearArrayFilter,
    setRtOnly,
    resetFilters,
    prevPage,
    nextPage,
    setPage,
    setPageSize,
    callLead,
    openQuickAdd,
    closeQuickAdd,
    updateQuickField,
    submitQuickAdd,
    openAddLead,
    closeAddLead,
    updateAddField,
    submitAddLead,
    updateFollowupDraft,
    saveFollowup,
    openCallForm,
    cancelCallForm,
    updateCallForm,
    saveCallOutcome,
    openTestRideForm,
    cancelTestRideForm,
    updateTestRideForm,
    saveTestRide,
    openSaleForm,
    cancelSaleForm,
    setSaleDocs,
    updateSaleForm,
    onInvoiceFile,
    saveSale,
    manualStageChange,
    filteredLeads,
    myLeads,
    openAddUser,
    openEditUser,
    closeUserForm,
    updateUserForm,
    submitUserForm,
    setUserRole,
    removeUser,
    // static reference lists
    STAGE_ORDER,
    SOURCE_LIST,
    CITY_LIST,
    AGENT_LIST,
    ROLE_LIST,
    ROLE_PERMISSIONS,
  };
}

type AppStoreValue = ReturnType<typeof useProviderValue>;

const AppContext = createContext<AppStoreValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useProviderValue();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppStoreValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
