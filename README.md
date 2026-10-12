# 🌸 Kanji Stroke Order Tool

Một ứng dụng web mini gọn nhẹ giúp tra cứu thứ tự nét viết chữ Kanji từ văn bản hỗn hợp. Ứng dụng hỗ trợ sao chép hình ảnh nét vẽ trực tiếp vào clipboard, phục vụ việc học tập, tạo thẻ Anki và soạn tài liệu.

## ✨ Tính năng chính

- **Trích xuất thông minh:** Tự động lọc các chữ Kanji từ đoạn văn bản dài hoặc văn bản hỗn hợp ngôn ngữ.
- **Loại bỏ trùng lặp:** Tự động loại bỏ các chữ Kanji trùng nhau, giữ nguyên thứ tự xuất hiện ban đầu.
- **Sao chép hình ảnh nét vẽ:** Chuyển đổi dữ liệu vector SVG sang định dạng PNG với nền trắng để tránh sai lệch màu sắc, sau đó lưu trực tiếp vào clipboard chỉ bằng một cú nhấp chuột.
- **Giao diện hiện đại:** Xây dựng bằng React, Vite và Tailwind CSS, với giao diện dạng bảng trực quan, dễ sử dụng.

## 🚀 Cài đặt và chạy dự án

### Yêu cầu hệ thống

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)

### Các bước thực hiện

**1. Cài đặt các thư viện phụ thuộc**

```bash
pnpm install
```

**2. Khởi động máy chủ phát triển**

```bash
pnpm run dev
```

**3. Truy cập ứng dụng**

Mở trình duyệt và truy cập địa chỉ được hiển thị trên terminal, thường là:

- http://localhost:3000
- http://localhost:5173

Địa chỉ thực tế phụ thuộc vào cấu hình dự án và cổng mà Vite sử dụng.

## 📚 Nguồn dữ liệu và bản quyền

- **Dữ liệu nét vẽ Kanji:** Sử dụng dữ liệu từ dự án [KanjiVG](https://github.com/KanjiVG/kanjivg), được phân phối thông qua JSDelivr CDN theo giấy phép [Creative Commons Attribution-Share Alike 3.0 (CC BY-SA 3.0)](https://creativecommons.org/licenses/by-sa/3.0/).
- **Mã nguồn ứng dụng:** Phân phối theo [MIT License](https://opensource.org/license/mit), cho phép sử dụng, chỉnh sửa và phân phối lại theo các điều khoản của giấy phép.

**Lưu ý:** Khi phân phối lại ứng dụng, cần tuân thủ các điều khoản bản quyền tương ứng của mã nguồn và dữ liệu KanjiVG.