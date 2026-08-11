export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface Registration {
  id: string;
  refNo: string;
  name: string;
  phone: string;
  email: string;
  area: string;
  arrival: string;
  source: string;
  wines: string[];
  prices: string[];
  slipUrl: string;
  amount: number;
  status: RegistrationStatus;
  rejectReason?: string;
  submittedAt: string;
}

export type FieldType =
  | 'short'
  | 'paragraph'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'date'
  | 'time'
  | 'scale'
  | 'file'
  | 'qr';

export interface FieldOption {
  id: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options: FieldOption[];
  maxSelect?: number;
  qrUrl?: string;
  qrCaption?: string;
}

export type BannerAspect = '16/9' | '1/1' | '4/3' | '9/16';

export interface Banner {
  id: string;
  url: string;
}

export interface Announcement {
  textTh: string;
  textEn: string;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  eventVenue: string;
  banners: Banner[];
  bannerAspect: BannerAspect;
  startDate: string;
  endDate: string;
  published: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: 'Admin' | 'Staff';
  active: boolean;
  joined: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revenue: number;
}

export interface Session {
  name: string;
  phone: string;
  role: string;
}
