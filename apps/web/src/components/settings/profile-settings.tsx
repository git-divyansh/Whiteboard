'use client';

import { AVATAR_PRESETS } from '@whiteboard/shared';
import { Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Resize/crop an image file to a 128px square avatar data URL. Encodes as WebP
 * (much smaller than JPEG at the same quality), falling back to JPEG on browsers
 * without WebP encoding support.
 */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  const webp = canvas.toDataURL('image/webp', 0.82);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82);
}

export function ProfileSettings({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState(name ?? '');
  const [avatar, setAvatar] = React.useState<string | null>(image);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function save(body: {
    name?: string;
    image?: string | null;
    avatarPreset?: number;
  }): Promise<boolean> {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        router.push('/login');
        return false;
      }
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(b?.error?.message ?? 'Could not save.');
        return false;
      }
      setNotice('Saved.');
      router.refresh();
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setPending(false);
    }
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatar(dataUrl);
      await save({ image: dataUrl });
    } catch {
      setError('Could not process that image.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <section className="rounded-xl border p-6">
      <h2 className="text-lg font-medium">Profile</h2>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xl font-semibold">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            (displayName || email).slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void onFile(e)}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload />
            Upload avatar
          </Button>
          {avatar ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setAvatar(null);
                void save({ image: null });
              }}
            >
              <Trash2 />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Or pick a preset</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_PRESETS.map((preset, index) => (
            <button
              key={preset}
              type="button"
              disabled={pending}
              aria-label={`Preset avatar ${index + 1}`}
              onClick={() => {
                setAvatar(preset);
                void save({ avatarPreset: index });
              }}
              className={cn(
                'size-10 overflow-hidden rounded-full border-2 transition disabled:opacity-50',
                avatar === preset
                  ? 'border-foreground'
                  : 'border-transparent hover:border-muted-foreground',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preset} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 max-w-sm space-y-4">
        <div className="space-y-1">
          <label htmlFor="displayName" className="text-sm font-medium">
            Display name
          </label>
          <div className="flex gap-2">
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="button"
              disabled={pending || !displayName.trim() || displayName.trim() === (name ?? '')}
              onClick={() => void save({ name: displayName.trim() })}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            value={email}
            disabled
            className="h-9 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}
      </div>
    </section>
  );
}
