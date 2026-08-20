/**
 * Phuket Wine Portfolio Tasting — Apps Script backend
 * Deploy as Web App: Execute as "Me", Who has access "Anyone".
 * See ../SETUP.md for full deploy steps.
 */

const SHEET_ID = '1vPqZka3cCGXR_hYUlAn4WfbowvNG6Pvv1_VTdRnM1so';
const FOLDER_ID = '1RPuhIU7rkGbhEHI8b4bewn8yH7YjQC8X';

const REG_HEADERS = ['Timestamp','RefNo','Name','Phone','Email','Area','Arrival','Source','Wines','Prices','SlipUrl','Amount','Status','RejectReason','RoundId','RoundName'];
// No password column — admin/staff sign in with phone number only (matched against Active users).
const USER_HEADERS = ['Name','Phone','Role','Active','Joined'];
// One row per question — Options stays as compact JSON since a question can
// have any number of them, but every other property is its own column so
// the form can be read/skimmed directly in the Sheet instead of as one
// opaque JSON blob.
const FORM_HEADERS = ['Id', 'Type', 'Label', 'Required', 'Placeholder', 'MaxSelect', 'OptionsJson', 'QrUrl', 'QrCaption'];
// A round is both the registerable session and its Home-page announcement —
// creating one creates the other (see the Rounds section below).
const ROUND_HEADERS = ['Id','Name','Title','Date','StartTime','EndTime','Venue','Capacity','Status','TextTh','TextEn','ImageUrls','BannerAspect','Published'];

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

/** Builds a row aligned to the sheet's actual current header order (post
 * self-heal) instead of a hardcoded positional array — self-healed columns
 * only ever get appended at the end, never inserted where a hand-written
 * literal would expect them, so a positional literal silently drifts out of
 * sync with real column order the moment a new header gets appended ahead
 * of where the deploy-time constant lists it. Any header not present in
 * valuesByHeader is left blank. */
function appendRowByHeaders_(sh, valuesByHeader) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map((h) => (h in valuesByHeader ? valuesByHeader[h] : '')));
}

/** Sheets auto-detects any numeric-looking string — a phone number like
 * "0812345678" included — and silently stores it as a real Number, which
 * drops the leading "0" every Thai mobile number starts with (becomes
 * 812345678). That's not just cosmetic: phone-based login and search both
 * compare against the string the user actually typed, leading zero
 * included, so a corrupted cell just stops matching. Force the column to
 * Plain Text formatting so future writes keep the leading zero, and repair
 * any cell that's already been silently coerced to a number (a 9-digit
 * number where a 10-digit Thai mobile number should be = a lost leading
 * zero). Safe to call repeatedly — a no-op once every cell is already text. */
function fixPhoneColumn_(sh, header) {
  const lastCol = sh.getLastColumn();
  if (lastCol === 0) return;
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const idx = headers.indexOf(header);
  if (idx === -1) return;
  const col = idx + 1;
  // Some sheets refuse a bulk number-format change on a column (merged
  // cells, a protected range, etc.) — that's real on at least one deployed
  // sheet in the wild, and letting it throw here would take down every
  // page that reads this sheet, not just phone formatting. Best-effort
  // only: skip formatting rather than crash the caller.
  try {
    sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@');
  } catch (err) { /* not fatal — the repair pass below is what matters */ }
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  const range = sh.getRange(2, col, lastRow - 1, 1);
  const values = range.getValues();
  let changed = false;
  const fixed = values.map(([v]) => {
    if (typeof v === 'number') {
      changed = true;
      const digits = String(v);
      return [digits.length === 9 ? '0' + digits : digits];
    }
    return [v];
  });
  if (changed) {
    try {
      range.setValues(fixed);
    } catch (err) { /* same reasoning — never let this crash the caller */ }
  }
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
    return msg + ' — ดูวิธีแก้ใน SETUP.md หัวข้อ "Access denied: DriveApp" หรือลองเปิด [Web App URL]?action=diag เพื่อดูรายละเอียด';
  }
  return msg;
}

/** Visit <web app URL>?action=diag directly in a browser to see exactly who
 * this deployment executes as and whether it can actually reach Drive right
 * now — this is the one thing that differs between an editor test run
 * (always runs as you) and a real request hitting the deployed web app, so
 * it's the fastest way to see what's actually happening server-side instead
 * of guessing from the short error message alone. */
// Bumped whenever diag() itself changes — the fastest way to tell whether
// a "Deploy → New version" actually took effect: if this string isn't the
// one you just added, the web app is still serving old code, full stop.
const CODE_VERSION = 'phone-column-fix-crashproof-2';

function diag() {
  const out = { ok: true, codeVersion: CODE_VERSION };
  try {
    const users = readUsers();
    out.usersReadTest = 'OK — ' + users.length + ' user row(s) read successfully';
  } catch (err) {
    out.usersReadTest = 'FAILED: ' + String(err);
  }
  try { out.effectiveUser = Session.getEffectiveUser().getEmail() || '(empty)'; } catch (err) { out.effectiveUser = 'ERROR: ' + String(err); }
  try { out.activeUser = Session.getActiveUser().getEmail() || '(empty)'; } catch (err) { out.activeUser = 'ERROR: ' + String(err); }
  try { out.scriptTimeZone = Session.getScriptTimeZone(); } catch (err) { out.scriptTimeZone = 'ERROR: ' + String(err); }
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    out.driveReadAccess = 'OK — folder name: ' + folder.getName() + ', owner: ' + folder.getOwner().getEmail();
  } catch (err) {
    out.driveReadAccess = 'FAILED: ' + String(err);
  }
  // Reading folder metadata only needs Viewer access — actually uploading a
  // file needs Editor/Content-manager access on that folder specifically,
  // which is a completely different, Drive-sharing-level permission that no
  // amount of re-authorizing OAuth scopes can grant. Test the real thing.
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const testFile = folder.createFile('diag-write-test.txt', 'ok', MimeType.PLAIN_TEXT);
    testFile.setTrashed(true);
    out.driveWriteAccess = 'OK — created and removed a test file successfully';
  } catch (err) {
    out.driveWriteAccess = 'FAILED: ' + String(err);
  }
  // setSharing() changes who else can view a file — a different, more
  // sensitive permission than just creating it. Test it in isolation, since
  // driveWriteAccess above never calls it.
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const testFile = folder.createFile('diag-sharing-test.txt', 'ok', MimeType.PLAIN_TEXT);
    testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    testFile.setTrashed(true);
    out.driveSharingAccess = 'OK — set sharing on a test file successfully';
  } catch (err) {
    out.driveSharingAccess = 'FAILED: ' + String(err);
  }
  // The most direct test: run the exact same function the real upload uses,
  // with a tiny 1x1 PNG, so this reproduces the real failure exactly instead
  // of an approximation of it.
  try {
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const url = saveBase64ToDrive(tinyPngBase64, 'diag-real-path-test.png', 'image/png', 'Banners');
    out.realUploadPathTest = 'OK — ' + url;
  } catch (err) {
    out.realUploadPathTest = 'FAILED: ' + String(err);
  }
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    out.sheetAccess = 'OK — spreadsheet name: ' + ss.getName();
  } catch (err) {
    out.sheetAccess = 'FAILED: ' + String(err);
  }
  return out;
}

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  try {
    if (action === 'getRegistrations') return json({ ok: true, data: readRegistrations() });
    if (action === 'getFormFields') return json({ ok: true, data: readFormFields() });
    if (action === 'getUsers') return json({ ok: true, data: readUsers() });
    if (action === 'getDashboardStats') return json({ ok: true, data: computeStats() });
    if (action === 'getRounds') return json({ ok: true, data: readRounds() });
    if (action === 'diag') return json(diag());
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
//
// Every form question is backed by a real, readable column on the
// Registrations sheet — never a JSON blob. The original fixed questions
// (f1,f2,f3,f5,f6,f7,f8,f9) reuse their existing named columns (Email/Name/
// Phone/Area/Arrival/Source/Wines/Prices, needed as-is by every other admin
// page); every other question — including any custom one added later —
// gets its own self-healed "Q: <label>" column, same pattern as
// ROUND_HEADERS. The API response still hands the frontend an `answers`
// map (reconstructed fresh from those columns on every read) since that's
// the existing contract, but nothing JSON-shaped is ever stored in a cell.

const LEGACY_FIELD_COLUMN = { f1: 'Email', f2: 'Name', f3: 'Phone', f5: 'Area', f6: 'Arrival', f7: 'Source', f8: 'Wines', f9: 'Prices' };

/** One entry per current question that needs its own Registrations column:
 * every non-QR field except the legacy ones already covered by a named
 * column. Header text is "Q: <label>" — the "Q: " prefix guarantees it can
 * never collide with a fixed REG_HEADERS name even if a question happens to
 * be labeled e.g. "Name". Duplicate labels get "(2)", "(3)", … appended. */
function answerColumns_(fields) {
  const seen = {};
  return fields
    .filter((f) => f.type !== 'qr' && !LEGACY_FIELD_COLUMN[f.id])
    .map((f) => {
      const label = (f.label || f.id || '').toString().trim() || f.id;
      let header = 'Q: ' + label;
      if (seen[header]) { seen[header] += 1; header = header + ' (' + seen[header] + ')'; } else { seen[header] = 1; }
      return { id: f.id, header: header };
    });
}

/** The Registrations sheet used to carry one AnswersJson blob column;
 * answers now live entirely in plain columns (see answerColumns_ above), so
 * on an already-deployed sheet that column is dead JSON left behind by the
 * old format — drop it once so the sheet stays JSON-free going forward. */
function migrateRegistrationsSheet_() {
  const ss = getSS();
  const sh = ss.getSheetByName('Registrations');
  if (!sh) return;
  const lastCol = sh.getLastColumn();
  if (lastCol === 0) return;
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const idx = headers.indexOf('AnswersJson');
  if (idx !== -1) {
    try {
      sh.deleteColumn(idx + 1);
    } catch (err) { /* e.g. merged cells blocking the edit — not fatal, skip it */ }
  }
  fixPhoneColumn_(sh, 'Phone');
}

function readRegistrations() {
  migrateRegistrationsSheet_();
  const dynCols = answerColumns_(readFormFields());
  const headers = REG_HEADERS.concat(dynCols.map((c) => c.header));
  const rows = sheetToObjects(getSheet('Registrations', headers));
  rows.forEach((r) => {
    const answers = {};
    Object.keys(LEGACY_FIELD_COLUMN).forEach((fieldId) => {
      const v = r[LEGACY_FIELD_COLUMN[fieldId]];
      if (v !== undefined && v !== '') answers[fieldId] = v;
    });
    dynCols.forEach((c) => {
      const v = r[c.header];
      if (v !== undefined && v !== '') answers[c.id] = v;
    });
    r.AnswersJson = JSON.stringify(answers);
  });
  return rows;
}

function nextRefNo() {
  const year = new Date().getFullYear();
  const sh = getSheet('Registrations', REG_HEADERS);
  const count = Math.max(0, sh.getLastRow() - 1);
  return year + '-' + String(count + 1).padStart(3, '0');
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
  // Do NOT call file.setSharing() here — diag confirmed this account's OAuth
  // grant can create files but not change per-file sharing (a narrower
  // permission tier than plain file creation). A new file created inside a
  // folder that is ITSELF shared "Anyone with the link" inherits that same
  // public-viewer access automatically, with no API call needed — so the
  // parent folder's sharing (set once, manually, in the Drive UI — see
  // SETUP.md) is what makes these links work now, not a per-file API call.
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

function submitRegistration(p) {
  migrateRegistrationsSheet_();
  const dynCols = answerColumns_(readFormFields());
  const sh = getSheet('Registrations', REG_HEADERS.concat(dynCols.map((c) => c.header)));
  const refNo = nextRefNo();
  let slipUrl = '';
  if (p.slipBase64) slipUrl = saveBase64ToDrive(p.slipBase64, refNo + '_' + (p.fileName || 'slip.jpg'), p.mimeType || 'image/jpeg');
  const answers = p.answers || {};
  const values = {
    Timestamp: new Date(), RefNo: refNo, Name: p.name || '', Phone: p.phone || '', Email: p.email || '',
    Area: p.area || '', Arrival: p.arrival || '', Source: p.source || '',
    Wines: (p.wines || []).join(', '), Prices: (p.prices || []).join(', '),
    SlipUrl: slipUrl, Amount: p.amount || 0, Status: 'pending', RejectReason: '',
    RoundId: p.roundId || '', RoundName: p.roundName || '',
  };
  dynCols.forEach((c) => {
    const v = answers[c.id];
    if (v === undefined) return;
    values[c.header] = Array.isArray(v) ? v.join(', ') : v;
  });
  appendRowByHeaders_(sh, values);
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
  const sh = getSheet('Users', USER_HEADERS);
  fixPhoneColumn_(sh, 'Phone');
  return sheetToObjects(sh);
}

function login(p) {
  const rows = readUsers();
  const user = rows.find(u => String(u.Phone) === String(p.phone) && u.Active !== false && u.Active !== 'FALSE');
  if (!user) return { ok: false, error: 'ไม่พบผู้ใช้งานหรือถูกปิดใช้งาน' };
  return { ok: true, name: user.Name, role: user.Role, phone: user.Phone };
}

function addUser(p) {
  const sh = getSheet('Users', USER_HEADERS);
  fixPhoneColumn_(sh, 'Phone');
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
  appendRowByHeaders_(sh, {
    Id: id, Name: p.name || '', Title: p.title || '', Date: p.date || '', StartTime: p.startTime || '',
    EndTime: p.endTime || '', Venue: p.venue || '', Capacity: p.capacity || 0, Status: p.status || 'closed',
    TextTh: p.textTh || '', TextEn: p.textEn || '', ImageUrls: (p.imageUrls || []).join(','),
    BannerAspect: ASPECT_TO_CELL[p.bannerAspect] || 'wide', Published: p.published !== false,
  });
  return { ok: true, id };
}

function updateRound(p) {
  const sh = getSheet('Rounds', ROUND_HEADERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      const headers = data[0];
      const setCol = (name, value) => sh.getRange(i + 1, headers.indexOf(name) + 1).setValue(value);
      ['Name','Title','Date','StartTime','EndTime','Venue','Capacity','Status','TextTh','TextEn','Published'].forEach(key => {
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
