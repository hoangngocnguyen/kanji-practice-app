import { GoogleGenAI } from '@google/genai';

/**
 * Serverless / Express translate handler
 * Supports:
 * 1. engine: 'google' (default) -> Google Translate via fast GTX endpoint (instant, highly natural for Japanese -> Vietnamese, no API key needed)
 * 2. engine: 'gemini' -> Gemini AI via @google/genai SDK (contextual, nuanced)
 */
export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel Serverless & local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Friendly health check on GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'Kanji Stroke Tool - Multi-Engine Translation API',
      engines: ['google (default - fast & accurate)', 'gemini (AI contextual)'],
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      usage: 'Gửi yêu cầu POST với body: { "text": "câu tiếng Nhật", "engine": "google" | "gemini" }',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST hoặc GET' });
  }

  const { text, engine = 'google' } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Vui lòng cung cấp văn bản tiếng Nhật cần dịch' });
  }

  const trimmedText = text.trim();

  // 1. ENGINE 1: GOOGLE TRANSLATE (Default, instant ~150ms, accurate, no key required)
  if (engine === 'google') {
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(trimmedText)}`;
      const googleRes = await fetch(gtxUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
      });

      if (googleRes.ok) {
        const data = await googleRes.json();
        // Google GTX format: [[["câu dịch", "câu gốc", null, null, ...], ...], ...]
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translatedText = data[0]
            .map((chunk: any) => (chunk && chunk[0] ? chunk[0] : ''))
            .filter(Boolean)
            .join('')
            .trim();

          if (translatedText) {
            return res.status(200).json({
              translatedText,
              engine: 'google',
              source: 'Google Translate',
            });
          }
        }
      }
    } catch (googleErr) {
      console.warn('Google Translate GTX gặp lỗi mạng, thử fallback sang Gemini nếu có:', googleErr);
    }
  }

  // 2. ENGINE 2: GEMINI AI (Contextual translation)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // If Gemini requested but no API key, fall back to Google Translate
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(trimmedText)}`;
      const gRes = await fetch(gtxUrl);
      if (gRes.ok) {
        const data = await gRes.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translatedText = data[0].map((c: any) => c?.[0] || '').join('').trim();
          if (translatedText) {
            return res.status(200).json({
              translatedText,
              engine: 'google',
              source: 'Google Translate (Tự động chuyển từ Gemini do chưa có API Key)',
            });
          }
        }
      }
    } catch {}

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
"${trimmedText}"

QUY TẮC BẮT BUỘC:
1. Trả về DUY NHẤT câu/đoạn dịch tiếng Việt hoàn chỉnh, không thêm bất kỳ lời dẫn, dấu ngoặc kép, ghi chú hay lời giải thích nào.
2. Nếu văn bản là câu hỏi giao tiếp đời thường: hãy dịch tự nhiên theo văn phong tiếng Việt (ví dụ: パクさんの国 = Ở nước anh/chị Park, 出産のお祝い = quà mừng sinh em bé).
3. Nếu văn bản là thành ngữ, tục ngữ, quán dụng ngữ: hãy dịch đúng nghĩa bóng kết hợp giải nghĩa sâu sắc (ví dụ: 七転び八起き -> Thất chuyển bát khởi: Bảy lần ngã, tám lần đứng dậy).
4. Giữ đúng sắc thái trang trọng/thân mật và ngữ pháp của câu gốc.`;

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

    return res.status(200).json({
      translatedText,
      engine: 'gemini',
      source: 'Gemini AI',
    });
  } catch (err: any) {
    console.error('Lỗi khi gọi Gemini AI, đang thử Google Translate dự phòng:', err);
    // Automatic fallback to Google Translate if Gemini fails
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(trimmedText)}`;
      const gRes = await fetch(gtxUrl);
      if (gRes.ok) {
        const data = await gRes.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translatedText = data[0].map((c: any) => c?.[0] || '').join('').trim();
          if (translatedText) {
            return res.status(200).json({
              translatedText,
              engine: 'google',
              source: 'Google Translate (Dự phòng tự động)',
            });
          }
        }
      }
    } catch {}

    return res.status(500).json({
      error: err.message || 'Lỗi khi dịch thuật qua Gemini AI',
    });
  }
}

