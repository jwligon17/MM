#!/usr/bin/env bash
# Simulator-only helper: resets location permission and reinstalls the app so iOS shows the popup again.

set -euo pipefail

# Try to read bundle id from app.json (expo ios.bundleIdentifier), fall back to placeholder.
BUNDLE_ID="$(node -e "try{const cfg=require('../app.json');const id=cfg?.expo?.ios?.bundleIdentifier||cfg?.expo?.ios?.bundleId; if(id){console.log(id); process.exit(0);} }catch(e){} process.exit(1);" 2>/dev/null || true)"

if [[ -z "$BUNDLE_ID" ]]; then
  echo "Bundle ID not found. Set bundleIdentifier in app.json (expo.ios.bundleIdentifier) or edit this script to hardcode it."
  BUNDLE_ID="com.example.milemend"
fi

echo "Resetting location privacy on booted simulator..."
xcrun simctl privacy booted reset location || true

echo "Uninstalling $BUNDLE_ID from booted simulator (fresh install triggers prompt)..."
xcrun simctl uninstall booted "$BUNDLE_ID" || true

echo "Done. Re-run the app to see the location permission prompt."
