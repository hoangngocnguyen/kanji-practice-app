/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { KanjiProvider, useKanji } from './context/KanjiContext';
import { Header } from './components/Header';
import { AppSidebar } from './components/AppSidebar';
import { InputSection } from './components/InputSection';
import { KanjiStrokesView } from './components/KanjiStrokesView';
import { RomajiReaderView } from './components/RomajiReaderView';
import { TranslationView } from './components/TranslationView';
import { RomajiConverterView } from './components/RomajiConverterView';
import { RadicalExplorer } from './components/RadicalExplorer';
import { RecentlyViewedKanji } from './components/RecentlyViewedKanji';
import { UserGuideView } from './components/UserGuideView';
import { PracticeModal } from './components/PracticeModal';
import { KanjiScannerModal } from './components/KanjiScannerModal';
import { KanjiPrintModal } from './components/KanjiPrintModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleDocsTableExporter } from './components/GoogleDocsTableExporter';
import { LicenseModal } from './components/LicenseModal';
import { Footer } from './components/Footer';

function AppLayout() {
  const {
    inputText,
    setInputText,
    mergedKanjiList,
    filteredKanjiList,
    inspectedKanji,
    setInspectedKanji,
    includeGrid,
    setIncludeGrid,
    handleInspectKanji,
    handleSelectRecentKanji,
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
    recentlyViewed,
    clearRecentHistory,
  } = useKanji() as any;

  // Sidebar collapse state (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kanji_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kanji_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Floating scroll-to-top button
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 250);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex w-full bg-slate-50/70 text-slate-800 antialiased selection:bg-teal-700 selection:text-white relative">
      {/* Sidebar with NavLinks */}
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen">
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
          <Routes>
            <Route path="/" element={<InputSection />} />
            <Route path="/input" element={<InputSection />} />
            <Route path="/kanji" element={<KanjiStrokesView />} />
            <Route path="/romaji" element={<RomajiReaderView />} />
            <Route path="/translate" element={<TranslationView />} />
            <Route path="/converter" element={<RomajiConverterView />} />
            <Route
              path="/radicals"
              element={<RadicalExplorer onSelectKanji={handleSelectRecentKanji} />}
            />
            <Route path="/history" element={<RecentlyViewedKanji />} />
            <Route
              path="/guide"
              element={<UserGuideView onOpenScanner={() => setIsScannerOpen(true)} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Footer & License Attribution */}
          <Footer onOpenLicenseModal={() => setIsLicenseOpen(true)} />
        </main>
      </div>

      {/* Practice / Stroke Modal */}
      <PracticeModal
        item={inspectedKanji}
        kanjiList={mergedKanjiList}
        onNavigateKanji={handleInspectKanji}
        showGrid={includeGrid}
        onToggleGrid={setIncludeGrid}
        onClose={() => setInspectedKanji(null)}
        onCopyImage={handleCopyImage}
        onDownloadPng={handleDownloadPng}
        onSelectKanji={handleSelectRecentKanji}
      />

      {/* OCR Scanner Modal */}
      <KanjiScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApplyToInput={(text) => {
          setInputText((prev: string) => (prev ? `${prev} ${text}` : text));
        }}
        onApplyToSearch={() => {}}
        onInspectKanji={(char) => {
          handleSelectRecentKanji(char);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        historyCount={recentlyViewed.length}
        onClearHistory={clearRecentHistory}
      />

      {/* Print Modal */}
      <KanjiPrintModal
        kanjiList={mergedKanjiList}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Google Docs Table Exporter Modal */}
      <GoogleDocsTableExporter
        kanjiList={mergedKanjiList}
        isOpen={isGoogleDocsExporterOpen}
        onClose={() => setIsGoogleDocsExporterOpen(false)}
      />

      {/* License Modal */}
      <LicenseModal isOpen={isLicenseOpen} onClose={() => setIsLicenseOpen(false)} />

      {/* Floating Scroll to Top */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3.5 bg-teal-700 hover:bg-teal-800 text-white rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-teal-500/30"
          title="Lên đầu trang"
          aria-label="Lên đầu trang"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <KanjiProvider>
        <AppLayout />
      </KanjiProvider>
    </BrowserRouter>
  );
}
