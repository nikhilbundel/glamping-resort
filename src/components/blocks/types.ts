import type { Settings } from '@/lib/data';

export type BlockCtx = { pageSlug: string; firstIsH1: boolean; settings: Settings; draft: boolean };
export type BlockProps = { data: Record<string, any>; ctx: BlockCtx };
