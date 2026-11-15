import { supabase } from "@/integrations/supabase/client";

/** Uploads a profile photo for `userId` and saves its link on the profile. */
export async function uploadAvatar(userId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Photo must be under 5 MB.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const up = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) throw new Error(up.error.message);
  const signed = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error) throw new Error(signed.error.message);
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: signed.data.signedUrl })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return signed.data.signedUrl;
}
