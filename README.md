# Phuket Wine Portfolio Tasting

เว็บแอปจัดงาน Wine Tasting — ฝั่ง User ลงทะเบียนเข้าร่วมงานพร้อมแนบสลิปโอนเงิน และฝั่ง Admin ตรวจสลิป จัดการรายการลงทะเบียน ผู้ใช้งาน รอบงาน (ซึ่งรวมประกาศหน้าแรกไว้ในตัว) และสร้างแบบฟอร์มลงทะเบียนแบบ dynamic พร้อมรายงาน/พิมพ์และ export Excel

## Tech Stack

- **Frontend**: React + TypeScript (Vite), React Router — static SPA deploy บน Cloudflare Pages
- **Backend**: Google Apps Script Web App (`doGet`/`doPost`) เป็น API layer เชื่อม Google Sheet (ฐานข้อมูล) และ Google Drive (เก็บรูปสลิป/แบนเนอร์/QR)
- Login ฝั่ง Admin ด้วยเบอร์โทรเทียบกับ sheet `Users` เท่านั้น (ไม่มีรหัสผ่านแยก)

ดูขั้นตอน deploy แบบละเอียดใน **[SETUP.md](./SETUP.md)**

## โครงสร้างโปรเจกต์

```
backend/Code.gs     — Apps Script backend
frontend/           — React + TypeScript SPA
SETUP.md            — ขั้นตอน deploy Apps Script + Cloudflare Pages
```

## Design System

ระบบดีไซน์ "blueprint": พื้นหลัง steel-blue neutrals, accent เดี่ยวโทนน้ำเงินเข้ม (`#5980a6`) พร้อม tonal ramp, ฟอนต์ Barlow Condensed (heading) / Barlow (body), การ์ด/รูปภาพมีเส้นบางและ corner mark ที่มุม — ดู token ทั้งหมดที่ `frontend/src/styles/tokens.css`

## Quick Start (local, mock data)

```bash
cd frontend
npm install
npm run dev
```

ไม่ต้องตั้งค่า backend ก็เปิดดู UI ได้ทันที — แอปจะใช้ mock data ที่เก็บใน localStorage โดยอัตโนมัติเมื่อไม่ได้ตั้งค่า `VITE_API_URL` (ดู `frontend/.env.example`)

## Features

**ฝั่ง User**
- หน้าหลัก: แสดงรายการรอบงานที่เผยแพร่ แต่ละรอบมี banner carousel (auto-play/dots/lightbox) + ข้อความประกาศ TH/EN ของตัวเอง, ปุ่มลงทะเบียน (เฉพาะรอบที่เปิด)
- แบบฟอร์มลงทะเบียนแบบ dynamic ตามที่ Admin ตั้งค่า พร้อม QR ชำระเงิน (view-only + ดาวน์โหลด) และแนบสลิป
- เลขที่อ้างอิงรูปแบบ `[ปี ค.ศ.]-[เลขลำดับ]`
- สลับภาษา TH/EN

**ฝั่ง Admin** (login ด้วยเบอร์โทร)
- Dashboard: การ์ดสรุป, กราฟรายเดือน/รายวัน/รายปี, กราฟโดนัทสัดส่วนสถานะ
- รายการลงทะเบียน: ค้นหา/กรองสถานะ, เลือกหลายแถว, ดูรายละเอียด/แก้ไข/ลบ, Report (พิมพ์), Export Excel
- สลิปรอตรวจสอบ: อนุมัติ/ปฏิเสธพร้อมเหตุผล
- การตอบแบบฟอร์ม: ตาราง+พิมพ์+Export
- ผู้ใช้งาน: เพิ่ม/ลบ/เปิดปิดสิทธิ์
- รอบงาน: สร้าง/แก้ไขรอบงานพร้อมกันกับประกาศหน้าแรก — ชื่อ/วันเวลา/สถานที่/จำนวนที่นั่ง/สถานะเปิด-ปิด, ข้อความ TH/EN, รูป banner หลายภาพ, ขนาด banner, สวิตช์เผยแพร่หน้าแรก
- Form Builder: toolbox ลากเพิ่มฟิลด์, properties panel, preview, save draft/publish
