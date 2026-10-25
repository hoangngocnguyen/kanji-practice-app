# Interactive App Guide & Feature Walkthrough Modal

This feature adds a dedicated **Help / User Guide icon button (`?`)** in the application header and an **Interactive Feature Guide Modal** to help new and existing users easily discover and master all capabilities of the Kanji Stroke Order Tool (tra cứu nét vẽ Kanji, tách lọc chữ Hán, chép ảnh Kanji sang Clipboard cho Anki, xuất CSV, dịch thuật tự động).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Below are the proposed design choices for the User Guide feature. You can review them in the Plan Approval Curtain and click **Proceed** to build or provide feedback if you want to tweak anything.

* **Trigger Button**: A clean, accessible `?` help button placed in the top header right next to the title/actions.
* **Modal Structure**: Tabbed modal dialogue split into 4 key learning topics:
  1. 🖋️ **Tra cứu & Nét vẽ Kanji** (How to search, filter Kanji, and view animated stroke order).
  2. 📋 **Sao chép ảnh Kanji sang Anki / Word** (How to copy transparent SVG/PNG stroke images directly to clipboard).
  3. 📑 **Xuất CSV & Quản lý bộ thẻ** (How to export flashcard sets to Anki / Obsidian).
  4. 🌐 **Dịch thuật & Tra từ Hán Việt** (How to look up meanings, ON/KUN readings, and auto-translate sentences).
* **Interactive Tooltips & Step Highlights**: Includes visual preview animations/screenshots of key buttons so users learn exactly where to click.
* **First-Time Welcome Option**: Remembers if the user has seen the guide in `localStorage` with an option to reopen anytime via the header icon.

---

## 1. Overview & Core Concept

* **Goal**: Provide an intuitive visual guide (styled like game tutorial modals / quick-start guides) that teaches users how to leverage all advanced features of the tool.
* **Target Audience**: Japanese language learners (JLPT N5-N1), Anki card creators, and teachers copying Kanji stroke order images into lesson plans.
* **Value Delivered**: Eliminates confusion about how to export to Anki, copy transparent Kanji images, or toggle readings.

---

## 2. User Experience & Visual Design

### Key User Flow
1. **Discoverability**: User notices a quiet, styled `?` (Help / Hướng dẫn) icon button on the top right header.
2. **Modal Open**: Clicking the button opens a clean, animated modal overlay (`AnimatePresence` / smooth backdrop blur).
3. **Tabbed Navigation**: Users can switch between 4 interactive tabs (General Overview, Kanji Stroke Copying, Anki CSV Export, AI Translation).
4. **Visual Highlights**: Each tab displays step-by-step illustrations, interactive button simulations, and tips (e.g., "Mẹo: Bấm 'Chép ảnh' để dán trực tiếp vào Anki bằng Ctrl+V").
5. **Quick Dismiss**: Escape key, backdrop click, or "Đã hiểu!" button closes the modal smoothly.

### Visual Identity & Theme
* **Modal Backdrop**: Soft translucent dark overlay (`bg-slate-900/40 backdrop-blur-sm`).
* **Container**: Light clean slate background (`bg-white dark:bg-slate-900`), rounded corners (`rounded-2xl`), subtle border (`border border-slate-200 dark:border-slate-800`).
* **Active Tab Accent**: Red indigo badge (`bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-medium`).
* **Typography**: Clean hierarchy with `Plus Jakarta Sans` display headings and subtle metadata separators.

---

## 3. Technical Architecture & Component Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App Header                                │
│  [ Kanji Stroke Tool ]                   [ 🌙 Mode ]  [ ❓ Hướng dẫn ] │
└─────────────────────────────────────────────┬──────────────────────────┘
                                              │ Click
                                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        User Guide Modal Overlay                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  📖 Hướng Dẫn Sử Dụng                                          [X] │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │  [ 1. Tra cứu ]  [ 2. Chép ảnh Anki ]  [ 3. Xuất CSV ]  [ 4. Dịch ] │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │                                                                    │ │
│ │  📌 Bước 1: Nhập đoạn văn bản hoặc từ Kanji bất kỳ                 │ │
│ │  📌 Bước 2: Nhấn vào ô Kanji để xem từng nét thứ tự vẽ              │ │
│ │  📌 Bước 3: Bấm "Sao chép ảnh" để dán trực tiếp vào Anki            │ │
│ │                                                                    │ │
│ │  💡 Mẹo nhỏ: Bạn có thể bật/tắt Hiragana & Nghĩa ở Section 2        │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │                              [ Đã hiểu! ]                          │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Components to Create / Update:
1. `src/components/UserGuideModal.tsx`: The main interactive walkthrough modal with tabs, step descriptions, and visual tips.
2. `src/components/Header.tsx` (or `App.tsx` Header zone): Add the Help `?` icon button with subtle hover animation and tooltip.
3. `src/App.tsx`: Manage `isGuideOpen` state and `localStorage` first-time visitor check.

---

## 4. Verification Plan

1. **Compilation & Syntax**: Run `compile_applet` and `lint_applet` to ensure TypeScript zero errors.
2. **Responsiveness**: Verify modal rendering on both mobile (full-screen touch optimized) and desktop viewports.
3. **Accessibility**: Esc key closes modal, aria-labels on trigger button and tabs.
