# See https://github.com/ionic-team/capacitor-assets
TOOLS_DIR=$(dirname $(realpath $0))
# This should be run from the root, so the binary can find the iOS & Android projects
cd $TOOLS_DIR/..
npx @capacitor/assets generate \
  --assetPath tools/assets \
  --ios --android \
  --logoSplashScale 0.4
# Remove dark mode assets, to not have half-dark splash screens
# see https://www.notion.so/slowby/Dark-mode-icons-splash-screens-for-native-3064f49e318e80fd8dcac8ef9289ec7f
rm -r \
  android/app/src/main/res/mipmap-night-* \
  android/app/src/main/res/drawable-*-night-* \
  ios/App/App/Assets.xcassets/Splash.imageset/Default@*-dark.png
# Remove references to dark assets
cd ios/App/App/Assets.xcassets/Splash.imageset
jq '.images |= map(select(has("appearances") | not))' Contents.json > tmp.json && mv tmp.json Contents.json
cd - && cd -

