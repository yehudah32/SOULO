'use client';

/**
 * MarkdownText — renders inline markdown (bold, italic) as HTML.
 * Handles: **bold**, *italic*, ***bold italic***
 * Does NOT handle: headers, links, lists, code blocks, etc.
 * This is intentionally minimal for AI-generated assessment text.
 */
export default function MarkdownText({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  const html = children
    // ***bold italic*** (must come before ** and *)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // *italic*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // newlines → <br>
    .replace(/\n/g, '<br>');

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
