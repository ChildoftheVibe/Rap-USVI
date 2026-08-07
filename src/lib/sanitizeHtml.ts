import sanitizeHtml from "sanitize-html";

/** Strips everything except the basic formatting the admin rich text editor can produce. */
export function sanitizeEventDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "span"],
    allowedAttributes: {
      span: ["style"],
    },
    allowedStyles: {
      span: {
        color: [/^#[0-9a-fA-F]{3,8}$/],
        "font-size": [/^\d+(\.\d+)?px$/],
      },
    },
    disallowedTagsMode: "discard",
  });
}

/**
 * Sanitizes a stored description at render time, on its way into
 * dangerouslySetInnerHTML.
 *
 * Sanitizing on write alone is not enough: rows written before the write-side
 * sanitizer existed were never cleaned, and anything that reaches the table by
 * another path (a migration, a manual edit in the Supabase dashboard, a future
 * code path that forgets) would render raw. Sanitizing here makes the render
 * site itself safe regardless of how the row got there. It's idempotent, so
 * running on both sides costs nothing.
 *
 * Server-only — sanitize-html cannot run in a Client Component, so call this
 * before passing rows across the boundary.
 */
export function sanitizeStoredDescription(html: string | null | undefined): string {
  return html ? sanitizeEventDescription(html) : "";
}

/** Returns a copy of the row with its description sanitized for rendering. */
export function withSanitizedDescription<T extends { description: string | null }>(row: T): T {
  return { ...row, description: sanitizeStoredDescription(row.description) };
}
