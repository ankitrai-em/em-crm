import type { CallForm, FilterKey, Lead, SaleForm, TestRideForm, User, UserForm, View } from '../types';
import { CURRENT_AGENT, NOW } from '../data/constants';
import { toDateInputValue } from '../data/format';

export interface AppState {
  view: View;
  selectedId: string | null;
  page: number;
  pageSize: number;
  search: string;
  stageFilter: string[];
  sourceFilter: string[];
  cityFilter: string[];
  ownerFilter: string[];
  dateFrom: string;
  dateTo: string;
  followupFrom: string;
  followupTo: string;
  taskFrom: string;
  taskTo: string;
  rtOnly: boolean;
  openFilter: FilterKey | null;
  quickAddOpen: boolean;
  addOpen: boolean;
  quickName: string;
  quickPhone: string;
  quickCity: string;
  quickPin: string;
  addName: string;
  addPhone: string;
  addEmail: string;
  addCity: string;
  addPin: string;
  addSource: string;
  addCampaign: string;
  callForm: CallForm;
  testRideForm: TestRideForm;
  saleForm: SaleForm;
  followupDraft: string;
  toast: string;
  leads: Lead[];
  users: User[];
  userForm: UserForm;
}

export const emptyCallForm: CallForm = { open: false, disposition: 'not_reachable', duration: '', remarks: '' };
export const emptyTestRideForm: TestRideForm = { open: false, date: '', store: '', dealer: '' };
export const emptySaleForm: SaleForm = { open: false, docs: 'no', invoiceNo: '', amount: '', model: '', fileName: '' };
export const emptyUserForm: UserForm = { open: false, editingId: null, name: '', email: '', phone: '', role: 'Agent' };

export function initialState(leads: Lead[]): AppState {
  return {
    view: 'dashboard',
    selectedId: null,
    page: 1,
    pageSize: 10,
    search: '',
    stageFilter: [],
    sourceFilter: [],
    cityFilter: [],
    ownerFilter: [CURRENT_AGENT],
    dateFrom: '',
    dateTo: '',
    followupFrom: '',
    followupTo: '',
    taskFrom: toDateInputValue(NOW),
    taskTo: toDateInputValue(NOW),
    rtOnly: false,
    openFilter: null,
    quickAddOpen: false,
    addOpen: false,
    quickName: '',
    quickPhone: '',
    quickCity: '',
    quickPin: '',
    addName: '',
    addPhone: '',
    addEmail: '',
    addCity: '',
    addPin: '',
    addSource: 'Website',
    addCampaign: '',
    callForm: emptyCallForm,
    testRideForm: emptyTestRideForm,
    saleForm: emptySaleForm,
    followupDraft: '',
    toast: '',
    leads,
    users: [],
    userForm: emptyUserForm,
  };
}
