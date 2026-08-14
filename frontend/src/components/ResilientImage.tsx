import { useEffect, useState, type CSSProperties } from 'react';
import { driveImageCandidates } from '../lib/driveImageUrls';

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
  const [candidates, setCandidates] = useState(() => driveImageCandidates(src));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setCandidates(driveImageCandidates(src));
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
