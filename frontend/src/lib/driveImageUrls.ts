/** Google serves the same Drive file through several different hostnames,
 * none of them officially documented or guaranteed reliable for every
 * account/file. Extract the file id from whichever URL the backend gave us
 * and return every known-working pattern to try, primary first. */
function driveFileId(url: string): string | null {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{15,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  return m ? m[1] : null;
}

export function driveImageCandidates(url: string): string[] {
  const id = driveFileId(url);
  if (!id) return [url];
  const candidates = [
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
  return candidates.includes(url) ? candidates : [url, ...candidates];
}
