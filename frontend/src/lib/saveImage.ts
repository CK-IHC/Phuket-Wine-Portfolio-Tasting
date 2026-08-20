/** Shared save/share flow for a generated canvas image (QR payment card,
 * entry card, …). The Web Share API's native share sheet (with "Save
 * Image"/"Save to Files") is what actually lets mobile users save a PNG —
 * <a download> is desktop-only and iOS mostly just navigates to the image
 * instead of saving it, so iOS gets a long-press-to-save fallback tab. */
export async function saveImageFromUrl(url: string, filename: string, onLongPressFallback?: () => void): Promise<void> {
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  try {
    const blob = await fetch(url).then((r) => r.blob());
    const file = new File([blob], filename, { type: 'image/png' });
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file] });
      return;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
  }
  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    window.open(url, '_blank');
    onLongPressFallback?.();
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
