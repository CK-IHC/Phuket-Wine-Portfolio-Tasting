/**
 * Phuket Wine Portfolio Tasting — Apps Script backend
 * Deploy as Web App: Execute as "Me", Who has access "Anyone".
 * See ../SETUP.md for full deploy steps.
 */

const SHEET_ID = '1vPqZka3cCGXR_hYUlAn4WfbowvNG6Pvv1_VTdRnM1so';
const FOLDER_ID = '1RPuhIU7rkGbhEHI8b4bewn8yH7YjQC8X';

const REG_HEADERS = ['Timestamp','RefNo','Name','Phone','Email','Area','Arrival','Source','Wines','Prices','SlipUrl','Amount','Status','RejectReason','RoundId','RoundName','AnswersJson'];
// No password column — admin/staff sign in with phone number only (matched against Active users).
const USER_HEADERS = ['Name','Phone','Role','Active','Joined'];
// One row per question — Options stays as compact JSON since a question can
// have any number of them, but every other property is its own column so
// the form can be read/skimmed directly in the Sheet instead of as one
// opaque JSON blob.
const FORM_HEADERS = ['Id', 'Type', 'Label', 'Required', 'Placeholder', 'MaxSelect', 'OptionsJson', 'QrUrl', 'QrCaption'];
// A round is both the registerable session and its Home-page announcement —
// creating one creates the other (see the Rounds section below).
const ROUND_HEADERS = ['Id','Name','Date','StartTime','EndTime','Venue','Capacity','Status','TextTh','TextEn','ImageUrls','BannerAspect','Published'];

function getSS() { return SpreadsheetApp.openById(SHEET_ID); }

/** Redeploying the Apps Script code never touches sheets that already exist —
 * a sheet created by an earlier version of this file keeps its original
 * header row forever. So whenever a phase adds a new column (e.g. ImageUrls,
 * TextTh, Published on Rounds), every existing deployment's live sheet is
 * silently missing it and reads/writes for that column go nowhere. Heal that
 * here: append any headers this sheet doesn't have yet, in the same order
 * they appear in the expected list, so appendRow's positional writes and
 * name-based lookups both stay correct. */
function getSheet(name, headers) {
  const ss = getSS();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    return sh;
  }
  const lastCol = sh.getLastColumn();
  const existing = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const missing = headers.filter((h) => existing.indexOf(h) === -1);
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Sheets auto-detects date/time-shaped text (the "2026-09-20" Date column,
 * "18:00" StartTime/EndTime) and silently stores it as a real Date value —
 * even though it was written as a plain string via appendRow/setValue. Left
 * alone, that Date survives into the JSON response via its default
 * toJSON/toISOString(), which is always UTC — shifting local dates/times
 * across midnight and leaving the frontend's "YYYY-MM-DD"/"HH:mm" string
 * parsing (date.split('-'), etc.) looking at mangled text. Convert any Date
 * cell back to a plain local-timezone string before it ever reaches JSON. */
function formatSheetDate_(v, header, tz) {
  if (/time$/i.test(header)) return Utilities.formatDate(v, tz, 'HH:mm');
  if (/date$/i.test(header)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  return Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm:ss");
}

function sheetToObjects(sh) {
  const tz = Session.getScriptTimeZone();
  const rng = sh.getDataRange().getValues();
  if (rng.length < 2) return [];
  const headers = rng[0];
  return rng.slice(1).filter(r => r.join('') !== '').map((row, i) => {
    const obj = { _row: i + 2 };
    headers.forEach((h, idx) => {
      let v = row[idx];
      if (v instanceof Date) v = formatSheetDate_(v, h, tz);
      obj[h] = v;
    });
    return obj;
  });
}

// ───────────────────────── doGet / doPost ─────────────────────────

/** "Access denied: DriveApp" isn't a bug in this code — it means the script's
 * permission to use Drive has expired or was never granted (very common
 * while the linked Google Cloud OAuth consent screen is still in "Testing"
 * publishing status, where granted access expires after ~7 days). Surface
 * the fix directly in the error instead of just the raw exception, so
 * whoever sees the failure toast doesn't have to come ask what it means. */
function friendlyError_(err) {
  const msg = String(err);
  if (/access denied/i.test(msg) && /drive/i.test(msg)) {
    return msg + ' — สิทธิ์เข้าถึง Google Drive หมดอายุ/ยังไม่ได้อนุญาต: เปิดโปรเจกต์นี้ที่ script.google.com, เลือกฟังก์ชันใดก็ได้จาก dropdown แล้วกด Run 1 ครั้ง, กด "Review permissions" > เลือกบัญชี > Advanced > Go to [ชื่อโปรเจกต์] (unsafe) > Allow. ถ้าเกิดซ้ำทุกสัปดาห์ ให้ไปที่ Google Cloud Console > OAuth consent screen แล้วเปลี่ยน Publishing status เป็น Internal (ถ้าเป็นบัญชี Workspace) เพื่อไม่ให้สิทธิ์หมดอายุอีก';
  }
  return msg;
}

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  try {
    if (action === 'getRegistrations') return json({ ok: true, data: readRegistrations() });
    if (action === 'getFormFields') return json({ ok: true, data: readFormFields() });
    if (action === 'getUsers') return json({ ok: true, data: readUsers() });
    if (action === 'getDashboardStats') return json({ ok: true, data: computeStats() });
    if (action === 'getRounds') return json({ ok: true, data: readRounds() });
    return json({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: friendlyError_(err) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    let result;
    switch (action) {
      case 'login': result = login(payload); break;
      case 'submitRegistration': result = submitRegistration(payload); break;
      case 'approveRegistration': result = setStatus(payload.refNo, 'approved'); break;
      case 'rejectRegistration': result = setStatus(payload.refNo, 'rejected', payload.reason); break;
      case 'editRegistration': result = editRegistration(payload); break;
      case 'deleteRegistration': result = deleteRegistration(payload.refNo); break;
      case 'saveFormFields': result = saveFormFields(payload.fields); break;
      case 'uploadImage': result = uploadImage(payload); break;
      case 'addUser': result = addUser(payload); break;
      case 'updateUser': result = updateUser(payload); break;
      case 'deleteUser': result = deleteUser(payload.phone); break;
      case 'addRound': result = addRound(payload); break;
      case 'updateRound': result = updateRound(payload); break;
      case 'deleteRound': result = deleteRound(payload.id); break;
      default: result = { ok: false, error: 'unknown action: ' + action };
    }
    return json(result);
  } catch (err) {
    return json({ ok: false, error: friendlyError_(err) });
  }
}

// ───────────────────────── Registrations ─────────────────────────

function readRegistrations() {
  return sheetToObjects(getSheet('Registrations', REG_HEADERS));
}

function nextRefNo() {
  const beYear = new Date().getFullYear() + 543;
  const sh = getSheet('Registrations', REG_HEADERS);
  const count = Math.max(0, sh.getLastRow() - 1);
  return beYear + '-' + String(count + 1).padStart(3, '0');
}

function getOrCreateSubfolder_(parentFolder, name) {
  const existing = parentFolder.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parentFolder.createFolder(name);
}

/** Run this manually from the editor (select it in the function dropdown,
 * click Run) whenever uploads start failing with "Access denied: DriveApp".
 * That error means Drive access has expired and needs re-granting — this
 * function exists purely to trigger that permission prompt cleanly, with no
 * other side effects and no confusing follow-up errors about missing
 * arguments (unlike running saveBase64ToDrive directly). Check the
 * execution log after running it: it should print the target folder's name
 * on success. */
function authorizeDriveAccess() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('อนุญาตสำเร็จ — เข้าถึงโฟลเดอร์ "%s" ได้แล้ว (Authorized OK — can access folder "%s")', folder.getName(), folder.getName());
}

/** subfolderName is optional — e.g. "Banners" keeps banner uploads out of
 * the flat root folder alongside payment slips. Omit it to save directly
 * into FOLDER_ID (used for slips and QR uploads). */
function saveBase64ToDrive(base64, fileName, mimeType, subfolderName) {
  let folder = DriveApp.getFolderById(FOLDER_ID);
  if (subfolderName) folder = getOrCreateSubfolder_(folder, subfolderName);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
  const file = folder.createFile(blob);
  // Serving the file through this Web App's own doGet (returning a raw Blob)
  // reliably fails live with "the returned value was not a supported return
  // type" — so instead, share the file and link to Google's own CDN, which
  // is what every <img> tag actually needs: a URL Google itself serves.
  // Sharing must succeed or the link is useless, so let a failure here
  // (e.g. a Workspace policy blocking "anyone with the link") surface as a
  // real upload error instead of silently returning a dead URL.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

function submitRegistration(p) {
  const sh = getSheet('Registrations', REG_HEADERS);
  const refNo = nextRefNo();
  let slipUrl = '';
  if (p.slipBase64) slipUrl = saveBase64ToDrive(p.slipBase64, refNo + '_' + (p.fileName || 'slip.jpg'), p.mimeType || 'image/jpeg');
  sh.appendRow([
    new Date(), refNo, p.name || '', p.phone || '', p.email || '', p.area || '',
    p.arrival || '', p.source || '', (p.wines || []).join(', '), (p.prices || []).join(', '),
    slipUrl, p.amount || 0, 'pending', '', p.roundId || '', p.roundName || '',
    JSON.stringify(p.answers || {}),
  ]);
  return { ok: true, refNo };
}

function findRegRow_(refNo) {
  const sh = getSheet('Registrations', REG_HEADERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (data[i][1] === refNo) return { sh, rowIndex: i + 1, headers: data[0] };
  return null;
}

function setStatus(refNo, status, reason) {
  const found = findRegRow_(refNo);
  if (!found) return { ok: false, error: 'not found' };
  const statusCol = found.headers.indexOf('Status') + 1;
  const reasonCol = found.headers.indexOf('RejectReason') + 1;
  found.sh.getRange(found.rowIndex, statusCol).setValue(status);
  if (reason !== undefined) found.sh.getRange(found.rowIndex, reasonCol).setValue(reason || '');
  return { ok: true };
}

function editRegistration(p) {
  const found = findRegRow_(p.refNo);
  if (!found) return { ok: false, error: 'not found' };
  ['Name','Phone','Email','Area','Arrival','Source','Amount','RoundId','RoundName'].forEach(key => {
    const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
    if (p[lowerKey] !== undefined) {
      const col = found.headers.indexOf(key) + 1;
      found.sh.getRange(found.rowIndex, col).setValue(p[lowerKey]);
    }
  });
  return { ok: true };
}

function deleteRegistration(refNo) {
  const found = findRegRow_(refNo);
  if (!found) return { ok: false, error: 'not found' };
  found.sh.deleteRow(found.rowIndex);
  return { ok: true };
}

function computeStats() {
  const regs = readRegistrations();
  const total = regs.length;
  const pending = regs.filter(r => r.Status === 'pending').length;
  const approved = regs.filter(r => r.Status === 'approved').length;
  const rejected = regs.filter(r => r.Status === 'rejected').length;
  const revenue = regs.filter(r => r.Status === 'approved').reduce((a, r) => a + (Number(r.Amount) || 0), 0);
  return { total, pending, approved, rejected, revenue };
}

// ───────────────────────── Users / Login ─────────────────────────
//
// Sign-in is phone-number-only: the phone must match an Active row in the
// Users sheet. There is no separate password field.

function readUsers() {
  return sheetToObjects(getSheet('Users', USER_HEADERS));
}

function login(p) {
  const rows = readUsers();
  const user = rows.find(u => String(u.Phone) === String(p.phone) && u.Active !== false && u.Active !== 'FALSE');
  if (!user) return { ok: false, error: 'ไม่พบผู้ใช้งานหรือถูกปิดใช้งาน' };
  return { ok: true, name: user.Name, role: user.Role, phone: user.Phone };
}

function addUser(p) {
  const sh = getSheet('Users', USER_HEADERS);
  sh.appendRow([p.name || '', p.phone || '', p.role || 'Staff', true, new Date()]);
  return { ok: true };
}

function updateUser(p) {
  const sh = getSheet('Users', USER_HEADERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(p.phone)) {
      if (p.name !== undefined) sh.getRange(i + 1, 1).setValue(p.name);
      if (p.role !== undefined) sh.getRange(i + 1, 3).setValue(p.role);
      if (p.active !== undefined) sh.getRange(i + 1, 4).setValue(p.active);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not found' };
}

function deleteUser(phone) {
  const sh = getSheet('Users', USER_HEADERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(phone)) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'not found' };
}

function uploadImage(p) {
  const url = saveBase64ToDrive(p.base64, p.fileName || ('image_' + Date.now() + '.jpg'), p.mimeType || 'image/jpeg', p.folder);
  return { ok: true, url };
}

// ───────────────────────── Rounds ─────────────────────────
//
// Each event edition/session is a "round" that admins open or close for
// registration. Registrations store which round they belong to (RoundId/
// RoundName on the Registrations sheet).

// Sheets treats a bare "9/16"-style cell as a date to auto-format (same
// class of bug as the Date/StartTime/EndTime columns) — "1/1" silently
// becomes Jan 1, "9/16" becomes Sep 16, etc. Store a word instead of a
// fraction so there's nothing date-shaped for Sheets to "helpfully" parse.
const ASPECT_TO_CELL = { '16/9': 'wide', '1/1': 'square', '4/3': 'classic', '9/16': 'tall' };
const CELL_TO_ASPECT = { wide: '16/9', square: '1/1', classic: '4/3', tall: '9/16' };

function readRounds() {
  const rows = sheetToObjects(getSheet('Rounds', ROUND_HEADERS));
  rows.forEach((r) => { r.BannerAspect = CELL_TO_ASPECT[r.BannerAspect] || r.BannerAspect; });
  return rows;
}

function addRound(p) {
  const sh = getSheet('Rounds', ROUND_HEADERS);
  const id = 'round-' + Date.now();
  sh.appendRow([
    id, p.name || '', p.date || '', p.startTime || '', p.endTime || '', p.venue || '', p.capacity || 0, p.status || 'closed',
    p.textTh || '', p.textEn || '', (p.imageUrls || []).join(','), ASPECT_TO_CELL[p.bannerAspect] || 'wide', p.published !== false,
  ]);
  return { ok: true, id };
}

function updateRound(p) {
  const sh = getSheet('Rounds', ROUND_HEADERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      const headers = data[0];
      const setCol = (name, value) => sh.getRange(i + 1, headers.indexOf(name) + 1).setValue(value);
      ['Name','Date','StartTime','EndTime','Venue','Capacity','Status','TextTh','TextEn','Published'].forEach(key => {
        const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
        if (p[lowerKey] !== undefined) setCol(key, p[lowerKey]);
      });
      if (p.bannerAspect !== undefined) setCol('BannerAspect', ASPECT_TO_CELL[p.bannerAspect] || 'wide');
      if (p.imageUrls !== undefined) setCol('ImageUrls', (p.imageUrls || []).join(','));
      return { ok: true };
    }
  }
  return { ok: false, error: 'not found' };
}

function deleteRound(id) {
  const sh = getSheet('Rounds', ROUND_HEADERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'not found' };
}

// ───────────────────────── Form Builder ─────────────────────────

function fieldToRow_(f) {
  return [f.id, f.type, f.label, !!f.required, f.placeholder || '', f.maxSelect || '', JSON.stringify(f.options || []), f.qrUrl || '', f.qrCaption || ''];
}

function rowToField_(r) {
  const field = { id: r.Id, type: r.Type, label: r.Label, required: r.Required === true || r.Required === 'TRUE', placeholder: r.Placeholder || '' };
  try { field.options = r.OptionsJson ? JSON.parse(r.OptionsJson) : []; } catch (e) { field.options = []; }
  if (r.MaxSelect) field.maxSelect = Number(r.MaxSelect);
  if (r.Type === 'qr') { field.qrUrl = r.QrUrl || ''; field.qrCaption = r.QrCaption || ''; }
  return field;
}

/** The FormFields sheet used to be a single JSON blob in one cell (header
 * "FieldsJson"). Redeploying code never touches an existing sheet's shape,
 * so on first read under the new row-per-question layout, migrate that old
 * blob into real rows once. */
function migrateFormFieldsSheet_() {
  const ss = getSS();
  const sh = ss.getSheetByName('FormFields');
  if (!sh) return;
  const lastCol = sh.getLastColumn();
  const headers = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if (headers[0] !== 'FieldsJson') return;
  const raw = sh.getRange(2, 1).getValue();
  let fields = DEFAULT_FORM_FIELDS;
  if (raw) { try { fields = JSON.parse(raw); } catch (e) {} }
  sh.clear();
  sh.appendRow(FORM_HEADERS);
  const rows = fields.map(fieldToRow_);
  if (rows.length) sh.getRange(2, 1, rows.length, FORM_HEADERS.length).setValues(rows);
}

function readFormFields() {
  migrateFormFieldsSheet_();
  const rows = sheetToObjects(getSheet('FormFields', FORM_HEADERS));
  if (!rows.length) return DEFAULT_FORM_FIELDS;
  return rows.map(rowToField_);
}

function saveFormFields(fields) {
  migrateFormFieldsSheet_();
  const sh = getSheet('FormFields', FORM_HEADERS);
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  const rows = fields.map(fieldToRow_);
  if (rows.length) sh.getRange(2, 1, rows.length, FORM_HEADERS.length).setValues(rows);
  return { ok: true };
}

function opts_(list) { return list.map((label, i) => ({ id: 'o' + i, label })); }

const DEFAULT_FORM_FIELDS = [
  { id: 'f1', type: 'short', label: 'Email', required: true, options: [] },
  { id: 'f2', type: 'short', label: 'Full Name', required: true, options: [] },
  { id: 'f3', type: 'short', label: 'Phone Number', required: true, options: [] },
  { id: 'f4', type: 'short', label: 'LINE ID or WhatsApp Number', required: false, options: [] },
  { id: 'f5', type: 'dropdown', label: 'Which Area Do You Live?', required: true,
    options: opts_(['Patong','Kata','Karon','Cherng Talay / Laguna','Rawai / Nai Harn','Phuket Town','Other']) },
  { id: 'f6', type: 'time', label: 'Estimated Arrival Time', required: true, options: [] },
  { id: 'f7', type: 'dropdown', label: 'How did you hear about this event?', required: false,
    options: opts_(['Instagram','Facebook','Friend / Word of mouth','Email invitation','Wine shop / Partner','Other']) },
  { id: 'f8', type: 'checkbox', label: 'Which wines are you interested in? (Top 3)', required: true, maxSelect: 3,
    options: opts_(['Red – Bordeaux','Red – Burgundy','Red – New World','White – Chardonnay','White – Sauvignon Blanc','Rosé','Sparkling / Champagne','Natural Wine','Orange Wine','Dessert / Fortified Wine']) },
  { id: 'f9', type: 'checkbox', label: 'What wine price range are you looking for? (Top 3)', required: true, maxSelect: 3,
    options: opts_(['Under ฿500','฿500–1,000','฿1,000–2,000','฿2,000–5,000','฿5,000+','Not sure yet']) },
  { id: 'f10', type: 'qr', label: 'Payment QR Code', required: false, options: [], qrUrl: '' },
];
