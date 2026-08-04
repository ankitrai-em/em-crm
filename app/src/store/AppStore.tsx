import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActivityEntry, Dealer, FilterKey, Lead, RolePermissions, Role, StageId, User } from '../types';
import { CITY_LIST, NOW, ROLE_LIST, SOURCE_LIST, STAGE_ORDER, getStage } from '../data/constants';
import { formatDateTime, parseDuration } from '../data/format';
import { api, auth } from '../lib/api';
import type { AppState } from './types';
import { emptyAccessoryForm, emptyCallForm, emptyContactForm, emptyCustomerProfileForm, emptyInventoryForm, emptySaleForm, emptyTestRideForm, emptyUserForm, initialState } from './types';

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function useProviderValue() {
  const [state, setStateRaw] = useState<AppState>(() => initialState([]));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setState = (patch: Patch) => {
    setStateRaw((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  };

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setState({ toast: msg });
    toastTimer.current = setTimeout(() => setState({ toast: '' }), 2400);
  };

  const loadWorkspace = (user: User) => {
    setState({ currentUser: user, ownerFilter: [user.name] });
    api.listLeads().then((leads) => setStateRaw((s) => ({ ...s, leads }))).catch((err) => showToast('Could not load leads: ' + err.message));
    api.listUsers().then((users) => setStateRaw((s) => ({ ...s, users }))).catch((err) => showToast('Could not load users: ' + err.message));
    api.getDispositions().then((dispositions) => setStateRaw((s) => ({ ...s, dispositions }))).catch((err) => showToast('Could not load dispositions: ' + err.message));
    api.listInventory().then((inventory) => setStateRaw((s) => ({ ...s, inventory }))).catch((err) => showToast('Could not load inventory: ' + err.message));
    api.listAccessories().then((accessories) => setStateRaw((s) => ({ ...s, accessories }))).catch((err) => showToast('Could not load accessories: ' + err.message));
    api.getPermissions().then(({ permissions, keys }) => setStateRaw((s) => ({ ...s, rolePermissions: permissions, permissionKeys: keys }))).catch(() => {});
  };

  useEffect(() => {
    const token = auth.getToken();
    if (!token) {
      setState({ authChecked: true });
      return;
    }
    api
      .me()
      .then((user) => {
        loadWorkspace(user);
        setState({ authChecked: true });
      })
      .catch(() => {
        auth.clearToken();
        setState({ authChecked: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- auth ----
  const updateLoginField = (field: 'loginEmail' | 'loginPassword', value: string) => setState({ [field]: value, loginError: '' } as Partial<AppState>);
  const login = async () => {
    const { loginEmail, loginPassword } = state;
    if (!loginEmail || !loginPassword) {
      setState({ loginError: 'Email and password are required' });
      return;
    }
    setState({ loginBusy: true, loginError: '' });
    try {
      const { token, user } = await api.login(loginEmail, loginPassword);
      auth.setToken(token);
      loadWorkspace(user);
      setState({ loginBusy: false, loginEmail: '', loginPassword: '', loginError: '' });
    } catch (err) {
      setState({ loginBusy: false, loginError: (err as Error).message });
    }
  };
  const logout = () => {
    auth.clearToken();
    setStateRaw(() => ({ ...initialState([]), authChecked: true }));
  };

  // The 11:59 PM daily reset invalidates every outstanding session token server-side;
  // api.ts detects the resulting 401 and fires this event so an open tab drops back to
  // the login screen instead of just failing every request with a cryptic error.
  useEffect(() => {
    const onExpired = () => {
      showToast('Session expired, please log in again');
      logout();
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLead = async (id: string, patch: Partial<Lead>, activity: string | ActivityEntry) => {
    const activityField = typeof activity === 'string' ? { activityNote: activity } : { activityEntry: activity };
    try {
      const updated = await api.patchLead(id, { ...patch, ...activityField });
      setState((s) => ({ leads: s.leads.map((l) => (l.id === id ? updated : l)) }));
      return updated;
    } catch (err) {
      showToast('Update failed: ' + (err as Error).message);
      return null;
    }
  };

  const refreshLeads = async () => {
    try {
      const leads = await api.listLeads();
      setState({ leads });
    } catch (err) {
      showToast('Could not refresh leads: ' + (err as Error).message);
    }
  };

  // ---- navigation ----
  const goDashboard = () => setState({ view: 'dashboard' });
  const goLeads = () => setState({ view: 'leads' });
  const goUsers = () => setState({ view: 'users' });
  const goImportLeads = () => setState({ view: 'import-leads' });
  const goIntegrations = () => setState({ view: 'integrations' });
  const goAuditLog = () => setState({ view: 'audit-log' });
  const goDealers = () => setState({ view: 'dealers' });
  const goInventory = () => setState({ view: 'inventory' });
  const goAccessories = () => setState({ view: 'accessories' });
  const goSalesAudit = () => setState({ view: 'sales-audit' });
  const goDispositions = () => setState({ view: 'dispositions' });
  const goPermissions = () => setState({ view: 'permissions' });
  const backToLeads = () => setState({ view: 'leads' });
  const openLead = (id: string) =>
    setState({
      view: 'detail',
      selectedId: id,
      callForm: emptyCallForm,
      testRideForm: emptyTestRideForm,
      saleForm: emptySaleForm,
      contactForm: emptyContactForm,
      customerProfileForm: emptyCustomerProfileForm,
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
      // No owner is sent — the lead goes through the same round-robin / pool allocation
      // as every other source instead of always landing on whoever happened to add it.
      const lead = await api.createLead({ name: quickName, phone: quickPhone, city: quickCity, pin: quickPin, source: 'Quick Add' });
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
      // Same as Quick Add: no owner sent, so it follows round-robin / pool allocation
      // instead of always landing on whoever happened to add it.
      lead = await api.createLead({ name: addName, phone: addPhone, email: addEmail, city: addCity, pin: addPin, source: addSource, campaign: addCampaign });
    } catch (err) {
      showToast('Could not add lead: ' + (err as Error).message);
      return;
    }
    setState((s) => ({ leads: [lead, ...s.leads], addOpen: false, addName: '', addPhone: '', addEmail: '', addCity: '', addPin: '', addSource: 'Website', addCampaign: '' }));
    showToast('Lead added');
  };

  // ---- contact info edit (any user; logged to Activity with before/after) ----
  const openEditContact = (id: string) => {
    const lead = state.leads.find((l) => l.id === id);
    if (!lead) return;
    setState({ contactForm: { open: true, name: lead.name || '', phone: lead.phone, secondaryPhone: lead.secondaryPhone || '', email: lead.email, pin: lead.pin } });
  };
  const closeContactForm = () => setState({ contactForm: emptyContactForm });
  const updateContactForm = (patch: Partial<AppState['contactForm']>) => setState((s) => ({ contactForm: { ...s.contactForm, ...patch } }));
  const saveContactEdit = async () => {
    const lead = state.leads.find((l) => l.id === state.selectedId);
    if (!lead) return;
    const { name, phone, secondaryPhone, email, pin } = state.contactForm;
    const changes: string[] = [];
    if (name !== (lead.name || '')) changes.push(`name '${lead.name || '—'}' → '${name || '—'}'`);
    if (phone !== lead.phone) changes.push(`phone '${lead.phone || '—'}' → '${phone || '—'}'`);
    if (secondaryPhone !== (lead.secondaryPhone || '')) changes.push(`secondary phone '${lead.secondaryPhone || '—'}' → '${secondaryPhone || '—'}'`);
    if (email !== lead.email) changes.push(`email '${lead.email || '—'}' → '${email || '—'}'`);
    if (pin !== lead.pin) changes.push(`pincode '${lead.pin || '—'}' → '${pin || '—'}'`);
    if (!changes.length) {
      setState({ contactForm: emptyContactForm });
      return;
    }
    await updateLead(lead.id, { name, phone, secondaryPhone, email, pin }, `Contact info updated by ${state.currentUser?.name || 'Unknown'}: ${changes.join('; ')}`);
    setState({ contactForm: emptyContactForm });
    showToast('Contact info updated');
  };

  // ---- customer profile (buying for / cyclist fit / budget) ----
  const openEditCustomerProfile = (id: string) => {
    const lead = state.leads.find((l) => l.id === id);
    if (!lead) return;
    setState({ customerProfileForm: { open: true, buyingFor: lead.buyingFor || '', cyclistWeight: lead.cyclistWeight || '', cyclistHeight: lead.cyclistHeight || '', budget: lead.budget || '' } });
  };
  const closeCustomerProfileForm = () => setState({ customerProfileForm: emptyCustomerProfileForm });
  const updateCustomerProfileForm = (patch: Partial<AppState['customerProfileForm']>) => setState((s) => ({ customerProfileForm: { ...s.customerProfileForm, ...patch } }));
  const saveCustomerProfile = async () => {
    const lead = state.leads.find((l) => l.id === state.selectedId);
    if (!lead) return;
    const { buyingFor, cyclistWeight, cyclistHeight, budget } = state.customerProfileForm;
    await updateLead(lead.id, { buyingFor, cyclistWeight, cyclistHeight, budget }, `Customer profile updated by ${state.currentUser?.name || 'Unknown'}`);
    setState({ customerProfileForm: emptyCustomerProfileForm });
    showToast('Customer profile updated');
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

  // ---- call / remarks form (disposition -> sub-disposition) ----
  const openCallForm = () => setState({ callForm: { open: true, dispositionId: '', subDispositionId: '', duration: '', remarks: '' } });
  const cancelCallForm = () => setState({ callForm: emptyCallForm });
  const updateCallForm = (patch: Partial<AppState['callForm']>) => setState((s) => ({ callForm: { ...s.callForm, ...patch } }));
  const saveCallOutcome = () => {
    const lead = state.leads.find((l) => l.id === state.selectedId);
    if (!lead) return;
    const { dispositionId, subDispositionId, duration, remarks } = state.callForm;
    const disposition = state.dispositions.find((d) => d.id === dispositionId);
    const subDisposition = disposition?.subDispositions.find((sd) => sd.id === subDispositionId);
    if (!disposition || !subDisposition) {
      showToast('Select a disposition and sub-disposition');
      return;
    }
    let newStage: StageId;
    let attempts = lead.attempts;
    if (!disposition.connected) {
      attempts = attempts + 1;
      newStage = attempts >= 3 ? 5 : 2;
    } else {
      const sec = parseDuration(duration);
      newStage = sec >= 120 ? 4 : 3;
    }
    const entry: ActivityEntry = {
      ts: Date.now(), kind: 'call', connected: disposition.connected,
      text: 'Outbound Call: ' + (disposition.connected ? 'Was called' : 'Did not answer a call') + ' by ' + (state.currentUser?.name || 'Unknown') + ' through ' + lead.phone + '.',
      duration: disposition.connected ? parseDuration(duration) : null,
      remarks: disposition.label + ' — ' + subDisposition.label + (remarks ? ' — ' + remarks : ''),
    };
    updateLead(lead.id, { stage: newStage, attempts, disposition: disposition.label, subDisposition: subDisposition.label }, entry);
    setState({ callForm: emptyCallForm });
    showToast('Stage updated to "' + getStage(newStage).label + '"');
  };

  // ---- test ride (state -> city -> dealer, dealer details auto-filled) ----
  const openTestRideForm = () => setState({ testRideForm: { open: true, date: '', state: '', city: '', dealerId: '' } });
  const cancelTestRideForm = () => setState({ testRideForm: emptyTestRideForm });
  const updateTestRideForm = (patch: Partial<AppState['testRideForm']>) => setState((s) => ({ testRideForm: { ...s.testRideForm, ...patch } }));
  const saveTestRide = (dealer: Dealer) => {
    const { date, state: st, city } = state.testRideForm;
    if (!date || !st || !city || !dealer) {
      showToast('Select state, city, dealer, and date first');
      return;
    }
    if (!state.selectedId) return;
    updateLead(
      state.selectedId,
      { stage: 6, testRide: { date: new Date(date).getTime(), state: st, city, dealerId: dealer.id, dealerName: dealer.name, dealerPhone: dealer.phone, dealerAddress: dealer.address } },
      'Test ride booked at ' + dealer.name + ', ' + city,
    );
    setState({ testRideForm: emptyTestRideForm });
    showToast('Test ride booked');
  };

  // ---- sale (inventory + accessories + source + audit) ----
  const openSaleForm = () => setState({ saleForm: { ...emptySaleForm, open: true } });
  const cancelSaleForm = () => setState({ saleForm: emptySaleForm });
  const setSaleDocs = (docs: 'yes' | 'no') => setState((s) => ({ saleForm: { ...s.saleForm, docs } }));
  const updateSaleForm = (patch: Partial<AppState['saleForm']>) => setState((s) => ({ saleForm: { ...s.saleForm, ...patch } }));
  const toggleSaleAccessory = (name: string) =>
    setState((s) => ({
      saleForm: { ...s.saleForm, accessories: s.saleForm.accessories.includes(name) ? s.saleForm.accessories.filter((a) => a !== name) : [...s.saleForm.accessories, name] },
    }));
  const onInvoiceFile = async (file: File | undefined) => {
    if (!file) return;
    setState((s) => ({ saleForm: { ...s.saleForm, uploading: true } }));
    try {
      const result = await api.uploadInvoice(file);
      setState((s) => ({ saleForm: { ...s.saleForm, fileName: result.originalName, fileUrl: result.url, uploading: false } }));
    } catch (err) {
      setState((s) => ({ saleForm: { ...s.saleForm, uploading: false } }));
      showToast('Upload failed: ' + (err as Error).message);
    }
  };
  const saveSale = () => {
    const { docs, invoiceNo, amount, inventoryId, saleDate, quantity, saleSource, sourceName, accessories, fileName, fileUrl } = state.saleForm;
    if (!inventoryId) {
      showToast('Select a model from Inventory first');
      return;
    }
    if (saleSource !== 'D2C' && !sourceName) {
      showToast(`Enter the ${saleSource} name`);
      return;
    }
    const item = state.inventory.find((i) => i.id === inventoryId);
    if (!item) return;
    const stage: StageId = docs === 'yes' ? 8 : 7;
    if (!state.selectedId) return;
    const patch = {
      stage,
      sale: {
        invoiceNo: docs === 'yes' ? invoiceNo : '', amount,
        modelRange: item.modelRange, modelSku: item.modelSku, modelColour: item.modelColour,
        saleDate: saleDate ? new Date(saleDate).getTime() : Date.now(),
        quantity: parseInt(quantity, 10) || 1,
        saleSource, sourceName: saleSource === 'D2C' ? '' : sourceName,
        accessories,
        fileName: docs === 'yes' ? fileName : '', fileUrl: docs === 'yes' ? fileUrl : '',
        auditStatus: 'pending' as const,
      },
    };
    updateLead(state.selectedId, patch, docs === 'yes' ? 'Sale marked complete with documents' : 'Sale marked complete — documents pending');
    setState({ saleForm: emptySaleForm });
    showToast('Sale recorded');
  };

  const reassignLead = async (id: string, owner: string) => {
    try {
      const updated = await api.reassignLead(id, owner);
      setState((s) => ({ leads: s.leads.map((l) => (l.id === id ? updated : l)) }));
      showToast(owner === 'Unassigned' ? 'Lead sent back to the pool' : `Lead reassigned to ${owner}`);
    } catch (err) {
      showToast('Could not reassign lead: ' + (err as Error).message);
    }
  };

  const manualStageChange = (id: StageId) => {
    if (!state.selectedId) return;
    updateLead(state.selectedId, { stage: id }, 'Stage manually changed to ' + getStage(id).label);
    showToast('Stage updated');
  };

  // ---- sales audit (Admin) ----
  const auditSale = async (leadId: string, auditStatus: 'successful' | 'rejected', auditNote: string) => {
    try {
      const updated = await api.auditSale(leadId, auditStatus, auditNote);
      setState((s) => ({ leads: s.leads.map((l) => (l.id === leadId ? updated : l)) }));
      showToast('Sale marked ' + auditStatus);
    } catch (err) {
      showToast('Could not update audit: ' + (err as Error).message);
    }
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

  const myLeads = useMemo(() => state.leads.filter((l) => l.owner === state.currentUser?.name), [state.leads, state.currentUser]);

  const AGENT_LIST = useMemo(() => state.users.map((u) => u.name), [state.users]);

  // ---- user management ----
  const openAddUser = () => setState({ userForm: { ...emptyUserForm, open: true } });
  const openEditUser = (id: string) => {
    const user = state.users.find((u) => u.id === id);
    if (!user) return;
    setState({
      userForm: {
        open: true, editingId: id, name: user.name, email: user.email, phone: user.phone, role: user.role,
        managerId: user.managerId || '', hierarchyEnabled: user.hierarchyEnabled, inPool: user.inPool,
      },
    });
  };
  const closeUserForm = () => setState({ userForm: emptyUserForm });
  const updateUserForm = (patch: Partial<AppState['userForm']>) => setState((s) => ({ userForm: { ...s.userForm, ...patch } }));
  const submitUserForm = async () => {
    const { editingId, name, email, phone, role, managerId, hierarchyEnabled, inPool } = state.userForm;
    if (!name) {
      showToast('Name is required');
      return;
    }
    try {
      if (editingId) {
        const updated = await api.patchUser(editingId, { name, email, phone, role, managerId: managerId || null, hierarchyEnabled, inPool });
        setState((s) => ({ users: s.users.map((u) => (u.id === editingId ? updated : u)), userForm: emptyUserForm }));
        showToast('User updated');
      } else {
        const created = await api.createUser({ name, email, phone, role, managerId: managerId || null, hierarchyEnabled, inPool });
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
  const toggleUserActive = async (id: string, active: boolean) => {
    try {
      const updated = await api.setUserActive(id, active);
      setState((s) => ({ users: s.users.map((u) => (u.id === id ? updated : u)) }));
    } catch (err) {
      showToast('Could not update eligibility: ' + (err as Error).message);
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

  const openResetPassword = (id: string) => setState({ resetPwUserId: id, resetPwValue: '' });
  const closeResetPassword = () => setState({ resetPwUserId: null, resetPwValue: '' });
  const updateResetPasswordValue = (value: string) => setState({ resetPwValue: value });
  const submitResetPassword = async () => {
    const { resetPwUserId, resetPwValue } = state;
    if (!resetPwUserId) return;
    try {
      await api.resetUserPassword(resetPwUserId, resetPwValue || '12345678');
      setState({ resetPwUserId: null, resetPwValue: '' });
      showToast('Password reset');
    } catch (err) {
      showToast('Could not reset password: ' + (err as Error).message);
    }
  };

  // ---- dispositions taxonomy (Admin) ----
  const saveDispositions = async (list: AppState['dispositions']) => {
    try {
      const saved = await api.saveDispositions(list);
      setState({ dispositions: saved });
      showToast('Dispositions saved');
    } catch (err) {
      showToast('Could not save dispositions: ' + (err as Error).message);
    }
  };

  // ---- inventory management (Admin) ----
  const openAddInventory = () => setState({ inventoryForm: { ...emptyInventoryForm, open: true } });
  const openEditInventory = (id: string) => {
    const item = state.inventory.find((i) => i.id === id);
    if (!item) return;
    setState({ inventoryForm: { open: true, editingId: id, modelRange: item.modelRange, modelSku: item.modelSku, modelColour: item.modelColour } });
  };
  const closeInventoryForm = () => setState({ inventoryForm: emptyInventoryForm });
  const updateInventoryForm = (patch: Partial<AppState['inventoryForm']>) => setState((s) => ({ inventoryForm: { ...s.inventoryForm, ...patch } }));
  const submitInventoryForm = async () => {
    const { editingId, modelRange, modelSku, modelColour } = state.inventoryForm;
    if (!modelRange || !modelSku || !modelColour) {
      showToast('Model Range, SKU, and Colour are all required');
      return;
    }
    try {
      if (editingId) {
        const updated = await api.patchInventoryItem(editingId, { modelRange, modelSku, modelColour });
        setState((s) => ({ inventory: s.inventory.map((i) => (i.id === editingId ? updated : i)), inventoryForm: emptyInventoryForm }));
      } else {
        const created = await api.createInventoryItem({ modelRange, modelSku, modelColour });
        setState((s) => ({ inventory: [...s.inventory, created], inventoryForm: emptyInventoryForm }));
      }
      showToast('Inventory saved');
    } catch (err) {
      showToast('Could not save inventory item: ' + (err as Error).message);
    }
  };
  const removeInventoryItem = async (id: string) => {
    try {
      await api.deleteInventoryItem(id);
      setState((s) => ({ inventory: s.inventory.filter((i) => i.id !== id) }));
      showToast('Inventory item removed');
    } catch (err) {
      showToast('Could not remove item: ' + (err as Error).message);
    }
  };

  // ---- accessories management (Admin) ----
  const openAddAccessory = () => setState({ accessoryForm: { open: true, name: '' } });
  const closeAccessoryForm = () => setState({ accessoryForm: emptyAccessoryForm });
  const updateAccessoryForm = (name: string) => setState({ accessoryForm: { open: true, name } });
  const submitAccessoryForm = async () => {
    const { name } = state.accessoryForm;
    if (!name) {
      showToast('Name is required');
      return;
    }
    try {
      const created = await api.createAccessory(name);
      setState((s) => ({ accessories: [...s.accessories, created], accessoryForm: emptyAccessoryForm }));
      showToast('Accessory added');
    } catch (err) {
      showToast('Could not add accessory: ' + (err as Error).message);
    }
  };
  const removeAccessory = async (id: string) => {
    try {
      await api.deleteAccessory(id);
      setState((s) => ({ accessories: s.accessories.filter((a) => a.id !== id) }));
      showToast('Accessory removed');
    } catch (err) {
      showToast('Could not remove accessory: ' + (err as Error).message);
    }
  };

  // ---- permissions (Admin) ----
  const loadPermissions = async () => {
    try {
      const { permissions, keys } = await api.getPermissions();
      setState({ rolePermissions: permissions, permissionKeys: keys });
    } catch (err) {
      showToast('Could not load permissions: ' + (err as Error).message);
    }
  };
  const togglePermission = (role: Role, key: string) => {
    setState((s) => {
      if (!s.rolePermissions) return {};
      const rolePerms = s.rolePermissions[role] || {};
      return { rolePermissions: { ...s.rolePermissions, [role]: { ...rolePerms, [key]: !rolePerms[key] } } };
    });
  };
  const savePermissions = async () => {
    if (!state.rolePermissions) return;
    try {
      const saved = await api.savePermissions(state.rolePermissions);
      setState({ rolePermissions: saved });
      showToast('Permissions saved');
    } catch (err) {
      showToast('Could not save permissions: ' + (err as Error).message);
    }
  };

  // ---- export ----
  const exportLeadsCsv = async () => {
    try {
      await api.exportLeads();
    } catch (err) {
      showToast('Export failed: ' + (err as Error).message);
    }
  };
  const exportSalesCsv = async () => {
    try {
      await api.exportSales();
    } catch (err) {
      showToast('Export failed: ' + (err as Error).message);
    }
  };

  // ---- change password (self-service; forced on first login / after a reset) ----
  const updateChangePasswordField = (field: 'changePasswordCurrent' | 'changePasswordNew' | 'changePasswordConfirm', value: string) =>
    setState({ [field]: value, changePasswordError: '' } as Partial<AppState>);
  const submitChangePassword = async () => {
    const { changePasswordCurrent, changePasswordNew, changePasswordConfirm } = state;
    if (!changePasswordCurrent || !changePasswordNew) {
      setState({ changePasswordError: 'Both current and new password are required' });
      return;
    }
    if (changePasswordNew.length < 8) {
      setState({ changePasswordError: 'New password must be at least 8 characters' });
      return;
    }
    if (changePasswordNew !== changePasswordConfirm) {
      setState({ changePasswordError: 'New password and confirmation do not match' });
      return;
    }
    setState({ changePasswordBusy: true, changePasswordError: '' });
    try {
      const updated = await api.changePassword(changePasswordCurrent, changePasswordNew);
      setState({
        currentUser: updated, changePasswordBusy: false,
        changePasswordCurrent: '', changePasswordNew: '', changePasswordConfirm: '', changePasswordError: '',
      });
      showToast('Password updated');
    } catch (err) {
      setState({ changePasswordBusy: false, changePasswordError: (err as Error).message });
    }
  };

  return {
    state,
    setState,
    showToast,
    updateLoginField,
    login,
    logout,
    goDashboard,
    goLeads,
    goUsers,
    goImportLeads,
    goIntegrations,
    goAuditLog,
    goDealers,
    goInventory,
    goAccessories,
    goSalesAudit,
    goDispositions,
    goPermissions,
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
    openEditContact,
    closeContactForm,
    updateContactForm,
    saveContactEdit,
    openEditCustomerProfile,
    closeCustomerProfileForm,
    updateCustomerProfileForm,
    saveCustomerProfile,
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
    toggleSaleAccessory,
    onInvoiceFile,
    saveSale,
    manualStageChange,
    reassignLead,
    auditSale,
    refreshLeads,
    filteredLeads,
    myLeads,
    openAddUser,
    openEditUser,
    closeUserForm,
    updateUserForm,
    submitUserForm,
    setUserRole,
    toggleUserActive,
    removeUser,
    openResetPassword,
    closeResetPassword,
    updateResetPasswordValue,
    submitResetPassword,
    saveDispositions,
    openAddInventory,
    openEditInventory,
    closeInventoryForm,
    updateInventoryForm,
    submitInventoryForm,
    removeInventoryItem,
    openAddAccessory,
    closeAccessoryForm,
    updateAccessoryForm,
    submitAccessoryForm,
    removeAccessory,
    loadPermissions,
    togglePermission,
    savePermissions,
    exportLeadsCsv,
    exportSalesCsv,
    updateChangePasswordField,
    submitChangePassword,
    // static reference lists
    STAGE_ORDER,
    SOURCE_LIST,
    CITY_LIST,
    AGENT_LIST,
    ROLE_LIST,
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
