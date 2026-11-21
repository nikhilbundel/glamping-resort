/** Turns change-log entries into plain text that can be pasted to Claude. Works in the browser and on the server. */
export type LogEntry = {
  id: string;
  createdAt: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  details: {
    where?: string;
    changes?: { path: string; from?: unknown; to?: unknown }[];
    snapshot?: unknown;
    order?: string[];
    note?: string;
  } | null;
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function val(v: unknown, indent: string): string {
  if (v === undefined) return '(nothing)';
  if (v === null || v === '') return '(empty)';
  if (typeof v === 'string') {
    if (v.includes('\n')) return `\n${v.split('\n').map((l) => `${indent}    | ${l}`).join('\n')}`;
    return JSON.stringify(v);
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object' && v && 'url' in v && typeof (v as { url: unknown }).url === 'string') {
    const m = v as { url: string; alt?: string };
    return `[image/video ${m.url}${m.alt ? ` alt="${m.alt}"` : ''}]`;
  }
  return JSON.stringify(v);
}

export function entryToText(e: LogEntry, n: number) {
  const lines: string[] = [];
  lines.push(`#${n}  ${fmtTime(e.createdAt)}  ·  ${e.userName}  ·  ${e.action.toUpperCase()} ${e.entity}`);
  lines.push(`    ${e.summary}`);
  const d = e.details;
  if (d?.where) lines.push(`    Where: ${d.where}`);
  if (d?.changes?.length) {
    lines.push('    Changes:');
    for (const c of d.changes) {
      if (c.from === undefined && c.to !== undefined) lines.push(`      + ${c.path}: ${val(c.to, '      ')}   (added)`);
      else if (c.to === undefined && c.from !== undefined) lines.push(`      - ${c.path}: ${val(c.from, '      ')}   (removed)`);
      else if (Array.isArray(c.from) || Array.isArray(c.to)) {
        lines.push(`      • ${c.path}:`);
        lines.push(`          before: ${val(c.from, '          ')}`);
        lines.push(`          after:  ${val(c.to, '          ')}`);
      } else lines.push(`      • ${c.path}: ${val(c.from, '      ')} → ${val(c.to, '      ')}`);
    }
  } else if (d && !d.snapshot && !d.order && !d.note && ['update', 'publish'].includes(e.action)) {
    lines.push('    Changes: (nothing changed)');
  }
  if (d?.order?.length) lines.push(`    New order: ${d.order.map((x, i) => `${i + 1}. ${x}`).join('  ')}`);
  if (d?.note) lines.push(...d.note.split('\n').map((l, i) => (i ? `          ${l}` : `    Note: ${l}`)));
  if (d?.snapshot !== undefined) lines.push(`    ${e.action === 'delete' ? 'Content before it was deleted' : 'Content'}: ${JSON.stringify(d.snapshot)}`);
  if (!d && !['login'].includes(e.action)) lines.push('    (logged before detailed tracking was added — no field details)');
  return lines.join('\n');
}

export function changelogText(entries: LogEntry[], opts: { site: string; period: string }) {
  const head = [
    `===== ${opts.site.toUpperCase()} — ADMIN CHANGE LOG =====`,
    `Exported: ${fmtTime(new Date().toISOString())}  ·  Period: ${opts.period}  ·  ${entries.length} change${entries.length === 1 ? '' : 's'} (oldest first)`,
    'Format: "path: before → after". "+" = added, "-" = removed. Section positions (#n) count from the top of the page.',
  ];
  const body = entries.length ? entries.map((e, i) => entryToText(e, i + 1)).join('\n\n') : '(no changes in this period)';
  return `${head.join('\n')}\n\n${body}\n\n===== END OF CHANGE LOG =====\n`;
}
