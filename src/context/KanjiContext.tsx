import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { KanjiItem, KanjiDetail, CopyStatus } from '../types/kanji';
import { extractUniqueKanji, convertSvgToPngBlob, downloadBlob, fetchKanjiSvg } from '../utils/kanji';
import {
  getFullKanjiDetail,
  getQuickLocalKanjiDetails,
  isKanjiDetailComplete,
  mergeKanjiDetails,
  sanitizeKanjiDetail,
} from '../utils/kanjiApi';
import { getKanjiInfo, KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';

interface KanjiContextType {
  inputText: string;
  setInputText: (text: string | ((prev: string) => string)) => void;
  extractedKanjiList: KanjiItem[];
  mergedKanjiList: KanjiItem[];
  enrichedDetails: Record<string, KanjiDetail>;
  recentlyViewed: KanjiItem[];
  saveToRecentHistory: (charOrItem: string | KanjiItem) => void;
  clearRecentHistory: () => void;
  includeGrid: boolean;
  setIncludeGrid: (val: boolean | ((prev: boolean) => boolean)) => void;
  inspectedKanji: KanjiItem | null;
  setInspectedKanji: (item: KanjiItem | null) => void;
  practiceContextList: KanjiItem[] | null;
  handleInspectKanji: (item: KanjiItem) => void;
  handleSelectRecentKanji: (char: string) => void;
  openKanjiPracticeModal: (
    char: string,
    contextChars?: string[],
    prefilledDetailsMap?: Record<string, KanjiDetail>
  ) => void;
  copyStatus: Record<string, CopyStatus>;
  handleCopyImage: (item: KanjiItem) => Promise<void>;
  handleDownloadPng: (item: KanjiItem) => Promise<void>;
  isScannerOpen: boolean;
  setIsScannerOpen: (val: boolean) => void;
  isPrintModalOpen: boolean;
  setIsPrintModalOpen: (val: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (val: boolean) => void;
  isGoogleDocsExporterOpen: boolean;
  setIsGoogleDocsExporterOpen: (val: boolean) => void;
  isLicenseOpen: boolean;
  setIsLicenseOpen: (val: boolean) => void;
  handleRemoveKanjiFromList: (char: string) => void;
  showListFurigana: boolean;
  setShowListFurigana: (val: boolean) => void;
  selectedCompareKanji: string[];
  toggleCompareKanji: (char: string) => void;
  clearCompareKanji: () => void;
  isCompareSelectionMode: boolean;
  setIsCompareSelectionMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setEnrichedDetails: React.Dispatch<React.SetStateAction<Record<string, KanjiDetail>>>;
  enrichingChars: Record<string, boolean>;
  updateEnrichedDetail: (kanji: string, detail: KanjiDetail) => void;
}

const KanjiContext = createContext<KanjiContextType | undefined>(undefined);

const LOCAL_STORAGE_HISTORY_KEY = 'luyenkanji_history_items_v2';
const LOCAL_STORAGE_DETAILS_CACHE_KEY = 'luyenkanji_details_cache_v2';

export const KanjiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Input text state
  const [inputText, setInputText] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get('text') || urlParams.get('kanji') || urlParams.get('q');
      if (q && q.trim()) return q.trim();
    } catch {}
    return '日本語能力試験（JLPT）で思い出す漢字の練習：日本人は漢字を毎日勉強する。一期一会、温故知新。';
  });

  // Cached Kanji Details (localStorage persistent to avoid repeat API calls)
  const [enrichedDetails, setEnrichedDetails] = useState<Record<string, KanjiDetail>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DETAILS_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const cleaned: Record<string, KanjiDetail> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (v && typeof v === 'object') {
              cleaned[k] = sanitizeKanjiDetail(v as KanjiDetail);
            }
          }
          return cleaned;
        }
      }
    } catch {}
    return {};
  });

  const [enrichingChars, setEnrichingChars] = useState<Record<string, boolean>>({});
  const enrichedDetailsRef = useRef(enrichedDetails);
  enrichedDetailsRef.current = enrichedDetails;
  const inFlightCharsRef = useRef<Set<string>>(new Set());
  const attemptedCharsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // History list of full KanjiItem objects (unlimited, persistent in localStorage)
  const [historyItems, setHistoryItems] = useState<KanjiItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Save cache to localStorage whenever details are updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_DETAILS_CACHE_KEY, JSON.stringify(enrichedDetails));
    } catch {}
  }, [enrichedDetails]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(historyItems));
    } catch {}
  }, [historyItems]);

  // Modals & Settings
  const [includeGrid, setIncludeGrid] = useState<boolean>(false);
  const [inspectedKanji, setInspectedKanjiState] = useState<KanjiItem | null>(null);
  const [practiceContextList, setPracticeContextList] = useState<KanjiItem[] | null>(null);

  const setInspectedKanji = useCallback((item: KanjiItem | null) => {
    setInspectedKanjiState(item);
    if (!item) {
      setPracticeContextList(null);
    }
  }, []);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isGoogleDocsExporterOpen, setIsGoogleDocsExporterOpen] = useState<boolean>(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState<boolean>(false);

  const [showListFurigana, setShowListFurigana] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kanji_setting_list_furigana');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const [copyStatus, setCopyStatus] = useState<Record<string, CopyStatus>>({});

  // Kanji Comparison Selection State
  const [isCompareSelectionMode, setIsCompareSelectionMode] = useState<boolean>(false);
  const [selectedCompareKanji, setSelectedCompareKanji] = useState<string[]>([]);

  const toggleCompareKanji = useCallback((char: string) => {
    if (!char) return;
    setSelectedCompareKanji((prev) => {
      if (prev.includes(char)) {
        return prev.filter((c) => c !== char);
      } else {
        if (prev.length >= 6) return prev; // Maximum 6 characters to compare side by side
        return [...prev, char];
      }
    });
  }, []);

  const clearCompareKanji = useCallback(() => {
    setSelectedCompareKanji([]);
  }, []);

  // Extract unique Kanji
  const extractedKanjiList = useMemo<KanjiItem[]>(() => {
    return extractUniqueKanji(inputText);
  }, [inputText]);

  const updateEnrichedDetail = useCallback((kanji: string, detail: KanjiDetail) => {
    if (!kanji || !detail) return;
    setEnrichedDetails((prev) => {
      const merged = mergeKanjiDetails(detail, prev[kanji]);
      if (!merged) return prev;
      return {
        ...prev,
        [kanji]: merged,
      };
    });
    setEnrichingChars((prev) => {
      if (!prev[kanji]) return prev;
      const next = { ...prev };
      delete next[kanji];
      return next;
    });
  }, []);

  // Background enrichment for missing or incomplete kanji details (no self-cancellation on state updates)
  useEffect(() => {
    const missingItems = extractedKanjiList.filter((item) => {
      const cached = enrichedDetailsRef.current[item.kanji];
      if (inFlightCharsRef.current.has(item.kanji)) return false;
      if (isKanjiDetailComplete(cached)) return false;
      // Allow re-attempt if cached has no readings/meanings/strokes yet and wasn't already attempted this session
      return !attemptedCharsRef.current.has(item.kanji);
    });

    if (missingItems.length === 0) return;

    const targetChars = missingItems.map((item) => item.kanji);
    targetChars.forEach((char) => {
      inFlightCharsRef.current.add(char);
      attemptedCharsRef.current.add(char);
    });

    setEnrichingChars((prev) => {
      const next = { ...prev };
      targetChars.forEach((char) => {
        next[char] = true;
      });
      return next;
    });

    const runEnrichment = async () => {
      // Phase 1: Instant batch hydration from local dictionary + 2,136 Jōyō catalog + VI meanings
      let stillNeedNetwork: string[] = [...targetChars];
      try {
        const localBatch = await getQuickLocalKanjiDetails(targetChars);
        if (!isMountedRef.current) return;

        const batchKeys = Object.keys(localBatch);
        if (batchKeys.length > 0) {
          setEnrichedDetails((prev) => {
            const next = { ...prev };
            for (const char of batchKeys) {
              const merged = mergeKanjiDetails(localBatch[char], prev[char]);
              if (merged) next[char] = merged;
            }
            return next;
          });

          const completedLocally: string[] = [];
          stillNeedNetwork = targetChars.filter((char) => {
            const candidate = mergeKanjiDetails(localBatch[char], enrichedDetailsRef.current[char]);
            // Need network only if still missing readings/meanings/strokes OR radical/examples weren't fetched yet
            if (isKanjiDetailComplete(candidate)) {
              completedLocally.push(char);
              return false;
            }
            return true;
          });

          if (completedLocally.length > 0) {
            completedLocally.forEach((char) => inFlightCharsRef.current.delete(char));
            setEnrichingChars((prev) => {
              const next = { ...prev };
              completedLocally.forEach((char) => {
                delete next[char];
              });
              return next;
            });
          }
        }
      } catch {}

      // Phase 2: Concurrency-limited network enrichment (max 4 concurrent requests)
      const concurrency = 4;
      let cursor = 0;

      const worker = async () => {
        while (cursor < stillNeedNetwork.length && isMountedRef.current) {
          const char = stillNeedNetwork[cursor++];
          try {
            const detail = await getFullKanjiDetail(char);
            if (!isMountedRef.current) return;
            if (detail) {
              setEnrichedDetails((prev) => {
                const merged = mergeKanjiDetails(detail, prev[char]);
                if (!merged) return prev;
                return {
                  ...prev,
                  [char]: merged,
                };
              });
            }
          } catch {
            // Keep existing partial data if any
          } finally {
            inFlightCharsRef.current.delete(char);
            if (isMountedRef.current) {
              setEnrichingChars((prev) => {
                if (!prev[char]) return prev;
                const next = { ...prev };
                delete next[char];
                return next;
              });
            }
          }
        }
      };

      if (stillNeedNetwork.length > 0) {
        await Promise.all(
          Array.from({ length: Math.min(concurrency, stillNeedNetwork.length) }, () => worker())
        );
      }
    };

    runEnrichment();
  }, [extractedKanjiList]);

  // Merged kanji list
  const mergedKanjiList = useMemo<KanjiItem[]>(() => {
    return extractedKanjiList.map((item) => {
      const cached = enrichedDetails[item.kanji];
      const localStrict = KANJI_DICTIONARY[item.kanji];
      const merged = mergeKanjiDetails(cached, localStrict);
      const fallbackClean: KanjiDetail = {
        kanji: item.kanji,
        hanViet: SINO_VIETNAMESE_MAP[item.kanji] || '',
        meanings: [],
        on: [],
        kun: [],
        examples: [],
      };
      return {
        ...item,
        detail: merged || fallbackClean,
      };
    });
  }, [extractedKanjiList, enrichedDetails]);

  const mergedHistoryItems = useMemo<KanjiItem[]>(() => {
    return historyItems.map((item) => {
      const merged = mergeKanjiDetails(
        enrichedDetails[item.kanji],
        KANJI_DICTIONARY[item.kanji] || item.detail
      );
      return merged ? { ...item, detail: merged } : item;
    });
  }, [historyItems, enrichedDetails]);

  // Save to recent history (unlimited, caches full details so no repeat API calls)
  const saveToRecentHistory = useCallback(
    (charOrItem: string | KanjiItem) => {
      const char = typeof charOrItem === 'string' ? charOrItem : charOrItem.kanji;
      if (!char || char.trim().length === 0) return;

      const extracted = extractUniqueKanji(char);
      const item: KanjiItem =
        typeof charOrItem === 'object'
          ? charOrItem
          : mergedKanjiList.find((k) => k.kanji === char) ||
            extracted[0] || {
              id: 1,
              kanji: char,
              hex: char.charCodeAt(0).toString(16).padStart(5, '0'),
              svgUrl: `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${char.charCodeAt(0).toString(16).padStart(5, '0')}.svg`,
              unicodeDecimal: char.charCodeAt(0),
              detail: enrichedDetails[char] || getKanjiInfo(char),
            };

      setHistoryItems((prev) => {
        const filtered = prev.filter((k) => k.kanji !== char);
        return [item, ...filtered];
      });
    },
    [mergedKanjiList, enrichedDetails]
  );

  const clearRecentHistory = useCallback(() => {
    setHistoryItems([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch {}
  }, []);

  // Inspect Kanji
  const handleInspectKanji = useCallback(
    (item: KanjiItem) => {
      fetchKanjiSvg(item.svgUrl, item.hex).catch(() => {});
      const enriched = mergeKanjiDetails(
        enrichedDetails[item.kanji],
        KANJI_DICTIONARY[item.kanji] || item.detail
      );
      const targetItem = enriched ? { ...item, detail: enriched } : item;
      setInspectedKanjiState(targetItem);
      saveToRecentHistory(targetItem);
    },
    [enrichedDetails, saveToRecentHistory]
  );

  const handleSelectRecentKanji = useCallback(
    (char: string) => {
      setPracticeContextList(null);
      const found =
        mergedKanjiList.find((k) => k.kanji === char) ||
        historyItems.find((k) => k.kanji === char);
      if (found) {
        handleInspectKanji(found);
      } else {
        const created = extractUniqueKanji(char);
        if (created.length > 0) {
          handleInspectKanji(created[0]);
        }
      }
    },
    [mergedKanjiList, historyItems, handleInspectKanji]
  );

  const openKanjiPracticeModal = useCallback(
    (
      char: string,
      contextChars?: string[],
      prefilledDetailsMap?: Record<string, KanjiDetail>
    ) => {
      const uniqueChars =
        contextChars && contextChars.length > 0
          ? Array.from(new Set(contextChars.filter(Boolean)))
          : [char];
      const builtList = extractUniqueKanji(uniqueChars.join('')).map((item) => {
        const enriched =
          prefilledDetailsMap?.[item.kanji] ||
          enrichedDetails[item.kanji] ||
          getKanjiInfo(item.kanji);
        return enriched ? { ...item, detail: enriched } : item;
      });

      if (builtList.length > 0) {
        setPracticeContextList(builtList);
        const target =
          builtList.find((k) => k.kanji === char) ||
          extractUniqueKanji(char)[0] ||
          builtList[0];
        fetchKanjiSvg(target.svgUrl, target.hex).catch(() => {});
        const resolvedTarget = target.detail
          ? target
          : {
              ...target,
              detail:
                prefilledDetailsMap?.[target.kanji] ||
                enrichedDetails[target.kanji] ||
                getKanjiInfo(target.kanji),
            };
        setInspectedKanjiState(resolvedTarget);
        saveToRecentHistory(resolvedTarget);
      } else {
        handleSelectRecentKanji(char);
      }
    },
    [enrichedDetails, saveToRecentHistory, handleSelectRecentKanji]
  );

  // Copy image to clipboard
  const handleCopyImage = async (item: KanjiItem) => {
    setCopyStatus((prev) => ({ ...prev, [item.hex]: 'copying' }));
    try {
      const pngBlob = await convertSvgToPngBlob(item.svgUrl, includeGrid);
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({ 'image/png': pngBlob });
        await navigator.clipboard.write([clipboardItem]);
        setCopyStatus((prev) => ({ ...prev, [item.hex]: 'copied' }));
        setTimeout(() => {
          setCopyStatus((prev) => ({ ...prev, [item.hex]: 'idle' }));
        }, 1500);
      } else {
        downloadBlob(pngBlob, `kanji_${item.kanji}_${item.hex}.png`);
        setCopyStatus((prev) => ({ ...prev, [item.hex]: 'idle' }));
      }
    } catch (err) {
      console.error(err);
      setCopyStatus((prev) => ({ ...prev, [item.hex]: 'error' }));
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [item.hex]: 'idle' }));
      }, 2000);
    }
  };

  // Download PNG file directly
  const handleDownloadPng = async (item: KanjiItem) => {
    try {
      const pngBlob = await convertSvgToPngBlob(item.svgUrl, includeGrid);
      downloadBlob(pngBlob, `kanji_${item.kanji}_${item.hex}.png`);
    } catch (err) {
      console.error(err);
    }
  };

  // Remove a specific Kanji character from current active input list
  const handleRemoveKanjiFromList = useCallback((charToRemove: string) => {
    if (!charToRemove) return;
    setInputText((prev) => {
      if (!prev) return '';
      return prev.replaceAll(charToRemove, '');
    });
  }, []);

  return (
    <KanjiContext.Provider
      value={{
        inputText,
        setInputText,
        extractedKanjiList,
        mergedKanjiList,
        enrichedDetails,
        recentlyViewed: mergedHistoryItems,
        saveToRecentHistory,
        clearRecentHistory,
        includeGrid,
        setIncludeGrid,
        inspectedKanji,
        setInspectedKanji,
        practiceContextList,
        handleInspectKanji,
        handleSelectRecentKanji,
        openKanjiPracticeModal,
        handleRemoveKanjiFromList,
        copyStatus,
        handleCopyImage,
        handleDownloadPng,
        isScannerOpen,
        setIsScannerOpen,
        isPrintModalOpen,
        setIsPrintModalOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        isGoogleDocsExporterOpen,
        setIsGoogleDocsExporterOpen,
        isLicenseOpen,
        setIsLicenseOpen,
        showListFurigana,
        setShowListFurigana,
        selectedCompareKanji,
        toggleCompareKanji,
        clearCompareKanji,
        isCompareSelectionMode,
        setIsCompareSelectionMode,
        setEnrichedDetails,
        enrichingChars,
        updateEnrichedDetail,
      }}
    >
      {children}
    </KanjiContext.Provider>
  );
};

export const useKanji = () => {
  const context = useContext(KanjiContext);
  if (!context) {
    throw new Error('useKanji must be used within a KanjiProvider');
  }
  return context;
};
