# Chrome Extension: Luyện Kanji - Phân tích & Học Kanji trên trang web

Kế hoạch xây dựng **Chrome Extension Manifest V3 "Luyện Kanji"** kết hợp với **Trình giả lập Web Interactive Playground** trong ứng dụng React Vite. Extension giúp người dùng bôi đen đoạn văn bản tiếng Nhật bất kỳ trên trình duyệt để hiển thị Floating Tooltip, mở Modal phân tích nét vẽ động, âm thanh phát âm, Hán-Việt, dịch câu bằng AI và xuất thẻ Anki.

---

## User Review & Critical Decisions

> [!IMPORTANT] Các quyết định tính năng dựa trên câu trả lời của người dùng:

- **Cơ chế kích hoạt (Activation UX)**: Kích hoạt dạng **Floating Tooltip Icon** xuất hiện ngay góc trên bên phải đoạn văn bản vừa bôi đen. Khi nhấp vào icon sẽ mở Modal phân tích chuyên sâu.
- **Tính năng trong Kanji Analysis Modal**:
  1. Trích xuất danh sách tất cả chữ Kanji trong đoạn văn bản bôi đen.
  2. Phát âm chuẩn tiếng Nhật (Web Speech API / Audio TTS).
  3. Tra Hán-Việt & nghĩa tiếng Việt đầy đủ.
  4. Trình chiếu nét vẽ động SVG (KanjiVG Stroke Order Animation player).
  5. Dịch câu ngữ cảnh bằng Gemini AI / Translate.
  6. Xuất thẻ ghi nhớ Anki (File CSV chuẩn Anki + Kết nối AnkiConnect API trực tiếp).
  7. Lưu lịch sử tra cứu & Từ vựng yêu thích (Bookmark).
- **Đóng gói & Phân phối**:
  1. Xây dựng bộ mã nguồn Chrome Extension Manifest V3 đầy đủ (`manifest.json`, `content.js`, `background.js`, `popup.html`, `popup.js`, `styles.css`).
  2. Đóng gói nút xuất **Tải ZIP Extension (JSZip)** để người dùng cài đặt Developer Mode (`chrome://extensions`).
  3. Trình giả lập (Simulator) trên giao diện Web cho phép thử nghiệm tính năng bôi đen văn bản và bật Popup Modal ngay lập tức.

---

## 1. Overview & Core Concept

- **Mục tiêu**: Cung cấp công cụ tra cứu Kanji cá nhân siêu tốc ngay trên mọi trang web khi đọc tin tức, truyện, tài liệu tiếng Nhật mà không cần chuyển tab sang từ điển.
- **Đối tượng sử dụng**: Người học tiếng Nhật ở mọi cấp độ (N5 - N1) cần tra nét vẽ, nghĩa Hán-Việt và lưu từ vựng sang Anki khi duyệt web.

---

## 2. User Experience & Visual Design

### Flow người dùng trên Extension & Web Simulator:

```
[ Bôi đen đoạn chữ tiếng Nhật trên trang web ]
                    │
                    ▼
[ Floating Icon ✒️ / 🏮 xuất hiện tại toạ độ bôi đen ]
                    │ (Click icon)
                    ▼
[ Modal Phân tích Kanji (Shadow DOM - tránh đụng độ CSS trang web) ]
 ├── Tab 1: Danh sách Kanji trong đoạn văn (Phát âm, Hán Việt, Nét vẽ động)
 ├── Tab 2: Dịch câu ngữ cảnh bằng AI
 └── Tab 3: Xuất Anki (Tải CSV hoặc Gửi sang AnkiConnect)
```

### Visual Identity:
- **Style**: Japanese Editorial & Clean SaaS Interface.
- **Color Budget (60-30-10)**:
  - 60% Canvas: Light warm gray / white slate (`#F8FAFC`, `#FFFFFF`).
  - 30% Structure: Emerald green slate (`#0F766E`, `#1E293B`, border `#E2E8F0`).
  - 10% Accent: Vivid Crimson Japanese Ink (`#E11D48` / `#0D9488`).
- **Typography**: Inter / Plus Jakarta Sans cho chữ Latin, Noto Sans JP cho chữ Kanji.

---

## 3. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CHROME EXTENSION MANIFEST V3                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────┐           ┌─────────────────────────────────┐  │
│  │    content.js (DOM)     │           │   background.js (Service Wkr)   │  │
│  │ ── MouseUp Event        │           │ ── Context Menu Actions         │  │
│  │ ── Floating Tooltip     │ ────────► │ ── Gemini API Proxy Request     │  │
│  │ ── Shadow DOM Modal     │           │ ── Chrome Storage Sync          │  │
│  └─────────────────────────┘           └─────────────────────────────────┘  │
│               │                                         │                   │
│               ▼                                         ▼                   │
│  ┌─────────────────────────┐           ┌─────────────────────────────────┐  │
│  │  KanjiVG & Audio Engine │           │     popup.html & options.html   │  │
│  │ ── Animated Stroke Player│           │ ── History & Saved Vocabulary   │  │
│  │ ── TTS Pronunciation    │           │ ── AnkiConnect & API Config     │  │
│  └─────────────────────────┘           └─────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plan Implementation Steps

1. **Tạo dữ liệu & Service cho Chrome Extension Engine (`src/services/` & `src/extension/`)**:
   - Viết bộ trích xuất Kanji từ chuỗi văn bản (`extractKanjiFromText`).
   - Tích hợp từ điển Hán-Việt, âm On/Kun, cấp độ JLPT, bộ thủ cấu thành.
   - Xây dựng SVG Stroke Order renderer & player cho từng nét chữ.

2. **Xây dựng Chrome Extension Codebase Files (`src/extension/files/`)**:
   - `manifest.json`: Khai báo Manifest V3, permissions (`storage`, `activeTab`, `scripting`), host permissions.
   - `content.js`: Trình bắt sự kiện `mouseup`, tính toán toạ độ hiển thị Floating Tooltip, chèn Shadow DOM Modal để không bị đè CSS của trang gốc.
   - `background.js`: Service worker xử lý tin nhắn (messages), gọi Gemini API dịch câu, lưu trữ Chrome storage.
   - `popup.html` & `popup.js`: Giao diện Popup Extension khi click icon trên thanh công cụ trình duyệt (xem lịch sử tra, từ vựng lưu, xuất Anki).
   - `styles.css`: Scoped CSS cho Floating Tooltip & Modal.

3. **Xây dựng Nút Xuất ZIP Extension (`src/components/ExtensionExporter.tsx`)**:
   - Tích hợp library `jszip` và `file-saver` để nén toàn bộ thư mục Extension thành file `LuyenKanji-Extension-v1.0.zip` chỉ với 1 click.
   - Cung cấp Hướng dẫn cài đặt từng bước (Developer Mode -> Load unpacked).

4. **Xây dựng Web Simulator & Tab Chức năng (`src/components/ExtensionPlayground.tsx`)**:
   - Tạo môi trường trang web giả định có sẵn nhiều đoạn văn tiếng Nhật tin tức / truyện.
   - Cho phép người dùng thử bôi đen chữ trên màn hình web simulator để trải nghiệm chính xác luồng hoạt động của Chrome Extension.
   - Tích hợp đầy đủ tính năng tra nét vẽ, nghe âm thanh, dịch câu ngữ cảnh bằng AI và xuất file CSV Anki.

5. **Cập nhật giao diện chính & Header**:
   - Đổi tên ứng dụng thành **Luyện Kanji**.
   - Thêm Tab / Nút "Tải Chrome Extension" nổi bật trên Header.

6. **Kiểm tra & Biên dịch**:
   - Chạy `lint_applet` và `compile_applet` đảm bảo không có bất kỳ lỗi TypeScript nào.
