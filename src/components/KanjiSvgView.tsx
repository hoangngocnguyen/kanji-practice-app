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
const svgCache = new Map<string, string>();

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

  useEffect(() => {
    let isCancelled = false;

    async function loadAndColorizeSvg() {
      if (!svgUrl) return;

      try {
        let rawSvg = svgCache.get(svgUrl);
        if (!rawSvg) {
          const res = await fetch(svgUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          rawSvg = await res.text();
          svgCache.set(svgUrl, rawSvg);
        }

        if (isCancelled) return;

        // Parse and apply stroke colors to each stroke path
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawSvg, 'image/svg+xml');
        const paths = Array.from(doc.querySelectorAll('path[d]'));

        paths.forEach((path, idx) => {
          const strokeColor = monochrome
            ? '#94a3b8'
            : (colorMode === 'multi' ? MAZII_STROKE_COLORS[idx % MAZII_STROKE_COLORS.length] : singleColor);

          path.setAttribute('stroke', strokeColor);
          path.setAttribute('style', `stroke: ${strokeColor} !important; stroke-width: 3.2px !important; stroke-linecap: round; stroke-linejoin: round; fill: none;`);
        });

        // Style stroke numbers (1, 2, 3...) or hide in monochrome tracing pad
        const numberGroup = doc.querySelector('g[id*="StrokeNumbers"]');
        if (numberGroup) {
          if (monochrome) {
            numberGroup.setAttribute('style', 'display: none;');
          } else {
            numberGroup.setAttribute('style', 'display: block;');
            const textElements = Array.from(numberGroup.querySelectorAll('text'));
            textElements.forEach((textEl, idx) => {
              const numColor = colorMode === 'multi'
                ? MAZII_STROKE_COLORS[idx % MAZII_STROKE_COLORS.length]
                : '#475569';

              textEl.setAttribute('fill', numColor);
              textEl.setAttribute('style', `fill: ${numColor} !important; font-size: 6.5px !important; font-weight: 500 !important; font-family: system-ui, -apple-system, sans-serif !important; fill-opacity: 0.82 !important;`);
            });
          }
        }

        // Ensure SVG root element expands to 100% width & height inside parent container
        const svgEl = doc.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('width', '100%');
          svgEl.setAttribute('height', '100%');
          svgEl.setAttribute('style', 'width: 100%; height: 100%; display: block;');
        }

        const serializer = new XMLSerializer();
        const output = serializer.serializeToString(doc);

        if (!isCancelled) {
          setColoredSvgText(output);
          setLoading(false);
        }
      } catch {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadAndColorizeSvg();

    return () => {
      isCancelled = true;
    };
  }, [svgUrl, colorMode, singleColor]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-50/50 rounded-xl ${className}`}>
        <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!coloredSvgText) {
    return (
      <img
        src={svgUrl}
        alt={`Nét viết ${kanji || ''}`}
        className={className}
        style={style}
        onClick={onClick}
        title={title}
      />
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
