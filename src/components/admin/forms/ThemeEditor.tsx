'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, RotateCcw, Save } from 'lucide-react';
import { saveTheme, resetTheme } from '@/app/admin/_actions/settings';
import { THEME_PRESETS, FONT_PAIRS, matchPreset, COLOR_LABELS, COLOR_TOKENS, HEADING_FONTS, BODY_FONTS, googleFontsHref, themeCss, type Theme } from '@/lib/theme';
import { Btn, Card, Input, Label, Select } from '../ui';
import { useUnsavedGuard } from '../fields/FieldsForm';

export function ThemeEditor({ initial }: { initial: Theme }) {
  const [t, setT] = useState<Theme>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const dirty = JSON.stringify(t) !== saved;
  useUnsavedGuard(dirty);
  const css = useMemo(() => themeCss(t).replace(':root', '.theme-preview'), [t]);

  const save = async () => {
    setBusy(true);
    const r = await saveTheme(t);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    setSaved(JSON.stringify(t));
    toast.success('Theme saved — live site updated');
    router.refresh();
  };
  const reset = async () => {
    if (!confirm('Reset all theme settings to the defaults?')) return;
    const r = await resetTheme();
    if (!r.ok) return toast.error(r.error);
    setT(r.data);
    setSaved(JSON.stringify(r.data));
    toast.success('Theme reset');
  };

  const active = matchPreset(t);
  const presets = (
    <Card title="Theme presets" className="mb-6">
      <p className="mb-4 text-sm text-zinc-500">Click a preset to load its colours, fonts and shapes into the editor, then press <b>Save theme</b>. Change anything afterwards to make it your own custom theme.</p>
      {THEME_PRESETS.map((p) => <link key={p.id} rel="stylesheet" href={googleFontsHref(p.theme)} />)}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="theme-presets">
        {THEME_PRESETS.map((p) => {
          const on = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => setT({ ...JSON.parse(JSON.stringify(p.theme)), buttonStyle: t.buttonStyle || 'solid', textSizes: t.textSizes })}
              className={`relative rounded-xl border p-3 text-left transition hover:shadow-md ${on ? 'border-emerald-600 ring-2 ring-emerald-600/30' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              <span className="mb-2 flex h-10 overflow-hidden rounded-lg border border-black/5">
                {(['primary', 'accent', 'bg', 'button'] as const).map((k) => <span key={k} className="flex-1" style={{ background: p.theme.colors[k] }} />)}
              </span>
              <span className="block text-sm font-semibold" style={{ fontFamily: `'${p.theme.headingFont}', serif` }}>{p.name}</span>
              <span className="block text-xs text-zinc-500">{p.description}</span>
              <span className="mt-1 block text-[11px] text-zinc-400">{p.theme.headingFont} · {p.theme.bodyFont}</span>
              {on && <span className="absolute right-2 top-2 rounded-full bg-emerald-600 p-0.5 text-white"><Check className="h-3 w-3" /></span>}
            </button>
          );
        })}
        <div className={`rounded-xl border border-dashed p-3 text-left ${!active ? 'border-emerald-600 ring-2 ring-emerald-600/30' : 'border-zinc-300 dark:border-zinc-700'}`}>
          <span className="mb-2 flex h-10 overflow-hidden rounded-lg border border-black/5">
            {(['primary', 'accent', 'bg', 'button'] as const).map((k) => <span key={k} className="flex-1" style={{ background: t.colors[k] }} />)}
          </span>
          <span className="block text-sm font-semibold">Custom</span>
          <span className="block text-xs text-zinc-500">{active ? 'Edit any colour or font below to create your own.' : 'You are using your own custom theme.'}</span>
        </div>
      </div>
      {dirty && <p className="mt-3 text-sm font-medium text-amber-700">Unsaved changes — press “Save theme” to apply them to the live site.</p>}
    </Card>
  );

  return (
    <>
    {presets}
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="space-y-6">
        <Card title="Colors">
          <div className="mb-4 flex flex-wrap gap-2">
            <Btn size="sm" onClick={() => setT({ ...t, colors: { ...t.colors, button: '#111111', 'button-text': '#FFFFFF' } })}>Black buttons</Btn>
            <Btn size="sm" onClick={() => setT({ ...t, buttonRadius: 0, buttonStyle: 'outline' })}>Square outline buttons</Btn>
            <Btn size="sm" onClick={() => setT({ ...t, colors: { ...t.colors, button: t.colors.accent, 'button-text': '#FFFFFF' } })}>Buttons = accent colour</Btn>
          </div>
          <div className="space-y-3">
            {COLOR_TOKENS.map((k) => (
              <div key={k} className="flex items-center gap-3">
                <input type="color" aria-label={`${COLOR_LABELS[k]} picker`} value={t.colors[k]} onChange={(e) => setT({ ...t, colors: { ...t.colors, [k]: e.target.value.toUpperCase() } })} className="h-9 w-11 cursor-pointer rounded border border-zinc-300 bg-transparent dark:border-zinc-700" />
                <label htmlFor={`c-${k}`} className="flex-1 text-sm">
                  {COLOR_LABELS[k]}
                  <span className="block text-xs text-zinc-500">--{k}</span>
                </label>
                <Input id={`c-${k}`} value={t.colors[k]} onChange={(e) => setT({ ...t, colors: { ...t.colors, [k]: e.target.value } })} className="w-28 font-mono text-xs" />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Text sizes (whole website)">
          <p className="mb-4 text-sm text-zinc-500">100% = normal. Every section can also be adjusted on its own (open the section → “Text sizes”). Only the size changes — alignment stays the same.</p>
          <div className="space-y-4">
            {([
              ['eyebrow', 'Small labels above headings (e.g. GLAMPING DOME)', 50, 400],
              ['heading', 'Section headings', 50, 250],
              ['title', 'Card / item titles', 50, 250],
              ['body', 'Paragraph & list text', 60, 200],
            ] as const).map(([k, label, min, max]) => {
              const val = t.textSizes?.[k] ?? 100;
              return (
                <div key={k}>
                  <Label htmlFor={`ts-${k}`}>{label}: {val}%</Label>
                  <div className="flex items-center gap-3">
                    <input id={`ts-${k}`} type="range" min={min} max={max} step={5} value={val} onChange={(e) => setT({ ...t, textSizes: { eyebrow: 100, heading: 100, title: 100, body: 100, ...t.textSizes, [k]: Number(e.target.value) } })} className="w-full accent-emerald-700" />
                    <button type="button" className="text-xs text-zinc-500 underline" onClick={() => setT({ ...t, textSizes: { eyebrow: 100, heading: 100, title: 100, body: 100, ...t.textSizes, [k]: 100 } })}>reset</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Font pairings">
          <p className="mb-3 text-sm text-zinc-500">One click sets the heading and body font together — your colours stay the same.</p>
          {FONT_PAIRS.map((fp) => <link key={fp.name} rel="stylesheet" href={googleFontsHref({ ...t, headingFont: fp.heading, bodyFont: fp.body })} />)}
          <div className="grid gap-2 sm:grid-cols-2" data-testid="font-pairs">
            {FONT_PAIRS.map((fp) => {
              const on = t.headingFont === fp.heading && t.bodyFont === fp.body;
              return (
                <button
                  key={fp.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setT({ ...t, headingFont: fp.heading, bodyFont: fp.body })}
                  className={`rounded-lg border p-3 text-left transition hover:shadow-sm ${on ? 'border-emerald-600 ring-2 ring-emerald-600/30' : 'border-zinc-200 dark:border-zinc-800'}`}
                >
                  <span className="block text-xl leading-tight" style={{ fontFamily: `'${fp.heading}', serif` }}>{fp.name}</span>
                  <span className="mt-1 block text-xs text-zinc-500" style={{ fontFamily: `'${fp.body}', sans-serif` }}>{fp.mood} — the quick brown fox at Cheog.</span>
                  <span className="mt-1 block text-[11px] text-zinc-400">{fp.heading} + {fp.body}</span>
                </button>
              );
            })}
          </div>
        </Card>
        <Card title="Typography & shape">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="hf">Heading font</Label>
              <Select id="hf" value={t.headingFont} onChange={(e) => setT({ ...t, headingFont: e.target.value })}>
                {HEADING_FONTS.map((f) => <option key={f}>{f}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="bf">Body font</Label>
              <Select id="bf" value={t.bodyFont} onChange={(e) => setT({ ...t, bodyFont: e.target.value })}>
                {BODY_FONTS.map((f) => <option key={f}>{f}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="br">Button radius: {t.buttonRadius >= 100 ? 'pill' : `${t.buttonRadius}px`}</Label>
              <input id="br" type="range" min={0} max={100} value={Math.min(100, t.buttonRadius)} onChange={(e) => setT({ ...t, buttonRadius: Number(e.target.value) >= 100 ? 999 : Number(e.target.value) })} className="w-full accent-emerald-700" />
            </div>
            <div>
              <Label htmlFor="cr">Card radius: {t.cardRadius}px</Label>
              <input id="cr" type="range" min={0} max={32} value={t.cardRadius} onChange={(e) => setT({ ...t, cardRadius: Number(e.target.value) })} className="w-full accent-emerald-700" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bs">Button style</Label>
              <Select id="bs" value={t.buttonStyle || 'solid'} onChange={(e) => setT({ ...t, buttonStyle: e.target.value as Theme['buttonStyle'] })}>
                <option value="solid">Solid (filled)</option>
                <option value="outline">Outline (thin border, fills in on hover)</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="sp">Section spacing</Label>
              <Select id="sp" value={t.sectionSpacing} onChange={(e) => setT({ ...t, sectionSpacing: e.target.value as Theme['sectionSpacing'] })}>
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="airy">Airy</option>
              </Select>
            </div>
          </div>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={save} loading={busy} disabled={!dirty}>
            <Save className="h-4 w-4" /> Save theme
          </Btn>
          <Btn onClick={() => setT(JSON.parse(saved))} disabled={!dirty}>Undo changes</Btn>
          <Btn variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Btn>
        </div>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <p className="mb-2 text-sm font-medium">Live preview</p>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={googleFontsHref(t)} />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="theme-preview overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
          <div className="relative px-8 py-14 text-center text-white" style={{ background: 'linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.45)), var(--primary-dark)' }}>
            <p className="text-xs uppercase" style={{ letterSpacing: '0.2em' }}>Eco-luxury glamping</p>
            <p className="mt-3 text-5xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Sleep under the stars</p>
            <span className="mt-6 inline-block px-6 py-3 text-sm" style={t.buttonStyle === 'outline' ? { border: '1px solid #fff', color: '#fff', borderRadius: 'var(--radius-btn)' } : { background: 'var(--button)', color: 'var(--button-text)', borderRadius: 'var(--radius-btn)' }}>Book Now</span>
          </div>
          <div className="grid gap-5 p-8 sm:grid-cols-2">
            <div>
              <p className="uppercase" style={{ letterSpacing: '0.2em', color: 'var(--accent)', fontSize: `calc(12px * var(--ts-eyebrow))`, lineHeight: 1.3 }}>Our domes</p>
              <p className="mt-2 font-semibold" style={{ fontFamily: 'var(--font-heading)', fontSize: `calc(1.875rem * var(--ts-heading))`, lineHeight: 1.15 }}>A room with the whole sky</p>
              <p className="mt-3" style={{ color: 'var(--muted)', lineHeight: 1.7, fontSize: `calc(0.875rem * var(--ts-body))` }}>Body text uses the body font with comfortable line height for long reading.</p>
              <div className="mt-5 flex gap-3">
                <span className="px-5 py-2.5 text-sm" style={t.buttonStyle === 'outline' ? { border: '1px solid var(--button)', color: 'var(--button)', borderRadius: 'var(--radius-btn)' } : { background: 'var(--button)', color: 'var(--button-text)', borderRadius: 'var(--radius-btn)' }}>Primary</span>
                <span className="border px-5 py-2.5 text-sm" style={{ borderColor: 'var(--text)', borderRadius: 'var(--radius-btn)' }}>Secondary</span>
              </div>
            </div>
            <div className="p-5" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', boxShadow: '0 10px 30px rgba(0,0,0,.06)', border: '1px solid var(--border)' }}>
              <p className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Card title</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Cards use the surface color, card radius and soft shadow.</p>
              <p className="mt-4 text-sm font-medium" style={{ color: 'var(--accent)' }}>Read more →</p>
            </div>
          </div>
          <div className="px-8 py-6 text-sm text-white" style={{ background: 'var(--primary)' }}>Primary band / footer color</div>
        </div>
      </div>
    </div>
    </>
  );
}
