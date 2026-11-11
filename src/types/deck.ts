export type SrsRating = 'hard' | 'good' | 'easy';

export interface SrsState {
  dueAt: number; // Timestamp (ms) when next review is due
  intervalMinutes: number; // Current interval in minutes
  easeFactor: number; // Anki SM-2 ease factor (default 2.5)
  repetitions: number; // Consecutive successful reviews
  lastRating?: SrsRating;
  lastReviewedAt?: number;
}

export interface SrsConfig {
  hardMinutes: number; // Default: 10 minutes
  goodDays: number; // Default: 1 day
  easyDays: number; // Default: 4 days
}

export interface CompoundWordCard {
  id: string;
  word: string;
  reading: string;
  hanViet: string;
  meaning: string;
  srsState: SrsState;
}

export interface FolderKanjiItem {
  id: string;
  folderId: string;
  kanji: string;
  hanViet: string;
  onReadings: string[];
  kunReadings: string[];
  meanings: string[];
  strokeCount?: number;
  srsState: SrsState;
  compoundWords: CompoundWordCard[];
  createdAt: number;
}

export interface StudyFolder {
  id: string;
  parentId: string | null;
  name: string;
  description?: string;
  sortOrder: number;
  isPublic?: boolean;
  shareSlug?: string;
  createdAt: number;
  updatedAt: number;
}

export type ReviewFilterMode = 'all' | 'kanji' | 'compound';

export interface FlashcardReviewItem {
  cardId: string;
  cardType: 'kanji' | 'compound';
  folderId: string;
  folderName: string;
  kanjiItemId: string;
  kanji: string;
  // Kanji card fields
  hanViet: string;
  onReadings: string[];
  kunReadings: string[];
  meanings: string[];
  strokeCount?: number;
  // Compound word card fields (if cardType === 'compound')
  compoundWordId?: string;
  word?: string;
  reading?: string;
  wordMeaning?: string;
  wordHanViet?: string;
  srsState: SrsState;
}

export interface KanjiDeckExportBundle {
  schemaVersion: 1;
  appName: 'LuyenKanji';
  exportedAt: number;
  rootFolderId: string;
  folders: StudyFolder[];
  items: FolderKanjiItem[];
}
