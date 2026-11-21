import sanitizeHtml from 'sanitize-html';

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'blockquote', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
    'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'span', 'div', 'mark', 'sub', 'sup',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'title'],
    th: ['colspan', 'rowspan', 'style'],
    td: ['colspan', 'rowspan', 'style'],
    '*': ['class', 'id', 'style'],
  },
  allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//.test(attribs.href || '');
      return {
        tagName,
        attribs: external ? { ...attribs, rel: 'noopener noreferrer', target: attribs.target || '_blank' } : attribs,
      };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
  },
};

/** Sanitize rich text (TipTap HTML) before rendering. Always call on render. */
export function sanitize(html?: string | null) {
  if (!html) return '';
  return sanitizeHtml(html, options);
}
