import QRCode from 'qrcode';

export interface EntryCardOptions {
  eventTitle: string;
  cardLabel: string;
  statusPillText: string;
  refNoLabel: string;
  refNo: string;
  name: string;
  eventInfoLabel: string;
  dateLabel: string;
  dateValue: string;
  timeLabel: string;
  timeValue: string;
  venueLabel: string;
  venueValue: string;
  footerNote: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, curY);
  return curY + lineHeight;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A light abstract grape-and-tendril flourish in one corner — not a literal
 * illustration, just enough texture that the card doesn't read as a bare
 * form. Drawn at low opacity so it never competes with the real content. */
function drawVine(ctx: CanvasRenderingContext2D, x: number, y: number, flip: 1 | -1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);
  ctx.strokeStyle = 'rgba(43,64,84,0.10)';
  ctx.fillStyle = 'rgba(43,64,84,0.08)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.bezierCurveTo(30, 10, 60, 60, 100, 20);
  ctx.bezierCurveTo(130, -5, 150, 30, 180, 0);
  ctx.stroke();
  const grapes: [number, number][] = [
    [90, 30], [102, 38], [114, 30], [96, 46], [108, 48], [120, 42], [104, 58],
  ];
  grapes.forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.arc(gx, gy, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export async function buildEntryCardBlob(opts: EntryCardOptions): Promise<Blob> {
  const W = 720;
  const H = 1080;
  // Render at 2x and downscale via CSS/display only — a 720x1080 canvas
  // looks soft once saved and viewed at real size (device pixel ratio),
  // especially the QR code and small text. Everything below still works
  // in the same 720x1080 coordinate space; only the physical pixel count
  // (and therefore sharpness) changes.
  const SCALE = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas not supported');
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = '#eceef2';
  ctx.fillRect(0, 0, W, H);

  drawVine(ctx, W - 210, 30, 1);
  drawVine(ctx, 210, H - 130, -1);

  const pad = 40;
  ctx.strokeStyle = 'rgba(43,64,84,0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

  // Status pill
  ctx.font = '700 22px "TH Sarabun PSK", Sarabun, sans-serif';
  const pillTextWidth = ctx.measureText(opts.statusPillText).width;
  const pillW = pillTextWidth + 56;
  const pillH = 44;
  const pillX = (W - pillW) / 2;
  const pillY = 74;
  ctx.fillStyle = '#2b4054';
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(opts.statusPillText, W / 2, pillY + 29);

  // Title + subtitle
  ctx.fillStyle = '#20323f';
  ctx.font = '800 52px "TH Sarabun PSK", Sarabun, sans-serif';
  let cursorY = wrapText(ctx, opts.eventTitle, W / 2, 190, W - pad * 3, 58);
  ctx.fillStyle = '#4b5a63';
  ctx.font = '600 30px "TH Sarabun PSK", Sarabun, sans-serif';
  cursorY = wrapText(ctx, opts.cardLabel, W / 2, cursorY + 14, W - pad * 3, 36);

  // White panel
  const panelX = pad + 24;
  const panelY = cursorY + 40;
  const panelW = W - (pad + 24) * 2;
  const qrSize = 220;
  const panelH = 500;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(29,31,32,0.12)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, panelX, panelY, panelW, panelH, 20);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const innerPad = 44;
  let ty = panelY + 60;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#5b6266';
  ctx.font = '500 24px "TH Sarabun PSK", Sarabun, sans-serif';
  ctx.fillText(opts.refNoLabel, panelX + innerPad, ty);

  ty += 54;
  ctx.fillStyle = '#1d1f20';
  ctx.font = '800 56px "TH Sarabun PSK", Sarabun, sans-serif';
  ctx.fillText(opts.refNo, panelX + innerPad, ty);

  ty += 50;
  ctx.fillStyle = '#1d1f20';
  ctx.font = '600 30px "TH Sarabun PSK", Sarabun, sans-serif';
  ctx.fillText(opts.name, panelX + innerPad, ty);

  // QR code, top-right of the panel — generated at the same physical pixel
  // density as the canvas so it stays crisp instead of being upscaled.
  const qrDataUrl = await QRCode.toDataURL(opts.refNo, { width: qrSize * SCALE, margin: 0, color: { dark: '#1d1f20', light: '#ffffffff' } });
  const qrImg = await loadImage(qrDataUrl);
  const qrX = panelX + panelW - innerPad - qrSize;
  const qrY = panelY + 44;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Divider
  const dividerY = qrY + qrSize + 36;
  ctx.strokeStyle = '#e2e4e6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(panelX + innerPad, dividerY);
  ctx.lineTo(panelX + panelW - innerPad, dividerY);
  ctx.stroke();

  // Event info
  let iy = dividerY + 44;
  ctx.fillStyle = '#20323f';
  ctx.font = '700 26px "TH Sarabun PSK", Sarabun, sans-serif';
  ctx.fillText(opts.eventInfoLabel, panelX + innerPad, iy);

  const infoRows: [string, string, string][] = [
    ['📅', opts.dateLabel, opts.dateValue],
    ['🕐', opts.timeLabel, opts.timeValue],
    ['📍', opts.venueLabel, opts.venueValue],
  ];
  ctx.font = '500 24px "TH Sarabun PSK", Sarabun, sans-serif';
  infoRows.forEach(([icon, label, value]) => {
    iy += 44;
    ctx.fillStyle = '#5b6266';
    ctx.fillText(icon, panelX + innerPad, iy);
    ctx.font = '700 24px "TH Sarabun PSK", Sarabun, sans-serif';
    ctx.fillStyle = '#1d1f20';
    ctx.fillText(label, panelX + innerPad + 38, iy);
    const labelW = ctx.measureText(label).width;
    ctx.font = '500 24px "TH Sarabun PSK", Sarabun, sans-serif';
    ctx.fillStyle = '#3a4147';
    ctx.fillText(value, panelX + innerPad + 38 + labelW + 10, iy);
  });

  // Footer note (below panel)
  const fy = panelY + panelH + 50;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4b5a63';
  ctx.font = '500 21px "TH Sarabun PSK", Sarabun, sans-serif';
  wrapText(ctx, opts.footerNote, W / 2, fy, W - pad * 3, 30);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
