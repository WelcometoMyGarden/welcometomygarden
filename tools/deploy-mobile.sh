#!/bin/bash
# deploy-mobile.sh — Interactive script to build and deploy the Capacitor mobile apps to Play Console / App Store Connect
# Designed on and for macOS Sequoia, probably not Linux-compatible in parts.
# Generated almost entirely by Sonnet 4.6.
#
# Usage:
#   ./tools/deploy-mobile.sh [options]
#
# Options:
#   -e, --env ENV              Target environment: prod (default), beta, or staging
#   -p, --platform PLAT        Platform(s) to process: ios, android, or both (default: both)
#       --version VER          Override semver version for both platforms (default: bump patch)
#       --android-build N      Override Android versionCode (default: current + 1)
#       --ios-build N          Override iOS build number (default: current + 1)
#   -h, --help                 Show this help message

set -euo pipefail

# ─── Colours ────────────────────────────────────────────────────────────────
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

info()    { echo -e "${BLUE}▶${RESET} $*"; }
success() { echo -e "${GREEN}✔${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
error()   { echo -e "${RED}✖${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}$*${RESET}"; }
prompt()  { echo -e "${YELLOW}?${RESET} $*"; }

# ─── Defaults ───────────────────────────────────────────────────────────────
ENV="prod"
PLATFORM="both"
OPT_VERSION=""       # empty = auto bump patch
OPT_ANDROID_BUILD="" # empty = auto increment
OPT_IOS_BUILD=""     # empty = auto increment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── Parse arguments ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)           ENV="$2";             shift 2 ;;
    -p|--platform)      PLATFORM="$2";        shift 2 ;;
    --version)          OPT_VERSION="$2";     shift 2 ;;
    --android-build)    OPT_ANDROID_BUILD="$2"; shift 2 ;;
    --ios-build)        OPT_IOS_BUILD="$2";   shift 2 ;;
    -h|--help)
      sed -n '2,16p' "$0" | sed 's/^# \?//'
      exit 0 ;;
    *)
      error "Unknown option: $1"
      exit 1 ;;
  esac
done

# ─── Validate args ───────────────────────────────────────────────────────────
if [[ "$ENV" != "prod" && "$ENV" != "beta" && "$ENV" != "staging" ]]; then
  error "Invalid environment: $ENV (must be 'prod', 'beta', or 'staging')"
  exit 1
fi
if [[ "$PLATFORM" != "both" && "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
  error "Invalid platform: $PLATFORM (must be 'ios', 'android', or 'both')"
  exit 1
fi

DO_ANDROID=false
DO_IOS=false
[[ "$PLATFORM" == "both" || "$PLATFORM" == "android" ]] && DO_ANDROID=true
[[ "$PLATFORM" == "both" || "$PLATFORM" == "ios" ]]     && DO_IOS=true

# ─── Environment-specific config ─────────────────────────────────────────────
# NODE_ENV (passed to `cap sync`) bakes the default server URL into the build. The
# native flavor/scheme is a separate axis: there is no dedicated `beta` Android flavor
# or iOS scheme, so beta ships under the production app identity (prod flavor / "App"
# scheme) — matching capacitor.config.ts, where beta uses ios.scheme "App".
case "$ENV" in
  prod)
    ANDROID_FLAVOR="prod"
    ANDROID_BUILD_TYPE="Release"
    IOS_SCHEME="App"
    ;;
  beta)
    ANDROID_FLAVOR="prod"
    ANDROID_BUILD_TYPE="Release"
    IOS_SCHEME="App"
    ;;
  staging)
    ANDROID_FLAVOR="staging"
    ANDROID_BUILD_TYPE="Release"
    IOS_SCHEME="App Staging"
    ;;
esac

ANDROID_VARIANT="${ANDROID_FLAVOR}${ANDROID_BUILD_TYPE}"   # e.g. prodRelease
ANDROID_BUILD_TYPE_LOWER="$(echo "$ANDROID_BUILD_TYPE" | tr '[:upper:]' '[:lower:]')"
# Standard Gradle AAB output path for product flavors
ANDROID_AAB_PATH="$PROJECT_ROOT/android/app/build/outputs/bundle/${ANDROID_VARIANT}/app-${ANDROID_FLAVOR}-${ANDROID_BUILD_TYPE_LOWER}.aab"

IOS_PROJECT="$PROJECT_ROOT/ios/App/App.xcworkspace"
IOS_PBXPROJ="$PROJECT_ROOT/ios/App/App.xcodeproj/project.pbxproj"
IOS_ARCHIVE_PATH="/tmp/wtmg-${ENV}.xcarchive"
IOS_EXPORT_PATH="/tmp/wtmg-${ENV}-export"

ANDROID_GRADLE="$PROJECT_ROOT/android/app/build.gradle"

# ─── App Store / Play Console links ──────────────────────────────────────────
PLAY_CONSOLE_URL="https://play.google.com/console/u/0/developers/8500628513458158038/app-list"
APP_STORE_CONNECT_URL="https://appstoreconnect.apple.com/apps/6759368622/distribution"

# ─── Helpers ─────────────────────────────────────────────────────────────────
ask_yes_no() {
  local question="$1"
  while true; do
    prompt "$question [y/N] "
    read -r answer
    case "$answer" in
      [Yy]|[Yy][Ee][Ss]) return 0 ;;
      [Nn]|[Nn][Oo]|"")  return 1 ;;
      *) warn "Please answer y or n." ;;
    esac
  done
}

check_tool() {
  if ! command -v "$1" &>/dev/null; then
    error "Required tool not found: $1"
    [[ -n "${2:-}" ]] && error "  → $2"
    exit 1
  fi
}

bump_patch() {
  # bump_patch "1.2.3" → "1.2.4"; tolerates 1- or 2-component versions ("1" → "1.0.1", "1.2" → "1.2.1")
  local ver="$1"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$ver"
  major="${major:-0}"
  minor="${minor:-0}"
  patch="${patch:-0}"
  echo "${major}.${minor}.$((patch + 1))"
}

resolve_android_java_home() {
  # Gradle 8.13 cannot run on Java 24+. Pick a JDK it supports, preferring Android
  # Studio's bundled JBR (the same JDK the signing wizard uses). Override with
  # WTMG_JAVA_HOME. Prints the chosen JAVA_HOME, or returns 1 if none found.
  if [[ -n "${WTMG_JAVA_HOME:-}" ]]; then
    echo "$WTMG_JAVA_HOME"; return 0
  fi
  local candidates=("/Applications/Android Studio.app/Contents/jbr/Contents/Home")
  local v jh
  for v in 21 17; do
    jh="$(/usr/libexec/java_home -v "$v" 2>/dev/null)" && candidates+=("$jh")
  done
  local c
  for c in "${candidates[@]}"; do
    [[ -x "$c/bin/javac" ]] && { echo "$c"; return 0; }
  done
  return 1
}

# ─── Pre-flight checks ───────────────────────────────────────────────────────
header "Pre-flight checks"

if $DO_IOS; then
  check_tool xcodebuild "Install Xcode from the Mac App Store"
  check_tool xcrun
fi
if $DO_ANDROID; then
  if [[ ! -f "$PROJECT_ROOT/android/gradlew" ]]; then
    error "android/gradlew not found"
    exit 1
  fi
fi
check_tool node
check_tool yarn "Install Yarn: corepack enable"

success "All required tools found"

# ─── Read current versions ───────────────────────────────────────────────────
if $DO_ANDROID; then
  CUR_ANDROID_BUILD="$(grep 'versionCode' "$ANDROID_GRADLE" | grep -oE '[0-9]+')"
  CUR_ANDROID_VERSION="$(grep -E '^\s+versionName "' "$ANDROID_GRADLE" | grep -oE '"[^"]+"' | tr -d '"')"
fi
if $DO_IOS; then
  CUR_IOS_BUILD="$(grep 'CURRENT_PROJECT_VERSION' "$IOS_PBXPROJ" | head -1 | grep -oE '[0-9]+')"
  CUR_IOS_VERSION="$(grep 'MARKETING_VERSION' "$IOS_PBXPROJ" | head -1 | grep -oE '[0-9]+(\.[0-9]+){0,2}')"
fi

# ─── Compute new versions ────────────────────────────────────────────────────
# Semver: both platforms share the same version string.
# Use the Android current version as the base when building both; iOS when Android is skipped.
if [[ -n "$OPT_VERSION" ]]; then
  NEW_VERSION="$OPT_VERSION"
elif $DO_ANDROID; then
  NEW_VERSION="$(bump_patch "$CUR_ANDROID_VERSION")"
else
  NEW_VERSION="$(bump_patch "$CUR_IOS_VERSION")"
fi

if $DO_ANDROID; then
  NEW_ANDROID_BUILD="${OPT_ANDROID_BUILD:-$((CUR_ANDROID_BUILD + 1))}"
fi
if $DO_IOS; then
  NEW_IOS_BUILD="${OPT_IOS_BUILD:-$((CUR_IOS_BUILD + 1))}"
fi

# ─── Build plan ──────────────────────────────────────────────────────────────
header "Build plan"
echo "  Environment : ${BOLD}${ENV}${RESET}"
echo "  Platform(s) : ${BOLD}${PLATFORM}${RESET}"
if $DO_ANDROID; then
  echo "  Android version : ${CUR_ANDROID_VERSION} (build ${CUR_ANDROID_BUILD})  →  ${BOLD}${NEW_VERSION} (build ${NEW_ANDROID_BUILD})${RESET}"
  echo "  Android output  : ${ANDROID_AAB_PATH}"
fi
if $DO_IOS; then
  echo "  iOS version     : ${CUR_IOS_VERSION} (build ${CUR_IOS_BUILD})  →  ${BOLD}${NEW_VERSION} (build ${NEW_IOS_BUILD})${RESET}"
  echo "  iOS archive     : ${IOS_ARCHIVE_PATH}"
fi
echo ""

if ! ask_yes_no "Proceed with version bump, cap sync, and builds?"; then
  info "Aborted."
  exit 0
fi

# Each platform's version bump is deferred to just before that platform's build (below),
# so a build failure on one platform doesn't leave the other needlessly bumped.

# ─── Capacitor sync ──────────────────────────────────────────────────────────
header "Capacitor sync (NODE_ENV=${ENV})"
cd "$PROJECT_ROOT"

if $DO_ANDROID && $DO_IOS; then
  NODE_ENV="$ENV" yarn cap sync
elif $DO_ANDROID; then
  NODE_ENV="$ENV" yarn cap sync android
elif $DO_IOS; then
  NODE_ENV="$ENV" yarn cap sync ios
fi

success "cap sync complete"

# ═══════════════════════════════════════════════════════════════════════════════
# ANDROID BUILD
# ═══════════════════════════════════════════════════════════════════════════════
if $DO_ANDROID; then
  header "Android — building signed AAB (${ANDROID_VARIANT})"

  # Bump version here (not earlier) so a failed iOS build never bumps Android, and vice versa.
  sed -i '' "s/versionCode ${CUR_ANDROID_BUILD}/versionCode ${NEW_ANDROID_BUILD}/" "$ANDROID_GRADLE"
  sed -i '' "s/versionName \"${CUR_ANDROID_VERSION}\"/versionName \"${NEW_VERSION}\"/" "$ANDROID_GRADLE"
  success "Android: versionName=${NEW_VERSION}, versionCode=${NEW_ANDROID_BUILD}"

  cd "$PROJECT_ROOT/android"

  # Capitalise first letter for Gradle task name: prodRelease → ProdRelease
  GRADLE_VARIANT="$(echo "$ANDROID_VARIANT" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"

  # Gradle 8.13 can't run on Java 24+. Resolve a compatible JDK and hand it to gradlew.
  ANDROID_JAVA_HOME="$(resolve_android_java_home || true)"
  if [[ -z "$ANDROID_JAVA_HOME" ]]; then
    error "No Gradle-compatible JDK (17 or 21) found."
    error "  Current java: $(java -version 2>&1 | head -1)"
    error "  Install a JDK 21 (e.g. Temurin) or set WTMG_JAVA_HOME to one."
    exit 1
  fi
  info "Using JDK for Gradle: ${ANDROID_JAVA_HOME}"

  JAVA_HOME="$ANDROID_JAVA_HOME" ./gradlew "bundle${GRADLE_VARIANT}" --no-daemon

  if [[ ! -f "$ANDROID_AAB_PATH" ]]; then
    error "Expected AAB not found at: $ANDROID_AAB_PATH"
    exit 1
  fi

  # Guard: a release AAB with no signing config builds successfully but is unsigned,
  # and the Play Console will reject it. Verify it carries a signature.
  # Use jarsigner from the resolved JDK — the macOS /usr/bin/jarsigner stub fails with
  # "Unable to locate a Java Runtime…" when only a JRE is on PATH, which would make a
  # signed AAB look unsigned.
  JARSIGNER="$ANDROID_JAVA_HOME/bin/jarsigner"
  if [[ -x "$JARSIGNER" ]]; then
    if ! "$JARSIGNER" -verify "$ANDROID_AAB_PATH" 2>/dev/null | grep -q 'jar verified'; then
      error "AAB is UNSIGNED: $ANDROID_AAB_PATH"
      error "  The Play Console will reject it. Configure release signing in"
      error "  android/app/build.gradle (see android/keystore.properties)."
      exit 1
    fi
  else
    warn "jarsigner not found at $JARSIGNER — skipping AAB signature check (cannot confirm it is signed)."
  fi

  success "AAB built & signed: $ANDROID_AAB_PATH"
  cd "$PROJECT_ROOT"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# iOS BUILD
# ═══════════════════════════════════════════════════════════════════════════════
if $DO_IOS; then
  header "iOS — archiving (scheme: \"${IOS_SCHEME}\")"

  # Bump version here (not earlier) so a failed Android build never bumps iOS, and vice versa.
  # Update all occurrences — covers both App and App Staging targets.
  sed -i '' "s/CURRENT_PROJECT_VERSION = ${CUR_IOS_BUILD};/CURRENT_PROJECT_VERSION = ${NEW_IOS_BUILD};/g" "$IOS_PBXPROJ"
  sed -i '' "s/MARKETING_VERSION = ${CUR_IOS_VERSION};/MARKETING_VERSION = ${NEW_VERSION};/g" "$IOS_PBXPROJ"
  success "iOS: MARKETING_VERSION=${NEW_VERSION}, CURRENT_PROJECT_VERSION=${NEW_IOS_BUILD} (all targets)"

  # Clean up any previous archive at the same path
  rm -rf "$IOS_ARCHIVE_PATH"

  xcodebuild \
    -workspace "$IOS_PROJECT" \
    -scheme "$IOS_SCHEME" \
    -configuration Release \
    -archivePath "$IOS_ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    archive \
    | xcpretty 2>/dev/null || true

  # xcpretty may not be installed; fall back to plain xcodebuild output
  # (the pipe above swallows errors, so re-check the archive)
  if [[ ! -d "$IOS_ARCHIVE_PATH" ]]; then
    warn "xcpretty not found or archive step failed; retrying without xcpretty…"
    xcodebuild \
      -workspace "$IOS_PROJECT" \
      -scheme "$IOS_SCHEME" \
      -configuration Release \
      -archivePath "$IOS_ARCHIVE_PATH" \
      -destination "generic/platform=iOS" \
      archive
  fi

  if [[ ! -d "$IOS_ARCHIVE_PATH" ]]; then
    error "Archive not found after build: $IOS_ARCHIVE_PATH"
    exit 1
  fi

  success "Archive created: $IOS_ARCHIVE_PATH"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# UPLOAD PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Android upload ──────────────────────────────────────────────────────────
if $DO_ANDROID; then
  header "Android — upload to Play Console"
  echo "  AAB: $ANDROID_AAB_PATH"
  echo ""
  warn "Automated AAB upload requires the Google Play Developer API or bundletool."
  warn "The recommended approach is to upload via the Play Console UI or using"
  warn "a CI tool (Fastlane supply, Gradle Play Publisher, etc.)."
  echo ""

  if ask_yes_no "Open Play Console in the browser to upload manually?"; then
    open "$PLAY_CONSOLE_URL"
    success "Opened Play Console: $PLAY_CONSOLE_URL"
    info "Navigate to your app → Testing → Internal testing → Create new release"
    info "Upload the AAB from: $ANDROID_AAB_PATH"
    echo ""
    info "Play Console (Internal Testing): ${BOLD}${PLAY_CONSOLE_URL}${RESET}"
  fi
fi

# ─── iOS validate + upload ───────────────────────────────────────────────────
if $DO_IOS; then
  header "iOS — validate & upload to App Store Connect"

  # Temp dir for export-options plists (auto-named & unique; cleaned at the end).
  # NB: a literal "/tmp/foo.XXXX.plist" template does NOT get its Xs substituted by
  # BSD mktemp (Xs must be trailing), so we make a dir and use known names inside it.
  IOS_TMPDIR="$(mktemp -d -t wtmg-ios)"

  # Upload export options (destination=upload → ships straight to App Store Connect)
  IOS_EXPORT_OPTIONS_UPLOAD="$IOS_TMPDIR/export-options-upload.plist"
  cat > "$IOS_EXPORT_OPTIONS_UPLOAD" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>upload</string>
  <key>signingStyle</key>
  <string>automatic</string>
</dict>
</plist>
PLIST

  if ask_yes_no "Validate the archive before uploading?"; then
    # There is no `xcodebuild -validate-archive` flag. Instead we export a signed
    # distribution IPA locally (destination=export): this exercises signing,
    # provisioning and packaging and fails fast on those errors before the upload.
    # (App Store metadata/asset checks still happen server-side during upload.)
    info "Validating: exporting a signed IPA locally (checks signing & packaging)…"
    IOS_EXPORT_OPTIONS_VALIDATE="$IOS_TMPDIR/export-options-validate.plist"
    cat > "$IOS_EXPORT_OPTIONS_VALIDATE" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>export</string>
  <key>signingStyle</key>
  <string>automatic</string>
</dict>
</plist>
PLIST
    rm -rf "$IOS_EXPORT_PATH-validate"
    xcodebuild \
      -exportArchive \
      -archivePath "$IOS_ARCHIVE_PATH" \
      -exportPath "$IOS_EXPORT_PATH-validate" \
      -exportOptionsPlist "$IOS_EXPORT_OPTIONS_VALIDATE"
    success "Validation passed (IPA exported to $IOS_EXPORT_PATH-validate)"
  fi

  if ask_yes_no "Upload the archive to App Store Connect?"; then
    info "Uploading to App Store Connect…"
    rm -rf "$IOS_EXPORT_PATH"
    xcodebuild \
      -exportArchive \
      -archivePath "$IOS_ARCHIVE_PATH" \
      -exportPath "$IOS_EXPORT_PATH" \
      -exportOptionsPlist "$IOS_EXPORT_OPTIONS_UPLOAD"
    success "Upload complete"
    echo ""
    info "App Store Connect: ${BOLD}${APP_STORE_CONNECT_URL}${RESET}"
    info "The build will appear in TestFlight once Apple finishes processing it."
  fi

  rm -rf "$IOS_TMPDIR"
fi

# ─── Done ────────────────────────────────────────────────────────────────────
header "Done"
$DO_ANDROID && success "Android: ${NEW_VERSION} (build ${NEW_ANDROID_BUILD}) — ${ANDROID_AAB_PATH}"
$DO_IOS     && success "iOS: ${NEW_VERSION} (build ${NEW_IOS_BUILD}) — ${IOS_ARCHIVE_PATH}"
echo ""
$DO_ANDROID && info "Play Console:        ${BOLD}${PLAY_CONSOLE_URL}${RESET}"
$DO_IOS     && info "App Store Connect:   ${BOLD}${APP_STORE_CONNECT_URL}${RESET}"
