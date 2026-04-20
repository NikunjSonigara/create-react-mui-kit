# create-react-mui-kit

[![npm version](https://img.shields.io/npm/v/create-react-mui-kit.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/create-react-mui-kit)
[![npm downloads](https://img.shields.io/npm/dm/create-react-mui-kit.svg)](https://www.npmjs.com/package/create-react-mui-kit)
[![license](https://img.shields.io/npm/l/create-react-mui-kit.svg)](./LICENSE)

> Create a React (Vite) app with **MUI (Material UI)**, **Emotion**, **Redux Toolkit**, and **Husky** pre-integrated — zero config.

One command: a fresh Vite + React project, MUI + Emotion installed, a theme wired up, `<ThemeProvider>` and `<CssBaseline />` already around your `<App />`, path aliases configured, and your favorite MUI add-ons pre-installed.

## Usage

```bash
npx create-react-mui-kit@latest
```

Or pass a name directly:

```bash
npx create-react-mui-kit my-app
```

## What it does

1. Scaffolds a fresh Vite + React app via `create-vite@latest` (TypeScript or JavaScript).
2. Installs **MUI** core (`@mui/material`, `@emotion/react`, `@emotion/styled`).
3. Configures `@/*` path aliases in `vite.config`, `tsconfig.json`, and `tsconfig.app.json`.
4. Pre-installs the MUI add-ons you pick (icons, Roboto font, X packages, notistack, router…).
5. Drops in a starter `theme/` and rewrites `main.tsx` to wrap `<App />` in `<ThemeProvider>` + `<CssBaseline />`.
6. Wires up state management — **Redux Toolkit** (default) or **Zustand**, with a sample store and (for Redux) `<Provider>` already wrapping `<App />`.
7. (Optional) Sets up **Husky + lint-staged + Prettier** with a pre-commit hook that runs `eslint --fix` and `prettier --write` on staged files.

You skip the "install Vite → add MUI → add Emotion → set up a theme → wire up CssBaseline → add icons → …" ritual.

## Options

| Flag                                    | Description                         |
| --------------------------------------- | ----------------------------------- |
| `-y, --yes`                             | Skip prompts, use sensible defaults |
| `--ts` / `--js`                         | TypeScript (default) or JavaScript  |
| `--npm` / `--pnpm` / `--yarn` / `--bun` | Pick your package manager           |
| `--no-husky`                            | Skip Husky + lint-staged setup      |
| `--state=<lib>`                         | `redux` (default), `zustand`, `none`|
| `-v, --version`                         | Print version                       |
| `-h, --help`                            | Show help                           |

## Examples

```bash
# Fully interactive
npx create-react-mui-kit

# Non-interactive with defaults
npx create-react-mui-kit my-app --yes

# Use pnpm
npx create-react-mui-kit my-app --pnpm
```

## Requirements

- Node.js **18.17+**
- Network access (to fetch `create-vite` and MUI packages)

## Development

```bash
git clone https://github.com/NikunjSonigara/create-react-mui-kit.git
cd create-react-mui-kit
npm install
node bin/index.js test-app --yes
```

## Contributing

Issues and PRs welcome at [github.com/NikunjSonigara/create-react-mui-kit](https://github.com/NikunjSonigara/create-react-mui-kit).

## License

MIT
