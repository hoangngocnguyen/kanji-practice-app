import { extractUniqueKanji } from './kanji';

export interface ParsedExampleSentenceInput {
  jp: string;
  kana: string;
  vi: string;
}

export interface ParsedCompoundWordInput {
  word: string;
  reading: string;
  hanViet: string;
  meaning: string;
  examples?: ParsedExampleSentenceInput[];
}

export interface ParsedLessonItemInput {
  kanji: string;
  hanViet?: string;
  meanings?: string[];
  examples?: ParsedExampleSentenceInput[];
  compoundWords: ParsedCompoundWordInput[];
}

export interface ParseBatchResult {
  items: ParsedLessonItemInput[];
  errors: string[];
}

export const SAMPLE_MINIMAL_JSON = {
  items: [
    {
      kanji: '日',
      compoundWords: [
        {
          word: '日本',
          reading: 'にほん',
          hanViet: 'NHẬT BẢN',
          meaning: 'Nước Nhật Bản',
          examples: [
            {
              jp: '来年、日本へ留学に行きます。',
              kana: 'らいねん、にほんへりゅうがくにいきます。',
              vi: 'Năm sau tôi sẽ đi du học ở Nhật Bản.',
            },
            {
              jp: '日本の料理はとても美味しいです。',
              kana: 'にほんのりょうりはとてもおいしいです。',
              vi: 'Món ăn Nhật Bản rất ngon.',
            },
          ],
        },
        {
          word: '今日',
          reading: 'きょう',
          hanViet: 'KIM NHẬT',
          meaning: 'Hôm nay',
          examples: [
            {
              jp: '今日はとてもいい天気ですね。',
              kana: 'きょうはとてもいいてんきですね。',
              vi: 'Hôm nay thời tiết thật đẹp nhỉ.',
            },
            {
              jp: '今日の午後、友達と会います。',
              kana: 'きょうのごご、ともだちとあいます。',
              vi: 'Chiều nay tôi sẽ gặp bạn.',
            },
          ],
        },
      ],
    },
    {
      kanji: '学',
      compoundWords: [
        {
          word: '学生',
          reading: 'がくせい',
          hanViet: 'HỌC SINH',
          meaning: 'Học sinh, sinh viên',
          examples: [
            {
              jp: '私は大学の学生です。',
              kana: 'わたしはだいがくのがくせいです。',
              vi: 'Tôi là sinh viên đại học.',
            },
            {
              jp: 'この町には外国人の学生が多いです。',
              kana: 'このまちにはがいこくじんのがくせいがおおいです。',
              vi: 'Thị trấn này có nhiều sinh viên nước ngoài.',
            },
          ],
        },
        {
          word: '大学',
          reading: 'だいがく',
          hanViet: 'ĐẠI HỌC',
          meaning: 'Trường đại học',
          examples: [
            {
              jp: '毎日バスで大学へ通っています。',
              kana: 'まいにちばすでだいがくへかよっています。',
              vi: 'Mỗi ngày tôi đều đi học đại học bằng xe buýt.',
            },
            {
              jp: '兄は東京の大学で経済を勉強しています。',
              kana: 'あにはとうきょうのだいがくでけいざいをべんきょうしています。',
              vi: 'Anh trai tôi đang học kinh tế tại một trường đại học ở Tokyo.',
            },
          ],
        },
      ],
    },
  ],
};

export const AI_JSON_PROMPT_TEMPLATE = `Hãy chuẩn hóa và tạo dữ liệu từ vựng JSON từ nội dung sau:
[DÁN DANH SÁCH KANJI, TỪ GHÉP CÓ SẴN HOẶC CHỦ ĐỀ VÀO ĐÂY]

Chỉ trả về JSON thuần (không giải thích thêm) theo đúng cấu trúc sau:
{
  "items": [
    {
      "kanji": "日",
      "examples": [
        {
          "jp": "毎日、日本語を勉強しています。",
          "kana": "まいにち、にほんごをべんきょうしています。",
          "vi": "Mỗi ngày tôi đều học tiếng Nhật."
        },
        {
          "jp": "今日はいい天気です。",
          "kana": "きょうはいいてんきです。",
          "vi": "Hôm nay thời tiết đẹp."
        }
      ],
      "compoundWords": [
        {
          "word": "日本",
          "reading": "にほん",
          "hanViet": "NHẬT BẢN",
          "meaning": "Nước Nhật Bản",
          "examples": [
            {
              "jp": "来年、日本へ留学に行きます。",
              "kana": "らいねん、にほんへりゅうがくにいきます。",
              "vi": "Năm sau tôi sẽ đi du học ở Nhật Bản."
            },
            {
              "jp": "日本の料理はとても美味しいです。",
              "kana": "にほんのりょうりはとてもおいしいです。",
              "vi": "Món ăn Nhật Bản rất ngon."
            }
          ]
        }
      ]
    }
  ]
}

Lưu ý quan trọng:
- KHÔNG cần ghi nghĩa, Hán-Việt hay âm On/Kun của chữ Kanji đơn lẻ (hệ thống sẽ tự tra cứu).
- Xử lý từ ghép theo dữ liệu đầu vào:
  + Nếu đầu vào ĐÃ CÓ sẵn từ ghép cho chữ Kanji nào: giữ nguyên và đưa TOÀN BỘ các từ ghép đó vào mảng "compoundWords" (không cắt bớt giới hạn 2–4 từ, không tự thêm từ ghép thừa ngoài danh sách đã cung cấp).
  + Nếu đầu vào chỉ là chữ Kanji ĐƠN LẺ (chưa có từ ghép đi kèm) hoặc là chủ đề: tự bổ sung 2–4 từ ghép thông dụng làm ví dụ cho chữ Kanji đó.
- Mỗi từ ghép đều phải có đủ: word, reading (hiragana), hanViet (IN HOA), meaning (tiếng Việt) và mảng "examples" gồm ĐÚNG 2 câu ví dụ ngắn gọn, tự nhiên để áp dụng ngay.
- Mỗi câu trong "examples" gồm đủ 3 trường: "jp" (câu tiếng Nhật chứa từ đang học), "kana" (cách đọc toàn câu bằng hiragana) và "vi" (nghĩa tiếng Việt).
- Cấp chữ Kanji cũng có thể kèm mảng "examples" gồm 2 câu ví dụ ngắn (nếu phù hợp để ôn thẻ Kanji).`;

export const SAMPLE_QUICK_TEXT = `日 | 日本:にほん:NHẬT BẢN:Nước Nhật Bản ; 今日:きょう:KIM NHẬT:Hôm nay
学 | 学生:がくせい:HỌC SINH:Học sinh ; 大学:だいがく:ĐẠI HỌC:Trường đại học`;

function normalizeParsedExamples(raw: unknown): ParsedExampleSentenceInput[] {
  if (!Array.isArray(raw)) return [];
  const results: ParsedExampleSentenceInput[] = [];
  const seenJp = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const jp = typeof obj.jp === 'string' ? obj.jp.trim() : '';
    const kana = typeof obj.kana === 'string' ? obj.kana.trim() : '';
    const vi = typeof obj.vi === 'string' ? obj.vi.trim() : '';
    if (!jp || !vi || seenJp.has(jp)) continue;
    seenJp.add(jp);
    results.push({ jp, kana, vi });
  }
  return results;
}

function mergeExampleLists(
  a: ParsedExampleSentenceInput[] | undefined,
  b: ParsedExampleSentenceInput[] | undefined
): ParsedExampleSentenceInput[] | undefined {
  const combined = [...(a || []), ...(b || [])];
  if (combined.length === 0) return undefined;
  const seen = new Set<string>();
  const deduped: ParsedExampleSentenceInput[] = [];
  for (const ex of combined) {
    const jp = ex.jp.trim();
    if (!jp || seen.has(jp)) continue;
    seen.add(jp);
    deduped.push(ex);
  }
  return deduped.length > 0 ? deduped : undefined;
}

function mergeParsedItems(list: ParsedLessonItemInput[]): ParsedLessonItemInput[] {
  const map = new Map<string, ParsedLessonItemInput>();

  for (const item of list) {
    const existing = map.get(item.kanji);
    if (!existing) {
      map.set(item.kanji, {
        ...item,
        examples: item.examples ? [...item.examples] : undefined,
        compoundWords: [...item.compoundWords],
      });
    } else {
      const cwIndexByWord = new Map<string, number>();
      existing.compoundWords.forEach((cw, idx) => cwIndexByWord.set(cw.word, idx));

      for (const cw of item.compoundWords) {
        const idx = cwIndexByWord.get(cw.word);
        if (idx === undefined) {
          cwIndexByWord.set(cw.word, existing.compoundWords.length);
          existing.compoundWords.push(cw);
        } else {
          const prevCw = existing.compoundWords[idx];
          existing.compoundWords[idx] = {
            ...prevCw,
            examples: mergeExampleLists(prevCw.examples, cw.examples),
          };
        }
      }
      existing.examples = mergeExampleLists(existing.examples, item.examples);
      if (!existing.hanViet && item.hanViet) existing.hanViet = item.hanViet;
      if ((!existing.meanings || existing.meanings.length === 0) && item.meanings?.length) {
        existing.meanings = item.meanings;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Phân tích cú pháp Text nhanh:
 * Kanji | TừGhép1:CáchĐọc:HánViệt:Nghĩa ; TừGhép2:CáchĐọc:HánViệt:Nghĩa
 * Hỗ trợ cả dạng rút gọn: TừGhép:Nghĩa hoặc TừGhép:CáchĐọc:Nghĩa
 */
export function parseQuickTextLesson(rawText: string): ParseBatchResult {
  const lines = rawText.split(/\r?\n/);
  const parsed: ParsedLessonItemInput[] = [];
  const errors: string[] = [];

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const lineNum = index + 1;
    const pipeIndex = line.indexOf('|');

    if (pipeIndex === -1) {
      // Dòng không có '|', trích xuất toàn bộ chữ Kanji trên dòng
      const extracted = extractUniqueKanji(line);
      if (extracted.length === 0) {
        errors.push(`Dòng ${lineNum}: Không tìm thấy chữ Kanji hợp lệ.`);
        return;
      }
      extracted.forEach((k) => {
        parsed.push({ kanji: k.kanji, compoundWords: [] });
      });
      return;
    }

    const leftPart = line.slice(0, pipeIndex).trim();
    const rightPart = line.slice(pipeIndex + 1).trim();

    const extractedKanji = extractUniqueKanji(leftPart);
    if (extractedKanji.length === 0) {
      errors.push(`Dòng ${lineNum}: Phần bên trái dấu "|" phải chứa chữ Kanji.`);
      return;
    }

    const targetKanji = extractedKanji[0].kanji;
    const compoundWords: ParsedCompoundWordInput[] = [];

    if (rightPart) {
      const segments = rightPart
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const seg of segments) {
        const parts = seg.split(':').map((p) => p.trim());
        const word = parts[0] || '';
        if (!word) continue;

        if (parts.length === 1) {
          errors.push(`Dòng ${lineNum}: Từ ghép "${word}" thiếu nghĩa (cần dấu ":").`);
          continue;
        } else if (parts.length === 2) {
          compoundWords.push({
            word,
            reading: '',
            hanViet: '',
            meaning: parts[1],
          });
        } else if (parts.length === 3) {
          compoundWords.push({
            word,
            reading: parts[1],
            hanViet: '',
            meaning: parts[2],
          });
        } else {
          compoundWords.push({
            word,
            reading: parts[1],
            hanViet: parts[2].toUpperCase(),
            meaning: parts.slice(3).join(':').trim(),
          });
        }
      }
    }

    parsed.push({
      kanji: targetKanji,
      compoundWords,
    });
  });

  return {
    items: mergeParsedItems(parsed),
    errors,
  };
}

/**
 * Phân tích JSON tối gian (hoặc JSON xuất đầy đủ của ứng dụng)
 * Tự động bóc tách markdown code fence ```json ... ```
 */
export function parseMinimalJsonLesson(rawJson: string): ParseBatchResult {
  const trimmed = rawJson.trim();
  if (!trimmed) return { items: [], errors: [] };

  let cleaned = trimmed;
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return {
      items: [],
      errors: ['Nội dung JSON không hợp lệ. Vui lòng kiểm tra lại dấu ngoặc và dấu phẩy.'],
    };
  }

  let rawItems: unknown[] = [];
  if (Array.isArray(data)) {
    rawItems = data;
  } else if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
    rawItems = (data as any).items;
  } else if (data && typeof data === 'object' && typeof (data as any).kanji === 'string') {
    rawItems = [data];
  } else {
    return {
      items: [],
      errors: ['JSON phải là đối tượng có "items": [...], một mảng [...], hoặc { "kanji": "...", "compoundWords": [...] }.'],
    };
  }

  const parsed: ParsedLessonItemInput[] = [];
  const errors: string[] = [];

  rawItems.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Mục #${idx + 1}: Không phải đối tượng JSON hợp lệ.`);
      return;
    }

    const obj = entry as Record<string, unknown>;
    const rawKanji = typeof obj.kanji === 'string' ? obj.kanji.trim() : '';
    const extracted = extractUniqueKanji(rawKanji);
    if (extracted.length === 0) {
      errors.push(`Mục #${idx + 1}: Thiếu trường "kanji" hợp lệ.`);
      return;
    }

    const compoundWords: ParsedCompoundWordInput[] = [];
    if (Array.isArray(obj.compoundWords)) {
      obj.compoundWords.forEach((cw) => {
        if (!cw || typeof cw !== 'object') return;
        const cwObj = cw as Record<string, unknown>;
        const word = typeof cwObj.word === 'string' ? cwObj.word.trim() : '';
        const meaning = typeof cwObj.meaning === 'string' ? cwObj.meaning.trim() : '';
        if (!word || !meaning) return;

        const examples = normalizeParsedExamples(cwObj.examples);

        compoundWords.push({
          word,
          reading: typeof cwObj.reading === 'string' ? cwObj.reading.trim() : '',
          hanViet:
            typeof cwObj.hanViet === 'string'
              ? cwObj.hanViet.trim().toUpperCase()
              : '',
          meaning,
          ...(examples.length > 0 ? { examples } : {}),
        });
      });
    }

    const kanjiExamples = normalizeParsedExamples(obj.examples);

    parsed.push({
      kanji: extracted[0].kanji,
      hanViet:
        typeof obj.hanViet === 'string' && obj.hanViet.trim()
          ? obj.hanViet.trim().toUpperCase()
          : undefined,
      meanings: Array.isArray(obj.meanings)
        ? obj.meanings.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
        : undefined,
      ...(kanjiExamples.length > 0 ? { examples: kanjiExamples } : {}),
      compoundWords,
    });
  });

  return {
    items: mergeParsedItems(parsed),
    errors,
  };
}

export interface ParseCompoundWordsResult {
  words: ParsedCompoundWordInput[];
  errors: string[];
}

export const SAMPLE_COMPOUND_WORDS_TEXT = `日本:にほん:NHẬT BẢN:Nước Nhật Bản
今日:きょう:KIM NHẬT:Hôm nay ; 毎日:まいにち:MỖI NHẬT:Mỗi ngày`;

export const SAMPLE_COMPOUND_WORDS_JSON = {
  compoundWords: [
    {
      word: '日本',
      reading: 'にほん',
      hanViet: 'NHẬT BẢN',
      meaning: 'Nước Nhật Bản',
      examples: [
        {
          jp: '来年、日本へ留学に行きます。',
          kana: 'らいねん、にほんへりゅうがくにいきます。',
          vi: 'Năm sau tôi sẽ đi du học ở Nhật Bản.',
        },
        {
          jp: '日本の料理はとても美味しいです。',
          kana: 'にほんのりょうりはとてもおいしいです。',
          vi: 'Món ăn Nhật Bản rất ngon.',
        },
      ],
    },
    {
      word: '今日',
      reading: 'きょう',
      hanViet: 'KIM NHẬT',
      meaning: 'Hôm nay',
      examples: [
        {
          jp: '今日はとてもいい天気ですね。',
          kana: 'きょうはとてもいいてんきですね。',
          vi: 'Hôm nay thời tiết thật đẹp nhỉ.',
        },
        {
          jp: '今日の午後、友達と会います。',
          kana: 'きょうのごご、ともだちとあいます。',
          vi: 'Chiều nay tôi sẽ gặp bạn.',
        },
      ],
    },
  ],
};

export function buildCompoundWordsAiPrompt(kanji: string): string {
  return `Hãy chuẩn hóa hoặc tạo danh sách từ ghép chứa chữ Kanji "${kanji}" (nếu tôi có cung cấp sẵn danh sách từ thì giữ đủ toàn bộ, không cắt bớt; nếu chưa có thì gợi ý 4–6 từ thông dụng).

Chỉ trả về JSON thuần (không giải thích thêm) theo đúng cấu trúc sau:
{
  "compoundWords": [
    {
      "word": "từ ghép tiếng Nhật",
      "reading": "cách đọc hiragana",
      "hanViet": "ÂM HÁN VIỆT IN HOA",
      "meaning": "nghĩa tiếng Việt",
      "examples": [
        {
          "jp": "Câu ví dụ tiếng Nhật ngắn 1",
          "kana": "cách đọc toàn câu bằng hiragana",
          "vi": "nghĩa tiếng Việt câu 1"
        },
        {
          "jp": "Câu ví dụ tiếng Nhật ngắn 2",
          "kana": "cách đọc toàn câu bằng hiragana",
          "vi": "nghĩa tiếng Việt câu 2"
        }
      ]
    }
  ]
}

Lưu ý: Mỗi từ ghép kèm ĐÚNG 2 câu ví dụ thực tế để áp dụng ngay khi ôn tập.`;
}

/**
 * Phân tích cú pháp Text nhanh cho danh sách từ ghép của 1 chữ Kanji:
 * Mỗi dòng hoặc phân cách bằng ";" có dạng:
 * TừGhép:CáchĐọc:HánViệt:Nghĩa (hoặc rút gọn TừGhép:Nghĩa, TừGhép:CáchĐọc:Nghĩa)
 */
export function parseCompoundWordsText(rawText: string): ParseCompoundWordsResult {
  const lines = rawText.split(/\r?\n/);
  const words: ParsedCompoundWordInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  lines.forEach((rawLine, index) => {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const lineNum = index + 1;
    const pipeIndex = line.indexOf('|');
    if (pipeIndex !== -1) {
      line = line.slice(pipeIndex + 1).trim();
    }
    if (!line) return;

    const segments = line
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const seg of segments) {
      const parts = seg.split(':').map((p) => p.trim());
      const word = parts[0] || '';
      if (!word) continue;

      if (parts.length === 1) {
        errors.push(`Dòng ${lineNum}: Từ ghép "${word}" thiếu nghĩa (cần dấu ":").`);
        continue;
      }

      if (seen.has(word)) continue;
      seen.add(word);

      if (parts.length === 2) {
        words.push({
          word,
          reading: '',
          hanViet: '',
          meaning: parts[1],
        });
      } else if (parts.length === 3) {
        words.push({
          word,
          reading: parts[1],
          hanViet: '',
          meaning: parts[2],
        });
      } else {
        words.push({
          word,
          reading: parts[1],
          hanViet: parts[2].toUpperCase(),
          meaning: parts.slice(3).join(':').trim(),
        });
      }
    }
  });

  return { words, errors };
}

/**
 * Phân tích JSON cho danh sách từ ghép của 1 chữ Kanji.
 * Hỗ trợ: { "compoundWords": [...] }, mảng [...], hoặc { "items": [{ "compoundWords": [...] }] }
 */
export function parseCompoundWordsJson(rawJson: string): ParseCompoundWordsResult {
  const trimmed = rawJson.trim();
  if (!trimmed) return { words: [], errors: [] };

  let cleaned = trimmed;
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return {
      words: [],
      errors: ['Nội dung JSON không hợp lệ. Vui lòng kiểm tra lại dấu ngoặc và dấu phẩy.'],
    };
  }

  let rawList: unknown[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === 'object' && Array.isArray((data as any).compoundWords)) {
    rawList = (data as any).compoundWords;
  } else if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
    rawList = (data as any).items.flatMap((it: any) =>
      Array.isArray(it?.compoundWords) ? it.compoundWords : []
    );
  } else {
    return {
      words: [],
      errors: ['JSON phải là mảng [...] hoặc đối tượng có trường "compoundWords": [...].'],
    };
  }

  const words: ParsedCompoundWordInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  rawList.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Mục #${idx + 1}: Không phải đối tượng JSON hợp lệ.`);
      return;
    }
    const obj = entry as Record<string, unknown>;
    const word = typeof obj.word === 'string' ? obj.word.trim() : '';
    const meaning = typeof obj.meaning === 'string' ? obj.meaning.trim() : '';
    if (!word || !meaning) {
      errors.push(`Mục #${idx + 1}: Thiếu trường "word" hoặc "meaning".`);
      return;
    }
    if (seen.has(word)) return;
    seen.add(word);

    const examples = normalizeParsedExamples(obj.examples);

    words.push({
      word,
      reading: typeof obj.reading === 'string' ? obj.reading.trim() : '',
      hanViet:
        typeof obj.hanViet === 'string' ? obj.hanViet.trim().toUpperCase() : '',
      meaning,
      ...(examples.length > 0 ? { examples } : {}),
    });
  });

  return { words, errors };
}
