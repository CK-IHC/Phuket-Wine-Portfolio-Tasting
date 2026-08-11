import type { Announcement, FormField, Registration, AdminUser } from './types';
import { seedAnnouncement, seedFormFields, seedRegistrations, seedUsers } from './mockData';

const KEY = 'pwpt.mockStore.v1';

interface StoreShape {
  registrations: Registration[];
  formFields: FormField[];
  announcement: Announcement;
  users: AdminUser[];
  nextRefSeq: number;
}

function seed(): StoreShape {
  const registrations = seedRegistrations();
  return {
    registrations,
    formFields: seedFormFields(),
    announcement: seedAnnouncement(),
    users: seedUsers(),
    nextRefSeq: registrations.length + 1,
  };
}

function load(): StoreShape {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed.registrations || !parsed.formFields) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

let store = load();

function persist() {
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

export const mockStore = {
  reset() {
    store = seed();
    persist();
  },
  getRegistrations(): Registration[] {
    return store.registrations;
  },
  getFormFields(): FormField[] {
    return store.formFields;
  },
  getAnnouncement(): Announcement {
    return store.announcement;
  },
  getUsers(): AdminUser[] {
    return store.users;
  },
  submitRegistration(reg: Omit<Registration, 'id' | 'refNo' | 'status' | 'submittedAt'>) {
    const beYear = new Date().getFullYear() + 543;
    const refNo = `${beYear}-${String(store.nextRefSeq).padStart(3, '0')}`;
    const full: Registration = {
      ...reg,
      id: String(Date.now()),
      refNo,
      status: 'pending',
      submittedAt: 'just now',
    };
    store.registrations = [full, ...store.registrations];
    store.nextRefSeq += 1;
    persist();
    return refNo;
  },
  setStatus(refNo: string, status: Registration['status'], reason?: string) {
    store.registrations = store.registrations.map((r) =>
      r.refNo === refNo ? { ...r, status, rejectReason: reason ?? r.rejectReason } : r
    );
    persist();
  },
  editRegistration(refNo: string, patch: Partial<Registration>) {
    store.registrations = store.registrations.map((r) => (r.refNo === refNo ? { ...r, ...patch } : r));
    persist();
  },
  deleteRegistration(refNo: string) {
    store.registrations = store.registrations.filter((r) => r.refNo !== refNo);
    persist();
  },
  saveFormFields(fields: FormField[]) {
    store.formFields = fields;
    persist();
  },
  saveAnnouncement(a: Announcement) {
    store.announcement = a;
    persist();
  },
  addUser(u: Omit<AdminUser, 'id' | 'joined'>) {
    store.users = [...store.users, { ...u, id: String(Date.now()), joined: 'Today' }];
    persist();
  },
  updateUser(phone: string, patch: Partial<AdminUser>) {
    store.users = store.users.map((u) => (u.phone === phone ? { ...u, ...patch } : u));
    persist();
  },
  deleteUser(phone: string) {
    store.users = store.users.filter((u) => u.phone !== phone);
    persist();
  },
  findUserByPhone(phone: string) {
    return store.users.find((u) => u.phone === phone && u.active);
  },
};
