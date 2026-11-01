# 01. Cơ Chế Tra Cứu Kanji & Hoạt Ảnh Nét Vẽ SVG

## 1. Trích Xuất Ký Tự CJK Hán Tự (CJK Extraction Engine)

### Thuật Toán & Regex Processing
Khi người dùng dán hoặc nhập một câu tiếng Nhật dài (ví dụ: `日本語能力試験（JLPT）で思い出す漢字の練習`), hệ thống thực hiện trích xuất các chữ Hán tự độc nhất bằng Regex Unicode block:

```typescript
export function extractUniqueKanji(text: string): string[] {
  if (!text) return [];
  // Regex quét toàn bộ Unicode block cho chữ Hán (CJK Unified Ideographs: U+4E00 -> U+9FAF)
  const matches = text.match(/[\u4e00-\u9faf]/gu) || [];
  // Loại bỏ các ký tự trùng lặp để chỉ giữ danh sách Kanji duy nhất
  return [...new Set(matches)];
}
```

---

## 2. Cơ Chế Render Hoạt Ảnh Nét Vẽ SVG Động (KanjiVG SVG Engine)

### A. Tải & Caching Cấu Trúc SVG
Hệ thống tải dữ liệu đồ họa nét vẽ KanjiVG chuẩn vector cho từng chữ Hán bằng mã Hex Unicode:
- Đường dẫn KanjiVG CDN: `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/${hexCode}.svg`
- Sử dụng `Map<string, string>` caching trực tiếp trên bộ nhớ RAM trình duyệt (`svgCache`) để tránh gửi HTTP Request lặp lại.

### B. Tô Màu Phân Biệt Thứ Tự Nét Vẽ
Mỗi nét vẽ trong file KanjiVG SVG được biểu diễn dưới dạng thẻ `<path d="...">`. Hệ thống tự động gán mảng màu sắc phân biệt (`STROKE_COLORS`) tương ứng với thứ tự nét ($1, 2, 3,\dots, N$):

```typescript
const STROKE_COLORS = [
  '#2563eb', // Nét 1: Xanh dương
  '#ef4444', // Nét 2: Đỏ
  '#0f172a', // Nét 3: Đen
  '#16a34a', // Nét 4: Xanh lá
  '#d97706', // Nét 5: Cam
  '#9333ea', // Nét 6: Tím
  '#0891b2', // Nét 7: Cyan
  '#db2777', // Nét 8: Hồng
  '#4f46e5', // Nét 9: Indigo
  '#ca8a04'  // Nét 10: Vàng đất
];
```

### C. Thuật Toán Animation Vẽ Nét Động
Hoạt ảnh nét vẽ được tính toán bằng CSS `stroke-dasharray` và `stroke-dashoffset`:
1. Đo tổng độ dài nét vẽ: `length = path.getTotalLength()`.
2. Khởi tạo trạng thái ẩn nét: `path.style.strokeDasharray = length`, `path.style.strokeDashoffset = length`.
3. Dùng `requestAnimationFrame` hoặc `setTimeout` tuần tự tăng dần `strokeDashoffset` về `0` với tốc độ điều khiển:
   - **Tốc độ 0.5x**: 1200ms / nét.
   - **Tốc độ 1.0x**: 600ms / nét.
   - **Tốc độ 2.0x**: 300ms / nét.

---

## 3. Lưới Kẻ Ô Mễ (米) & Căn Tỉ Lệ Chữ Hán

Trong bảng chữ Kanji và modal luyện viết, ứng dụng vẽ khung lưới kẻ ô Mễ bằng SVG Overlay gồm:
* 2 đường trục chính (ngang & đứng) qua tâm ô chữ ($x = 50\%$, $y = 50\%$).
* 2 đường chéo chính từ 4 góc ($(0,0) \to (W,H)$ và $(W,0) \to (0,H)$).
* Màu đường nét nét đứt `stroke-dasharray="3 3"` màu nhạt `#cbd5e1` giúp mắt người học dễ dàng căn chỉnh tỉ lệ trọng tâm chữ Hán.

---

## 4. Phát Âm Tiếng Nhật Bản Địa (Web Speech Synthesis API)

Sử dụng trực tiếp API tổng hợp giọng nói chuẩn của trình duyệt web:

```typescript
export function speakJapanese(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // Dừng câu phát âm cũ nếu đang phát
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP'; // Gán ngôn ngữ chuẩn Tiếng Nhật
  utterance.rate = 0.85;    // Tốc độ đọc vừa phải giúp người học nghe rõ
  window.speechSynthesis.speak(utterance);
}
```

---

## 5. Bộ Tra Cứu 11,000+ Âm Hán-Việt Offline

Ứng dụng tích hợp bộ từ điển `SINO_VIETNAMESE_MAP` chứa hơn 11,000 chữ Hán giúp tra cứu tức thì âm Hán Việt chuẩn mà không phụ thuộc kết nối mạng bên ngoài.
