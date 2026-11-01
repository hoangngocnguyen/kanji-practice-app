# 02. Cơ Chế Dịch Đoạn Văn & Ngôn Ngữ

## 1. Tổng Quan Kiến Trúc Dịch Câu

Tính năng dịch câu tự động cho phép người dùng nhập các đoạn văn tiếng Nhật dài và dịch ngữ cảnh câu sang **Tiếng Việt** (hoặc Tiếng Anh) trực tiếp trong hộp nhập liệu `InputSection`.

---

## 2. Luồng Xử Lý & API Integration

```
[Nhập câu Tiếng Nhật (vd: "温故知新：過去の事をよく調べて新しい見解を得る。")]
                             │
                             ▼
              [Mã hóa URI UTF-8 encodeURIComponent]
                             │
                             ▼
         [Gọi Endpoint Dịch (Google Translation Proxy)]
    URL: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=...`
                             │
                             ▼
         [Phân tích Response JSON Matrix (res[0][i][0])]
                             │
                             ▼
           [Cập nhật UI Kết Quả Dịch & Tách Kanji]
```

---

## 3. Thuật Toán Xử Lý Chuỗi Văn Bản & Kết Quả Response

Google Translate API công cộng trả về mảng lồng nhau (nested array). Hệ thống thực hiện nối các đoạn dịch thành câu hoàn chỉnh:

```typescript
export async function translateJapaneseText(text: string, targetLang: string = 'vi'): Promise<string> {
  if (!text.trim()) return '';

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

    const data = await response.json();
    
    // Mảng data[0] chứa các mảng con tương ứng với từng câu văn trong đoạn
    if (data && Array.isArray(data[0])) {
      const translatedParts = data[0].map((item: any) => item[0]).filter(Boolean);
      return translatedParts.join(' ');
    }
  } catch (error) {
    console.warn('Lỗi khi dịch câu:', error);
  }
  return '';
}
```

---

## 4. Tự Động Kết Hợp Dịch & Tách Kanji

Khi người dùng nhấn nút **Dịch ngay**:
1. Hàm `translateJapaneseText` được thực thi asynchronously.
2. Kết quả dịch tiếng Việt được hiển thị ngay bên dưới ô nhập câu với nút 1-click **Sao chép kết quả dịch**.
3. Đồng thời, toàn bộ câu gốc tiếng Nhật được chuyển qua hàm `extractUniqueKanji` để trích xuất ngay danh sách các chữ Hán có trong câu giúp người dùng vừa hiểu nghĩa câu vừa học viết từng chữ.
