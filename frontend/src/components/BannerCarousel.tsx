import { useEffect, useRef, useState } from 'react';
import type { Banner, BannerAspect } from '../lib/types';
import { Blueprint } from './ui/Blueprint';
import { Lightbox } from './ui/Lightbox';

const AUTOPLAY_MS = 5000;

export function BannerCarousel({ banners, aspect }: { banners: Banner[]; aspect: BannerAspect }) {
  const [index, setIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + banners.length) % banners.length);
  const next = () => setIndex((i) => (i + 1) % banners.length);

  return (
    <>
      <Blueprint style={{ position: 'relative', overflow: 'hidden', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <div className="duotone" style={{ width: '100%', aspectRatio: aspect.replace('/', ' / '), position: 'relative' }}>
          {banners.map((b, i) => (
            <div
              key={b.id}
              style={{
                position: 'absolute', inset: 0,
                opacity: i === index ? 1 : 0,
                transition: 'opacity .4s',
                pointerEvents: i === index ? 'auto' : 'none',
              }}
              onClick={() => b.url && setLightboxSrc(b.url)}
            >
              {b.url ? (
                <img src={b.url} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', cursor: 'pointer' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>Banner {i + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {banners.length > 1 && (
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 5 }}>
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setIndex(i)}
                style={{
                  width: 7, height: 7, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: i === index ? '#fff' : 'rgba(255,255,255,.5)',
                }}
              />
            ))}
          </div>
        )}
        {banners.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous"
              style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.35)', color: '#fff', cursor: 'pointer', zIndex: 5 }}
            >‹</button>
            <button
              onClick={next}
              aria-label="Next"
              style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.35)', color: '#fff', cursor: 'pointer', zIndex: 5 }}
            >›</button>
          </>
        )}
      </Blueprint>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
