'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Redirect } from '@prisma/client';
import { deleteRedirect, saveRedirect, deleteSubscriber, inviteUser, updateUser, deleteUser, resetUserPassword, changeOwnPassword } from '@/app/admin/_actions/admin-misc';
import { Badge, Btn, Card, Empty, Input, Label, Modal, Select, Switch } from '../ui';
import { formatDate } from '@/lib/utils';

// ── Redirects ──
export function RedirectsManager({ initial }: { initial: Redirect[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Partial<Redirect> | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const r = await saveRedirect(edit?.id || null, { from: edit?.from, to: edit?.to, type: edit?.type || 301, active: edit?.active ?? true });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success('Redirect saved (live within ~30 seconds)');
    setEdit(null);
    router.refresh();
  };
  return (
    <Card title={`Redirects (${initial.length})`} actions={<Btn size="sm" variant="primary" onClick={() => setEdit({ type: 301, active: true, from: '', to: '' })}><Plus className="h-4 w-4" /> Add redirect</Btn>}>
      {!initial.length ? <Empty>No redirects yet.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="py-2">From</th><th>To</th><th>Type</th><th>Hits</th><th>Active</th><th className="text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {initial.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 font-mono text-xs">{r.from}</td>
                  <td className="max-w-xs truncate font-mono text-xs">{r.to}</td>
                  <td><Badge tone={r.type === 301 ? 'green' : 'amber'}>{r.type}</Badge></td>
                  <td>{r.hits}</td>
                  <td>{r.active ? 'Yes' : 'No'}</td>
                  <td className="text-right">
                    <Btn size="sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></Btn>
                    <Btn size="sm" variant="ghost" className="text-red-600" aria-label="Delete" onClick={async () => { if (!confirm('Delete redirect?')) return; const res = await deleteRedirect(r.id); if (!res.ok) return toast.error(res.error); router.refresh(); }}><Trash2 className="h-4 w-4" /></Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit redirect' : 'New redirect'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={save}>Save</Btn></>}>
        {edit && (
          <div className="space-y-4">
            <div><Label htmlFor="r-from" required>From path</Label><Input id="r-from" value={edit.from || ''} onChange={(e) => setEdit({ ...edit, from: e.target.value })} placeholder="/old-page" /></div>
            <div><Label htmlFor="r-to" required>To (path or full URL)</Label><Input id="r-to" value={edit.to || ''} onChange={(e) => setEdit({ ...edit, to: e.target.value })} placeholder="/new-page or https://…" /></div>
            <div className="flex items-end gap-6">
              <div className="w-48"><Label htmlFor="r-type">Type</Label><Select id="r-type" value={edit.type || 301} onChange={(e) => setEdit({ ...edit, type: Number(e.target.value) })}><option value={301}>301 — permanent</option><option value={302}>302 — temporary</option></Select></div>
              <div className="flex items-center gap-2 pb-2"><Switch checked={edit.active ?? true} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" /> Active</div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

// ── Subscribers ──
export function SubscribersTable({ initial }: { initial: { id: string; email: string; source: string | null; createdAt: Date }[] }) {
  const [rows, setRows] = useState(initial);
  return (
    <Card title={`Subscribers (${rows.length})`} actions={<a href="/api/export/subscribers" className="inline-flex h-8 items-center rounded-lg border border-zinc-300 px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700">Export CSV</a>}>
      {!rows.length ? <Empty>No subscribers yet.</Empty> : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="py-2">Email</th><th>Source</th><th>Subscribed</th><th /></tr></thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2">{r.email}</td><td>{r.source || '—'}</td><td>{formatDate(r.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="text-right"><Btn size="sm" variant="ghost" className="text-red-600" aria-label={`Remove ${r.email}`} onClick={async () => { if (!confirm(`Remove ${r.email}?`)) return; const res = await deleteSubscriber(r.id); if (!res.ok) return toast.error(res.error); setRows((a) => a.filter((x) => x.id !== r.id)); }}><Trash2 className="h-4 w-4" /></Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ── Users ──
type U = { id: string; name: string; email: string; role: 'SUPER_ADMIN' | 'EDITOR'; active: boolean; lastLoginAt: Date | null };
export function UsersManager({ initial, me }: { initial: U[]; me: string }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Partial<U> | null>(null);
  const [secret, setSecret] = useState<{ email: string; password: string; emailed?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const payload = { name: edit?.name, email: edit?.email, role: edit?.role || 'EDITOR', active: edit?.active ?? true };
    const r = edit?.id ? await updateUser(edit.id, payload) : await inviteUser(payload);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    if (!edit?.id && r.data) setSecret({ email: String(edit?.email), ...(r.data as { password: string; emailed: boolean }) });
    toast.success(edit?.id ? 'User updated' : 'User invited');
    setEdit(null);
    router.refresh();
  };
  return (
    <Card title={`Users (${initial.length})`} actions={<Btn size="sm" variant="primary" onClick={() => setEdit({ role: 'EDITOR', active: true })}><Plus className="h-4 w-4" /> Invite user</Btn>}>
      <p className="mb-4 text-sm text-zinc-500">Editors can manage all content, media and enquiries. Only Super Admins can change users, theme, analytics and maintenance mode.</p>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="py-2">User</th><th>Role</th><th>Status</th><th>Last login</th><th className="text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {initial.map((u) => (
            <tr key={u.id}>
              <td className="py-2"><span className="font-medium">{u.name}</span>{u.id === me && <span className="ml-1 text-xs text-zinc-400">(you)</span>}<span className="block text-xs text-zinc-500">{u.email}</span></td>
              <td><Badge tone={u.role === 'SUPER_ADMIN' ? 'green' : 'blue'}>{u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Editor'}</Badge></td>
              <td>{u.active ? 'Active' : <Badge tone="red">Disabled</Badge>}</td>
              <td className="text-zinc-500">{u.lastLoginAt ? formatDate(u.lastLoginAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}</td>
              <td className="text-right">
                <Btn size="sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(u)}><Pencil className="h-4 w-4" /></Btn>
                <Btn size="sm" variant="ghost" aria-label="Reset password" onClick={async () => { if (!confirm(`Generate a new temporary password for ${u.email}?`)) return; const r = await resetUserPassword(u.id); if (!r.ok) return toast.error(r.error); setSecret({ email: u.email, password: r.data.password }); }}><KeyRound className="h-4 w-4" /></Btn>
                {u.id !== me && <Btn size="sm" variant="ghost" className="text-red-600" aria-label="Delete" onClick={async () => { if (!confirm(`Delete ${u.email}?`)) return; const r = await deleteUser(u.id); if (!r.ok) return toast.error(r.error); router.refresh(); }}><Trash2 className="h-4 w-4" /></Btn>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit user' : 'Invite user'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={save}>{edit?.id ? 'Save' : 'Send invite'}</Btn></>}>
        {edit && (
          <div className="space-y-4">
            <div><Label htmlFor="u-name" required>Name</Label><Input id="u-name" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div><Label htmlFor="u-email" required>Email</Label><Input id="u-email" type="email" value={edit.email || ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            <div className="flex items-end gap-6">
              <div className="w-48"><Label htmlFor="u-role">Role</Label><Select id="u-role" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as U['role'] })}><option value="EDITOR">Editor</option><option value="SUPER_ADMIN">Super Admin</option></Select></div>
              <div className="flex items-center gap-2 pb-2"><Switch checked={edit.active ?? true} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" /> Active</div>
            </div>
            {!edit.id && <p className="text-xs text-zinc-500">A temporary password is generated, shown once, and emailed if SMTP is configured.</p>}
          </div>
        )}
      </Modal>
      <Modal open={!!secret} onClose={() => setSecret(null)} title="Temporary password" footer={<Btn variant="primary" onClick={() => setSecret(null)}>Done</Btn>}>
        {secret && (
          <div className="space-y-3 text-sm">
            <p>Share this with <b>{secret.email}</b> securely. It won’t be shown again.{secret.emailed && ' It was also emailed to them.'}</p>
            <p className="rounded-lg bg-zinc-100 p-3 font-mono text-base dark:bg-zinc-800">{secret.password}</p>
            <Btn size="sm" onClick={() => { navigator.clipboard.writeText(secret.password); toast.success('Copied'); }}>Copy</Btn>
          </div>
        )}
      </Modal>
    </Card>
  );
}

export function ChangePassword() {
  const [v, setV] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Change password" className="max-w-lg">
      <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await changeOwnPassword(v); setBusy(false); if (!r.ok) return toast.error(r.error); toast.success('Password changed — please sign in again'); setTimeout(() => { window.location.href = '/admin/login'; }, 1200); }}>
        <div><Label htmlFor="pw-c" required>Current password</Label><Input id="pw-c" type="password" autoComplete="current-password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} /></div>
        <div><Label htmlFor="pw-n" required>New password (min 10 characters)</Label><Input id="pw-n" type="password" autoComplete="new-password" value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} /></div>
        <div><Label htmlFor="pw-r" required>Confirm new password</Label><Input id="pw-r" type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} /></div>
        <Btn type="submit" variant="primary" loading={busy}>Update password</Btn>
      </form>
    </Card>
  );
}
