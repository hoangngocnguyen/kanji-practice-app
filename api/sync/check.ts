import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureUserProfile, requireAuth, setCorsHeaders } from '../_lib/auth';

export type SyncCheckDecision = 'up_to_date' | 'auto_push' | 'auto_pull' | 'conflict';

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST.' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { user, supabaseAdmin } = auth;

  try {
    const profile = await ensureUserProfile(supabaseAdmin, user);

    const {
      lastSyncedVersion = 0,
      lastSyncedUserId = null,
      localHasChanges = false,
      localDataHash = '',
      localStats = {},
    } = req.body || {};

    const [{ data: activeDecks, error: deckErr }, { data: activeCards, error: cardErr }] =
      await Promise.all([
        supabaseAdmin
          .from('flashcard_decks')
          .select('id, updated_at')
          .eq('user_id', user.id)
          .is('deleted_at', null),
        supabaseAdmin
          .from('flashcards')
          .select('id, compound_words, updated_at')
          .eq('user_id', user.id)
          .is('deleted_at', null),
      ]);

    if (deckErr) throw deckErr;
    if (cardErr) throw cardErr;

    const deckCount = activeDecks?.length || 0;
    const cardCount = activeCards?.length || 0;
    const compoundCount = (activeCards || []).reduce((sum, row: any) => {
      return sum + (Array.isArray(row.compound_words) ? row.compound_words.length : 0);
    }, 0);

    const serverVersion = Number(profile.sync_version || 0);
    const serverHash = profile.data_hash || '';
    const serverHasData = deckCount > 0 || cardCount > 0 || serverVersion > 0;
    const serverChanged = serverVersion !== Number(lastSyncedVersion || 0);

    const hasUserModifiedLocalData = Boolean(localStats?.hasUserModifiedData);
    const localDeckCount = Number(localStats?.deckCount || 0);
    const localCardCount = Number(localStats?.cardCount || 0);
    const hasPendingDeletions =
      Number(localStats?.deletedDeckCount || 0) > 0 ||
      Number(localStats?.deletedCardCount || 0) > 0;

    const effectiveLocalChanges = Boolean(localHasChanges) || hasPendingDeletions;
    const sameHash = Boolean(localDataHash && serverHash && localDataHash === serverHash);
    const accountMismatch = Boolean(
      lastSyncedUserId && lastSyncedUserId !== user.id && (localDeckCount > 0 || localCardCount > 0)
    );

    let decision: SyncCheckDecision = 'up_to_date';
    let reason = 'Dữ liệu trên máy và Cloud hoàn toàn giống nhau.';

    if (sameHash && !hasPendingDeletions) {
      decision = 'up_to_date';
      reason = 'Dữ liệu đã được đồng bộ mới nhất.';
    } else if (accountMismatch && serverHasData) {
      decision = 'conflict';
      reason = 'Tài khoản vừa đăng nhập khác với phiên đồng bộ trước đó trên thiết bị này.';
    } else if (Number(lastSyncedVersion || 0) === 0 && serverHasData) {
      if (!hasUserModifiedLocalData) {
        decision = 'auto_pull';
        reason = 'Thiết bị mới chưa có dữ liệu tùy chỉnh, tự động tải từ Cloud.';
      } else {
        decision = 'conflict';
        reason = 'Cả thiết bị này và Cloud đều đang có bộ thẻ riêng biệt.';
      }
    } else if (effectiveLocalChanges && serverChanged) {
      decision = 'conflict';
      reason = 'Cả máy này và Cloud đều có thay đổi kể từ lần đồng bộ gần nhất.';
    } else if (!effectiveLocalChanges && serverChanged) {
      decision = 'auto_pull';
      reason = 'Cloud có bản cập nhật mới hơn từ thiết bị khác.';
    } else if (effectiveLocalChanges && !serverChanged) {
      decision = 'auto_push';
      reason = 'Thiết bị này có thay đổi mới, sẵn sàng tải lên Cloud.';
    } else if (!serverHasData && (localDeckCount > 0 || localCardCount > 0)) {
      decision = 'auto_push';
      reason = 'Cloud chưa có dữ liệu, tự động sao lưu dữ liệu từ máy lên Cloud.';
    }

    return res.status(200).json({
      decision,
      reason,
      serverSummary: {
        syncVersion: serverVersion,
        dataHash: serverHash,
        lastSyncAt: profile.last_sync_at,
        deckCount,
        cardCount,
        compoundCount,
      },
    });
  } catch (err: any) {
    console.error('Lỗi /api/sync/check:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi kiểm tra trạng thái đồng bộ.' });
  }
}
