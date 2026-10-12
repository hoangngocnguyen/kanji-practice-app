export interface KanjiExample {
  word: string;
  reading: string;
  hanViet: string;
  meaning: string;
}

export interface KanjiDetail {
  kanji: string;
  hanViet: string;
  meanings: string[];
  on: string[];
  kun: string[];
  jlpt?: string;
  radical?: string;
  strokeCount?: number;
  examples: KanjiExample[];
}

export interface KanjiItem {
  id: number;
  kanji: string;
  hex: string;
  svgUrl: string;
  unicodeDecimal: number;
  detail?: KanjiDetail;
}

export type CopyStatus = 'idle' | 'copying' | 'copied' | 'error';

export interface ToastInfo {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

export interface SamplePreset {
  title: string;
  desc: string;
  text: string;
}
