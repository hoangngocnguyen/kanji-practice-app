# Kế hoạch Tối ưu SEO Toàn diện cho Luyện Kanji (luyenkanji.vercel.app)

Tối ưu hóa công cụ tìm kiếm (SEO), thẻ chia sẻ mạng xã hội (OpenGraph / Twitter Cards), dữ liệu cấu trúc Schema.org (JSON-LD), cùng các tệp chuẩn SEO `sitemap.xml` và `robots.txt` cho ứng dụng Luyện Kanji tại `https://luyenkanji.vercel.app`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Các phương án SEO đã được xác nhận dựa trên phản hồi của bạn:

- **Nhóm từ khóa chiến lược**: Tập trung tối ưu từ khóa tiếng Việt như *"Luyện nét vẽ Kanji", "Tra cứu Hán-Việt", "Phiên âm Romaji", "214 Bộ thủ Khang Hy", "Thứ tự nét viết chữ Hán", "Luyện thi JLPT N5-N1"*.
- **Phạm vi cấu hình SEO**: Đầy đủ Meta Tags chuẩn, OpenGraph Social Card, Twitter Card `summary_large_image`, Schema.org JSON-LD (`WebApplication`, `FAQPage`, `HowTo`), `sitemap.xml`, `robots.txt` và Canonical Link chuẩn xác cho `https://luyenkanji.vercel.app`.
- **Ảnh OpenGraph Social Card**: Banner minh họa 1200x630 hiển thị thương hiệu Luyện Kanji với đồ họa thứ tự nét vẽ SVG, âm Hán-Việt và bảng bộ thủ.

---

## 1. Overview & Core Concept

- **Mục tiêu**: Đưa website `https://luyenkanji.vercel.app` đạt điểm SEO tối đa trên Google Lighthouse/PageSpeed, hiển thị thẻ preview sinh động, chuyên nghiệp khi chia sẻ link trên Facebook, Zalo, Telegram, X/Twitter, LinkedIn, Discord.
- **Đối tượng hướng đến**: Học viên tiếng Nhật tại Việt Nam, giáo viên, người luyện thi JLPT (N5 đến N1) và người dùng cần tra thứ tự nét viết Kanji để học tập hoặc tạo tài liệu Anki/Obsidian/Word.
- **Giá trị mang lại**: Tăng thứ hạng xuất hiện tự nhiên trên Google Search cho các truy vấn tra cứu Kanji, nét viết và âm Hán-Việt.

---

## 2. User Experience & Visual Design

- **Hiển thị Snippet trên Google**:
  - **Tiêu đề (Title)**: `Luyện Kanji - Tra Cứu Thứ Tự Nét Vẽ, Âm Hán-Việt & 214 Bộ Thủ` (khoảng 58 ký tự - nằm trong khoảng tối ưu 30–60 ký tự).
  - **Mô tả (Description)**: `Luyện Kanji - Công cụ tra cứu thứ tự nét viết chữ Hán SVG động, phiên âm Romaji, dịch câu song ngữ, 214 bộ thủ Khang Hy và xuất phiếu luyện viết cho Anki & Word.` (154 ký tự - tối ưu trong khoảng 120–160 ký tự).
- **Thẻ chia sẻ OpenGraph Social Card**:
  - Banner kích thước chuẩn **1200x630 px** được tạo và đặt tại `/public/og-image.png`.
  - Thiết kế phối màu Teal/Emerald đặc trưng của Luyện Kanji, hiển thị rõ ràng logo, minh họa các nét vẽ màu và các biểu tượng tính năng chính.

---

## 3. Key Product Decisions & Trade-Offs

- **Quyết định 1: Định dạng Canonical URL cố định**:
  - *Lựa chọn*: Sử dụng `https://luyenkanji.vercel.app/` làm URL chuẩn chính thức cho thẻ `<link rel="canonical">` và `og:url` thay vì phụ thuộc vào môi trường ngẫu nhiên.
  - *Lý do*: Đảm bảo Google Index đúng trang gốc của người dùng trên Vercel mà không bị phân tán thứ hạng do các domain tạm thời.
- **Quyết định 2: Tệp static `sitemap.xml` & `robots.txt` trong `/public/`**:
  - *Lựa chọn*: Đặt trực tiếp các tệp static chuẩn trong thư mục `/public/` kết hợp khai báo static route trên Express (`server.ts`).
  - *Lý do*: Vercel và Express server đều tự động phân phối các tệp này với tốc độ cao, hỗ trợ Googlebot crawler tự động tìm index.
- **Quyết định 3: Nhúng Schema.org JSON-LD dạng `WebApplication` & `FAQPage`**:
  - *Lựa chọn*: Thêm thẻ `<script type="application/ld+json">` chứa metadata dạng JSON-LD hợp lệ vào `<head>` của `index.html`.
  - *Lý do*: Giúp Google Search hiển thị Rich Snippets (loại ứng dụng web miễn phí, đánh giá, tính năng nổi bật) ngay trên trang kết quả tìm kiếm.

---

## 4. Technical Architecture & Data Strategy

### Sơ đồ kiến trúc SEO (SEO Architecture & Assets)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Google Search & Social Crawlers                 │
│               (Googlebot, Facebook External Hit, Twitterbot)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            index.html                                  │
│ ├─ <title> Luyện Kanji - Tra Cứu Thứ Tự Nét Vẽ...                   │
│ ├─ <meta name="description"> ...                                       │
│ ├─ <meta property="og:title|description|image|url">                    │
│ ├─ <meta name="twitter:card|title|description|image">                  │
│ ├─ <link rel="canonical" href="https://luyenkanji.vercel.app">         │
│ └─ <script type="application/ld+json"> (Schema.org WebApplication)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────┐                       ┌───────────────────────┐
│ /public/sitemap.xml   │                       │ /public/robots.txt    │
│ - Index URLs          │                       │ - User-agent: *       │
│ - Lastmod & Priority  │                       │ - Allow: /            │
│                       │                       │ - Sitemap location    │
└───────────────────────┘                       └───────────────────────┘
```

### Chi tiết các tệp sẽ khởi tạo và cập nhật:

1. **`index.html`**:
   - Thêm đầy đủ Meta SEO chuẩn (Keywords, Author, Robots, Theme color).
   - Thêm đầy đủ OpenGraph (`og:title`, `og:description`, `og:url`, `og:image`, `og:site_name`, `og:locale`).
   - Thêm Twitter Card (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
   - Thêm Canonical link (`https://luyenkanji.vercel.app`).
   - Thêm Schema.org JSON-LD nhúng thông tin `WebApplication`, `FAQPage` & `HowTo`.

2. **`/public/robots.txt`**:
   - Khai báo cho phép tất cả crawler (`User-agent: *`, `Allow: /`).
   - Dẫn link trực tiếp tới `Sitemap: https://luyenkanji.vercel.app/sitemap.xml`.

3. **`/public/sitemap.xml`**:
   - Khai báo cấu trúc các đường dẫn chính của ứng dụng (`https://luyenkanji.vercel.app/`, `/?tab=kanji-strokes`, `/?tab=romaji-reader`, `/?tab=translation`, `/?tab=radicals`, `/?tab=history`).
   - Đặt tần suất cập nhật `weekly` và độ ưu tiên `priority=1.0`.

4. **`/public/og-image.png`**:
   - Tạo banner thương hiệu xem trước 1200x630px hiển thị giao diện học chữ Hán, nét vẽ SVG màu và thông tin tính năng của Luyện Kanji.

5. **Kịch bản kiểm thử**:
   - Kiểm tra syntax HTML & JSON-LD bằng `compile_applet` và `lint_applet`.
   - Đảm bảo không có lỗi thiếu thẻ hoặc đường dẫn broken.
