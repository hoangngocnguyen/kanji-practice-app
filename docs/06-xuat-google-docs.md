# 📋 Cơ Chế Xuất Bảng 1 Cột Tối Ưu Dán Google Docs & Word

Tính năng **Xuất Bảng 1 Cột & Tùy Chọn Cột** được thiết kế đặc biệt cho người học tiếng Nhật cần tổng hợp danh sách Kanji kèm ảnh nét vẽ vào tài liệu Google Docs hoặc Microsoft Word chỉ với 1 thao tác copy duy nhất.

---

## 🛠️ Luồng Xử Lý Kỹ Thuật

1. **Chuyển Đổi Vector SVG sang High-Res PNG Base64**:
   - Khi người dùng mở bảng xuất Google Docs, các tệp SVG nét vẽ từ KanjiVG được render vào bộ nhớ Canvas (`600x600px`), tô nền trắng tinh khiết (`#FFFFFF`) để tương thích hoàn hảo với cả chế độ sáng và tối của Google Docs/Word.
   - Kết quả được mã hóa dưới dạng `data:image/png;base64,...` giúp Google Docs hiển thị ảnh tức thì mà không phụ thuộc vào tải mạng ngoài.

2. **Hệ Thống Tùy Chọn Cột Linh Hoạt (Column Selector)**:
   - Người dùng có thể chủ động tích chọn hoặc bỏ chọn từng cột trước khi sao chép:
     - ⏹️ **STT**: Số thứ tự hàng.
     - ⏹️ **Chữ Hán & Hán-Việt**: Ký tự Kanji, furigana và âm Hán-Việt.
     - ⏹️ **Âm đọc & Ý nghĩa**: Thông tin chi tiết âm On/Kun và nghĩa tiếng Việt.
     - ⏹️ **Ảnh Nét Vẽ Kanji**: Cột chứa hình ảnh thứ tự nét vẽ (tối ưu hóa làm cột duy nhất khi chỉ cần ảnh).

3. **Gói Dữ Liệu Clipboard Đa Định Dạng (Rich Text HTML Clipboard)**:
   - Ứng dụng sử dụng Web Clipboard API (`ClipboardItem`) để ghi đồng thời 2 định dạng:
     - `'text/html'`: Cấu trúc bảng HTML chuẩn (`<table>`, `<tr>`, `<td>`, `<img>`) với các thuộc tính CSS nội tuyến (Inline styles) được Google Docs nhận diện và dựng thành bảng.
     - `'text/plain'`: Dạng văn bản thuần thối (fallback).
   - Chỉ với một cú nhấp chuột vào **"📋 Sao Chép Bảng Vào Clipboard"** và nhấn `Ctrl + V` trong Google Docs, toàn bộ bảng hàng loạt sẽ xuất hiện chính xác như ý muốn.
