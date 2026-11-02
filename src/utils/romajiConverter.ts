// Romaji to Hiragana and Katakana converter
// Supports Hepburn, Kunrei, double consonants (sokuon), n' combos, and punctuation.

export type KanaMode = 'off' | 'hiragana' | 'katakana' | 'kanji';

const HIRAGANA_MAP: Record<string, string> = {
  // Vowels
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',

  // K
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',

  // S
  sa: 'さ', shi: 'し', si: 'し', su: 'す', se: 'せ', so: 'そ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
  sya: 'しゃ', syu: 'しゅ', syo: 'しょ',

  // T
  ta: 'た', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', te: 'て', to: 'と',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
  tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',

  // N
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',

  // H
  ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',

  // M
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',

  // Y
  ya: 'や', yu: 'ゆ', yo: 'よ',

  // R
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',

  // W
  wa: 'わ', wo: 'を',

  // G (dakuten)
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',

  // Z (dakuten)
  za: 'ざ', ji: 'じ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
  zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ',

  // D (dakuten)
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ',

  // B (dakuten)
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',

  // P (handakuten)
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',

  // Special combinations
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',

  // Small kana
  xtsu: 'っ', ltsu: 'っ',
  xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ',
  lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ',
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ',
  la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ',

  // Punctuation & Long vowel
  '-': 'ー',
  '.': '。',
  ',': '、',
  '?': '？',
  '!': '！',
};

// Convert Hiragana character to Katakana
export function hiraganaToKatakana(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Hiragana range 0x3041 to 0x3096 -> Katakana range 0x30A1 to 0x30F6 (+0x60)
    if (code >= 0x3041 && code <= 0x3096) {
      result += String.fromCharCode(code + 0x60);
    } else {
      result += text[i];
    }
  }
  return result;
}

// Convert Katakana character to Hiragana
export function katakanaToHiragana(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Katakana range 0x30A1 to 0x30F6 -> Hiragana range 0x3041 to 0x3096 (-0x60)
    if (code >= 0x30A1 && code <= 0x30F6) {
      result += String.fromCharCode(code - 0x60);
    } else {
      result += text[i];
    }
  }
  return result;
}

/**
 * Converts a romaji string to Kana (Hiragana or Katakana).
 * Handles sokuon (double consonants like 'tt', 'kk'), 'nn' -> 'ん', and punctuation.
 */
export function romajiToKana(
  text: string,
  mode: 'hiragana' | 'katakana' = 'hiragana',
  finalize: boolean = false
): string {
  if (!text) return '';

  let i = 0;
  let out = '';
  const lower = text.toLowerCase();

  while (i < lower.length) {
    const char = lower[i];

    // Check if punctuation or space
    if (HIRAGANA_MAP[char] && !/[a-z]/.test(char)) {
      out += HIRAGANA_MAP[char];
      i += 1;
      continue;
    }

    // Check 4-char prefix
    if (i + 4 <= lower.length) {
      const quad = lower.slice(i, i + 4);
      if (HIRAGANA_MAP[quad]) {
        out += HIRAGANA_MAP[quad];
        i += 4;
        continue;
      }
    }

    // Check 3-char prefix
    if (i + 3 <= lower.length) {
      const tri = lower.slice(i, i + 3);
      if (HIRAGANA_MAP[tri]) {
        out += HIRAGANA_MAP[tri];
        i += 3;
        continue;
      }
    }

    // Check 2-char prefix
    if (i + 2 <= lower.length) {
      const duo = lower.slice(i, i + 2);
      if (HIRAGANA_MAP[duo]) {
        out += HIRAGANA_MAP[duo];
        i += 2;
        continue;
      }

      // Check 'nn' -> 'ん'
      if (duo === 'nn' || duo === "n'") {
        out += 'ん';
        i += 2;
        continue;
      }

      // Check double consonant (sokuon: kk, tt, ss, pp, etc.)
      const c1 = duo[0];
      const c2 = duo[1];
      if (c1 === c2 && /[bcdfghjklmpqrstvwxyz]/.test(c1) && c1 !== 'n') {
        out += 'っ';
        i += 1;
        continue;
      }
    }

    // Check 1-char vowel
    if (HIRAGANA_MAP[char] && /[aeiou]/.test(char)) {
      out += HIRAGANA_MAP[char];
      i += 1;
      continue;
    }

    // If 'n' followed by a consonant (other than y or vowel) or non-letter, convert to 'ん'
    if (char === 'n') {
      const nextChar = i + 1 < lower.length ? lower[i + 1] : '';
      const isConsonant = nextChar !== '' && !/[aeiouy]/.test(nextChar) && /[bcdfghjklmpqrstvwxz]/.test(nextChar);
      const isNonLetter = nextChar !== '' && !/[a-z]/.test(nextChar);
      const isFinalAtEnd = finalize && !nextChar;

      if (isConsonant || isNonLetter || isFinalAtEnd) {
        out += 'ん';
        i += 1;
        continue;
      }
    }

    // Fallback: keep current character (e.g., kanji, numbers, symbols, spaces, or pending 'n')
    out += text[i];
    i += 1;
  }

  return mode === 'katakana' ? hiraganaToKatakana(out) : out;
}

/**
 * Checks if a string contains roman alphabet letters that can be converted to Kana.
 */
export function hasRomaji(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

const KANA_TO_ROMAJI_MAP: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',

  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ゔ: 'vu', 'ー': '-', '。': '. ', '、': ', ', '？': '? ', '！': '! '
};

/**
 * Converts a Kana string (Hiragana or Katakana) to Hepburn Romaji.
 */
export function kanaToRomaji(kanaText: string): string {
  if (!kanaText) return '';

  const hiragana = katakanaToHiragana(kanaText);
  let result = '';
  let i = 0;

  while (i < hiragana.length) {
    const ch = hiragana[i];

    // Check sokuon っ
    if (ch === 'っ' || ch === 'ッ') {
      const nextCh = i + 1 < hiragana.length ? hiragana[i + 1] : '';
      if (nextCh) {
        const duo = hiragana.slice(i + 1, i + 3);
        const nextRomaji = KANA_TO_ROMAJI_MAP[duo] || KANA_TO_ROMAJI_MAP[nextCh] || '';
        if (nextRomaji) {
          result += nextRomaji[0];
          i += 1;
          continue;
        }
      }
      result += 't';
      i += 1;
      continue;
    }

    // Check 2-char digraph
    if (i + 1 < hiragana.length) {
      const duo = hiragana.slice(i, i + 2);
      if (KANA_TO_ROMAJI_MAP[duo]) {
        result += KANA_TO_ROMAJI_MAP[duo];
        i += 2;
        continue;
      }
    }

    // Check 1-char monograph
    if (KANA_TO_ROMAJI_MAP[ch]) {
      result += KANA_TO_ROMAJI_MAP[ch];
      i += 1;
      continue;
    }

    // Fallback: keep char
    result += ch;
    i += 1;
  }

  return result;
}

import { KANJI_DICTIONARY } from '../data/kanjiDictionary';
import { getPrimaryHiragana } from './kanji';

const COMMON_KANJI_READINGS: Record<string, string> = {
  歯: 'は',
  薬: 'くすり',
  方: 'かた',
  入: 'い',
  気: 'き',
  食: 'た',
  飲: 'の',
  行: 'い',
  来: 'き',
  見: 'み',
  聞: 'き',
  読: 'よ',
  書: 'か',
  話: 'はな',
  買: 'か',
  出: 'で',
  会: 'あ',
  立: 'た',
  座: 'すわ',
  走: 'はし',
  歩: 'ある',
  休: 'やす',
  働: 'はたら',
  使: 'つか',
  作: 'つく',
  泳: 'およ',
  洗: 'あら',
  待: 'ま',
  持: 'も',
  知: 'し',
  思: 'おも',
  言: 'い',
  教: 'おし',
  習: 'なら',
  考: 'かんが',
  始: 'はじ',
  終: 'おわ',
  止: 'と',
  動: 'うご',
  開: 'あ',
  閉: 'し',
  着: 'き',
  脱: 'ぬ',
  乗: 'の',
  降: 'お',
  勝: 'か',
  負: 'ま',
  助: 'たす',
  歌: 'うた',
  笑: 'わら',
  泣: 'な',
  怒: 'おこ',
  払: 'はら',
  送: 'おく',
  渡: 'わた',
  困: 'こま',
  返: 'かえ',
  集: 'あつ',
  直: 'なお',
  治: 'なお',
  選: 'えら',
  変: 'か',
  通: 'かよ',
  連: 'つれ',
  忘: 'わす',
  落: 'おち',
  残: 'のこ',
  続: 'つづ',
  過: 'すご',
  進: 'すす',
  遅: 'おく',
  頼: 'たの',
  願: 'ねが',
  泊: 'とま',
  探: 'さが',
  起: 'お',
  寝: 'ね',
  帰: 'かえ',
  生: 'い',
  死: 'し',
  切: 'き',
  引: 'ひ',
  押: 'お',
  置: 'お',
  売: 'う',
  貸: 'か',
  借: 'か',
  代: 'か',
  受: 'う',
  取: 'と',
  調: 'しら',
  合: 'あ',
  向: 'む',
  飛: 'と',
  吹: 'ふ',
  咲: 'さ',
  晴: 'は',
  曇: 'くも',
  冷: 'つめ',
  暖: 'あたた',
  温: 'あたた',
  涼: 'すず',
  暑: 'あつ',
  熱: 'あつ',
  寒: 'さむ',
  重: 'おも',
  軽: 'かる',
  広: 'ひろ',
  狭: 'せま',
  高: 'たか',
  安: 'やす',
  低: 'ひく',
  近: 'ちか',
  遠: 'とお',
  速: 'はや',
  多: 'おお',
  少: 'すく',
  太: 'ふと',
  細: 'ほそ',
  長: 'なが',
  短: 'みじか',
  強: 'つよ',
  弱: 'よわ',
  新: 'あたら',
  古: 'ふる',
  好: 'す',
  嫌: 'きら',
  痛: 'いた',
  忙: 'いそが',
  楽: 'たの',
  辛: 'から',
  甘: 'あま',
  苦: 'にが',
  黒: 'くろ',
  白: 'しろ',
  赤: 'あか',
  青: 'あお',
  黄: 'き',
  緑: 'みどり',
  茶: 'ちゃ',
  銀: 'ぎん',
  金: 'きん',
  空: 'そら',
  海: 'うみ',
  山: 'やま',
  川: 'かわ',
  花: 'はな',
  草: 'くさ',
  木: 'き',
  森: 'もり',
  林: 'はやし',
  石: 'いし',
  雨: 'あめ',
  雪: 'ゆき',
  風: 'かぜ',
  雲: 'くも',
  天: 'てん',
  地: 'ち',
  月: 'つき',
  星: 'ほし',
  水: 'みず',
  光: 'ひかり',
  影: 'かげ',
  音: 'おと',
  声: 'こえ',
  心: 'こころ',
  手: 'て',
  足: 'あし',
  目: 'め',
  耳: 'みみ',
  口: 'くち',
  顔: 'かお',
  頭: 'あたま',
  髪: 'かみ',
  体: 'からだ',
  首: 'くび',
  肩: 'かた',
  胸: 'むね',
  腹: 'はら',
  腰: 'こし',
  背: 'せ',
  骨: 'ほね',
  血: 'ち',
  涙: 'なみだ',
  汗: 'あせ',
  息: 'いき',
  父: 'ちち',
  母: 'はは',
  兄: 'あに',
  姉: 'あね',
  弟: 'おとうと',
  妹: 'いもうと',
  夫: 'おっと',
  妻: 'つま',
  子: 'こ',
  孫: 'まご',
  親: 'おや',
  家: 'いえ',
  部屋: 'へや',
  庭: 'にわ',
  窓: 'まど',
  机: 'つくえ',
  椅子: 'いす',
  紙: 'かみ',
  筆: 'ふで',
  箱: 'はこ',
  服: 'ふく',
  靴: 'くつ',
  傘: 'かさ',
  鍵: 'かぎ',
  財布: 'さいふ',
  時計: 'とけい',
  鏡: 'かがみ',
  写真: 'しゃしん',
  絵: 'え',
  曲: 'きょく',
  店: 'みせ',
  駅: 'えき',
  道: 'みち',
  橋: 'はし',
  町: 'まち',
  村: 'むら',
  国: 'くに',
  島: 'しま',
  港: 'みなと',
  空港: 'くうこう',
  病院: 'びょういん',
  公園: 'こうえん',
  郵便局: 'ゆうびんきょく',
  警察: 'けいさつ',
  工場: 'こうじょう',
  市場: 'いちば',
  朝: 'あさ',
  昼: 'ひる',
  夜: 'よる',
  夕方: 'ゆうがた',
  昔: 'むかし',
  春: 'はる',
  夏: 'なつ',
  秋: 'あき',
  冬: 'ふゆ',
  週: 'しゅう',
  今: 'いま',
  嘘: 'うそ',
  形: 'かたち',
  神: 'かみ',
  仏: 'ほとけ',
  鬼: 'おに',
  王: 'おう',
  主: 'ぬし',
  友: 'とも',
  敵: 'てき',
  味方: 'みかた',
  自分: 'じぶん',
  他人: 'たにん',
  誰: 'だれ',
  何: 'なに',
};

const BASE_COMPOUNDS: Array<[string, string]> = [
  // User's specific example compounds & phrases
  ['日本語能力試験', 'Nihongo Nōryoku Shiken'],
  ['思い出す', 'omoidasu'],
  ['漢字の練習', 'kanji no renshū'],
  ['日本人は', 'Nihonjin wa'],
  ['漢字を', 'kanji o'],
  ['毎日勉強する', 'mainichi benkyō suru'],
  ['一期一会', 'Ichigoichie'],
  ['温故知新', 'onkochishin'],

  // Specific grammar & sentence patterns from user input
  ['気をつけなければなりません', 'ki o tsukenakereba narimasen'],
  ['気をつけなければ', 'ki o tsukenakereba'],
  ['気をつける', 'ki o tsukeru'],
  ['気をつけ', 'ki o tsuke'],
  ['気をつけ', 'ki o tsuke'],
  ['気を', 'ki o'],
  ['食べ方に', 'tabekata ni'],
  ['食べ方', 'tabekata'],
  ['飲み方', 'nomikata'],
  ['行き方', 'ikikata'],
  ['書き方', 'kakikata'],
  ['話し方', 'hanashikata'],
  ['使い方', 'tsukaikata'],
  ['読み方', 'yomikata'],
  ['作り方', 'tsukurikata'],
  ['歯をぬいたあとは', 'ha o nuita ato wa'],
  ['歯をぬいた', 'ha o nuita'],
  ['ぬいたあとは', 'nuita ato wa'],
  ['ぬいた', 'nuita'],
  ['あとは', 'ato wa'],
  ['薬をのんでから', 'kusuri o nonde kara'],
  ['薬をのんで', 'kusuri o nonde'],
  ['薬を', 'kusuri o'],
  ['のんでから', 'nonde kara'],
  ['のんで', 'nonde'],
  ['ごはんを食べてください', 'gohan o tabete kudasai'],
  ['ごはんを食べて', 'gohan o tabete'],
  ['ごはんを', 'gohan o'],
  ['食べてください', 'tabete kudasai'],
  ['食べて', 'tabete'],
  ['を食べるときは', 'o taberu toki wa'],
  ['食べるときは', 'taberu toki wa'],
  ['食べるとき', 'taberu toki'],
  ['入れないで', 'irenaide'],
  ['入れない', 'irenai'],
  ['入れる', 'ireru'],
  ['食べます', 'tabemasu'],
  ['飲みます', 'nomimasu'],
  ['行きます', 'ikimasu'],
  ['来ます', 'kimasu'],
  ['します', 'shimasu'],
  ['とうがらし', 'tōgarashi'],
  ['コショウを', 'koshō o'],
  ['コショウ', 'koshō'],
  ['ラーメンを', 'Rāmen o'],
  ['ラーメン', 'Rāmen'],
  ['まず', 'Mazu'],
  ['みなさん', 'Minasan'],

  // Presets & common idioms
  ['七転び八起き', 'Nanakorobi yaoki'],
  ['継続は力なり', 'Keizoku wa chikara nari'],
  ['初心忘るべからず', 'Shoshin wasurubekarazu'],
  ['日進月歩で', 'Nisshingeppo de'],
  ['学問を修める', 'gakumon o osameru'],
  ['臥薪嘗胆', 'Gashinshōtan'],
  ['弱肉強食', 'Jakunikukyōshoku'],
  ['泰然自若', 'Taizenjijaku'],
  ['臨機応変', 'Rinkiōhen'],
  ['風林火山', 'Fūrinkazan'],
  ['十人十色', 'Jūnin-toiro'],

  // Common Vocabulary & Compounds
  ['日本語', 'Nihongo'],
  ['日本人', 'Nihonjin'],
  ['日本', 'Nihon'],
  ['能力', 'Nōryoku'],
  ['試験', 'Shiken'],
  ['漢字', 'kanji'],
  ['練習', 'renshū'],
  ['毎日', 'mainichi'],
  ['勉強する', 'benkyō suru'],
  ['勉強', 'benkyō'],
  ['仕事', 'shigoto'],
  ['生活', 'seikatsu'],
  ['日常', 'nichijō'],
  ['東京', 'Tōkyō'],
  ['学校', 'gakkō'],
  ['大学', 'daigaku'],
  ['会社', 'kaisha'],
  ['時間', 'jikan'],
  ['言葉', 'kotoba'],
  ['意味', 'imi'],
  ['問題', 'mondai'],
  ['理由', 'riyū'],
  ['方法', 'hōhō'],
  ['世界', 'sekai'],
  ['理解', 'rikai'],
  ['語彙', 'goi'],
  ['大切', 'taisetsu'],
  ['書き順', 'kakijun'],
  ['曖昧', 'aimai'],
  ['返答', 'hentō'],
  ['躊躇', 'chūcho'],
  ['迅速', 'jinsoku'],
  ['緻密', 'chimitsu'],
  ['計画', 'keikaku'],
  ['推進', 'suishin'],
  ['必要', 'hitsuyō'],
  ['脆弱', 'zeijaku'],
  ['顕著', 'kencho'],
  ['齟齬', 'sogo'],
  ['洗練', 'senren'],
  ['友達', 'tomodachi'],
  ['先生', 'sensei'],
  ['学生', 'gakusei'],
];

const AUTO_COMPOUNDS: Array<[string, string]> = [];
let isCompoundsInitialized = false;

function initAutoCompounds() {
  if (isCompoundsInitialized) return;
  isCompoundsInitialized = true;

  const seenWords = new Set<string>();

  for (const [jp, romaji] of BASE_COMPOUNDS) {
    if (!seenWords.has(jp)) {
      seenWords.add(jp);
      AUTO_COMPOUNDS.push([jp, romaji]);
    }
  }

  // Extract all vocabulary examples from KANJI_DICTIONARY
  for (const key in KANJI_DICTIONARY) {
    const item = KANJI_DICTIONARY[key];
    if (item && item.examples) {
      for (const ex of item.examples) {
        if (ex.word && ex.reading && !seenWords.has(ex.word) && ex.word.length > 1) {
          seenWords.add(ex.word);
          const r = kanaToRomaji(ex.reading);
          AUTO_COMPOUNDS.push([ex.word, r]);
        }
      }
    }
  }

  // Sort compounds by decreasing length so longer phrases match first
  AUTO_COMPOUNDS.sort((a, b) => b[0].length - a[0].length);
}

/**
 * Converts a full Japanese sentence / paragraph into standard Hepburn Romaji
 * preserving punctuation, particle pronunciations (ha->wa, wo->o, he->e),
 * compound word spacing, and long vowels (macrons like ō, ū).
 */
export function japaneseToFullRomaji(text: string): string {
  if (!text || !text.trim()) return '';

  initAutoCompounds();

  let working = text;

  // 1. Replace multi-character compounds and phrases from dictionary
  for (const [jp, romaji] of AUTO_COMPOUNDS) {
    if (working.includes(jp)) {
      working = working.replaceAll(jp, ` ${romaji} `);
    }
  }

  // 2. Replace individual remaining Kanji characters with primary dictionary reading or COMMON_KANJI_READINGS
  let kanjiResolved = '';
  for (let i = 0; i < working.length; i++) {
    const ch = working[i];
    if (/\p{Script=Han}/u.test(ch)) {
      if (COMMON_KANJI_READINGS[ch]) {
        const r = kanaToRomaji(COMMON_KANJI_READINGS[ch]);
        kanjiResolved += ` ${r} `;
      } else {
        const detail = KANJI_DICTIONARY[ch];
        const hira = detail ? getPrimaryHiragana(detail) : '';
        if (hira) {
          const r = kanaToRomaji(hira);
          kanjiResolved += ` ${r} `;
        } else {
          // Absolute fallback if character is completely missing in dictionary
          kanjiResolved += ' ';
        }
      }
    } else {
      kanjiResolved += ch;
    }
  }
  working = kanjiResolved;

  // 3. Convert Japanese full-width punctuation to Western style
  working = working
    .replace(/（/g, ' (')
    .replace(/）/g, ') ')
    .replace(/：/g, ': ')
    .replace(/；/g, '; ')
    .replace(/。/g, '. ')
    .replace(/、/g, ', ')
    .replace(/！/g, '! ')
    .replace(/？/g, '? ');

  // 4. Convert Kana runs to Romaji
  let result = '';
  let kanaRun = '';

  const flushKana = () => {
    if (kanaRun) {
      result += kanaToRomaji(kanaRun);
      kanaRun = '';
    }
  };

  for (let i = 0; i < working.length; i++) {
    const ch = working[i];
    if (/[\u3040-\u30ff]/.test(ch)) {
      kanaRun += ch;
    } else {
      flushKana();
      result += ch;
    }
  }
  flushKana();

  // 5. Smart particle replacements (ha -> wa, wo -> o, he -> e)
  result = result
    .replace(/(\s|^)ha(\s|$)/g, '$1wa$2')
    .replace(/(\s|^)wo(\s|$)/g, '$1o$2')
    .replace(/(\s|^)he(\s|$)/g, '$1e$2');

  // 6. Replace long vowels with macrons for Hepburn standard (ou->ō, uu->ū, oo->ō)
  result = result
    .replace(/ou/g, 'ō')
    .replace(/uu/g, 'ū')
    .replace(/oo/g, 'ō');

  // 7. Spacing cleanup
  result = result
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,:;!?\)])/g, '$1')
    .replace(/\(([\s]+)/g, '(')
    .trim();

  // 8. Capitalization after sentence ends or starts
  result = result.replace(/(^\w|[\.\!\?:]\s+\w)/g, (match) => match.toUpperCase());

  return result;
}

/**
 * Splits Japanese input text into sentence/line pairs with matching Romaji transliterations
 * for interleaved line-by-line display (Input line -> Romaji line).
 */
export function japaneseToRomajiPairs(text: string): Array<{ japanese: string; romaji: string }> {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const pairs: Array<{ japanese: string; romaji: string }> = [];

  for (const line of lines) {
    let sentenceBlocks: string[] = [];
    if (/[。！？：]/.test(line)) {
      sentenceBlocks = line
        .split(/(?<=[。！？：])\s*/g)
        .filter((s) => s.trim().length > 0);
    } else {
      sentenceBlocks = [line];
    }

    for (const block of sentenceBlocks) {
      const romaji = japaneseToFullRomaji(block);
      pairs.push({
        japanese: block.trim(),
        romaji: romaji.trim(),
      });
    }
  }

  return pairs;
}



