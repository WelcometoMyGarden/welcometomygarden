# See https://github.com/ionic-team/capacitor-assets
# skips ios icon generation
npx @capacitor/assets generate \
  --assetPath $(dirname $0)/assets \
  --ios --android \
  --logoSplashTargetWidth 256
