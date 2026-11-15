import { Camera } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { uploadAvatar } from "@/lib/dashboard/avatar";

import { Avatar } from "./kit";

export function AvatarPicker({
  userId,
  name,
  src,
  onDone,
}: {
  userId: string;
  name: string;
  src: string | null;
  onDone: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadAvatar(userId, file);
      toast.success("Photo updated");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="flex items-center gap-4">
      <Avatar src={src} name={name} className="size-20 text-base" />
      <div>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-border px-3 text-sm transition-colors hover:bg-mist disabled:opacity-50"
        >
          <Camera className="size-4" />
          {busy ? "Uploading…" : src ? "Change photo" : "Upload photo"}
        </button>
        <p className="mt-1.5 text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
