function loadImage(src: string): Promise<HTMLImageElement> {
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

/** Renders a 9:16 portrait "share card": heading, QR code, caption box. */
export async function buildQrCardBlob(opts: { qrUrl: string; caption?: string; heading?: string }): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas not supported');

  ctx.fillStyle = '#f2f2f3';
  ctx.fillRect(0, 0, W, H);

  const pad = 72;
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

  let cursorY = 220;
  if (opts.heading) {
    ctx.fillStyle = '#1d1f20';
    ctx.font = '600 58px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    cursorY = wrapText(ctx, opts.heading, W / 2, cursorY, W - pad * 4, 66);
  }

  const img = await loadImage(opts.qrUrl);
  const qrSize = 640;
  const qrX = (W - qrSize) / 2;
  const qrY = 420;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  if (opts.caption) {
    const boxY = qrY + qrSize + 80;
    const boxX = pad + 40;
    const boxW = W - (pad + 40) * 2;
    ctx.strokeStyle = '#d7dadc';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, 220);
    ctx.fillStyle = '#5b6266';
    ctx.font = '400 38px Barlow, sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, opts.caption, W / 2, boxY + 70, boxW - 80, 50);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
