# Setup — Phuket Wine Portfolio Tasting

โฟลเดอร์นี้มี 2 ส่วนหลัก:

- `backend/Code.gs` — Google Apps Script backend (API layer เชื่อม Google Sheet + Drive)
- `frontend/` — React + TypeScript SPA (Vite) สำหรับ deploy บน Cloudflare Pages

## 1) เตรียม Google Sheet และ Drive Folder

ใช้ของที่ระบุไว้ในสเปกเดิม:

- Sheet ID: `1vPqZka3cCGXR_hYUlAn4WfbowvNG6Pvv1_VTdRnM1so`
- Drive Folder ID: `1RPuhIU7rkGbhEHI8b4bewn8yH7YjQC8X`

โค้ดจะสร้าง sheet tab ที่จำเป็นให้อัตโนมัติพร้อมหัวตารางในการรันครั้งแรก (`Registrations`, `Users`, `Rounds`, `FormFields`) — ไม่ต้องสร้างเอง

**สำคัญ:** ต้องเพิ่มผู้ใช้ admin คนแรกเองในแท็บ `Users` (คอลัมน์ `Name, Phone, Role, Active, Joined`) ก่อนจะ login เข้าหน้า Admin ได้ครั้งแรก — ตั้ง `Active = TRUE`, `Role = Admin` การ login ใช้ **เบอร์โทรอย่างเดียว ไม่มีรหัสผ่าน**

## 2) Deploy Apps Script

1. เปิด [script.google.com](https://script.google.com) → New project
2. ลบโค้ดตัวอย่าง แล้ว copy เนื้อหาทั้งหมดจาก `backend/Code.gs` ไปวาง
3. กด Save
4. Deploy → New deployment → เลือกประเภท **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. กด Deploy แล้ว Authorize access (จะเจอ "Google hasn't verified this app" ให้กด Advanced → Go to ... (unsafe) ได้ตามปกติ เพราะเป็นสคริปต์ของคุณเอง)
6. คัดลอก Web app URL ที่ได้ (รูปแบบ `https://script.google.com/macros/s/AKfycb.../exec`)

ทุกครั้งที่แก้โค้ดแล้วต้องการให้มีผลกับ URL เดิม ให้ไปที่ Deploy → Manage deployments → แก้ไข (ไอคอนดินสอ) → Version: New version → Deploy (ไม่ใช่สร้าง deployment ใหม่)

## 3) ตั้งค่า Frontend

คัดลอก `frontend/.env.example` เป็น `frontend/.env` แล้วใส่ URL จากขั้นตอนที่ 2:

```
VITE_API_URL=https://script.google.com/macros/s/AKfycb.../exec
```

ถ้าไม่ตั้งค่า `VITE_API_URL` แอปจะรันด้วย mock data ในเครื่อง (เก็บใน localStorage) — สะดวกสำหรับ preview UI โดยไม่ต้อง deploy backend ก่อน

```bash
cd frontend
npm install
npm run dev      # local dev, http://localhost:5173
npm run build    # production build → frontend/dist
```

## 4) Deploy Frontend บน Cloudflare Pages

1. Push repo นี้ขึ้น GitHub (ทำแล้วถ้าเห็นไฟล์นี้ผ่าน repo)
2. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git
3. ตั้งค่า build:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variable: `VITE_API_URL` = Apps Script Web App URL จากขั้นตอนที่ 2
5. Deploy

`frontend/public/_redirects` มี `/* /index.html 200` อยู่แล้วเพื่อรองรับ client-side routing (React Router) บน Cloudflare Pages

## เรื่อง CORS

- `doGet` (อ่านข้อมูล) เรียกผ่าน `fetch` ปกติ อ่าน response ได้ตามปกติ
- `doPost` (บันทึกข้อมูล) ส่งด้วย `Content-Type: text/plain` เพื่อเลี่ยง CORS preflight (ตามที่ Apps Script Web App รองรับ) — อ่าน response กลับมาได้ปกติในกรณีส่วนใหญ่
- ถ้าเจอ CORS error ที่แก้ไม่ได้ (บางครั้งเกิดจาก redirect ภายในของ Google เอง) ให้เปลี่ยนไปใช้ `mode: 'no-cors'` ใน `apiPost` (`frontend/src/lib/api.ts`) แทน (จะไม่สามารถอ่าน response ได้ ต้องดูผลจริงที่ Google Sheet)

## ความปลอดภัย (สำคัญ — ต้องปรับก่อนใช้งานจริง)

- Login ใช้เบอร์โทรอย่างเดียวเทียบกับ sheet `Users` — เหมาะกับทีมงานปิดกลุ่มเล็กที่ไว้ใจกันเท่านั้น ถ้าต้องการความปลอดภัยสูงขึ้นแนะนำเพิ่ม OTP ผ่าน SMS
- รูปภาพ (สลิป/แบนเนอร์/QR) ถูกตั้ง sharing เป็น `ANYONE_WITH_LINK` แล้ว serve ผ่านลิงก์ Google เอง (`lh3.googleusercontent.com/d/...` เป็นหลัก) — ฝั่ง frontend (`ResilientImage`, `qrCard.ts`) จะลองรูปแบบ URL อื่นสำรอง (`drive.google.com/thumbnail`, `drive.google.com/uc`) อัตโนมัติถ้าอันแรกโหลดไม่ขึ้น เพราะ URL เหล่านี้ไม่มีเอกสารทางการรับรองความเสถียร 100%
- Apps Script Web App ที่ "Who has access: Anyone" หมายความว่าทุก action ใน `doGet`/`doPost` เรียกได้แบบไม่ต้อง login ระดับ Google — การกันสิทธิ์ (เช่นห้าม user ทั่วไปยิง `approveRegistration`) ทำที่ฝั่ง frontend เท่านั้นในเวอร์ชันนี้ ถ้าต้องการความรัดกุมกว่านี้ควรเพิ่มการเช็ค session token ฝั่ง backend ด้วย

## แก้ปัญหา: "Access denied: DriveApp" ตอนอัปโหลดรูป

ข้อความนี้ไม่ใช่บั๊กของโค้ด — หมายความว่าสิทธิ์การเข้าถึง Google Drive ของสคริปต์หมดอายุหรือยังไม่เคยได้รับอนุญาต โดยเฉพาะบัญชี Gmail ส่วนตัว (ไม่ใช่ Workspace) ที่ OAuth consent screen ยังอยู่สถานะ "Testing" — สิทธิ์ที่ให้ไว้จะหมดอายุอัตโนมัติทุกประมาณ 7 วัน และต้องอนุญาตใหม่ทุกครั้ง (ไม่มีทางเลี่ยงแบบถาวรถ้าไม่เปลี่ยนไปใช้บัญชี Workspace หรือให้ Google ตรวจสอบแอป)

**วิธีแก้ (ทำซ้ำได้ทุกครั้งที่เจอ ใช้เวลา ~2 นาที):**

1. เปิดโปรเจกต์นี้ที่ script.google.com
2. เลือกฟังก์ชัน `authorizeDriveAccess` จาก dropdown บน toolbar (ข้างปุ่ม ▶ เรียกใช้) แล้วกด Run
3. จะมี popup "ต้องมีการให้สิทธิ์" ขึ้นมา → กด **ตรวจสอบสิทธิ์** (Review permissions)
4. เลือกบัญชี Google ที่เป็นเจ้าของโปรเจกต์
5. ถ้าเจอหน้าเตือน "Google hasn't verified this app" → กด **ขั้นสูง (Advanced)** → **ไปที่ [ชื่อโปรเจกต์] (unsafe)**
6. ตรวจดูรายการสิทธิ์ (ควรมี Google Drive) → กด **อนุญาต (Allow)**
7. ดู execution log ด้านล่าง ควรขึ้นข้อความ "อนุญาตสำเร็จ — เข้าถึงโฟลเดอร์..." แปลว่าเสร็จแล้ว
8. กลับไปที่เว็บจริง ลองอัปโหลดรูปใหม่อีกครั้ง (ไม่ต้อง redeploy — ขั้นตอนนี้เป็นการให้สิทธิ์ ไม่ใช่การแก้โค้ด)

ถ้าไม่อยากทำซ้ำทุกสัปดาห์ ทางเลือกถาวรคือย้าย Publishing status ของ OAuth consent screen (Google Cloud Console) เป็น **Internal** — ใช้ได้เฉพาะบัญชี Google Workspace เท่านั้น บัญชี Gmail ส่วนตัวไม่มีตัวเลือกนี้

## โครงสร้างโปรเจกต์

```
backend/
  Code.gs               — Apps Script API (doGet/doPost)
frontend/
  src/
    styles/             — design tokens + base + component CSS
    components/         — shared UI (Button, Card, charts, dynamic form field, ...)
    context/             — Auth / Language / Toast / Print providers
    lib/                 — types, api client, mock store, chart/format helpers
    pages/user/          — Home, Register, Success
    pages/admin/         — Login, Dashboard, Rounds, List, Verify, Responses, Users, Form Builder
  public/_redirects      — Cloudflare Pages SPA routing
```
