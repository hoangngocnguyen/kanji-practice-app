# 04. Cơ Chế Bóc Tách Bộ Thủ & Cấu Phần 4 Tầng

## 1. Tổng Quan Cơ Chế Bóc Tách Cấu Trúc Kanji

Tính năng phân tích bộ thủ cho phép rã một chữ Kanji phức tạp (như `歌` - CA) thành các bộ thủ và thành phần cấu thành (`哥` - CA, `可` - KHẢ, `丁` - ĐINH, `一` - NHẤT, `口` - KHẨU, `亅` - QUYẾT) kèm vị trí không gian (`hen`, `tsukuri`, `kanmuri`, `ashi`, `kamae`, `tare`, `nyo`).

---

## 2. Bóc Tách XML DOM KanjiVG SVG (`parseKanjiVgSvgXml`)

Mỗi file SVG KanjiVG chứa cấu trúc cây nhóm `<g>` biểu diễn các nét và bộ thủ:

```xml
<g id="kvg:06b4c" kvg:element="歌">
    <g id="kvg:06b4c-g1" kvg:element="哥" kvg:position="left">
        <g id="kvg:06b4c-g2" kvg:element="可" kvg:position="top">
            <g id="kvg:06b4c-g3" kvg:element="丁">
                <path id="kvg:06b4c-s1" kvg:type="㐆" d="..."/>
            </g>
            <g id="kvg:06b4c-g4" kvg:element="口"> ... </g>
        </g>
    </g>
</g>
```

Ứng dụng dùng `DOMParser` duyệt toàn bộ cây nhóm `<g>`, trích xuất thuộc tính `kvg:element` và `kvg:position` để thu thập danh sách tất cả các sub-elements.

---

## 3. Mô Hình Tra Cứu 4 Tầng (4-Tier Radical Lookup Engine)

Đối với mỗi sub-element bóc tách được (ví dụ `哥`, `可`, `丁`), hệ thống áp dụng thuật toán tra cứu 4 tầng:

```
                                [Ký Tự Sub-Element (vd: 可)]
                                             │
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │ 1. Tra trong 214 Bộ Thủ Khang Hi (RADICALS)  │
                     └───────────────────────┬───────────────────────┘
                                             │ (Không thấy)
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │ 2. Tra trong Từ Điển Kanji (KANJI_DICT)      │
                     └───────────────────────┬───────────────────────┘
                                             │ (Không thấy)
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │ 3. Tra CSDL 11,000+ Hán-Việt & COMPONENT_MAP  │
                     └───────────────────────┬───────────────────────┘
                                             │ (Không thấy)
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │ 4. Fallback Sạch: Để trống '' (Không bị 'HÁN')│
                     └───────────────────────────────────────────────┘
```

### A. Tầng 1: 214 Bộ Thủ Chính Khang Hi (`RADICALS_LIST`)
Tìm kiếm theo ký tự chính hoặc biến thể (`variant`). Nếu trùng khớp, trả về đầy đủ Tên Hán Việt, Ý nghĩa và Số nét chuẩn Khang Hi.

### B. Tầng 2: Từ Điển Kanji Chi Tiết (`KANJI_DICTIONARY`)
Nếu cấu phần bóc tách là một chữ Kanji độc lập (như `哥`, `可`, `良`, `重`), lấy âm Hán Việt và nghĩa từ bộ từ điển Kanji chính.

### C. Tầng 3: CSDL 11,000+ Hán-Việt (`SINO_VIETNAMESE_MAP`) + Bảng Nghĩa Cấu Phần
Dùng từ điển 11,000+ từ Hán-Việt để gán âm Hán Việt chính xác (ví dụ `哥` ➔ **CA**, `可` ➔ **KHẢ**, `丁` ➔ **ĐINH**, `青` ➔ **THANH**, `巴` ➔ **BA**). Kết hợp bảng nghĩa `COMPONENT_MEANINGS` cho các thành phần biểu âm.

### D. Tầng 4: Fallback Sạch (No Placeholder Noise)
Nếu ký tự hoàn toàn không có thông tin nghĩa, ứng dụng **để trống `''`** chứ không bao giờ hiển thị chữ "HÁN" hoặc "Cấu phần chữ Hán" vô nghĩa.
