// Romaji to Hiragana and Katakana converter
// Supports Hepburn, Kunrei, double consonants (sokuon), n' combos, and punctuation.

export type KanaMode = 'off' | 'hiragana' | 'katakana';

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

/**
 * Converts a romaji string to Kana (Hiragana or Katakana).
 * Handles sokuon (double consonants like 'tt', 'kk'), 'nn' -> 'ん', and punctuation.
 */
export function romajiToKana(text: string, mode: 'hiragana' | 'katakana' = 'hiragana'): string {
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

    // Check 1-char vowel or 'n' followed by consonant/end
    if (HIRAGANA_MAP[char]) {
      out += HIRAGANA_MAP[char];
      i += 1;
      continue;
    }

    // If 'n' followed by a consonant (other than y or vowel), convert to 'ん'
    if (char === 'n') {
      const nextChar = i + 1 < lower.length ? lower[i + 1] : '';
      if (!nextChar || (!/[aeiouy]/.test(nextChar) && /[bcdfghjklmpqrstvwxz]/.test(nextChar))) {
        out += 'ん';
        i += 1;
        continue;
      }
    }

    // Fallback: keep current character (e.g., kanji, numbers, symbols, spaces)
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
