#!/usr/bin/env bash
# Reset iOS Simulator location privacy so the system permission popup shows again.

set -euo pipefail

echo "Resetting location privacy on booted simulator..."
xcrun simctl privacy booted reset location

# Optionally uninstall the app to force a clean install (set your bundle id first):
# xcrun simctl uninstall booted <YOUR_BUNDLE_ID>

echo "Done. Re-run the app to trigger the location permission prompt."
