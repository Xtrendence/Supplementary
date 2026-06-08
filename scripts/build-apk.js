const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const versionFile = path.join(__dirname, ".apk-version");
const apkPath = path.join(
  root,
  "android/app/build/outputs/apk/release/app-release.apk"
);

function nextVersion() {
  if (!fs.existsSync(versionFile)) return 1.0;
  const prev = Number.parseFloat(fs.readFileSync(versionFile, "utf8").trim());
  if (!Number.isFinite(prev)) return 1.0;
  return (Math.round(prev * 10) + 1) / 10;
}

const version = nextVersion();
const versionStr = version.toFixed(1);
const fileName = `Supplementary-V.${versionStr}.apk`;
const dest = path.join(os.homedir(), "Desktop", fileName);

const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

console.log(`\nBuilding ${fileName} …\n`);
execSync(`${gradlew} assembleRelease`, {
  cwd: path.join(root, "android"),
  stdio: "inherit",
});

if (!fs.existsSync(apkPath)) {
  console.error(`\nBuild finished but APK not found at:\n  ${apkPath}`);
  process.exit(1);
}

fs.copyFileSync(apkPath, dest);
fs.writeFileSync(versionFile, versionStr);

console.log(`\n✔ ${fileName}\n  copied to ${dest}\n`);
