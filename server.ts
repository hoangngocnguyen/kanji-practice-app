import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import translateHandler from './api/translate.js';
import profileHandler from './api/profile.js';
import syncCheckHandler from './api/sync/check.js';
import syncMergeHandler from './api/sync/merge.js';
import syncPushHandler from './api/sync/push.js';
import syncPullHandler from './api/sync/pull.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  const mountHandler = (routePath: string, fn: (req: any, res: any) => Promise<any>) => {
    app.all(routePath, async (req, res) => {
      try {
        await fn(req, res);
      } catch (err: any) {
        if (!res.headersSent) {
          res.status(500).json({ error: err?.message || 'Lỗi server nội bộ' });
        }
      }
    });
  };

  // Server-side translation & Supabase Auth/Sync routes
  mountHandler('/api/translate', translateHandler);
  mountHandler('/api/profile', profileHandler);
  mountHandler('/api/sync/check', syncCheckHandler);
  mountHandler('/api/sync/merge', syncMergeHandler);
  mountHandler('/api/sync/push', syncPushHandler);
  mountHandler('/api/sync/pull', syncPullHandler);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite dev server middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Kanji Stroke Tool server đang chạy tại http://0.0.0.0:${port}`);
  });
}

startServer();
