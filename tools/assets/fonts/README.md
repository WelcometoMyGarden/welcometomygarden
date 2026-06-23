# Shared native fonts

Fonts here are the single source of truth for **native** (Capacitor) UI that renders
before the web app loads — currently the offline gate (see `OfflineGate.java` /
`OfflineGateViewController.swift`). The web app itself loads Montserrat from Google Fonts,
so these files are only for native screens.

To avoid duplicating the binaries, the native projects reference these files via **relative
symlinks** rather than copies:

- Android: `android/app/src/main/res/font/montserrat_semibold.ttf`
  → `../../../../../../tools/assets/fonts/Montserrat-SemiBold.ttf`
- iOS: `ios/App/App/Montserrat-SemiBold.ttf`
  → `../../../tools/assets/fonts/Montserrat-SemiBold.ttf`
  (registered in `Info.plist` `UIAppFonts` and in the Xcode project's Copy Bundle Resources)

Both Gradle/aapt2 and Xcode resolve the symlink and package the real file. Git stores the
symlinks as links, which works on macOS/Linux (the team's platforms); a checkout on a
filesystem without symlink support would need `git config core.symlinks true`.

To change weights/files: update the file here and adjust the symlink name + the native
registrations (`res/font/`, `Info.plist`, `project.pbxproj`) accordingly.

## License

Montserrat is licensed under the SIL Open Font License 1.1 — see `OFL.txt`.
