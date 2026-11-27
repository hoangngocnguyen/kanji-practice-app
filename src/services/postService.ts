import { getSupabaseAccessToken } from '../utils/supabaseClient';

export interface PostItem {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  author_id?: string;
  author_name?: string;
  published: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PostsFetchResult {
  posts: PostItem[];
  isFallback?: boolean;
  notice?: string;
}

export async function fetchPublicPosts(): Promise<PostsFetchResult> {
  try {
    const res = await fetch('/api/posts');
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.posts)) {
      return {
        posts: data.posts,
        isFallback: Boolean(data.isFallback),
        notice: data.notice,
      };
    }
  } catch (err) {
    console.warn('Lỗi kết nối tới cơ sở dữ liệu khi tải bài viết:', err);
  }
  return { posts: [] };
}

export async function createPost(payload: {
  title: string;
  summary?: string;
  content: string;
  category?: string;
}): Promise<PostItem> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập tài khoản quản trị viên để đăng bài.');
  }

  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể đăng bài viết.');
  }

  return data.post as PostItem;
}

export async function updatePost(
  id: string,
  payload: {
    title: string;
    summary?: string;
    content: string;
    category?: string;
    published?: boolean;
  }
): Promise<PostItem> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập tài khoản quản trị viên để sửa bài.');
  }

  const res = await fetch('/api/posts', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể cập nhật bài viết.');
  }

  return data.post as PostItem;
}

export async function deletePost(postId: string): Promise<void> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập tài khoản quản trị viên.');
  }

  const res = await fetch(`/api/posts?id=${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể xóa bài viết.');
  }
}
