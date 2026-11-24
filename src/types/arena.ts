export type ArenaRoomMode = '1v1' | 'group';
export type ArenaRoomStatus = 'waiting' | 'playing' | 'finished';
export type ArenaAdvanceMode = 'auto' | 'host';

export type ArenaQuestionMode =
  | 'kanji-to-meaning'
  | 'meaning-to-kanji'
  | 'reading'
  | 'sentence-cloze'
  | 'custom';

export interface ArenaQuestionOption {
  id: string;
  label: string;
  subLabel?: string;
}

export interface ArenaQuestionDraft {
  id: string;
  kanji: string;
  mode: ArenaQuestionMode;
  promptPrimary: string;
  promptSub?: string;
  sentenceJp?: string;
  sentenceKana?: string;
  sentenceVi?: string;
  options: ArenaQuestionOption[];
  correctOptionId: string;
  explanation?: string;
}

export interface ArenaPublicQuestion {
  id: string;
  kanji?: string;
  mode: ArenaQuestionMode | string;
  promptPrimary: string;
  promptSub?: string;
  sentenceJp?: string;
  sentenceKana?: string;
  sentenceVi?: string;
  options: ArenaQuestionOption[];
  correctHash?: string;
  correctOptionId?: string;
  explanation?: string;
}

export interface ArenaPlayer {
  id: string;
  playerId: string;
  userId: string | null;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  answeredCount: number;
  totalResponseMs: number;
  answeredCurrent: boolean;
  lastAnswerCorrect: boolean | null;
  joinedAt: string;
}

export interface ArenaPlayerAnswerEntry {
  optionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  elapsedMs: number;
}

export interface ArenaRoomState {
  id: string;
  roomCode: string;
  mode: ArenaRoomMode;
  status: ArenaRoomStatus;
  hostPlayerId: string;
  title: string;
  levelFilter: string;
  quizId: string | null;
  questionCount: number;
  timePerQuestion: number;
  advanceMode: ArenaAdvanceMode;
  currentQuestionIndex: number;
  questionStartedAt: string | null;
  serverNow: string;
  questions: ArenaPublicQuestion[];
  players: ArenaPlayer[];
  myAnswers: Record<string, ArenaPlayerAnswerEntry>;
}

export interface ArenaQuiz {
  id: string;
  ownerId?: string;
  title: string;
  description: string;
  levelTag: string;
  timePerQuestion: number;
  questions: ArenaQuestionDraft[];
  playCount: number;
  updatedAt: string;
  isLocalOnly?: boolean;
}

export interface ArenaSubmitResult {
  isCorrect: boolean;
  correctOptionId: string;
  explanation?: string;
  kanji?: string;
  sentenceJp?: string;
  optionSubLabels?: Record<string, string>;
  pointsAwarded: number;
  newScore: number;
  streak: number;
  correctCount?: number;
  answeredCount?: number;
  allPlayersAnswered: boolean;
}

export interface ArenaAdvanceDelta {
  roomCode: string;
  status: ArenaRoomStatus;
  currentQuestionIndex: number;
  questionStartedAt: string | null;
  serverNow: string;
}
