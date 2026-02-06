# React + Vite

## Municipal Demo workflow

Run dev:

```
npm --prefix municipal-demo install
npm --prefix municipal-demo run dev
```

Build:

```
npm --prefix municipal-demo run build
```

Deploy municipal-demo only:

```
firebase deploy --only hosting:municipal-demo
```

## Google Maps Setup

- Create an API key in Google Cloud Console.
- Enable the Maps JavaScript API.
- Enable Billing for the project.
- Restrict the key by HTTP referrers:
  - http://localhost:5173/*
  - (add your production domain later)
- Add the key to `Municipal-Demo/.env.local` as `VITE_GOOGLE_MAPS_API_KEY=...`.
- Restart the dev server after changing env vars.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
