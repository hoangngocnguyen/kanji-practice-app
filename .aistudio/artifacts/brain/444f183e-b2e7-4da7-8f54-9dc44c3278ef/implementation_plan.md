# Kế hoạch Triển khai: Phiên Âm Romaji Phân Tách Từ (Word-Spaced Romaji Transliteration)

## User Review & Critical Decisions (Xác nhận từ người dùng)

Dựa trên phản hồi từ bạn qua các câu hỏi làm rõ, tính năng chuyển đổi đoạn văn sang Romaji sẽ được thiết kế và xây dựng tuân thủ 3 quyết định cốt lõi:

1. **Vị trí hiển thị**: Hiển thị dòng Romaji phân tách từ ngay bên dưới từng chữ/từ trong **Khung đọc chi tiết từng chữ (Glossed Reader Box)**, kết hợp song song cùng Furigana (Hiragana trên đầu) và Nghĩa tiếng Việt (chân chữ).
2. **Định dạng & Cách từ (Word Spacing)**: Tuân theo **Chuẩn Romaji Hepburn** có khoảng trắng (`space`) phân tách rõ ràng giữa các từ ghép, cụm từ và từ đơn (ví dụ: `Nihongo nōryoku shiken`, `Nihonjin wa kanji wo mainichi benkyō suru`), giúp người đọc nhịp điệu chính xác mà không bị dính liền ký tự.
3. **Độ chính xác âm đọc (Kanji Reading Accuracy)**: Tự động phân tích ngữ cảnh từ ghép và từ đơn:
   - **Từ đơn đứng độc lập**: Ưu tiên âm Kun-yomi (ví dụ: `歌` → `uta`, `日` → `hi`).
   - **Từ ghép nhiều Kanji (Kanji Compound Words)**: Ưu tiên âm On-yomi ghép liên tục (ví dụ: `日本` → `nihon`, `歌手` → `kashu`, `勉強` → `benkyō`).

---

## 1. Tổng quan & Mục tiêu

Mục đích chính của người học khi xem đoạn văn tiếng Nhật là **đọc chính xác từng từ theo đúng ngữ điệu và ngắt nghỉ tự nhiên**.

Tính năng mới **Word-Spaced Romaji Reader** sẽ bổ sung một lớp phiên âm Romaji chuẩn Hepburn ngay trong Khung đọc chi tiết với công tắc bật/tắt **`Romaji [BẬT/TẮT]`**:
- Giúp người mới học hoặc người chưa thuộc hết Kana/Kanji có thể cất tiếng đọc nguyên đoạn văn tiếng Nhật một cách trôi chảy, đúng từ, đúng ngắt nghỉ.
- Mọi từ ghép (như `日本語`, `能力試験`, `勉強`, `一期一会`) đều được phân tách bằng khoảng trắng rộng `space` rõ ràng.

---

## 2. Trải nghiệm Người dùng & Thiết kế Giao diện (UI/UX)

### 2.1. Công tắc điều khiển `Romaji [BẬT/TẮT]`
- Trong **Khung đọc chi tiết từng chữ (`InputSection.tsx`)**, bên cạnh 2 công tắc hiện tại là `Furigana [BẬT/TẮT]` và `Nghĩa chữ [BẬT/TẮT]`, thêm công tắc thứ 3:
  - **`Romaji [BẬT/TẮT]`**: Kiểu dáng nút bấm nhã nhặn, chuẩn theme (`bg-teal-50 text-teal-950 border-2 border-teal-600` khi BẬT kèm badge `BẬT`; `bg-slate-100 text-slate-500` khi TẮT).

### 2.2. Hiển thị Romaji theo từng từ ghép / từ đơn trong Khung đọc
Mỗi ô từ vựng trong Khung đọc chi tiết sẽ có cấu trúc 4 tầng hoàn chỉnh (tùy theo công tắc người dùng bật):
```
    [ 1. Furigana (Hiragana) trên đầu ]     -> (ví dụ: にほんご)
    [ 2. Chữ Kanji chính giữa ]            -> (ví dụ: 日本語)
    [ 3. Romaji Hepburn phân tách từ ]     -> (ví dụ: nihongo)
    [ 4. Nghĩa tiếng Việt dưới chân ]       -> (ví dụ: Tiếng Nhật)
```

- **Romaji Badge**: Hiển thị dòng chữ Romaji Hepburn in thường/in hoa nhã nhặn (`text-[10px] sm:text-[11px] font-mono font-bold text-indigo-900 bg-indigo-50/80 border border-indigo-200/80 px-1.5 py-0.2 rounded-md`).
- **Khoảng cách nhịp thở (Spacing)**: Giữa các thẻ từ ghép có khoảng trống `gap-2` và margin tự nhiên, giúp mắt người dùng dễ dàng lướt đọc theo từng cụm ngữ nghĩa.

---

## 3. Kiến trúc Kỹ thuật & Luồng Dữ liệu (Transliteration Pipeline)

```
[Đoạn văn bản tiếng Nhật] (ví dụ: "日本人は漢字を毎日勉強する。")
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 1. Japanese Word & Compound Segmenter                  │
│    Tách đoạn văn thành các cụm từ ghép & từ đơn         │
│    - Từ ghép Kanji: "日本人", "漢字", "毎日", "勉強"     │
│    - Trợ từ & Hiragana: "は", "を", "する"            │
└────────────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 2. Contextual Reading Resolver                         │
│    - Kiểm tra CSDL KANJI_DICTIONARY & Ví dụ            │
│    - Từ đơn 1 Kanji -> Âm Kun (như "日" -> "hi")       │
│    - Từ ghép >= 2 Kanji -> Ghép âm On ("日本" -> "nihon")│
└────────────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 3. Kana-to-Hepburn Romaji Converter                    │
│    - Chuyển Kana Hiragana thành Romaji chuẩn Hepburn   │
│    - Xử lý âm dài (ー, おう -> ō/ou), sokuon (っ -> kk/tt) │
│    - Phân tách cụm từ bằng phím space                  │
└────────────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 4. Reader Card Rendering                               │
│    Hiển thị lớp Romaji Hepburn bên dưới thẻ từ vựng   │
└────────────────────────────────────────────────────────┘
```

### 3.1. Thuật toán phân tách từ & chuyển đổi Romaji (`src/utils/romajiConverter.ts`)
- Tạo hàm `kanaToHepburnRomaji(kanaText: string): string`:
  - Chuyển đổi các âm Kana (Hiragana/Katakana) sang Romaji Hepburn chính xác.
  - Xử lý các trường hợp đặc biệt: `ん` trước nguyên âm hay phụ âm (`n'` vs `m`), biến âm `っ` (sokuon), trợ từ `は` (wa), `へ` (e), `を` (o).
- Tạo hàm `getWordRomaji(charOrWord: string, detail?: KanjiDetail): string`:
  - Trích xuất âm đọc chuẩn nhất cho từng từ ghép hoặc từ đơn dựa trên `KANJI_DICTIONARY`.

---

## 4. Các Bước Thực Hiện (Implementation Steps)

1. **Bước 1: Nâng cấp `romajiConverter.ts` & `kanji.ts`**
   - Viết hàm `kanaToHepburn(kana: string): string` chuyển đổi từ Kana sang Romaji Hepburn chuẩn xác.
   - Viết hàm `getExactWordRomaji(word: string, detail?: KanjiDetail)` phân tích từ đơn (Kun) và từ ghép (On).

2. **Bước 2: Cập nhật `InputSection.tsx`**
   - Thêm trạng thái `showRomaji` (Mặc định `true` hoặc `false` linh hoạt).
   - Thêm nút công tắc `Romaji [BẬT/TẮT]` trên thanh công cụ Khung đọc chi tiết.
   - Cập nhật JSX thẻ từ vựng hiển thị thêm dòng Romaji Hepburn cách từ nhã nhặn.

3. **Bước 3: Cập nhật Cẩm Nang Hướng Dẫn & Tài Liệu**
   - Cập nhật `UserGuideModal.tsx` và `docs/08-bo-go-ime-nhat-ban.md` giới thiệu tính năng đọc Romaji phân tách từ.

4. **Bước 4: Kiểm thử & Biên dịch**
   - Kiểm tra đoạn văn mẫu: `日本語能力試験（JLPT）で思い出す漢字の練習：日本人は漢字を毎日勉強する。一期一会、温故知新。`
   - Đảm bảo hiển thị Romaji đẹp mắt: `Nihongo` `nōryoku` `shiken`, `Nihonjin` `wa` `kanji` `wo` `mainichi` `benkyō` `suru`.
   - Chạy `compile_applet` và `lint_applet` đạt 0 lỗi.

---

Vui lòng xem xét kế hoạch chi tiết trên. Khi bạn đã sẵn sàng, hãy bấm **Proceed** để tôi tiến hành triển khai mã nguồn!
