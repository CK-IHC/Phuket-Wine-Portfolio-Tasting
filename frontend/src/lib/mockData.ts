import type { EventRound, FormField, Registration, AdminUser } from './types';

export const WINE_OPTIONS = [
  'Red – Bordeaux', 'Red – Burgundy', 'Red – New World', 'White – Chardonnay',
  'White – Sauvignon Blanc', 'Rosé', 'Sparkling / Champagne', 'Natural Wine',
  'Orange Wine', 'Dessert / Fortified Wine',
];
export const PRICE_OPTIONS = ['Under ฿500', '฿500–1,000', '฿1,000–2,000', '฿2,000–5,000', '฿5,000+', 'Not sure yet'];
export const AREA_OPTIONS = ['Patong', 'Kata', 'Karon', 'Cherng Talay / Laguna', 'Rawai / Nai Harn', 'Phuket Town', 'Other'];
export const SOURCE_OPTIONS = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Email invitation', 'Wine shop / Partner', 'Other'];

function opts(list: string[]) {
  return list.map((label, i) => ({ id: 'o' + i, label }));
}

export function seedFormFields(): FormField[] {
  return [
    { id: 'f1', type: 'short', label: 'Email', required: true, placeholder: 'you@email.com', options: [] },
    { id: 'f2', type: 'short', label: 'Full Name', required: true, placeholder: 'ชื่อ-นามสกุล', options: [] },
    { id: 'f3', type: 'short', label: 'Phone Number', required: true, placeholder: '08XXXXXXXX', options: [] },
    { id: 'f4', type: 'short', label: 'LINE ID or WhatsApp Number', required: false, placeholder: '', options: [] },
    { id: 'f5', type: 'dropdown', label: 'Which Area Do You Live?', required: true, options: opts(AREA_OPTIONS) },
    { id: 'f6', type: 'time', label: 'Estimated Arrival Time', required: true, options: [] },
    { id: 'f7', type: 'dropdown', label: 'How did you hear about this event?', required: false, options: opts(SOURCE_OPTIONS) },
    { id: 'f8', type: 'checkbox', label: 'Which wines are you interested in? (Top 3)', required: true, options: opts(WINE_OPTIONS), maxSelect: 3 },
    { id: 'f9', type: 'checkbox', label: 'What wine price range are you looking for? (Top 3)', required: true, options: opts(PRICE_OPTIONS), maxSelect: 3 },
    { id: 'f10', type: 'qr', label: 'Payment QR Code', required: false, options: [] },
  ];
}

const FIRST_NAMES = ['สมชาย', 'พิมพ์ชนก', 'ธนกร', 'อรวรรณ', 'วรากร', 'กัญญาพัชร', 'ณัฐวุฒิ', 'ปวีณา', 'ชัยวัฒน์', 'สุนิสา', 'กิตติศักดิ์', 'รัตนาภรณ์', 'ธีรพงษ์', 'มนัสวี', 'พีรพัฒน์', 'ศิริพร'];
const LAST_NAMES = ['ใจดี', 'วงศ์สุริยะ', 'ศรีสุข', 'เพชรรัตน์', 'ทองสุข', 'บุญมี', 'แสงระวี', 'เกษมสุข', 'จันทร์เพ็ญ', 'สายทอง', 'ภูมิพัฒน์', 'วัฒนกุล'];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function pickMany<T>(arr: T[], seed: number, count: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(arr[(seed + i * 3) % arr.length]);
  return Array.from(new Set(out));
}

export function seedRounds(): EventRound[] {
  const textTh = 'ร่วมชิมไวน์คัดสรรกว่า 60 ชนิดจากทั่วโลก พร้อมพบปะตัวแทนผู้นำเข้าไวน์ชั้นนำของภูเก็ต';
  const textEn = 'Taste over 60 curated wines from around the world and meet Phuket’s leading wine importers.';
  const banners = () => [
    { id: 'banner' + Date.now() + Math.random(), url: '' },
    { id: 'banner' + Date.now() + Math.random(), url: '' },
  ];
  return [
    { id: 'round-2024', name: 'Phuket Wine Portfolio Tasting 2024', title: 'Phuket Wine Portfolio Tasting', date: '2024-09-14', startTime: '18:00', endTime: '21:00', venue: 'The Slate, Phuket', capacity: 0, status: 'closed', textTh, textEn, banners: banners(), bannerAspect: '16/9', published: true },
    { id: 'round-2025', name: 'Phuket Wine Portfolio Tasting 2025', title: 'Phuket Wine Portfolio Tasting', date: '2025-09-13', startTime: '18:00', endTime: '21:00', venue: 'The Slate, Phuket', capacity: 0, status: 'closed', textTh, textEn, banners: banners(), bannerAspect: '16/9', published: true },
    { id: 'round-2026', name: 'Phuket Wine Portfolio Tasting 2026', title: 'Phuket Wine Portfolio Tasting', date: '2026-09-20', startTime: '18:00', endTime: '21:00', venue: 'The Slate, Phuket', capacity: 150, status: 'open', textTh, textEn, banners: banners(), bannerAspect: '16/9', published: true },
  ];
}

const ROUND_ID_BY_YEAR: Record<number, string> = { 2024: 'round-2024', 2025: 'round-2025', 2026: 'round-2026' };
const ROUND_NAME_BY_YEAR: Record<number, string> = {
  2024: 'Phuket Wine Portfolio Tasting 2024',
  2025: 'Phuket Wine Portfolio Tasting 2025',
  2026: 'Phuket Wine Portfolio Tasting 2026',
};

export function seedRegistrations(): Registration[] {
  const regs: Registration[] = [];
  let seq = 1;
  // Monthly registration counts across three editions (rounds) of the
  // annual event, rising toward each year's September tasting date.
  const monthlyCounts: [number, number, number][] = [
    [2024, 3, 2], [2024, 4, 3], [2024, 5, 4], [2024, 6, 5], [2024, 7, 8], [2024, 8, 11], [2024, 9, 4],
    [2025, 2, 2], [2025, 3, 3], [2025, 4, 4], [2025, 5, 6], [2025, 6, 7], [2025, 7, 9], [2025, 8, 12], [2025, 9, 5],
    [2026, 3, 4], [2026, 4, 6], [2026, 5, 7], [2026, 6, 9], [2026, 7, 11], [2026, 8, 13],
  ];
  for (const [year, month, count] of monthlyCounts) {
    for (let i = 0; i < count; i++) {
      const seed = seq;
      const day = 1 + ((seed * 7) % 27);
      const hour = 8 + ((seed * 3) % 12);
      const minute = (seed * 11) % 60;
      const submittedAt = new Date(year, month - 1, day, hour, minute).toISOString();
      const status = seed % 9 === 0 ? 'rejected' : seed % 3 === 0 ? 'pending' : 'approved';
      const wines = pickMany(WINE_OPTIONS, seed, 2 + (seed % 2));
      const prices = [pick(PRICE_OPTIONS, seed)];
      const name = `${pick(FIRST_NAMES, seed)} ${pick(LAST_NAMES, seed + 5)}`;
      const phone = `08${String(1000000 + seed * 137).slice(0, 8)}`;
      const email = `guest${seed}@mail.com`;
      const area = pick(AREA_OPTIONS, seed + 1);
      const arrival = `${18 + (seed % 2)}:${seed % 2 === 0 ? '00' : '30'}`;
      const source = pick(SOURCE_OPTIONS, seed + 2);
      regs.push({
        id: String(seq),
        refNo: `${year}-${String(seq).padStart(3, '0')}`,
        name, phone, email, area, arrival, source,
        wines,
        prices,
        slipUrl: '',
        status,
        amount: 1200 + (seed % 4) * 200,
        submittedAt,
        roundId: ROUND_ID_BY_YEAR[year],
        roundName: ROUND_NAME_BY_YEAR[year],
        answers: {
          f1: email, f2: name, f3: phone, f4: '', f5: area, f6: arrival, f7: source, f8: wines, f9: prices,
        },
      });
      seq += 1;
    }
  }
  return regs.reverse();
}

export function seedUsers(): AdminUser[] {
  return [
    { id: '1', name: 'กมล ธนาวุฒิ', phone: '081-000-1111', role: 'Admin', active: true, joined: '01 Aug 2026' },
    { id: '2', name: 'สุภาพร แก้วมณี', phone: '082-222-3333', role: 'Staff', active: true, joined: '03 Aug 2026' },
    { id: '3', name: 'ปิยะ วัฒนกุล', phone: '083-444-5555', role: 'Staff', active: false, joined: '05 Aug 2026' },
  ];
}

