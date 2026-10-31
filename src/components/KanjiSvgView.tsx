import React, { useState, useEffect } from 'react';
import { MAZII_STROKE_COLORS } from './StrokeAnimation';

interface KanjiSvgViewProps {
  svgUrl: string;
  kanji?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  title?: string;
  monochrome?: boolean;
}

// Module-level SVG fetch cache to eliminate duplicate network calls
import { fetchKanjiSvg, globalKanjiSvgCache } from '../utils/kanji';

export const KanjiSvgView: React.FC<KanjiSvgViewProps> = ({
  svgUrl,
  kanji,
  className = 'w-full h-full object-contain',
  style,
  onClick,
  title,
  monochrome = false,
}) => {
  const [coloredSvgText, setColoredSvgText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const hex = kanji ? kanji.codePointAt(0)?.toString(16).toLowerCase().padStart(5, '0') : undefined;

  const [colorMode, setColorMode] = useState<'multi' | 'single'>(() => {
    try {
      return (localStorage.getItem('kanji_stroke_color_mode') as 'multi' | 'single') || 'multi';
    } catch {
      return 'multi';
    }
  });

  const [singleColor, setSingleColor] = useState<string>(() => {
    try {
      return localStorage.getItem('kanji_stroke_single_color') || '#0f172a';
    } catch {
      return '#0f172a';
    }
  });

  // Listen for global storage changes when settings update
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const mode = (localStorage.getItem('kanji_stroke_color_mode') as 'multi' | 'single') || 'multi';
        const color = localStorage.getItem('kanji_stroke_single_color') || '#0f172a';
        setColorMode(mode);
        setSingleColor(color);
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const colorizeRawSvg = (rawSvg: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawSvg, 'image/svg+xml');
      const paths = Array.from(doc.querySelectorAll('path[d]'));

      paths.forEach((path, idx) => {
        const strokeColor = monochrome
          ? '#94a3b8'
          : (colorMode === 'multi' ? MAZII_STROKE_COLORS[idx % MAZII_STROKE_COLORS.length] : singleColor);

        path.setAttribute('stroke', strokeColor);
        path.setAttribute(
          'style',
          `stroke: ${strokeColor} !important; stroke-width: 3.2px !important; stroke-linecap: round; stroke-linejoin: round; fill: none;`
        );
      });

      const numberGroup = doc.querySelector('g[id*="StrokeNumbers"]');
      if (numberGroup) {
        if (monochrome) {
          numberGroup.setAttribute('style', 'display: none;');
        } else {
          numberGroup.setAttribute('style', 'display: block;');
          const textElements = Array.from(numberGroup.querySelectorAll('text'));
          textElements.forEach((textEl, idx) => {
            const numColor =
              colorMode === 'multi'
                ? MAZII_STROKE_COLORS[idx % MAZII_STROKE_COLORS.length]
                : '#475569';

            textEl.setAttribute('fill', numColor);
            textEl.setAttribute(
              'style',
              `fill: ${numColor} !important; font-size: 6.5px !important; font-weight: 500 !important; font-family: system-ui, -apple-system, sans-serif !important; fill-opacity: 0.82 !important;`
            );
          });
        }
      }

      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        svgEl.setAttribute('width', '100%');
        svgEl.setAttribute('height', '100%');
        svgEl.setAttribute('style', 'width: 100%; height: 100%; display: block;');
      }

      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc);
    } catch {
      return '';
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadAndColorizeSvg() {
      if (!svgUrl) return;

      try {
        setHasError(false);
        const rawSvg = await fetchKanjiSvg(svgUrl, hex);

        if (isCancelled) return;

        const output = colorizeRawSvg(rawSvg);
        if (output) {
          setColoredSvgText(output);
          setLoading(false);
        } else {
          setHasError(true);
          setLoading(false);
        }
      } catch {
        if (!isCancelled) {
          setHasError(true);
          setLoading(false);
        }
      }
    }

    loadAndColorizeSvg();

    // Listen for cache updates (e.g. when user clicks 'Xem nét vẽ' or modal preloads)
    const handleSvgCached = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; rawSvg: string }>;
      if (
        customEvent.detail &&
        (customEvent.detail.key === svgUrl ||
          (hex && customEvent.detail.key.includes(hex)) ||
          (kanji && customEvent.detail.key.includes(kanji)))
      ) {
        const output = colorizeRawSvg(customEvent.detail.rawSvg);
        if (output && !isCancelled) {
          setColoredSvgText(output);
          setLoading(false);
          setHasError(false);
        }
      }
    };

    window.addEventListener('kanji-svg-cached', handleSvgCached);

    return () => {
      isCancelled = true;
      window.removeEventListener('kanji-svg-cached', handleSvgCached);
    };
  }, [svgUrl, colorMode, singleColor, hex, monochrome]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-50/50 rounded-xl ${className}`}>
        <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasError || !coloredSvgText) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center p-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 hover:bg-teal-50/50 transition-colors cursor-pointer ${className}`}
        style={style}
        onClick={onClick}
        title={title || `Click để xem nét vẽ chữ ${kanji || ''}`}
      >
        <span className="font-kanji font-bold text-3xl sm:text-4xl text-slate-800 leading-none">
          {kanji || '字'}
        </span>
        <span className="text-[10px] text-teal-700 font-semibold mt-1 flex items-center gap-0.5">
          Xem nét
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center select-none [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain ${className}`}
      style={style}
      onClick={onClick}
      title={title}
      dangerouslySetInnerHTML={{ __html: coloredSvgText }}
    />
  );
};
