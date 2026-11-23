import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDecks } from '../context/DeckContext';
import { KanjiLevelTab } from '../services/kanjiLevelService';
import { generateArenaQuestions } from '../services/arenaQuestionGenerator';
import {
  advanceArenaQuestion,
  createArenaRoom,
  deleteArenaQuiz,
  getOrCreateArenaPlayerId,
  getSavedArenaGuestName,
  joinArenaRoom,
  kickArenaPlayer,
  leaveArenaRoom,
  listMyArenaQuizzes,
  rematchArenaRoom,
  saveArenaGuestName,
  saveArenaQuiz,
  startArenaRoom,
  submitArenaAnswer,
  updateArenaRoomSettings,
} from '../services/arenaService';
import { useArenaRoom } from '../hooks/useArenaRoom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  ArenaAdvanceMode,
  ArenaQuestionDraft,
  ArenaQuestionMode,
  ArenaQuiz,
  ArenaRoomMode,
  ArenaRoomState,
} from '../types/arena';
import { ArenaHub } from '../components/arena/ArenaHub';
import { ArenaQuizBuilder } from '../components/arena/ArenaQuizBuilder';
import { ArenaLobby } from '../components/arena/ArenaLobby';
import { ArenaMatchView } from '../components/arena/ArenaMatchView';
import { ArenaResultSummary } from '../components/arena/ArenaResultSummary';

export interface ArenaQuestionGeneratorConfig {
  sourceType: 'jlpt' | 'folder';
  level: KanjiLevelTab;
  folderId: string;
  count: number;
  mode: Exclude<ArenaQuestionMode, 'custom'> | 'mixed';
}

export const ArenaPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, displayName: authDisplayName, openAuthModal } = useAuth();
  const { items: deckItems } = useDecks();
  const { isOnline } = usePWAInstall();

  const playerId = useMemo(
    () => getOrCreateArenaPlayerId(user?.id || null),
    [user?.id]
  );

  const defaultDisplayName = useMemo(() => {
    if (user && authDisplayName) return authDisplayName;
    return getSavedArenaGuestName();
  }, [user, authDisplayName]);

  const urlCode = (searchParams.get('code') || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

  const [viewMode, setViewMode] = useState<'hub' | 'builder' | 'room'>('hub');
  const [editingQuiz, setEditingQuiz] = useState<ArenaQuiz | null>(null);
  const [quizzes, setQuizzes] = useState<ArenaQuiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<boolean>(true);

  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [initialRoomSnapshot, setInitialRoomSnapshot] = useState<ArenaRoomState | null>(null);
  const [activeGuestName, setActiveGuestName] = useState<string>(defaultDisplayName || 'Người chơi');
  const [lastGeneratorConfig, setLastGeneratorConfig] =
    useState<ArenaQuestionGeneratorConfig | null>(null);

  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    room,
    setRoom,
    onlinePlayerIds,
    realtimeStatus,
    syncError,
    refreshRoom,
    broadcastSync,
  } = useArenaRoom({
    roomCode: viewMode === 'room' ? activeRoomCode : null,
    playerId,
    displayName: activeGuestName,
    initialRoom: initialRoomSnapshot,
  });

  // Load saved quiz library
  const refreshQuizzes = useCallback(async () => {
    setIsLoadingQuizzes(true);
    try {
      const list = await listMyArenaQuizzes(Boolean(user));
      setQuizzes(list);
    } finally {
      setIsLoadingQuizzes(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshQuizzes();
  }, [refreshQuizzes]);

  // Auto-reconnect if refreshing browser while already a participant in urlCode room
  useEffect(() => {
    if (viewMode !== 'hub' || urlCode.length !== 6 || activeRoomCode) return;
    let active = true;
    import('../services/arenaService').then(({ fetchArenaRoom }) => {
      fetchArenaRoom(urlCode, playerId)
        .then((fetched) => {
          if (!active) return;
          if (fetched.players.some((p) => p.playerId === playerId)) {
            setInitialRoomSnapshot(fetched);
            setActiveRoomCode(fetched.roomCode);
            setViewMode('room');
          }
        })
        .catch(() => {});
    });
    return () => {
      active = false;
    };
  }, [viewMode, urlCode, activeRoomCode, playerId]);

  const handleJoinRoom = async (roomCode: string, name: string) => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      saveArenaGuestName(name);
      setActiveGuestName(name);
      const joined = await joinArenaRoom({
        roomCode,
        playerId,
        displayName: name,
      });
      setInitialRoomSnapshot(joined);
      setActiveRoomCode(joined.roomCode);
      setViewMode('room');
      if (searchParams.get('code') !== joined.roomCode) {
        setSearchParams({ code: joined.roomCode }, { replace: true });
      }
      broadcastSync('player:joined');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tham gia phòng.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateQuickRoom = async (params: {
    displayName: string;
    mode: ArenaRoomMode;
    advanceMode: ArenaAdvanceMode;
    title: string;
    timePerQuestion: number;
    generatorConfig: ArenaQuestionGeneratorConfig;
  }) => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      saveArenaGuestName(params.displayName);
      setActiveGuestName(params.displayName);
      setLastGeneratorConfig(params.generatorConfig);

      const folderItems =
        params.generatorConfig.sourceType === 'folder'
          ? deckItems.filter((it) => it.folderId === params.generatorConfig.folderId)
          : undefined;

      const questions = await generateArenaQuestions({
        sourceType: params.generatorConfig.sourceType,
        level: params.generatorConfig.level,
        folderItems,
        count: params.generatorConfig.count,
        mode: params.generatorConfig.mode,
      });

      const created = await createArenaRoom({
        playerId,
        displayName: params.displayName,
        mode: params.mode,
        advanceMode: params.advanceMode,
        title: params.title,
        levelFilter:
          params.generatorConfig.sourceType === 'folder'
            ? 'FOLDER'
            : params.generatorConfig.level,
        timePerQuestion: params.timePerQuestion,
        questions,
      });

      setInitialRoomSnapshot(created);
      setActiveRoomCode(created.roomCode);
      setViewMode('room');
      setSearchParams({ code: created.roomCode }, { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tạo phòng thi đấu.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleHostSavedQuiz = async (
    quiz: ArenaQuiz,
    mode: ArenaRoomMode,
    advanceMode: ArenaAdvanceMode,
    hostName: string
  ) => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      saveArenaGuestName(hostName);
      setActiveGuestName(hostName);
      setLastGeneratorConfig(null);

      const created = await createArenaRoom({
        playerId,
        displayName: hostName,
        mode,
        advanceMode,
        title: quiz.title,
        levelFilter: quiz.levelTag,
        quizId: quiz.isLocalOnly ? null : quiz.id,
        timePerQuestion: quiz.timePerQuestion,
        questions: quiz.questions,
      });

      setInitialRoomSnapshot(created);
      setActiveRoomCode(created.roomCode);
      setViewMode('room');
      setSearchParams({ code: created.roomCode }, { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể mở phòng từ bộ đề này.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveQuiz = async (payload: {
    id?: string;
    title: string;
    description: string;
    levelTag: string;
    timePerQuestion: number;
    questions: ArenaQuestionDraft[];
  }): Promise<ArenaQuiz> => {
    setIsBusy(true);
    try {
      const saved = await saveArenaQuiz(payload, Boolean(user));
      await refreshQuizzes();
      setEditingQuiz(saved);
      setViewMode('hub');
      return saved;
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveAndLaunchQuiz = async (payload: {
    id?: string;
    title: string;
    description: string;
    levelTag: string;
    timePerQuestion: number;
    questions: ArenaQuestionDraft[];
  }) => {
    setIsBusy(true);
    try {
      const saved = await saveArenaQuiz(payload, Boolean(user));
      await refreshQuizzes();
      await handleHostSavedQuiz(
        saved,
        'group',
        'host',
        defaultDisplayName || 'Chủ phòng'
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể lưu và mở phòng.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteArenaQuiz(quizId, Boolean(user));
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể xóa bộ đề.');
    }
  };

  const handleLeaveRoom = async () => {
    if (activeRoomCode) {
      try {
        await leaveArenaRoom(activeRoomCode, playerId);
        broadcastSync('player:left');
      } catch {}
    }
    setActiveRoomCode(null);
    setInitialRoomSnapshot(null);
    setRoom(null);
    setViewMode('hub');
    setSearchParams({}, { replace: true });
  };

  const handleKickPlayer = async (targetPlayerId: string) => {
    if (!activeRoomCode) return;
    const updated = await kickArenaPlayer(activeRoomCode, playerId, targetPlayerId);
    if (updated) {
      setRoom(updated);
      broadcastSync('player:kicked');
    }
  };

  const handleUpdateSettings = async (patch: {
    advanceMode?: ArenaAdvanceMode;
    timePerQuestion?: number;
  }) => {
    if (!activeRoomCode) return;
    const updated = await updateArenaRoomSettings({
      roomCode: activeRoomCode,
      playerId,
      ...patch,
    });
    if (updated) {
      setRoom(updated);
      broadcastSync('room:settings');
    }
  };

  const handleStartMatch = async () => {
    if (!activeRoomCode) return;
    setErrorMessage(null);
    setIsBusy(true);
    try {
      const started = await startArenaRoom(activeRoomCode, playerId);
      setRoom(started);
      broadcastSync('room:started');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể bắt đầu trận đấu.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitAnswer = async (questionIndex: number, optionId: string) => {
    if (!activeRoomCode) throw new Error('Không tìm thấy mã phòng.');
    const res = await submitArenaAnswer({
      roomCode: activeRoomCode,
      playerId,
      questionIndex,
      optionId,
    });
    broadcastSync('player:answered', { questionIndex });
    await refreshRoom();
    return res;
  };

  const handleAdvanceQuestion = async (expectedIndex: number) => {
    if (!activeRoomCode) return;
    const updated = await advanceArenaQuestion({
      roomCode: activeRoomCode,
      playerId,
      expectedIndex,
    });
    if (updated) {
      setRoom(updated);
      broadcastSync('question:advanced');
    }
  };

  const handleRematch = async () => {
    if (!activeRoomCode || !room) return;
    setIsBusy(true);
    try {
      let freshQuestions: ArenaQuestionDraft[] | undefined;
      if (lastGeneratorConfig) {
        const folderItems =
          lastGeneratorConfig.sourceType === 'folder'
            ? deckItems.filter((it) => it.folderId === lastGeneratorConfig.folderId)
            : undefined;
        freshQuestions = await generateArenaQuestions({
          sourceType: lastGeneratorConfig.sourceType,
          level: lastGeneratorConfig.level,
          folderItems,
          count: lastGeneratorConfig.count,
          mode: lastGeneratorConfig.mode,
        });
      }

      const reset = await rematchArenaRoom({
        roomCode: activeRoomCode,
        playerId,
        questions: freshQuestions,
      });
      if (reset) {
        setRoom(reset);
        broadcastSync('room:rematch');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tạo ván tái đấu.');
    } finally {
      setIsBusy(false);
    }
  };

  if (viewMode === 'builder') {
    return (
      <ArenaQuizBuilder
        initialQuiz={editingQuiz}
        isSaving={isBusy}
        onBack={() => setViewMode('hub')}
        onSaveQuiz={handleSaveQuiz}
        onSaveAndLaunch={handleSaveAndLaunchQuiz}
      />
    );
  }

  if (viewMode === 'room' && room) {
    if (room.status === 'waiting') {
      return (
        <ArenaLobby
          room={room}
          currentPlayerId={playerId}
          onlinePlayerIds={onlinePlayerIds}
          realtimeStatus={realtimeStatus}
          isBusy={isBusy}
          errorMessage={errorMessage || syncError}
          onStartMatch={handleStartMatch}
          onLeaveRoom={handleLeaveRoom}
          onKickPlayer={handleKickPlayer}
          onUpdateSettings={handleUpdateSettings}
        />
      );
    }

    if (room.status === 'playing') {
      return (
        <ArenaMatchView
          room={room}
          currentPlayerId={playerId}
          onSubmitAnswer={handleSubmitAnswer}
          onAdvanceQuestion={handleAdvanceQuestion}
          onLeaveRoom={handleLeaveRoom}
        />
      );
    }

    return (
      <ArenaResultSummary
        room={room}
        currentPlayerId={playerId}
        isBusy={isBusy}
        onRematch={handleRematch}
        onBackToHub={() => void handleLeaveRoom()}
      />
    );
  }

  return (
    <ArenaHub
      initialRoomCode={urlCode}
      defaultDisplayName={defaultDisplayName}
      isOnline={isOnline}
      isAuthenticated={Boolean(user)}
      quizzes={quizzes}
      isLoadingQuizzes={isLoadingQuizzes}
      isBusy={isBusy}
      errorMessage={errorMessage}
      onJoinRoom={handleJoinRoom}
      onCreateQuickRoom={handleCreateQuickRoom}
      onOpenQuizBuilder={(quiz) => {
        setEditingQuiz(quiz || null);
        setViewMode('builder');
      }}
      onHostSavedQuiz={handleHostSavedQuiz}
      onDeleteQuiz={handleDeleteQuiz}
      onRequireLogin={() => openAuthModal('login')}
    />
  );
};
