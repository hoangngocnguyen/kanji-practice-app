import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel Serverless
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Vui lòng cung cấp văn bản tiếng Nhật cần dịch' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Chưa cấu hình GEMINI_API_KEY trong biến môi trường server/Vercel',
      code: 'NO_API_KEY',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Bạn là một dịch giả cao cấp tiếng Nhật - tiếng Việt. Hãy dịch chuẩn xác, tự nhiên và mượt mà văn bản tiếng Nhật sau đây sang tiếng Việt:
"${text.trim()}"

QUY TẮC BẮT BUỘC:
1. Trả về DUY NHẤT câu/đoạn dịch tiếng Việt hoàn chỉnh, không thêm bất kỳ lời dẫn, dấu ngoặc kép, ghi chú hay lời giải thích nào.
2. Nếu văn bản là thành ngữ, tục ngữ, quán dụng ngữ: hãy dịch đúng nghĩa bóng kết hợp giải nghĩa sâu sắc (ví dụ: 七転び八起き -> Thất chuyển bát khởi: Bảy lần ngã, tám lần đứng dậy).
3. Thể hiện đúng kính ngữ, sắc thái ngữ cảnh và ngữ pháp của câu gốc.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const translatedText = response.text?.trim() || '';
    return res.status(200).json({ translatedText });
  } catch (err: any) {
    console.error('Lỗi khi gọi Gemini AI:', err);
    return res.status(500).json({
      error: err.message || 'Lỗi khi dịch thuật qua Gemini AI',
    });
  }
}
