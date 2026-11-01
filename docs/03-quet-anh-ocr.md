# 03. Cơ Chế Quét Ảnh OCR & Snipping Screen Capture

## 1. Hai Chế Độ Quét Ảnh Nhận Diện Chữ Hán

Ứng dụng hỗ trợ 2 công nghệ quét ảnh OCR chính:
1. **Web App Image OCR Modal**: Tải ảnh chụp sách báo, tài liệu, đề thi từ máy tính.
2. **Chrome Extension Snipping Screen Capture OCR**: Khoanh vùng quét màn hình trực tiếp trên bất kỳ trang web nào (NHK News, Youtube, Manga).

---

## 2. Web App Image OCR Engine (Canvas Pre-processing + Tesseract.js)

### A. Tiền Xử Lý Ảnh Mẫu (Image Pre-processing)
Trước khi đưa ảnh vào mô hình OCR, ứng dụng vẽ ảnh lên HTML5 Canvas để tối ưu độ tương phản (Contrast) và khử nhiễu (Denoising):
* **Chuyển ảnh xám (Grayscale)**: $Y = 0.299R + 0.587G + 0.114B$
* **Khử ngưỡng nhị phân (Binarization / Thresholding)**: Đưa các điểm ảnh về thuần Đen (`#000000`) và Trắng (`#FFFFFF`) giúp nâng cao độ chính xác nhận diện chữ Hán.

### B. Nhận Diện Chữ Hán
Sử dụng Tesseract.js Worker với ngôn ngữ `jpn` (Tiếng Nhật) để bóc tách text:
```typescript
import { createWorker } from 'tesseract.js';

export async function scanKanjiFromImage(imageFile: File): Promise<string> {
  const worker = await createWorker('jpn');
  const ret = await worker.recognize(imageFile);
  await worker.terminate();
  return ret.data.text;
}
```

---

## 3. Chrome Extension Snipping OCR Engine (Screen Crop Capture)

### A. Quy Trình Chụp Màn Hình Viewport
Khi người dùng bấm **`Ctrl + Shift + K`** hoặc chọn menu chuột phải:

```
[User Trigger Ctrl+Shift+K / ContextMenu]
                    │
                    ▼
[background.js: chrome.tabs.captureVisibleTab(windowId, {format: 'png'})]
                    │
                    ▼
[Gửi Base64 Image URI tới content.js]
                    │
                    ▼
[Kích hoạt Overlay Layer (.lk-snipping-layer) + Crosshair Cursor]
                    │
                    ▼
[Người dùng kéo khoanh vùng Bounding Box (startX, startY, currentX, currentY)]
                    │
                    ▼
[Canvas Crop Image: ctx.drawImage(bgImg, cropX, cropY, cropW, cropH, 0, 0, w, h)]
                    │
                    ▼
[Trích xuất CJK Kanji & Hiển thị kết quả trên Cửa sổ nổi Floating Modal]
```

### B. Shadow DOM Isolation
Lớp phủ khoanh vùng chụp màn hình và Modal kết quả được bọc bên trong **Shadow DOM Open Root** (`#luyen-kanji-root`) để đảm bảo không bị xung đột CSS hay JavaScript từ trang web gốc.
