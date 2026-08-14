/** When an <img> tag fails to load, fetch its URL directly so we can surface
 * the server's actual response — usually a JSON {ok:false,error:"..."} body
 * from the Apps Script backend — instead of just a broken-image icon with no
 * explanation. Admin-only diagnostic; not used on public-facing pages. */
export async function diagnoseImageLoadError(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.startsWith('image/')) {
      return `HTTP ${res.status} (${contentType}) — the URL serves a valid image now, try refreshing`;
    }
    const text = (await res.text()).trim();
    return `HTTP ${res.status}: ${text.slice(0, 300) || '(empty response)'}`;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
