import type { VercelRequest, VercelResponse } from '@vercel/node';

const CALLBACK_HTML = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Đang hoàn tất đăng nhập Google...</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #f8fafc;
        color: #0f172a;
        padding: 24px;
      }
      .card {
        max-width: 360px;
        width: 100%;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 700;
      }
      p {
        margin: 0 0 16px;
        font-size: 13px;
        color: #475569;
        line-height: 1.5;
      }
      button {
        padding: 9px 16px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      button:hover {
        background: #f1f5f9;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1 id="status-title">Đang xác thực tài khoản Google...</h1>
      <p id="status-desc">Cửa sổ này sẽ tự động đóng ngay khi hoàn tất.</p>
      <button id="close-btn" type="button" onclick="window.close()">Đóng cửa sổ</button>
    </div>
    <script>
      (function () {
        try {
          var searchParams = new URLSearchParams(window.location.search || '');
          var hashRaw = window.location.hash ? window.location.hash.slice(1) : '';
          var hashParams = new URLSearchParams(hashRaw);

          var payload = {
            type: 'SUPABASE_GOOGLE_OAUTH_CALLBACK',
            code: searchParams.get('code') || '',
            accessToken: hashParams.get('access_token') || '',
            refreshToken: hashParams.get('refresh_token') || '',
            error:
              searchParams.get('error') ||
              hashParams.get('error') ||
              '',
            errorDescription:
              searchParams.get('error_description') ||
              hashParams.get('error_description') ||
              ''
          };

          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage(payload, window.location.origin);
            } catch (err) {
              window.opener.postMessage(payload, '*');
            }

            var titleEl = document.getElementById('status-title');
            var descEl = document.getElementById('status-desc');
            if (payload.error) {
              if (titleEl) titleEl.textContent = 'Đăng nhập không thành công';
              if (descEl) descEl.textContent = payload.errorDescription || 'Vui lòng đóng cửa sổ và thử lại.';
            } else {
              if (titleEl) titleEl.textContent = 'Đăng nhập thành công';
              if (descEl) descEl.textContent = 'Bạn có thể đóng cửa sổ này nếu nó không tự đóng.';
              setTimeout(function () {
                window.close();
              }, 150);
            }
            return;
          }

          var target = '/';
          if (payload.code) {
            target = '/?code=' + encodeURIComponent(payload.code);
          } else if (payload.error) {
            target = '/?oauth_error=' + encodeURIComponent(payload.errorDescription || payload.error);
          }
          window.location.replace(target + (window.location.hash || ''));
        } catch (e) {
          window.location.replace('/');
        }
      })();
    </script>
  </body>
</html>`;

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(200).send(CALLBACK_HTML);
}
