import DOMPurify from 'dompurify';

const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'strong', 'i', 'em', 's', 'strike', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel', 'style', 'data-*'],
  ALLOW_DATA_ATTR: true,
  KEEP_CONTENT: true,
};

// Configure DOMPurify to allow target="_blank" on links
DOMPurify.addHook('afterSanitizeAttributes', function(node) {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const sanitized = DOMPurify.sanitize(html, CONFIG);
  // Log if there are links in the output
  if (sanitized.includes('<a ')) {
    console.log('[sanitizeHtml] Links found:', sanitized.match(/<a[^>]*>/g));
  }
  return sanitized;
}
