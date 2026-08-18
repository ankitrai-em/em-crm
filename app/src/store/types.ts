import type { Accessory, CallForm, ContactEditForm, CustomerProfileForm, Disposition, FilterKey, InventoryItem, Lead, PermissionKey, RolePermissions, SaleForm, TestRideForm, User, UserForm, View } from '../types';
import { NOW } from '../data/constants';
import { toDateInputValue } from '../data/format';

export interface InventoryForm {
  open: boolean;
  editingId: string | null;
  modelRange: string;
  modelSku: string;
  modelColour: string;
}

export interface AccessoryForm {
  open: boolean;
  name: string;
}

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
  contactForm: ContactEditForm;
  customerProfileForm: CustomerProfileForm;
  followupDraft: string;
  toast: string;
  leads: Lead[];
  users: User[];
  userForm: UserForm;
  currentUser: User | null;
  authChecked: boolean;
  loginEmail: string;
  loginPassword: string;
  loginError: string;
  loginBusy: boolean;
  resetPwUserId: string | null;
  resetPwValue: string;
  dispositions: Disposition[];
  inventory: InventoryItem[];
  accessories: Accessory[];
  inventoryForm: InventoryForm;
  accessoryForm: AccessoryForm;
  rolePermissions: RolePermissions | null;
  permissionKeys: PermissionKey[];
  changePasswordOpen: boolean;
  changePasswordCurrent: string;
  changePasswordNew: string;
  changePasswordConfirm: string;
  changePasswordError: string;
  changePasswordBusy: boolean;
}

export const emptyCallForm: CallForm = { open: false, dispositionId: '', subDispositionId: '', duration: '', remarks: '' };
export const emptyTestRideForm: TestRideForm = { open: false, date: '', state: '', city: '', dealerId: '' };
export const emptySaleForm: SaleForm = {
  open: false, docs: 'no', invoiceNo: '', amount: '', inventoryId: '', saleDate: '', quantity: '1',
  saleSource: 'D2C', sourceName: '', accessories: [], fileName: '', fileUrl: '', uploading: false,
};
export const emptyUserForm: UserForm = { open: false, editingId: null, name: '', email: '', phone: '', role: 'Agent', managerId: '', hierarchyEnabled: false, inPool: true };
export const emptyContactForm: ContactEditForm = { open: false, name: '', phone: '', secondaryPhone: '', email: '', pin: '' };
export const emptyCustomerProfileForm: CustomerProfileForm = { open: false, buyingFor: '', cyclistWeight: '', cyclistHeight: '', budget: '' };
export const emptyInventoryForm: InventoryForm = { open: false, editingId: null, modelRange: '', modelSku: '', modelColour: '' };
export const emptyAccessoryForm: AccessoryForm = { open: false, name: '' };

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
    ownerFilter: [],
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
    contactForm: emptyContactForm,
    customerProfileForm: emptyCustomerProfileForm,
    followupDraft: '',
    toast: '',
    leads,
    users: [],
    userForm: emptyUserForm,
    currentUser: null,
    authChecked: false,
    loginEmail: '',
    loginPassword: '',
    loginError: '',
    loginBusy: false,
    resetPwUserId: null,
    resetPwValue: '',
    dispositions: [],
    inventory: [],
    accessories: [],
    inventoryForm: emptyInventoryForm,
    accessoryForm: emptyAccessoryForm,
    rolePermissions: null,
    permissionKeys: [],
    changePasswordOpen: false,
    changePasswordCurrent: '',
    changePasswordNew: '',
    changePasswordConfirm: '',
    changePasswordError: '',
    changePasswordBusy: false,
  };
}
