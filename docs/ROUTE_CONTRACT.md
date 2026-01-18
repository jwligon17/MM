# Route Contract: Drive / Impact

- Drive tab route key: `Drive` (bottom tab in `src/navigation/TabNavigator.js`).
- Must point to component: `ImpactStackScreen` -> `DriveHome` -> `ImpactScreen` in `src/screens/ImpactScreen.js`.
- Impact Screen must remain unchanged:
  - Full-screen map (`MapView` with dark style, live user location, bounty/pothole overlays).
  - EKG strip (`RoadHeartbeatLine` with heartbeat status labels showing Good/Rough/Impact).
  - HUD: speed/distance/duration readouts, Points pill, mode selector, ImpactTopBar, impact toast, drawers (menu + controls), Dev Tools hotspot.
  - Expected navigation hooks: Impact events drawer button opens `ImpactEvents` stack screen; Dev Tools hotspot opens `DevTools`; Trip history reachable via stack without altering Impact layout.
- Warning: **Do not rename route keys; do not repoint Drive tab unless explicitly asked.**
