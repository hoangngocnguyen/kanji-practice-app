import dns from 'node:dns';
import { GoogleGenAI } from '@google/genai';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore in runtimes that do not support setDefaultResultOrder
}

export interface TatoebaExampleSentence {
  id: number;
  jp: string;
  furigana?: string;
  vi: string;
  source: 'tatoeba' | 'tatoeba+gtx' | 'tatoeba+mymemory' | 'tatoeba+gemini' | 'tatoeba+en';
}

const EXAMPLE_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours in-memory cache per warm lambda
const exampleMemoryCache = new Map<
  string,
  { timestamp: number; sentences: TatoebaExampleSentence[] }
>();

async function translateViaGoogleGtx(text: string, sourceLang = 'ja'): Promise<string | null> {
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(gtxUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const joined = data[0]
        .map((chunk: any) => (chunk && chunk[0] ? chunk[0] : ''))
        .filter(Boolean)
        .join('')
        .trim();
      return joined || null;
    }
  } catch {
    return null;
  }
  return null;
}

async function translateViaMyMemory(text: string, sourceLang = 'ja'): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sourceLang)}|vi`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.responseData?.translatedText?.trim();
    if (
      translated &&
      !translated.toUpperCase().includes('MYMEMORY WARNING') &&
      translated.toLowerCase() !== text.toLowerCase()
    ) {
      return translated;
    }
  } catch {
    return null;
  }
  return null;
}

async function translateViaGemini(trimmedText: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
        timeout: 12000,
      },
    });
    const prompt = `Bạn là một dịch giả cao cấp chuyên ngữ Nhật - Việt. Hãy dịch chuẩn xác, tự nhiên văn bản sau đây sang tiếng Việt:\n"${trimmedText}"\n\nQUY TẮC: Trả về DUY NHẤT câu dịch tiếng Việt hoàn chỉnh, không thêm ngoặc kép hay ghi chú.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || null;
  } catch {
    return null;
  }
}

async function fetchTatoebaSentences(
  kanji: string,
  limit = 4
): Promise<TatoebaExampleSentence[]> {
  const cleanKanji = Array.from(kanji.trim())[0] || '';
  if (!cleanKanji) return [];

  const cacheKey = `${cleanKanji}:${limit}`;
  const cached = exampleMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < EXAMPLE_CACHE_TTL_MS) {
    return cached.sentences;
  }

  const collected: TatoebaExampleSentence[] = [];
  const seenTexts = new Set<string>();

  const parseTatoebaResults = (results: any[]) => {
    const rows: Array<{
      id: number;
      jp: string;
      furigana?: string;
      viText?: string;
      enText?: string;
    }> = [];

    for (const item of results) {
      const jp = typeof item?.text === 'string' ? item.text.trim() : '';
      if (!jp || !jp.includes(cleanKanji)) continue;
      if (jp.length < 4 || jp.length > 58) continue;
      if (seenTexts.has(jp)) continue;
      seenTexts.add(jp);

      let furigana: string | undefined;
      if (Array.isArray(item?.transcriptions)) {
        const hrkt = item.transcriptions.find(
          (t: any) => t?.script === 'Hrkt' && typeof t?.text === 'string'
        );
        if (hrkt?.text) furigana = hrkt.text.trim();
      }

      let viText: string | undefined;
      let enText: string | undefined;
      if (Array.isArray(item?.translations)) {
        const flat: any[] = [];
        for (const group of item.translations) {
          if (Array.isArray(group)) flat.push(...group);
          else if (group && typeof group === 'object') flat.push(group);
        }
        const directVi = flat.find((t) => t?.lang === 'vie' && t?.isDirect && t?.text);
        const anyVi = flat.find((t) => t?.lang === 'vie' && t?.text);
        const directEn = flat.find((t) => t?.lang === 'eng' && t?.text);
        viText = (directVi?.text || anyVi?.text || '').trim() || undefined;
        enText = (directEn?.text || '').trim() || undefined;
      }

      rows.push({
        id: Number(item?.id) || Math.floor(Math.random() * 1e9),
        jp,
        furigana,
        viText,
        enText,
      });
    }
    return rows;
  };

  // Step 1: Query Tatoeba direct Japanese -> Vietnamese sentences
  try {
    const urlVie = `https://tatoeba.org/en/api_v0/search?from=jpn&query=${encodeURIComponent(cleanKanji)}&to=vie&sort=relevance`;
    const res = await fetch(urlVie, {
      headers: { Accept: 'application/json', 'User-Agent': 'LuyenKanjiApp/1.0' },
      signal: AbortSignal.timeout(7000),
    });
    if (res.ok) {
      const data = await res.json();
      const parsed = parseTatoebaResults(Array.isArray(data?.results) ? data.results : []);
      for (const row of parsed) {
        if (row.viText) {
          collected.push({
            id: row.id,
            jp: row.jp,
            furigana: row.furigana,
            vi: row.viText,
            source: 'tatoeba',
          });
          if (collected.length >= limit) break;
        }
      }
    }
  } catch {
    // Continue to fallback search below
  }

  // Step 2: If fewer than desired, fetch Japanese -> English or general Japanese sentences and auto-translate
  if (collected.length < limit) {
    try {
      const urlEng = `https://tatoeba.org/en/api_v0/search?from=jpn&query=${encodeURIComponent(cleanKanji)}&to=eng&sort=relevance`;
      const res = await fetch(urlEng, {
        headers: { Accept: 'application/json', 'User-Agent': 'LuyenKanjiApp/1.0' },
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = parseTatoebaResults(Array.isArray(data?.results) ? data.results : []);
        const candidates = parsed
          .sort((a, b) => a.jp.length - b.jp.length)
          .slice(0, limit - collected.length);

        const translatedRows = await Promise.all(
          candidates.map(async (row): Promise<TatoebaExampleSentence | null> => {
            if (row.viText) {
              return {
                id: row.id,
                jp: row.jp,
                furigana: row.furigana,
                vi: row.viText,
                source: 'tatoeba',
              };
            }

            // Try translating Japanese first via GTX, then MyMemory, then English->Vi via GTX/MyMemory, then Gemini
            const gtxJa = await translateViaGoogleGtx(row.jp, 'ja');
            if (gtxJa) {
              return {
                id: row.id,
                jp: row.jp,
                furigana: row.furigana,
                vi: gtxJa,
                source: 'tatoeba+gtx',
              };
            }

            const mmJa = await translateViaMyMemory(row.jp, 'ja');
            if (mmJa) {
              return {
                id: row.id,
                jp: row.jp,
                furigana: row.furigana,
                vi: mmJa,
                source: 'tatoeba+mymemory',
              };
            }

            const gem = await translateViaGemini(row.jp);
            if (gem) {
              return {
                id: row.id,
                jp: row.jp,
                furigana: row.furigana,
                vi: gem,
                source: 'tatoeba+gemini',
              };
            }

            if (row.enText) {
              const mmEn = await translateViaMyMemory(row.enText, 'en');
              return {
                id: row.id,
                jp: row.jp,
                furigana: row.furigana,
                vi: mmEn || row.enText,
                source: mmEn ? 'tatoeba+mymemory' : 'tatoeba+en',
              };
            }

            return null;
          })
        );

        for (const row of translatedRows) {
          if (row && collected.length < limit) {
            collected.push(row);
          }
        }
      }
    } catch {
      // Return whatever collected so far
    }
  }

  exampleMemoryCache.set(cacheKey, {
    timestamp: Date.now(),
    sentences: collected,
  });

  return collected;
}

/**
 * Serverless / Express translate handler
 * Supports:
 * 1. mode=examples / action='examples' -> Tatoeba Japanese example sentences + Vietnamese translation
 * 2. engine: 'google' (default) -> Google Translate via fast GTX endpoint
 * 3. engine: 'gemini' -> Gemini AI via @google/genai SDK
 */
export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel Serverless & local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Example sentences lookup on GET ?mode=examples&kanji=日&limit=3
  if (req.method === 'GET') {
    const mode = typeof req.query?.mode === 'string' ? req.query.mode : '';
    const kanji = typeof req.query?.kanji === 'string' ? req.query.kanji : '';
    if (mode === 'examples') {
      if (!kanji.trim()) {
        return res.status(400).json({ error: 'Thiếu ký tự kanji cần tìm ví dụ' });
      }
      const limitNum = Math.min(8, Math.max(1, Number(req.query?.limit) || 4));
      const sentences = await fetchTatoebaSentences(kanji, limitNum);
      return res.status(200).json({
        kanji: Array.from(kanji.trim())[0],
        sentences,
        count: sentences.length,
      });
    }

    return res.status(200).json({
      status: 'online',
      service: 'Kanji Stroke Tool - Multi-Engine Translation & Examples API',
      engines: ['google (default - fast & accurate)', 'gemini (AI contextual)'],
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      usage: 'POST { "text": "...", "engine": "google"|"gemini" } hoặc GET ?mode=examples&kanji=日',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST hoặc GET' });
  }

  // Example sentences lookup on POST { action: 'examples', kanji, limit }
  if (req.body?.action === 'examples') {
    const kanji = typeof req.body?.kanji === 'string' ? req.body.kanji : '';
    if (!kanji.trim()) {
      return res.status(400).json({ error: 'Thiếu ký tự kanji cần tìm ví dụ' });
    }
    const limitNum = Math.min(8, Math.max(1, Number(req.body?.limit) || 4));
    const sentences = await fetchTatoebaSentences(kanji, limitNum);
    return res.status(200).json({
      kanji: Array.from(kanji.trim())[0],
      sentences,
      count: sentences.length,
    });
  }

  const { text, engine = 'google' } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Vui lòng cung cấp văn bản tiếng Nhật cần dịch' });
  }

  const trimmedText = text.trim();

  // 1. ENGINE 1: GOOGLE TRANSLATE (Default, instant ~150ms, accurate, no key required)
  if (engine === 'google') {
    const gtxTranslated = await translateViaGoogleGtx(trimmedText, 'ja');
    if (gtxTranslated) {
      return res.status(200).json({
        translatedText: gtxTranslated,
        engine: 'google',
        source: 'Google Translate',
      });
    }
  }

  // 2. ENGINE 2: GEMINI AI (Contextual translation)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const gtxFallback = await translateViaGoogleGtx(trimmedText, 'ja');
    if (gtxFallback) {
      return res.status(200).json({
        translatedText: gtxFallback,
        engine: 'google',
        source: 'Google Translate (Tự động chuyển từ Gemini do chưa có API Key)',
      });
    }

    const mmFallback = await translateViaMyMemory(trimmedText, 'ja');
    if (mmFallback) {
      return res.status(200).json({
        translatedText: mmFallback,
        engine: 'mymemory',
        source: 'MyMemory Translate',
      });
    }

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
    const gtxFallback = await translateViaGoogleGtx(trimmedText, 'ja');
    if (gtxFallback) {
      return res.status(200).json({
        translatedText: gtxFallback,
        engine: 'google',
        source: 'Google Translate (Dự phòng tự động)',
      });
    }

    return res.status(500).json({
      error: err.message || 'Lỗi khi dịch thuật qua Gemini AI',
    });
  }
}

