'use client';

import { useMemo, useState } from 'react';
import { icons } from 'lucide-react';
import { Btn, Input, Modal } from '../ui';
import { cn } from '@/lib/utils';

const ALL = Object.keys(icons) as (keyof typeof icons)[];
const SUGGESTED = ['Mountain', 'MountainSnow', 'Tent', 'TreePine', 'Trees', 'Leaf', 'Sun', 'Moon', 'Stars', 'Snowflake', 'Flame', 'Coffee', 'UtensilsCrossed', 'Wine', 'Bath', 'Waves', 'Flower2', 'Sparkles', 'Wifi', 'Car', 'CircleParking', 'Dog', 'Baby', 'BedDouble', 'BedSingle', 'Sofa', 'Heater', 'AirVent', 'Tv', 'Laptop', 'ShowerHead', 'Bike', 'Footprints', 'Camera', 'Binoculars', 'Map', 'Compass', 'HeartPulse', 'Music', 'BookOpen', 'Check', 'ShieldCheck', 'Clock', 'Phone', 'Recycle', 'Sprout', 'Droplets', 'Wind', 'Telescope'];

export function IconPicker({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return SUGGESTED.filter((n) => n in icons) as (keyof typeof icons)[];
    return ALL.filter((n) => n.toLowerCase().includes(query)).slice(0, 180);
  }, [q]);
  const Current = value && icons[value as keyof typeof icons];
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700">{Current ? <Current className="h-5 w-5" /> : <span className="text-xs text-zinc-400">—</span>}</span>
        <Btn id={id} onClick={() => setOpen(true)}>
          {value || 'Choose icon'}
        </Btn>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Choose an icon (Lucide)">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 1,500+ icons — e.g. tree, wifi, bath" aria-label="Search icons" className="mb-4" />
        <ul className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {list.map((name) => {
            const I = icons[name];
            return (
              <li key={name}>
                <button
                  type="button"
                  title={name}
                  aria-label={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className={cn('flex aspect-square w-full items-center justify-center rounded-lg border hover:border-emerald-600', value === name ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-zinc-200 dark:border-zinc-800')}
                >
                  <I className="h-5 w-5" />
                </button>
              </li>
            );
          })}
        </ul>
        {!q && <p className="mt-3 text-xs text-zinc-500">Showing suggestions. Type to search all icons.</p>}
      </Modal>
    </>
  );
}
