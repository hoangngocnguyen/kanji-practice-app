import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for clean GFM and line breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Strips markdown syntax to generate clean, legible plain text
 * for compact snippets and card previews without ugly asterisks or hash marks.
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold **text**
    .replace(/__(.*?)__/g, '$1') // Bold __text__
    .replace(/\*(.*?)\*/g, '$1') // Italic *text*
    .replace(/_(.*?)_/g, '$1') // Italic _text_
    .replace(/~~(.*?)~~/g, '$1') // Strikethrough
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Inline code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links [text](url)
    .replace(/^>\s+/gm, '') // Blockquotes
    .replace(/^[\*\-\+]\s+/gm, '') // List items
    .replace(/^\d+\.\s+/gm, '') // Numbered list items
    .replace(/\n+/g, ' ') // Collapse newlines
    .trim();
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const sanitizedHtml = useMemo(() => {
    if (!content) return '';
    try {
      const rawHtml = marked.parse(content) as string;
      return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel'],
      });
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-body text-slate-700 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
