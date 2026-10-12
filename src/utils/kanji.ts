import { KanjiItem, SamplePreset } from '../types/kanji';
import { getKanjiInfo } from '../data/kanjiDictionary';

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    title: 'Tục ngữ & Danh ngôn',
    desc: 'Thất chuyển bát khởi, Kiên trì là sức mạnh',
    text: '七転び八起き。継続は力なり。初心忘るべからず。日進月歩で学問を修める。',
  },
  {
    title: 'Thành ngữ Yojijukugo (4 chữ)',
    desc: 'Nhất kì nhất hội, Nằm gai nếm mật',
    text: '一期一会、臥薪嘗胆、温故知新、弱肉強食、泰然自若、臨機応変、風林火山、十人十色。',
  },
  {
    title: 'Đoạn văn JLPT N3/N2',
    desc: 'Luyện tập tiếng Nhật đời sống & công việc',
    text: '日本語を勉強するとき、漢字の書き順や意味を理解することはとても大切です。日常の生活や仕事で使われる語彙を増やすために、毎日少しずつ練習しましょう。',
  },
  {
    title: 'Từ vựng cao cấp N1',
    desc: 'Chữ Hán nâng cao, từ ghép trừu tượng',
    text: '曖昧な返答を避け、躊躇することなく迅速かつ緻密に計画を推進する必要がある。脆弱、顕著、齟齬、洗練。',
  },
];

/**
 * Quét lọc các ký tự Kanji chuẩn Unicode (U+4E00 -> U+9FAF)
 * Loại bỏ trùng lặp, bảo toàn thứ tự xuất hiện đầu tiên
 */
export function extractUniqueKanji(text: string): KanjiItem[] {
  if (!text) return [];

  const seen = new Set<string>();
  const list: KanjiItem[] = [];
  const chars = Array.from(text);

  for (const char of chars) {
    if (char >= '\u4e00' && char <= '\u9faf') {
      if (!seen.has(char)) {
        seen.add(char);
        const codePoint = char.codePointAt(0) ?? char.charCodeAt(0);
        const hex = codePoint.toString(16).toLowerCase().padStart(5, '0');
        const svgUrl = `/kanji/${hex}.svg`;

        list.push({
          id: list.length + 1,
          kanji: char,
          hex,
          svgUrl,
          unicodeDecimal: codePoint,
          detail: getKanjiInfo(char),
        });
      }
    }
  }

  return list;
}

/**
 * Chuyển SVG từ KanjiVG CDN sang PNG Blob với nền trắng tinh khiết (#FFFFFF)
 */
export async function convertSvgToPngBlob(svgUrl: string, addPracticeGrid: boolean = false): Promise<Blob> {
  const response = await fetch(svgUrl);
  if (!response.ok) {
    throw new Error(`Không thể tải hình ảnh nét vẽ (HTTP ${response.status})`);
  }
  const rawSvg = await response.text();

  // Làm sạch DOCTYPE và XML header để tránh xung đột trình duyệt
  const cleanSvg = rawSvg
    .replace(/<!DOCTYPE[\s\S]*?\]>/i, '')
    .replace(/<\?xml[\s\S]*?\?>/i, '')
    .trim();

  return new Promise<Blob>((resolve, reject) => {
    const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const size = 600; // Độ phân giải 600x600 siêu sắc nét cho in ấn và màn hình Retina
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Trình duyệt không thể khởi tạo Canvas 2D'));
          return;
        }

        // Tô nền trắng tinh (#FFFFFF) tránh nền đen khi dán vào Word/Anki/Obsidian Dark Mode
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Kèm lưới ô vuông chữ điền / chữ Mễ nếu người dùng bật (+ Grid)
        if (addPracticeGrid) {
          const margin = 20;

          // 1. Đường chéo chữ Mễ (Mizi ge) nét chấm mờ
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 8]);
          ctx.beginPath();
          ctx.moveTo(margin, margin);
          ctx.lineTo(size - margin, size - margin);
          ctx.moveTo(size - margin, margin);
          ctx.lineTo(margin, size - margin);
          ctx.stroke();

          // 2. Trục ngang & dọc chữ Điền (Tianzi ge) nét đứt rõ nét
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([8, 8]);

          // Kẻ trục ngang giữa
          ctx.beginPath();
          ctx.moveTo(margin, size / 2);
          ctx.lineTo(size - margin, size / 2);
          ctx.stroke();

          // Kẻ trục dọc giữa
          ctx.beginPath();
          ctx.moveTo(size / 2, margin);
          ctx.lineTo(size / 2, size - margin);
          ctx.stroke();

          // 3. Viền khung chữ điền
          ctx.setLineDash([]);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 2.8;
          ctx.strokeRect(margin, margin, size - margin * 2, size - margin * 2);

          // 4. Tâm giao nhau
          ctx.fillStyle = '#94A3B8';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Vẽ ảnh nét vẽ ở giữa với lề thoáng
        const padding = 36;
        ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2);

        URL.revokeObjectURL(objectUrl);

        canvas.toBlob(
          (pngBlob) => {
            if (pngBlob) {
              resolve(pngBlob);
            } else {
              reject(new Error('Chuyển đổi Canvas sang PNG Blob thất bại'));
            }
          },
          'image/png',
          1.0
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Lỗi nạp hình ảnh SVG vào bộ nhớ'));
    };

    img.src = objectUrl;
  });
}

/**
 * Tải file Blob về máy tính người dùng
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
