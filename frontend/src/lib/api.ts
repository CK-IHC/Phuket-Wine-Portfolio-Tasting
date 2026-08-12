import type { Announcement, BannerAspect, DashboardStats, EventRound, FormField, Registration, AdminUser, Session } from './types';
import { mockStore } from './mockStore';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const USE_MOCK = !API_URL;

const VALID_ASPECTS: BannerAspect[] = ['16/9', '1/1', '4/3', '9/16'];

/** Guards against malformed/legacy backend or cached data (e.g. a missing
 * or unrecognized bannerAspect) crashing the UI — always returns a
 * well-formed Announcement. */
function normalizeAnnouncement(a: Partial<Announcement> | null | undefined): Announcement {
  return {
    textTh: a?.textTh || '',
    textEn: a?.textEn || '',
    eventDate: a?.eventDate || '',
    eventStartTime: a?.eventStartTime || '',
    eventEndTime: a?.eventEndTime || '',
    eventVenue: a?.eventVenue || '',
    banners: Array.isArray(a?.banners) ? a.banners : [],
    bannerAspect: VALID_ASPECTS.includes(a?.bannerAspect as BannerAspect) ? (a!.bannerAspect as BannerAspect) : '16/9',
    startDate: a?.startDate || '',
    endDate: a?.endDate || '',
    published: a?.published !== false,
  };
}

async function apiGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API_URL!);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || `${action} failed`);
  return body.data as T;
}

async function apiPost<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || `${action} failed`);
  return body as T;
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(',');
      resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function rawRegToRegistration(raw: any): Registration {
  return {
    id: String(raw._row ?? raw.RefNo),
    refNo: raw.RefNo,
    name: raw.Name || '',
    phone: raw.Phone || '',
    email: raw.Email || '',
    area: raw.Area || '',
    arrival: raw.Arrival || '',
    source: raw.Source || '',
    wines: raw.Wines ? String(raw.Wines).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    prices: raw.Prices ? String(raw.Prices).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    slipUrl: raw.SlipUrl || '',
    amount: Number(raw.Amount) || 0,
    status: (raw.Status || 'pending') as Registration['status'],
    rejectReason: raw.RejectReason || '',
    submittedAt: raw.Timestamp ? String(raw.Timestamp) : '',
    roundId: raw.RoundId || '',
    roundName: raw.RoundName || '',
  };
}

function rawRoundToEventRound(raw: any): EventRound {
  return {
    id: raw.Id || String(raw._row ?? ''),
    name: raw.Name || '',
    date: raw.Date || '',
    startTime: raw.StartTime || '',
    endTime: raw.EndTime || '',
    venue: raw.Venue || '',
    capacity: Number(raw.Capacity) || 0,
    status: (raw.Status || 'closed') as EventRound['status'],
  };
}

function rawUserToAdminUser(raw: any): AdminUser {
  return {
    id: String(raw._row ?? raw.Phone),
    name: raw.Name || '',
    phone: raw.Phone || '',
    role: (raw.Role || 'Staff') as AdminUser['role'],
    active: raw.Active !== false && raw.Active !== 'FALSE',
    joined: raw.Joined ? String(raw.Joined) : '',
  };
}

export const api = {
  async getRegistrations(): Promise<Registration[]> {
    if (USE_MOCK) return mockStore.getRegistrations();
    const raw = await apiGet<any[]>('getRegistrations');
    return raw.map(rawRegToRegistration);
  },

  async getFormFields(): Promise<FormField[]> {
    if (USE_MOCK) return mockStore.getFormFields();
    return apiGet<FormField[]>('getFormFields');
  },

  async getAnnouncement(): Promise<Announcement> {
    if (USE_MOCK) return normalizeAnnouncement(mockStore.getAnnouncement());
    const raw = await apiGet<any>('getAnnouncement');
    return normalizeAnnouncement({
      textTh: raw.textTh || raw.text,
      textEn: raw.textEn,
      eventDate: raw.eventDate,
      eventStartTime: raw.eventStartTime,
      eventEndTime: raw.eventEndTime,
      eventVenue: raw.eventVenue,
      banners: (raw.imageUrls || []).map((url: string, i: number) => ({ id: 'banner' + i, url })),
      bannerAspect: raw.bannerAspect,
      startDate: raw.startDate,
      endDate: raw.endDate,
      published: raw.published,
    });
  },

  async getUsers(): Promise<AdminUser[]> {
    if (USE_MOCK) return mockStore.getUsers();
    const raw = await apiGet<any[]>('getUsers');
    return raw.map(rawUserToAdminUser);
  },

  async getDashboardStats(): Promise<DashboardStats> {
    if (USE_MOCK) {
      const regs = mockStore.getRegistrations();
      return {
        total: regs.length,
        pending: regs.filter((r) => r.status === 'pending').length,
        approved: regs.filter((r) => r.status === 'approved').length,
        rejected: regs.filter((r) => r.status === 'rejected').length,
        revenue: regs.filter((r) => r.status === 'approved').reduce((a, r) => a + r.amount, 0),
      };
    }
    return apiGet<DashboardStats>('getDashboardStats');
  },

  async login(phone: string): Promise<Session> {
    if (USE_MOCK) {
      const user = mockStore.findUserByPhone(phone);
      if (!user) throw new Error('not found');
      return { name: user.name, phone: user.phone, role: user.role };
    }
    const res = await apiPost<{ ok: boolean; name: string; phone: string; role: string }>('login', { phone });
    return { name: res.name, phone: res.phone, role: res.role };
  },

  async getRounds(): Promise<EventRound[]> {
    if (USE_MOCK) return mockStore.getRounds();
    const raw = await apiGet<any[]>('getRounds');
    return raw.map(rawRoundToEventRound);
  },

  async addRound(round: Omit<EventRound, 'id'>): Promise<string> {
    if (USE_MOCK) return mockStore.addRound(round);
    const res = await apiPost<{ ok: boolean; id: string }>('addRound', round);
    return res.id;
  },

  async updateRound(id: string, patch: Partial<EventRound>): Promise<void> {
    if (USE_MOCK) return mockStore.updateRound(id, patch);
    await apiPost('updateRound', { id, ...patch });
  },

  async deleteRound(id: string): Promise<void> {
    if (USE_MOCK) return mockStore.deleteRound(id);
    await apiPost('deleteRound', { id });
  },

  async submitRegistration(payload: {
    name: string; phone: string; email: string; area: string; arrival: string; source: string;
    wines: string[]; prices: string[]; amount: number; roundId: string; roundName: string; slip?: File;
  }): Promise<string> {
    if (USE_MOCK) {
      let slipUrl = '';
      if (payload.slip) slipUrl = URL.createObjectURL(payload.slip);
      return mockStore.submitRegistration({ ...payload, slipUrl });
    }
    let slipBase64: string | undefined;
    let mimeType: string | undefined;
    let fileName: string | undefined;
    if (payload.slip) {
      const encoded = await fileToBase64(payload.slip);
      slipBase64 = encoded.base64;
      mimeType = encoded.mimeType;
      fileName = payload.slip.name;
    }
    const res = await apiPost<{ ok: boolean; refNo: string }>('submitRegistration', {
      ...payload, slipBase64, mimeType, fileName,
    });
    return res.refNo;
  },

  async approveRegistration(refNo: string): Promise<void> {
    if (USE_MOCK) return mockStore.setStatus(refNo, 'approved');
    await apiPost('approveRegistration', { refNo });
  },

  async rejectRegistration(refNo: string, reason: string): Promise<void> {
    if (USE_MOCK) return mockStore.setStatus(refNo, 'rejected', reason);
    await apiPost('rejectRegistration', { refNo, reason });
  },

  async editRegistration(refNo: string, patch: Partial<Registration>): Promise<void> {
    if (USE_MOCK) return mockStore.editRegistration(refNo, patch);
    await apiPost('editRegistration', { refNo, ...patch });
  },

  async deleteRegistration(refNo: string): Promise<void> {
    if (USE_MOCK) return mockStore.deleteRegistration(refNo);
    await apiPost('deleteRegistration', { refNo });
  },

  async saveFormFields(fields: FormField[]): Promise<void> {
    if (USE_MOCK) return mockStore.saveFormFields(fields);
    await apiPost('saveFormFields', { fields });
  },

  async saveAnnouncement(a: Announcement): Promise<void> {
    if (USE_MOCK) return mockStore.saveAnnouncement(a);
    await apiPost('saveAnnouncement', {
      textTh: a.textTh, textEn: a.textEn,
      eventDate: a.eventDate, eventStartTime: a.eventStartTime, eventEndTime: a.eventEndTime, eventVenue: a.eventVenue,
      imageUrls: a.banners.map((b) => b.url), bannerAspect: a.bannerAspect,
      startDate: a.startDate, endDate: a.endDate, published: a.published,
    });
  },

  async uploadImage(file: File, folder?: string): Promise<string> {
    if (USE_MOCK) return URL.createObjectURL(file);
    const { base64, mimeType } = await fileToBase64(file);
    const res = await apiPost<{ ok: boolean; url: string }>('uploadImage', {
      base64, mimeType, fileName: file.name, folder,
    });
    return res.url;
  },

  async addUser(u: Omit<AdminUser, 'id' | 'joined'>): Promise<void> {
    if (USE_MOCK) return mockStore.addUser(u);
    await apiPost('addUser', u);
  },

  async updateUser(phone: string, patch: Partial<AdminUser>): Promise<void> {
    if (USE_MOCK) return mockStore.updateUser(phone, patch);
    await apiPost('updateUser', { phone, ...patch });
  },

  async deleteUser(phone: string): Promise<void> {
    if (USE_MOCK) return mockStore.deleteUser(phone);
    await apiPost('deleteUser', { phone });
  },
};

export const isMockMode = USE_MOCK;
