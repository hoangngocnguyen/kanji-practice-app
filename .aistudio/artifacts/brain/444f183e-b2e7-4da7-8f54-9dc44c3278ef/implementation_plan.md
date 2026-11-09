# Kế hoạch Tối ưu SEO & Google AI Overview (GEO) cho Luyện Kanji Pro

Chi tiết chiến lược và từng bước triển khai kỹ thuật nhằm giúp ứng dụng **Luyện Kanji Pro** xuất hiện chuẩn xác, đẹp mắt trên **Google Search**, **Google AI Overviews (AI Mode)**, khắc phục tình trạng bị gán tên/logo mặc định của Vercel và tăng điểm hiển thị thương hiệu.

---

## Các Quyết định Đã Thống nhất (User Confirmed)

> [!IMPORTANT]
> Dựa trên phản hồi trực tiếp của người dùng qua bảng câu hỏi làm rõ:
> 1. **Tên thương hiệu & Tiêu đề chuẩn**: `Luyện Kanji Pro - Tra Cứu & Luyện Nét Vẽ Chữ Hán` (Độ dài ~48 ký tự, tối ưu tiêu chuẩn 30–60 ký tự của Google để không bị cắt bớt hoặc tự chèn "- Vercel").
> 2. **Logo & Favicon nhận diện**: Biểu tượng chữ Hán SVG `漢` màu xanh Teal đậm chuẩn thương hiệu (xuất file PNG đa kích thước 48x48, 96x96, 192x192, 512x512px đáp ứng chuẩn Google Favicon Guidelines).
> 3. **Cấu trúc Dữ liệu Schema.org (JSON-LD)**: Kết hợp `WebSite` + `WebApplication` + `EducationalApplication` + `FAQPage` + `BreadcrumbList` (Tối ưu đặc biệt cho Google AI Overviews & Generative Engine Optimization - GEO).

---

## 1. Tổng quan & Mục tiêu Dự án

### Vấn đề hiện tại
* Trên kết quả tìm kiếm Google & AI Overview (như hình ảnh đính kèm):
  - Tiêu đề hiển thị bị thêm đoạn đuôi `... - Vercel`.
  - Icon trang web (Favicon) bị quay về icon quả cầu xám / logo Vercel mặc định do Google chưa nhận diện được favicon chuẩn kích thước 48x48px+.
  - Tên trang web hiển thị phụ thuộc vào domain `luyenkanji.vercel.app` thay vì thương hiệu `Luyện Kanji Pro`.

### Giải pháp & Kết quả đạt được
* **Khắc phục lỗi hiển thị thương hiệu**: Google Search Card sẽ hiển thị chính xác logo chữ `漢` màu Teal, tên Site Name là **Luyện Kanji Pro**, tiêu đề không bị dính đuôi Vercel.
* **Tối ưu cho Google AI Overview (GEO)**: Cung cấp đầy đủ Schema.org `FAQPage` và `EducationalApplication` chuẩn hóa dạng câu hỏi - trả lời để AI Mode trích dẫn ứng dụng khi người dùng tìm kiếm câu hỏi liên quan đến học Kanji, tra thứ tự nét chữ Hán, JLPT N5-N1.

---

## 2. Chiến lược Tối ưu Visual & Metadata (SEO / GEO)

### 2.1 Cấu hình Meta Tags & Header Tags (`index.html`)
* **Title Tag**: `<title>Luyện Kanji Pro – Tra Cứu & Luyện Nét Vẽ Chữ Hán</title>`
* **Description Tag**: `<meta name="description" content="Luyện Kanji Pro – Công cụ tra cứu thứ tự nét viết chữ Hán SVG động, âm Hán-Việt, phiên âm Romaji, 214 bộ thủ Khang Hy và xuất phiếu luyện viết cho Anki & Word." />`
* **Robots Tag**: `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`
* **Google Site Verification & Canonical Link**:
  - `<link rel="canonical" href="https://luyenkanji.vercel.app" />`

### 2.2 Đa kích thước Favicon & Google Favicon Guidelines Compliance
Google yêu cầu Favicon hiển thị trên SERP phải là bội số của 48px (ví dụ: 48x48, 96x96, 192x192, 512x512) và định dạng chuẩn SVG/PNG:
```html
<link rel="icon" type="image/svg+xml" href="/logo.svg" />
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/logo-192.png" />
<link rel="icon" type="image/png" sizes="512x512" href="/logo-512.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

### 2.3 Cấu trúc Dữ liệu Schema.org JSON-LD Tối ưu AI Search

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Schema.org JSON-LD Stack                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 1. WebSite                       │ Định danh Site Name 'Luyện Kanji    │
│                                  │ Pro' & AlternateNames               │
├──────────────────────────────────┼─────────────────────────────────────┤
│ 2. WebApplication / Educational   │ Thông tin ứng dụng học tập, giá     │
│    Application                   │ miễn phí (0 VND), danh mục JLPT     │
├──────────────────────────────────┼─────────────────────────────────────┤
│ 3. FAQPage                       │ Bộ câu hỏi đáp được tối ưu riêng    │
│                                  │ cho Google AI Overview trích dẫn    │
├──────────────────────────────────┼─────────────────────────────────────┤
│ 4. Organization                  │ Thương hiệu chính chủ Luyện Kanji   │
│                                  │ Studio                              │
└──────────────────────────────────┴─────────────────────────────────────┘
```

#### JSON-LD WebSite (Ép Google đổi Site Name từ 'Vercel' thành 'Luyện Kanji Pro'):
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Luyện Kanji Pro",
  "alternateName": ["Luyện Kanji", "Luyen Kanji Pro", "LuyenKanjiPro"],
  "url": "https://luyenkanji.vercel.app/"
}
```

#### JSON-LD FAQPage (Cho Google AI Overview):
* Thêm các câu hỏi thường gặp mà AI hay tổng hợp:
  - *"Ứng dụng Luyện Kanji Pro có những tính năng gì nổi bật?"*
  - *"Cách tra cứu thứ tự nét viết chữ Hán Kanji chuẩn JLPT?"*
  - *"Luyện Kanji Pro có hỗ trợ xuất phiếu tập viết A4 và file Anki không?"*

---

## 3. Kiến trúc Kỹ thuật & Các Tệp Cần Cập Nhật

```
┌────────────────────────────────────────────────────────────────────────┐
│                           File Updates Tree                            │
├──────────────────────────────────────┬─────────────────────────────────┤
│ index.html                           │ Cập nhật Meta, OpenGraph, Title,│
│                                      │ Favicon links & JSON-LD         │
├──────────────────────────────────────┼─────────────────────────────────┤
│ metadata.json                        │ Đổi name -> 'Luyện Kanji Pro'   │
├──────────────────────────────────────┼─────────────────────────────────┤
│ public/site.webmanifest              │ Khai báo PWA Manifest & App     │
│                                      │ Icons                           │
├──────────────────────────────────────┼─────────────────────────────────┤
│ public/robots.txt                    │ Cho phép Googlebot & Google-    │
│                                      │ Extended (AI bot) cào dữ liệu   │
├──────────────────────────────────────┼─────────────────────────────────┤
│ public/sitemap.xml                   │ Cập nhật Sitemap chuẩn SEO      │
└──────────────────────────────────────┴─────────────────────────────────┘
```

---

## 4. Các Bước Triển khai Kỹ thuật Chi tiết

1. **Bước 1**: Cập nhật `metadata.json` đặt tên ứng dụng chính thức thành `Luyện Kanji Pro`.
2. **Bước 2**: Chuẩn hóa biểu tượng Favicon trong `/public`:
   - Kiểm tra và đảm bảo các file `/public/logo.svg`, `/public/logo.png`, `/public/apple-touch-icon.png` có hình chữ `漢` chuẩn màu Teal (#0f766e).
   - Thêm tệp `site.webmanifest` trong `/public` với thông tin tên app và icon chuẩn.
3. **Bước 3**: Cập nhật toàn bộ thẻ Meta & 3 khối JSON-LD (`WebSite`, `WebApplication`, `FAQPage`) trong `index.html`.
4. **Bước 4**: Tối ưu `robots.txt` cho phép cả Googlebot và AI Crawler (`User-agent: Google-Extended`) indexing thuận lợi.
5. **Bước 5**: Kiểm tra build (`compile_applet` & `lint_applet`) đảm bảo không có lỗi cú pháp.
