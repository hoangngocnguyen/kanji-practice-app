# Thuật Toán Bóc Tách Bộ Thủ KanjiVG & Phân Rã Cấu Trúc Ngữ Nghĩa 2 Cấp Độ

Kế hoạch tái cấu trúc toàn diện thuật toán phân tích cú pháp KanjiVG XML nhằm nhận diện chính xác 100% Bộ thủ chính (`kvg:radical="general"`), bóc tách cấu trúc 2 tầng (thành phần trực tiếp cấp 1 và chi tiết cấp 2), đồng thời kết hợp đếm số thẻ `<path>` thực tế cho đồ họa và lấy số nét chuẩn 214 Bộ thủ Khang Hy cho thông tin hiển thị.

## User Review & Critical Decisions

> [!IMPORTANT]
> Dưới đây là các quyết định kỹ thuật đã được thống nhất trực tiếp cùng người dùng trong Phase 1:

- **Cấp độ bóc tách thành phần**: Phân tách **2 cấp độ**: Cấp 1 trực tiếp (thành phần cha trực tiếp tạo nên chữ, ví dụ `見` = `目` [Kanmuri] + `儿` [Ashi]; `待` = `彳` [Hen] + `寺` [Tsukuri]) và mở rộng cấp 2 chi tiết (phân rã sâu hơn các cụm phức hợp, ví dụ `寺` = `土` + `寸`).
- **Phương pháp tính số nét**: Kết hợp lưỡng hợp (Dual Approach):
  1. *Để hiển thị thông tin*: Lấy số nét tiêu chuẩn định nghĩa sẵn từ 214 Bộ thủ Khang Hy / từ điển Hán-Việt (`comp.strokeCount`).
  2. *Để xử lý đồ họa / vẽ hoạt ảnh*: Đếm số thẻ `<path>` thực tế (`pathCount`, `strokeIndices`) nằm bên trong thẻ `<g>` của thành phần đó trong file SVG để phục vụ tô màu hoặc chạy hiệu ứng vẽ tương ứng.
- **Hiển thị Bộ thủ chính (`kvg:radical="general"`)**: Gắn huy hiệu nổi bật (`★ BỘ THỦ CHÍNH`) ngay trên thẻ bộ phận tương ứng, giúp người học phân biệt rõ ràng giữa thành phần ngữ nghĩa chính và các thành phần biểu âm/tượng hình phụ.

---

## 1. Overview & Core Concept

### Vấn đề hiện tại
- Thuật toán `parseKanjiVgSvgXml` cũ duyệt phẳng tất cả các thẻ `<g>` mà không phân biệt thứ bậc cha - con (DOM depth).
- Bị rò rỉ dữ liệu từ mảng `examples` trong danh sách 214 bộ thủ (như chữ `見` nằm trong ví dụ của bộ `目`, dẫn đến fallback chỉ nhận mỗi bộ `目` mà bỏ sót bộ `儿`).
- Chưa tận dụng triệt để thuộc tính cốt lõi của KanjiVG: `kvg:radical="general"`, `kvg:position` (top, bottom, left, right, surround...), `kvg:part` (các nét bị phân tách thành nhiều phần), và các thẻ `<path>` con.

### Giải pháp mới
Xây dựng parser cây cú pháp ngữ nghĩa (Semantic Tree Parser) đọc trực tiếp cấu trúc XML của KanjiVG:
1. **Xác định Root & Radical**:
   - Nếu thẻ `<g>` gốc của chữ có `kvg:radical="general"`, chữ đó chính là một trong 214 Bộ thủ (như `見`, `門`, `馬`). Khi đó toàn bộ chữ là bộ thủ chính, các nhánh con thể hiện cấu tạo tạo hình (ví dụ `見` cấu tạo từ `目` ở trên + `儿` ở dưới).
   - Nếu thẻ con bên dưới có `kvg:radical="general"`, thẻ con đó được gán cờ `isPrimaryRadical = true` (ví dụ `彳` trong `待`, `扌` trong `持`, `牜` trong `特`).
2. **Cấu trúc 2 cấp độ phân rã**:
   - **Cấp 1 (Direct Components)**: Các thẻ `<g kvg:element>` là con trực tiếp dưới root (hoặc cấp độ phân chia vị trí trực tiếp cao nhất).
   - **Cấp 2 (Sub Components)**: Các thẻ `<g kvg:element>` nằm sâu bên trong cụm phức hợp, cho phép bấm nút "Mở rộng chi tiết" để xem cách cấu thành.
3. **Trích xuất nét vẽ đồ họa**:
   - Lưu trữ danh sách chỉ số nét (`pathIndices: number[]`) và số thẻ path thực tế (`actualPathCount: number`) cho từng bộ phận để hỗ trợ hiệu ứng highlight nét trên SVG khi rê chuột hoặc bấm chọn.

---

## 2. User Experience & Visual Design

### 2.1. Trải nghiệm người dùng
1. **Nhận diện trực giác cấp 1**:
   - Trên mỗi thẻ so sánh hoặc modal chi tiết, hiển thị công thức trực tiếp cấp 1:
     - `見` = `目` (Phía trên - Kanmuri) + `儿` (Phía dưới - Ashi)
     - `待` = `彳` (Bên trái - Hen ★) + `寺` (Bên phải - Tsukuri)
2. **Huy hiệu Bộ thủ chính (`★ BỘ THỦ CHÍNH`)**:
   - Component mang thuộc tính `kvg:radical="general"` sẽ được viền vàng hổ phách (`border-amber-400 bg-amber-50/70`) kèm nhãn `★ Bộ thủ chính`.
3. **Mở rộng cấp 2 linh hoạt (Collapsible Detail)**:
   - Nếu thành phần có cấu trúc con (như `寺` gồm `土` + `寸`), hiển thị nút bấm tinh tế `↳ Cấu tạo sâu hơn (+2 nét nhỏ)` cho phép người dùng mở rộng/thu gọn mà không làm rối mắt giao diện so sánh.
4. **Tương tác trực quan đồ họa (SVG Path Highlighting)**:
   - Khi hover vào thẻ bộ thủ (ví dụ `目`), các đường nét tương ứng của `目` trên khung vẽ Kanji SVG sẽ được sáng đèn / đổi màu viền, dựa trên danh sách `<path>` thực tế đã đếm được.

### 2.2. Visual Identity & Color System
- Tuân thủ nghiêm ngặt **60-30-10** và quy chuẩn Typography không dùng thẻ pill xơ cứng:
  - **Vị trí Bên trái (Hen)**: Nền cyan dịu `bg-cyan-50/70 border-cyan-200 text-cyan-900`.
  - **Vị trí Bên phải (Tsukuri)**: Nền indigo thanh lịch `bg-indigo-50/70 border-indigo-200 text-indigo-900`.
  - **Vị trí Phía trên (Kanmuri)**: Nền amber nhã nhặn `bg-amber-50/70 border-amber-200 text-amber-900`.
  - **Vị trí Phía dưới (Ashi)**: Nền emerald dịu mắt `bg-emerald-50/70 border-emerald-200 text-emerald-900`.
  - **Vị trí Bao quanh (Kamae/Tare/Nyo)**: Nền rose mềm mại `bg-rose-50/70 border-rose-200 text-rose-900`.
  - **Huy hiệu Bộ thủ chính**: Viền hổ phách sắc nét `ring-1 ring-amber-400 bg-amber-100/80 text-amber-950 font-bold`.

---

## 3. Key Product Decisions & Trade-Offs

### Quyết định 1: Phân tách Cây 2 tầng thay vì làm phẳng danh sách
- **Cách làm**: Thay vì đưa tất cả các phần tử nhặt được vào một mảng phẳng (khiến chữ `待` bị nhặt thành `[彳, 寺, 土, 寸]` làm người học tưởng chữ có 4 bộ phận đứng cạnh nhau), thuật toán mới cấu trúc:
  - `directComponents`: `[ 彳 (3 nét), 寺 (6 nét) ]`
  - `subComponents`: `寺` chứa `[ 土 (3 nét), 寸 (3 nét) ]`
- **Lý do**: Đây là bản chất tự nhiên của chữ khối tượng hình (chữ hội ý / hình thanh). Người học nhìn vào thấy ngay 2 vế đối xứng trái - phải hoặc trên - dưới trước, sau đó mới đi sâu vào chi tiết nếu cần.

### Quyết định 2: Tách biệt số nét hiển thị và số nét đồ họa
- **Cách làm**:
  - `displayStrokes`: Lấy từ bộ từ điển 214 Bộ thủ (`RADICALS_LIST`) để người dùng ôn thi JLPT / Hán ngữ tiêu chuẩn.
  - `graphicPathCount`: Đếm thực tế số thẻ `<path>` bên trong cụm `<g>` của SVG KanjiVG để phục vụ vòng lặp vẽ SVG, highlight từng nét một cách chính xác tuyệt đối.

---

## 4. Technical Architecture & Data Strategy

### 4.1. Cấu trúc dữ liệu mở rộng cho `RadicalComponent` & `KanjiDecomposition`

```typescript
export interface RadicalComponent {
  radical: string;              // Ký tự bộ thủ / thành phần (ví dụ '目', '儿', '彳')
  hanViet?: string;             // Âm Hán Việt ('MỤC', 'NHI', 'XÍCH')
  meaning?: string;             // Ý nghĩa ngữ nghĩa ('Con mắt', 'Người đứng')
  strokeCount: number;          // Số nét chuẩn Khang Hy để hiển thị
  actualPathCount: number;      // Số nét <path> thực tế đếm từ SVG (cho đồ họa)
  pathIndices?: number[];       // Danh sách thứ tự nét (1-indexed) để highlight
  positionType?: RadicalPositionType; // 'hen' | 'tsukuri' | 'kanmuri' | 'ashi' ...
  positionName?: string;        // 'Phía trên (Kanmuri)', 'Phía dưới (Ashi)' ...
  isPrimaryRadical?: boolean;   // true nếu chứa kvg:radical="general"
  subComponents?: RadicalComponent[]; // Thành phần cấp 2 nếu có
}

export interface KanjiDecomposition {
  kanji: string;
  hanViet: string;
  primaryRadical: string;       // Tên bộ thủ chính xác định qua kvg:radical
  isSelfRadical: boolean;       // true nếu cả chữ chính là một bộ thủ độc lập
  directComponents: RadicalComponent[]; // Cấp 1: Các thành phần tạo nên chữ
  allLeafComponents?: RadicalComponent[]; // Danh sách phẳng các bộ phận cơ bản nhất
  mnemonicStory?: string;
}
```

### 4.2. Sơ đồ xử lý Parser KanjiVG XML

```
┌─────────────────────────────────────────────────────────────┐
│                 KanjiVG SVG Input (XML Text)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Parse XML DOM & Chuẩn hóa Namespace                      │
│    - Sử dụng DOMParser an toàn với tiền tố kvg: và xmlns   │
│    - Đọc root <g id="kvg:0898b" kvg:element="..." kvg:rad>  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Nhận diện Bộ thủ chính (kvg:radical="general")           │
│    - Nếu root có kvg:radical="general" -> isSelfRadical     │
│    - Nếu thẻ con có kvg:radical -> Đánh dấu isPrimary       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Phân tách Cấp 1 (Direct Children) & Cấp 2 (Nested)       │
│    - Quét các thẻ <g kvg:element> trực tiếp dưới root       │
│    - Đọc kvg:position (top, bottom, left, right...)         │
│    - Đệ quy nhẹ lấy subComponents cấp 2                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Đo lường Nét: Dual Mapping                               │
│    - Đếm thẻ <path> con -> actualPathCount & pathIndices    │
│    - Tra cứu 214 Radicals Database -> strokeCount chuẩn     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Kết hợp Từ điển Hán-Việt & Ngữ nghĩa Component           │
│    - Gắn Âm Hán-Việt & Ý nghĩa giải thích chi tiết          │
│    - Trả về cấu trúc KanjiDecomposition chuẩn hóa           │
└─────────────────────────────────────────────────────────────┘
```

### 4.3. Các bước triển khai cụ thể

1. **Cập nhật Types (`src/types/radical.ts`)**:
   - Bổ sung `isPrimaryRadical?: boolean`, `actualPathCount?: number`, `pathIndices?: number[]`, `subComponents?: RadicalComponent[]`, `isSelfRadical?: boolean`, `directComponents: RadicalComponent[]`.
2. **Nâng cấp Parser (`src/utils/kanjiSubElementParser.ts`)**:
   - Viết lại hàm `parseKanjiVgSvgXml` với thuật toán phân tầng đệ quy 2 cấp độ.
   - Nhận diện chính xác `kvg:radical="general"` (cả ở root node lẫn child nodes).
   - Đếm số lượng và thu thập index các thẻ `<path>` thuộc về từng `<g>`.
   - Bổ sung định nghĩa ý nghĩa và âm Hán Việt cho các bộ thường gặp như `儿` (NHI - Người đứng, con cái), `見` (KIẾN - Nhìn thấy), v.v.
3. **Cập nhật Giao diện So Sánh (`src/components/KanjiCompareView.tsx`)**:
   - Hiển thị công thức cấp 1 rõ ràng: `chữ = bộ_1 + bộ_2`.
   - Gắn huy hiệu `★ BỘ THỦ CHÍNH` cho component mang `isPrimaryRadical`.
   - Nút mở rộng/thu gọn cấp 2 cho các component có `subComponents`.
   - Cung cấp visual stroke path preview khi tương tác.
4. **Cập nhật Cây Phân Nhánh (`src/components/KanjiRadicalTree.tsx`)**:
   - Hỗ trợ hiển thị 2 cấp độ phân tầng trực quan với nhánh cây SVG chuẩn xác.
5. **Kiểm thử xác thực**:
   - Kiểm tra kỹ các trường hợp kinh điển:
     - `見` -> `目` (trên) + `儿` (dưới), bộ thủ chính là `見` (hoặc `目` theo quy ước).
     - `待`, `持`, `特` -> tách vế trái (`彳`, `扌`, `牜` - có huy hiệu Bộ thủ chính) và vế phải `寺` (mở rộng được thành `土` + `寸`).
     - Chữ 3 thành phần như `樹`, `微`, `徴`.
     - Xác thực TypeScript (`compile_applet`) và Linter (`lint_applet`).
