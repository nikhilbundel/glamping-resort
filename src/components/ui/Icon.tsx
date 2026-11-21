import { icons, type LucideProps } from 'lucide-react';

export type IconName = keyof typeof icons;

/** Render any Lucide icon by name (PascalCase, e.g. "Mountain"). Falls back to Sparkles. */
export function Icon({ name, ...props }: { name?: string | null } & LucideProps) {
  const key = (name || 'Sparkles').replace(/(^|[-_ ])(\w)/g, (_, __, c: string) => c.toUpperCase()) as IconName;
  const Cmp = icons[key] || icons.Sparkles;
  return <Cmp aria-hidden="true" {...props} />;
}
