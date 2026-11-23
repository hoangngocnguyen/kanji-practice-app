import {
  KanjiCatalogEntry,
  KanjiLevelTab,
  loadKanjiJoyoCatalog,
  loadKanjiSentencesStatic,
  getStaticSentencesForKanji,
} from './kanjiLevelService';
import { FolderKanjiItem } from '../types/deck';
import { ArenaQuestionDraft, ArenaQuestionMode } from '../types/arena';

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatReadingsPair(entry: KanjiCatalogEntry): string {
  const on = entry.on.slice(0, 2).join('・');
  const kun = entry.kun.slice(0, 2).join('・');
  if (on && kun) return `On: ${on} · Kun: ${kun}`;
  if (on) return `On: ${on}`;
  if (kun) return `Kun: ${kun}`;
  return entry.hv;
}

function maskSentenceWithBlank(sentence: string, targetChar: string): string {
  return sentence.split(targetChar).join('【 ＿ 】');
}

function folderItemToCatalogEntry(item: FolderKanjiItem): KanjiCatalogEntry {
  return {
    c: item.kanji,
    lv: 'N4',
    st: item.strokeCount || 1,
    fr: 100,
    on: item.onReadings || [],
    kun: item.kunReadings || [],
    hv: item.hanViet || '',
    vi: item.meanings || [],
  };
}

export interface GenerateArenaQuestionsParams {
  sourceType: 'jlpt' | 'folder';
  level?: KanjiLevelTab;
  folderItems?: FolderKanjiItem[];
  count: number;
  mode: ArenaQuestionMode | 'mixed';
}

export async function generateArenaQuestions(
  params: GenerateArenaQuestionsParams
): Promise<ArenaQuestionDraft[]> {
  const [catalog, sentencesReady] = await Promise.all([
    loadKanjiJoyoCatalog(),
    loadKanjiSentencesStatic(),
  ]);
  void sentencesReady;

  let sourcePool: KanjiCatalogEntry[] = [];
  if (params.sourceType === 'folder' && params.folderItems && params.folderItems.length > 0) {
    sourcePool = params.folderItems.map(folderItemToCatalogEntry);
  } else {
    const lvl = params.level || 'N5';
    sourcePool = lvl === 'JOYO' ? catalog : catalog.filter((e) => e.lv === lvl);
  }

  // Filter valid entries that have at least Han-Viet or Vietnamese meaning
  const cleanPool = sourcePool.filter(
    (entry) => entry.c && (entry.vi.length > 0 || Boolean(entry.hv))
  );
  if (cleanPool.length === 0) {
    throw new Error('Không đủ chữ Kanji trong nguồn đã chọn để tạo đề.');
  }

  // Distractor pool uses full catalog if sourcePool is smaller than 8 items
  const distractorBase =
    cleanPool.length >= 8
      ? cleanPool
      : [
          ...cleanPool,
          ...catalog.filter((c) => !cleanPool.some((p) => p.c === c.c)).slice(0, 60),
        ];

  const desiredCount = Math.min(Math.max(1, params.count), 50);
  const targets: KanjiCatalogEntry[] = [];
  while (targets.length < desiredCount) {
    const batch = shuffleArray(cleanPool);
    for (const item of batch) {
      if (targets.length >= desiredCount) break;
      targets.push(item);
    }
  }

  const concreteModes: Array<Exclude<ArenaQuestionMode, 'custom'>> = [
    'kanji-to-meaning',
    'meaning-to-kanji',
    'reading',
    'sentence-cloze',
  ];

  return targets.map((target, idx) => {
    let qMode: Exclude<ArenaQuestionMode, 'custom'> =
      params.mode === 'mixed' || params.mode === 'custom'
        ? concreteModes[idx % concreteModes.length]
        : params.mode;

    const sentences = qMode === 'sentence-cloze' ? getStaticSentencesForKanji(target.c, 2) : [];
    const usableSentence = sentences.find((s) => s.jp.includes(target.c));
    if (qMode === 'sentence-cloze' && !usableSentence) {
      qMode = idx % 2 === 0 ? 'kanji-to-meaning' : 'meaning-to-kanji';
    }

    const distractors: KanjiCatalogEntry[] = [];
    const seenChars = new Set<string>([target.c]);
    const seenLabels = new Set<string>();

    const primaryLabelOf = (entry: KanjiCatalogEntry): string => {
      if (qMode === 'kanji-to-meaning') {
        return entry.vi[0] || entry.hv || entry.c;
      }
      if (qMode === 'reading') {
        return formatReadingsPair(entry) || entry.hv;
      }
      return entry.c;
    };

    seenLabels.add(primaryLabelOf(target).toLowerCase());

    for (const cand of shuffleArray(distractorBase)) {
      if (distractors.length >= 3) break;
      if (seenChars.has(cand.c)) continue;
      const lbl = primaryLabelOf(cand).toLowerCase();
      if (!lbl || seenLabels.has(lbl)) continue;
      seenChars.add(cand.c);
      seenLabels.add(lbl);
      distractors.push(cand);
    }

    const buildOption = (entry: KanjiCatalogEntry, optIdx: number, isCorrect: boolean) => {
      const optId = `${idx}-${entry.c}-${optIdx}-${isCorrect ? 'c' : 'w'}`;
      if (qMode === 'kanji-to-meaning') {
        return {
          id: optId,
          label: entry.vi.slice(0, 2).join(', ') || entry.hv,
          subLabel: entry.hv ? `Hán-Việt: ${entry.hv}` : undefined,
        };
      }
      if (qMode === 'reading') {
        return {
          id: optId,
          label: formatReadingsPair(entry) || entry.hv,
          subLabel: entry.hv ? `Hán-Việt: ${entry.hv}` : undefined,
        };
      }
      return {
        id: optId,
        label: entry.c,
        subLabel: entry.hv || undefined,
      };
    };

    const correctOpt = buildOption(target, 0, true);
    const wrongOpts = distractors.map((d, dIdx) => buildOption(d, dIdx + 1, false));
    const options = shuffleArray([correctOpt, ...wrongOpts]);

    let promptPrimary = target.c;
    let promptSub: string | undefined;
    let sentenceJp: string | undefined;
    let sentenceKana: string | undefined;
    let sentenceVi: string | undefined;

    if (qMode === 'kanji-to-meaning') {
      promptPrimary = target.c;
      promptSub = `Chọn nghĩa đúng · ${target.st} nét`;
    } else if (qMode === 'meaning-to-kanji') {
      promptPrimary = target.vi.slice(0, 2).join(', ') || target.hv;
      promptSub = target.hv ? `Hán-Việt: ${target.hv}` : 'Chọn chữ Kanji tương ứng';
    } else if (qMode === 'reading') {
      promptPrimary = target.c;
      promptSub = 'Chọn âm đọc On / Kun đúng';
    } else if (qMode === 'sentence-cloze' && usableSentence) {
      promptPrimary = maskSentenceWithBlank(usableSentence.jp, target.c);
      promptSub = usableSentence.vi;
      sentenceJp = usableSentence.jp;
      sentenceKana = usableSentence.kana;
      sentenceVi = usableSentence.vi;
    }

    const meaningSummary = target.vi.slice(0, 2).join(', ');
    const explanation = [
      `${target.c} (${target.hv})`,
      meaningSummary,
      formatReadingsPair(target),
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      id: `aq-${Date.now()}-${idx}-${target.c}`,
      kanji: target.c,
      mode: qMode,
      promptPrimary,
      promptSub,
      sentenceJp,
      sentenceKana,
      sentenceVi,
      options,
      correctOptionId: correctOpt.id,
      explanation,
    };
  });
}
