import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { KanjiItem, KanjiDetail, CopyStatus } from '../types/kanji';
import { extractUniqueKanji, convertSvgToPngBlob, downloadBlob, fetchKanjiSvg } from '../utils/kanji';
import { getFullKanjiDetail } from '../utils/kanjiApi';
import { getKanjiInfo } from '../data/kanjiDictionary';

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
  handleInspectKanji: (item: KanjiItem) => void;
  handleSelectRecentKanji: (char: string) => void;
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
  showListFurigana: boolean;
  setShowListFurigana: (val: boolean) => void;
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
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

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
  const [inspectedKanji, setInspectedKanji] = useState<KanjiItem | null>(null);
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

  // Extract unique Kanji
  const extractedKanjiList = useMemo<KanjiItem[]>(() => {
    return extractUniqueKanji(inputText);
  }, [inputText]);

  // Background enrichment for missing kanji details
  useEffect(() => {
    let isCancelled = false;
    const missing = extractedKanjiList.filter((item) => !enrichedDetails[item.kanji]);

    if (missing.length === 0) return;

    missing.forEach(async (item) => {
      try {
        const detail = await getFullKanjiDetail(item.kanji);
        if (!isCancelled && detail) {
          setEnrichedDetails((prev) => ({
            ...prev,
            [item.kanji]: detail,
          }));
        }
      } catch {}
    });

    return () => {
      isCancelled = true;
    };
  }, [extractedKanjiList, enrichedDetails]);

  // Merged kanji list
  const mergedKanjiList = useMemo<KanjiItem[]>(() => {
    return extractedKanjiList.map((item) => {
      const enriched = enrichedDetails[item.kanji] || getKanjiInfo(item.kanji);
      return {
        ...item,
        detail: enriched || item.detail,
      };
    });
  }, [extractedKanjiList, enrichedDetails]);

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
      const enriched = enrichedDetails[item.kanji] || getKanjiInfo(item.kanji);
      const targetItem = enriched ? { ...item, detail: enriched } : item;
      setInspectedKanji(targetItem);
      saveToRecentHistory(targetItem);
    },
    [enrichedDetails, saveToRecentHistory]
  );

  const handleSelectRecentKanji = useCallback(
    (char: string) => {
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

  return (
    <KanjiContext.Provider
      value={{
        inputText,
        setInputText,
        extractedKanjiList,
        mergedKanjiList,
        enrichedDetails,
        recentlyViewed: historyItems,
        saveToRecentHistory,
        clearRecentHistory,
        includeGrid,
        setIncludeGrid,
        inspectedKanji,
        setInspectedKanji,
        handleInspectKanji,
        handleSelectRecentKanji,
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
