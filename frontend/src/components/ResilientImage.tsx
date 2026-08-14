import { useEffect, useState, type CSSProperties } from 'react';

/** Google serves the same Drive file through several different hostnames,
 * each with its own reliability quirks (undocumented, occasionally
 * rate-limited or blocked per-file/per-account). Rather than gamble on one,
 * extract the file id from whichever URL the backend gave us and try each
 * known-working pattern in turn before finally giving up. */
function driveFileId(url: string): string | null {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{15,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  return m ? m[1] : null;
}

function candidateUrls(url: string): string[] {
  const id = driveFileId(url);
  if (!id) return [url];
  const candidates = [
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
  return candidates.includes(url) ? candidates : [url, ...candidates];
}

export function ResilientImage({
  src,
  alt,
  style,
  onAllFailed,
}: {
  src: string;
  alt?: string;
  style?: CSSProperties;
  onAllFailed?: (lastUrl: string) => void;
}) {
  const [candidates, setCandidates] = useState(() => candidateUrls(src));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setCandidates(candidateUrls(src));
    setIndex(0);
  }, [src]);

  if (index >= candidates.length) return null;

  return (
    <img
      src={candidates[index]}
      alt={alt}
      style={style}
      onError={() => {
        if (index < candidates.length - 1) {
          setIndex(index + 1);
        } else {
          onAllFailed?.(candidates[index]);
          setIndex(index + 1);
        }
      }}
    />
  );
}
