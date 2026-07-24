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
