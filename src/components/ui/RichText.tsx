import { sanitize } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

export function RichText({ html, className, onDark }: { html?: string | null; className?: string; onDark?: boolean }) {
  if (!html) return null;
  return (
    <div
      className={cn(
        'prose max-w-none font-body prose-headings:font-heading prose-headings:font-semibold prose-a:text-accent prose-img:rounded-card prose-table:text-sm prose-th:bg-primary/5 prose-th:px-3 prose-td:px-3',
        onDark ? 'prose-invert' : 'prose-p:text-ink/80 prose-li:text-ink/80',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  );
}
