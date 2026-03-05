# See https://github.com/ionic-team/capacitor-assets
TOOLS_DIR=$(dirname $(realpath $0))
# This should be run from the root, so the binary can find the iOS & Android projects
cd $TOOLS_DIR/..

if [[ $(uname) == Darwin ]]; then
  SP=" " # Needed for portability with gnu sed
fi

npx @capacitor/assets generate \
  --assetPath tools/assets \
  --ios --android \
  --logoSplashScale 0.5
# Remove dark mode assets, to not have half-dark splash screens
# see https://www.notion.so/slowby/Dark-mode-icons-splash-screens-for-native-3064f49e318e80fd8dcac8ef9289ec7f
rm -r \
  android/app/src/main/res/mipmap-night-* \
  android/app/src/main/res/drawable-*-night-* \
  ios/App/App/Assets.xcassets/Splash.imageset/Default@*-dark.png
# Remove references to dark assets
cd ios/App/App/Assets.xcassets/Splash.imageset
jq '.images |= map(select(has("appearances") | not))' Contents.json > tmp.json && mv tmp.json Contents.json

# Back to root
cd -

# Fix icon inset from 16.7% to 16.6% to prevent black edges
# see https://github.com/ionic-team/capacitor-assets/issues/522
# and https://www.notion.so/slowby/Launch-plan-for-our-mobile-app-3064f49e318e80c99d8aed9ef9c4dc16#3194f49e318e807f8e00e12b8914b949
for file in $(grep -rl 'android:inset="16.7%"' android/app/src/main/res); do
  sed -i${SP}'' -e 's/android:inset="16.7%"/android:inset="16.6%"/g' "$file"
done

# Back to previous dir
cd -

