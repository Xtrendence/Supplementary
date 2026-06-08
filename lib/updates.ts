import { Alert, Platform } from "react-native";
import * as Application from "expo-application";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { getAutoUpdate } from "./preferences";

const REPO = "Xtrendence/Supplementary";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;

export interface UpdateInfo {
  version: string;
  notes: string;
  apkUrl: string;
}

export function currentVersion(): string {
  return Application.nativeApplicationVersion ?? "0.0.0";
}

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isFinite(n));
}

function isNewer(remote: string, local: string): boolean {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const a = r[i] ?? 0;
    const b = l[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

interface GithubAsset {
  name?: string;
  browser_download_url?: string;
}

interface GithubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  assets?: GithubAsset[];
}

/**
 * Queries the repo's latest GitHub release and returns update info if it
 * bundles an APK newer than the installed version. Android only.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (Platform.OS !== "android") return null;

  const res = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);

  const data = (await res.json()) as GithubRelease;
  const tag = data.tag_name ?? data.name ?? "";
  const version = tag.replace(/^v/i, "");
  const asset = (data.assets ?? []).find(
    (a) => typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk")
  );

  if (!version || !asset?.browser_download_url) return null;
  if (!isNewer(version, currentVersion())) return null;

  return { version, notes: data.body ?? "", apkUrl: asset.browser_download_url };
}

export type ProgressCallback = (fraction: number) => void;

/**
 * Downloads the release APK and hands it to the Android package installer.
 * The user confirms the system install prompt (requires "install unknown
 * apps" permission, which Android requests on first use).
 */
export async function downloadAndInstall(
  info: UpdateInfo,
  onProgress?: ProgressCallback
): Promise<void> {
  const target = `${FileSystem.cacheDirectory}supplementary-${info.version}.apk`;

  try {
    await FileSystem.deleteAsync(target, { idempotent: true });
  } catch {
    // ignore — nothing to clean up
  }

  const download = FileSystem.createDownloadResumable(
    info.apkUrl,
    target,
    {},
    (p) => {
      if (onProgress && p.totalBytesExpectedToWrite > 0) {
        onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      }
    }
  );

  const result = await download.downloadAsync();
  if (!result?.uri) throw new Error("Download failed");

  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync(
    "android.intent.action.INSTALL_PACKAGE",
    { data: contentUri, flags: 1 }
  );
}

let promptedThisSession = false;

/**
 * Launch-time check: if enabled and an update exists, prompt once per session.
 * Network/parse failures are swallowed so a flaky connection never blocks the app.
 */
export async function maybePromptUpdate(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (promptedThisSession || !getAutoUpdate()) return;

  let info: UpdateInfo | null = null;
  try {
    info = await checkForUpdate();
  } catch {
    return;
  }
  if (!info) return;

  promptedThisSession = true;
  Alert.alert(
    `Update available — v${info.version}`,
    info.notes ? info.notes.slice(0, 400) : "A new version is ready to install.",
    [
      { text: "Later", style: "cancel" },
      {
        text: "Install",
        onPress: () => {
          downloadAndInstall(info).catch((error) =>
            Alert.alert("Update failed", String(error))
          );
        },
      },
    ]
  );
}
