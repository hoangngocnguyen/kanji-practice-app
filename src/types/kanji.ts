export interface KanjiItem {
  id: number;
  kanji: string;
  hex: string;
  svgUrl: string;
  unicodeDecimal: number;
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
