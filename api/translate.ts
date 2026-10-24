import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel Serverless & local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Friendly health check on GET requests (avoiding 405 error when visited directly in browser)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'Kanji Stroke Tool - Gemini Translation API',
      configured: !!process.env.GEMINI_API_KEY,
      usage: 'Gửi yêu cầu POST với body: { "text": "câu tiếng Nhật cần dịch" }',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST hoặc GET' });
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
        timeout: 15000,
      },
    });

    const prompt = `Bạn là một dịch giả cao cấp chuyên ngữ Nhật - Việt. Hãy dịch chuẩn xác, tự nhiên và mượt mà văn bản tiếng Nhật sau đây sang tiếng Việt:
"${text.trim()}"

QUY TẮC BẮT BUỘC:
1. Trả về DUY NHẤT câu/đoạn dịch tiếng Việt hoàn chỉnh, không thêm bất kỳ lời dẫn, dấu ngoặc kép, ghi chú hay lời giải thích nào.
2. Nếu văn bản là câu hỏi giao tiếp đời thường: hãy dịch tự nhiên theo văn phong tiếng Việt (ví dụ: パクさんの国 = Ở nước anh/chị Park, 出産のお祝い = quà mừng sinh em bé).
3. Nếu văn bản là thành ngữ, tục ngữ, quán dụng ngữ: hãy dịch đúng nghĩa bóng kết hợp giải nghĩa sâu sắc (ví dụ: 七転び八起き -> Thất chuyển bát khởi: Bảy lần ngã, tám lần đứng dậy).
4. Giữ đúng sắc thái trang trọng/thân mật và ngữ pháp của câu gốc.`;

    // Try gemini-2.5-flash first (fast, reliable, excellent translation), with fallback
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
    } catch (modelErr) {
      console.warn('gemini-2.5-flash gặp lỗi, thử chuyển sang gemini-3.8-flash:', modelErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
    }

    const translatedText = response.text?.trim() || '';
    if (!translatedText) {
      throw new Error('AI không tạo được nội dung dịch hợp lệ');
    }

    return res.status(200).json({ translatedText });
  } catch (err: any) {
    console.error('Lỗi khi gọi Gemini AI:', err);
    return res.status(500).json({
      error: err.message || 'Lỗi khi dịch thuật qua Gemini AI',
    });
  }
}

