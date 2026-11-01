# 📚 Luyện Kanji - Tài Liệu Kiến Trúc & Cơ Chế Kỹ Thuật

Thư mục này chứa toàn bộ tài liệu kỹ thuật chi tiết giải thích cơ chế hoạt động, thuật toán, công nghệ và luồng xử lý dữ liệu cho các tính năng của ứng dụng **Luyện Kanji (Web App & Chrome Extension v3.0.0)**.

---

## 📑 Danh Mục Tài Liệu Kỹ Thuật

1. [01. Cơ Chế Tra Cứu Kanji & Hoạt Ảnh Nét Vẽ SVG](./01-tra-cuu-kanji.md)
   * Thuật toán tách ký tự CJK Hán tự bằng Regex.
   * Cơ chế render nét vẽ SVG động, điều khiển tốc độ (0.5x, 1x, 2x).
   * Kỹ thuật vẽ ô lưới Mễ (米) và phát âm giọng Nhật bản địa (`ja-JP`).
   * Bộ tra cứu 11,000+ âm Hán-Việt offline.

2. [02. Cơ Chế Dịch Đoạn Văn & Ngôn Ngữ](./02-dich-va-ngon-ngu.md)
   * Tích hợp API dịch câu tự động (Google Translate API / Client Proxy).
   * Xử lý chuỗi UTF-8, mã hóa URL và phân tách đoạn văn tiếng Nhật.

3. [03. Cơ Chế Quét Ảnh OCR & Snipping Screen Capture](./03-quet-anh-ocr.md)
   * **Web App OCR**: Tiền xử lý ảnh (Grayscale, Binarization) & Nhận diện chữ Hán bằng Tesseract.js.
   * **Chrome Extension Snipping OCR**: API `chrome.tabs.captureVisibleTab`, thuật toán tính tọa độ Bounding Box, cắt Canvas viewport và trích xuất chữ Hán.

4. [04. Cơ Chế Bóc Tách Bộ Thủ & Cấu Phần 4 Tầng](./04-tach-bo-thu.md)
   * Phân tích cây DOM XML KanjiVG SVG (`kvg:element`, `kvg:position`).
   * Thuật toán phân loại vị trí bộ thủ (`hen`, `tsukuri`, `kanmuri`, `ashi`, `kamae`, `tare`, `nyo`).
   * **Mô hình tra cứu 4 tầng (4-Tier Lookup Engine)** kết hợp 214 Bộ thủ Khang Hi + CSDL 11,000+ từ Hán-Việt.

5. [05. Cơ Chế Chấm Điểm & Luyện Viết Tay (Canvas Stroke Matching)](./05-check-luyen-viet.md)
   * Bắt sự kiện Canvas Pointer/Touch trên di động và máy tính.
   * Thuật toán so sánh đường cong (Stroke Geometry Matching): Khoảng cách điểm đầu, vector hướng nét vẽ, tỷ lệ độ dài.
   * Thang điểm chính xác (0-100%) và quy trình chuyển nét tự động.

6. [06. Cơ Chế Xuất Bảng 1 Cột Tối Ưu Dán Google Docs & Word](./06-xuat-google-docs.md)
   * Chuyển đổi SVG nét vẽ sang PNG Base64 độ nét cao.
   * Tùy chọn bật/tắt linh hoạt các cột (STT, Chữ Hán, Âm đọc/Ý nghĩa, Ảnh nét vẽ).
   * Gói dữ liệu Clipboard HTML Rich-Text cho phép dán trực tiếp vào Google Docs chỉ với 1 cú nhấp.

---

*Tài liệu kỹ thuật hệ thống Luyện Kanji v3.0.0* 🚀
