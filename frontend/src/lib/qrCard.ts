import { driveImageCandidates } from './driveImageUrls';

function loadImageOnce(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // blob:/data: URLs are same-document and don't support (and can even
    // break under) crossOrigin="anonymous" — only set it for remote http(s)
    // sources, where it's needed to avoid tainting the canvas.
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

/** Same reasoning as ResilientImage: the QR URL's primary hosting scheme
 * isn't guaranteed to work, so try every known fallback pattern before
 * giving up — otherwise the card silently fails to build the moment the
 * first URL scheme doesn't load for this account/file. */
async function loadImage(src: string): Promise<HTMLImageElement> {
  const candidates = driveImageCandidates(src);
  let lastErr: unknown;
  for (const candidate of candidates) {
    try {
      return await loadImageOnce(candidate);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('image load failed');
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
  if (line) ctx.fillText(line, x, curY);
  return curY + lineHeight;
}

/** Renders a 1080x1350 "share card": bold "QR PAYMENT" title, event name,
 * QR code, caption box. */
export async function buildQrCardBlob(opts: { qrUrl: string; caption?: string; heading?: string }): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas not supported');

  ctx.fillStyle = '#f2f2f3';
  ctx.fillRect(0, 0, W, H);

  const pad = 60;
  ctx.strokeStyle = '#b9bec2';
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
  const corner = 18;
  ctx.strokeStyle = '#5980a6';
  ctx.lineWidth = 3;
  [[pad, pad], [W - pad, pad], [pad, H - pad], [W - pad, H - pad]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.moveTo(cx - corner, cy);
    ctx.lineTo(cx + corner, cy);
    ctx.moveTo(cx, cy - corner);
    ctx.lineTo(cx, cy + corner);
    ctx.stroke();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1d1f20';
  ctx.font = '800 76px "Barlow Condensed", sans-serif';
  ctx.fillText('QR PAYMENT', W / 2, 160);

  let cursorY = 220;
  if (opts.heading) {
    ctx.fillStyle = '#5b6266';
    ctx.font = '600 40px "Barlow Condensed", sans-serif';
    cursorY = wrapText(ctx, opts.heading, W / 2, cursorY, W - pad * 4, 48);
  }

  const img = await loadImage(opts.qrUrl);
  const qrSize = 560;
  const qrX = (W - qrSize) / 2;
  const qrY = 280;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  if (opts.caption) {
    const boxY = qrY + qrSize + 70;
    const boxX = pad + 40;
    const boxW = W - (pad + 40) * 2;
    ctx.strokeStyle = '#d7dadc';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, 200);
    ctx.fillStyle = '#1d1f20';
    ctx.font = '700 46px Barlow, sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, opts.caption, W / 2, boxY + 78, boxW - 80, 58);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
