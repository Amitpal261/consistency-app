// Using the "/legacy" import path on purpose — expo-file-system's newer API
// (SDK 54+) changed shape, but the classic promise-based functions we use
// below (getInfoAsync, makeDirectoryAsync, copyAsync, deleteAsync,
// documentDirectory) are guaranteed stable there.
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";

const RINGTONE_DIR = `${FileSystem.documentDirectory}ringtones/`;

async function ensureRingtoneDir() {
  const info = await FileSystem.getInfoAsync(RINGTONE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RINGTONE_DIR, { intermediates: true });
  }
}

export type PickedRingtone = { uri: string; name: string };

/**
 * Opens the system file picker so the user can pick any local audio file
 * (mp3/wav/m4a/ogg) from their phone to use as a habit's alarm sound.
 *
 * The picked file is copied into the app's own private storage
 * (FileSystem.documentDirectory) so it:
 *  - keeps working even if the user deletes/moves the original file
 *  - can be read directly by the native Android alarm service without
 *    needing any extra storage permission (it's inside the app's sandbox)
 *
 * Returns null if the user cancels the picker.
 */
export async function pickCustomRingtone(): Promise<PickedRingtone | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  await ensureRingtoneDir();

  const extension = asset.name.includes(".") ? asset.name.split(".").pop() : "mp3";
  const destination = `${RINGTONE_DIR}${Date.now()}.${extension}`;

  await FileSystem.copyAsync({ from: asset.uri, to: destination });

  return { uri: destination, name: asset.name };
}

/** Deletes a previously-picked custom ringtone file (e.g. when replacing it). */
export async function deleteCustomRingtone(uri: string) {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // File might already be gone — safe to ignore.
  }
}