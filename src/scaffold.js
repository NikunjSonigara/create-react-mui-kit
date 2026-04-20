import path from "node:path";
import fs from "node:fs";
import pc from "picocolors";
import { run } from "./utils.js";

export async function scaffold(config) {
    const cwd = process.cwd();
    const projectPath = path.resolve(cwd, config.projectName);

    if (fs.existsSync(projectPath) && fs.readdirSync(projectPath).length > 0) {
        throw new Error(`Directory "${config.projectName}" already exists and is not empty.`);
    }

    console.log();
    console.log(pc.cyan("◆") + " Creating Vite + React app...");
    console.log();

    const template = config.typescript ? "react-ts" : "react";

    await run("npx", ["--yes", "create-vite@latest", config.projectName, "--template", template, "--no-interactive"]);

    console.log();
    console.log(pc.cyan("◆") + " Installing dependencies...");
    console.log();

    const baseInstall = baseInstallFor(config.packageManager);
    await run(baseInstall.cmd, baseInstall.args, { cwd: projectPath });

    console.log();
    console.log(pc.cyan("◆") + " Installing MUI (Material UI)...");
    console.log();

    const installer = installerFor(config.packageManager, false);
    await run(installer.cmd, [...installer.args, "@mui/material", "@emotion/react", "@emotion/styled"], { cwd: projectPath });

    if (config.typescript) {
        const devInstaller = installerFor(config.packageManager, true);
        await run(devInstaller.cmd, [...devInstaller.args, "@types/node"], { cwd: projectPath });
    }

    writeViteConfig(projectPath, config);
    writePathAliasConfig(projectPath, config);
    writeIndexCss(projectPath);

    if (config.addons.length > 0) {
        console.log();
        console.log(pc.cyan("◆") + ` Installing MUI add-ons: ${pc.dim(config.addons.join(", "))}`);
        console.log();

        await run(installer.cmd, [...installer.args, ...config.addons], { cwd: projectPath });
    }

    writeTheme(projectPath, config);
    writeApp(projectPath, config);

    if (config.state === "redux") {
        await setupRedux(projectPath, config);
    } else if (config.state === "zustand") {
        await setupZustand(projectPath, config);
    }

    writeMain(projectPath, config);

    if (config.husky) {
        await setupHusky(projectPath, config);
    }
}

function aliasPrefix(importAlias) {
    const i = importAlias.indexOf("/*");
    return i === -1 ? importAlias : importAlias.slice(0, i);
}

function writeViteConfig(projectPath, config) {
    const ts = config.typescript;
    const alias = aliasPrefix(config.importAlias);
    const configFile = path.join(projectPath, ts ? "vite.config.ts" : "vite.config.js");

    const contents = `import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "${alias}": path.resolve(__dirname, "./src"),
    },
  },
})
`;
    fs.writeFileSync(configFile, contents);
}

function writeIndexCss(projectPath) {
    const cssPath = path.join(projectPath, "src", "index.css");
    const contents = `html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;
    fs.writeFileSync(cssPath, contents);

    const appCssPath = path.join(projectPath, "src", "App.css");
    if (fs.existsSync(appCssPath)) {
        fs.writeFileSync(appCssPath, "");
    }
}

function writePathAliasConfig(projectPath, config) {
    const alias = config.importAlias;

    if (config.typescript) {
        patchTsconfig(path.join(projectPath, "tsconfig.json"), alias, true);
        patchTsconfig(path.join(projectPath, "tsconfig.app.json"), alias, false);
    } else {
        const jsconfigPath = path.join(projectPath, "jsconfig.json");
        const jsconfig = {
            compilerOptions: {
                paths: {
                    [alias]: ["./src/*"],
                },
            },
        };
        fs.writeFileSync(jsconfigPath, JSON.stringify(jsconfig, null, 2) + "\n");
    }
}

function patchTsconfig(filePath, alias, isRoot) {
    if (!fs.existsSync(filePath)) {
        console.log(pc.yellow("⚠") + ` ${path.basename(filePath)} not found — skipping.`);
        return;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = parseJsonc(raw);

    if (!parsed.compilerOptions) parsed.compilerOptions = {};
    parsed.compilerOptions.paths = {
        ...(parsed.compilerOptions.paths || {}),
        [alias]: ["./src/*"],
    };

    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + "\n");
}

function parseJsonc(s) {
    const stripped = s
        .replace(/\\"|"(?:\\"|[^"])*"|(\/\/[^\n\r]*|\/\*[\s\S]*?\*\/)/g, (m, g1) => (g1 ? "" : m));
    return JSON.parse(stripped);
}

function writeTheme(projectPath, config) {
    const ts = config.typescript;
    const themeDir = path.join(projectPath, "src", "theme");
    fs.mkdirSync(themeDir, { recursive: true });

    const contents = ts
        ? `import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#9c27b0",
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
`
        : `import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#9c27b0",
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
`;

    fs.writeFileSync(path.join(themeDir, ts ? "index.ts" : "index.js"), contents);
}

function writeApp(projectPath, config) {
    const ts = config.typescript;
    const appPath = path.join(projectPath, "src", ts ? "App.tsx" : "App.jsx");

    const hasIcons = config.addons.includes("@mui/icons-material");
    const stateSnippet = stateDemoSnippet(config);

    const iconImport = hasIcons
        ? `import FavoriteIcon from "@mui/icons-material/Favorite";\n`
        : "";
    const iconButton = hasIcons
        ? `          <IconButton color="primary" aria-label="like">
            <FavoriteIcon />
          </IconButton>\n`
        : "";

    const contents = ts
        ? `import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
${hasIcons ? 'import IconButton from "@mui/material/IconButton";\n' : ""}${iconImport}${stateSnippet.imports}
function App() {
${stateSnippet.hooks}  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3} sx={{ alignItems: "center" }}>
        <Typography variant="h3" component="h1" gutterBottom>
          create-react-mui-kit
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
          React + Vite + MUI, pre-wired and ready to build.
        </Typography>
${stateSnippet.jsx}        <Stack direction="row" spacing={2}>
          <Button variant="contained">Primary</Button>
          <Button variant="outlined" color="secondary">
            Secondary
          </Button>
${iconButton}        </Stack>
      </Stack>
    </Container>
  );
}

export default App;
`
        : `import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
${hasIcons ? 'import IconButton from "@mui/material/IconButton";\n' : ""}${iconImport}${stateSnippet.imports}
function App() {
${stateSnippet.hooks}  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3} sx={{ alignItems: "center" }}>
        <Typography variant="h3" component="h1" gutterBottom>
          create-react-mui-kit
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
          React + Vite + MUI, pre-wired and ready to build.
        </Typography>
${stateSnippet.jsx}        <Stack direction="row" spacing={2}>
          <Button variant="contained">Primary</Button>
          <Button variant="outlined" color="secondary">
            Secondary
          </Button>
${iconButton}        </Stack>
      </Stack>
    </Container>
  );
}

export default App;
`;

    fs.writeFileSync(appPath, contents);
}

function stateDemoSnippet(config) {
    const alias = aliasPrefix(config.importAlias);

    if (config.state === "redux") {
        return {
            imports: `import { useAppDispatch, useAppSelector } from "${alias}/store/hooks";
import { decrement, increment } from "${alias}/store/counterSlice";
`,
            hooks: `  const count = useAppSelector((s) => s.counter.value);
  const dispatch = useAppDispatch();

`,
            jsx: `        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button variant="outlined" onClick={() => dispatch(decrement())}>
            -
          </Button>
          <Typography variant="h5">{count}</Typography>
          <Button variant="outlined" onClick={() => dispatch(increment())}>
            +
          </Button>
        </Stack>
`,
        };
    }

    if (config.state === "zustand") {
        return {
            imports: `import { useCounterStore } from "${alias}/store/useCounterStore";
`,
            hooks: `  const { count, increment, decrement } = useCounterStore();

`,
            jsx: `        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button variant="outlined" onClick={decrement}>-</Button>
          <Typography variant="h5">{count}</Typography>
          <Button variant="outlined" onClick={increment}>+</Button>
        </Stack>
`,
        };
    }

    return { imports: "", hooks: "", jsx: "" };
}

function writeMain(projectPath, config) {
    const ts = config.typescript;
    const alias = aliasPrefix(config.importAlias);
    const srcDir = path.join(projectPath, "src");
    const mainPath = path.join(srcDir, ts ? "main.tsx" : "main.jsx");

    const hasRoboto = config.addons.includes("@fontsource/roboto");
    const hasNotistack = config.addons.includes("notistack");
    const hasRouter = config.addons.includes("react-router-dom");

    const robotoImports = hasRoboto
        ? `import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
`
        : "";

    const reduxImports =
        config.state === "redux"
            ? `import { Provider } from "react-redux";
import { store } from "${alias}/store";
`
            : "";

    const notistackImport = hasNotistack ? `import { SnackbarProvider } from "notistack";\n` : "";
    const routerImport = hasRouter ? `import { BrowserRouter } from "react-router-dom";\n` : "";

    const openTags = [];
    const closeTags = [];
    if (config.state === "redux") {
        openTags.push(`<Provider store={store}>`);
        closeTags.unshift(`</Provider>`);
    }
    if (hasRouter) {
        openTags.push(`<BrowserRouter>`);
        closeTags.unshift(`</BrowserRouter>`);
    }
    openTags.push(`<ThemeProvider theme={theme}>`);
    closeTags.unshift(`</ThemeProvider>`);
    if (hasNotistack) {
        openTags.push(`<SnackbarProvider maxSnack={3}>`);
        closeTags.unshift(`</SnackbarProvider>`);
    }

    const indent = (lines, spaces) => lines.map((l) => " ".repeat(spaces) + l).join("\n");
    const tree = [
        indent(openTags, 4),
        "      <CssBaseline />",
        "      <App />",
        indent(closeTags, 4),
    ].join("\n");

    const contents = ts
        ? `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
${robotoImports}${reduxImports}${routerImport}${notistackImport}import App from "${alias}/App";
import theme from "${alias}/theme";
import "${alias}/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
${tree}
  </StrictMode>
);
`
        : `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
${robotoImports}${reduxImports}${routerImport}${notistackImport}import App from "${alias}/App";
import theme from "${alias}/theme";
import "${alias}/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
${tree}
  </StrictMode>
);
`;

    fs.writeFileSync(mainPath, contents);
}

async function setupRedux(projectPath, config) {
    console.log();
    console.log(pc.cyan("◆") + " Setting up Redux Toolkit...");
    console.log();

    const installer = installerFor(config.packageManager, false);
    await run(installer.cmd, [...installer.args, "@reduxjs/toolkit", "react-redux"], { cwd: projectPath });

    const srcDir = path.join(projectPath, "src");
    const storeDir = path.join(srcDir, "store");
    fs.mkdirSync(storeDir, { recursive: true });

    const ts = config.typescript;
    const storeExt = ts ? "ts" : "js";

    const storeIndex = ts
        ? `import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./counterSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`
        : `import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./counterSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});
`;
    fs.writeFileSync(path.join(storeDir, `index.${storeExt}`), storeIndex);

    const counterSlice = ts
        ? `import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface CounterState {
  value: number;
  status: "idle" | "loading";
}

const initialState: CounterState = { value: 0, status: "idle" };

export const incrementAsync = createAsyncThunk(
  "counter/incrementAsync",
  async (amount: number) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return amount;
  }
);

const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(incrementAsync.pending, (state) => {
        state.status = "loading";
      })
      .addCase(incrementAsync.fulfilled, (state, action) => {
        state.status = "idle";
        state.value += action.payload;
      });
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
`
        : `import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const initialState = { value: 0, status: "idle" };

export const incrementAsync = createAsyncThunk(
  "counter/incrementAsync",
  async (amount) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return amount;
  }
);

const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(incrementAsync.pending, (state) => {
        state.status = "loading";
      })
      .addCase(incrementAsync.fulfilled, (state, action) => {
        state.status = "idle";
        state.value += action.payload;
      });
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
`;
    fs.writeFileSync(path.join(storeDir, `counterSlice.${storeExt}`), counterSlice);

    const hooks = ts
        ? `import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`
        : `import { useDispatch, useSelector } from "react-redux";

export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
`;
    fs.writeFileSync(path.join(storeDir, `hooks.${storeExt}`), hooks);
}

async function setupZustand(projectPath, config) {
    console.log();
    console.log(pc.cyan("◆") + " Setting up Zustand...");
    console.log();

    const installer = installerFor(config.packageManager, false);
    await run(installer.cmd, [...installer.args, "zustand"], { cwd: projectPath });

    const storeDir = path.join(projectPath, "src", "store");
    fs.mkdirSync(storeDir, { recursive: true });

    const ts = config.typescript;
    const ext = ts ? "ts" : "js";
    const contents = ts
        ? `import { create } from "zustand";

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: s.count - 1 })),
  reset: () => set({ count: 0 }),
}));
`
        : `import { create } from "zustand";

export const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: s.count - 1 })),
  reset: () => set({ count: 0 }),
}));
`;
    fs.writeFileSync(path.join(storeDir, `useCounterStore.${ext}`), contents);
}

async function setupHusky(projectPath, config) {
    console.log();
    console.log(pc.cyan("◆") + " Setting up Husky + lint-staged + Prettier...");
    console.log();

    const installer = installerFor(config.packageManager, true);
    await run(
        installer.cmd,
        [...installer.args, "husky@^8", "lint-staged", "prettier"],
        { cwd: projectPath }
    );

    const pkgPath = path.join(projectPath, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.scripts = {
        ...pkg.scripts,
        prepare: "husky install",
        format: "prettier --check .",
        "format:fix": "prettier --write .",
        "lint:fix": "eslint --fix",
        ...(config.typescript ? { typecheck: "tsc --noEmit" } : {}),
    };
    delete pkg["lint-staged"];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

    const gitDir = path.join(projectPath, ".git");
    if (!fs.existsSync(gitDir)) {
        await run("git", ["init"], { cwd: projectPath });
    }

    const runner = runnerFor(config.packageManager);
    await run(runner.cmd, [...runner.args, "husky", "install"], {
        cwd: projectPath,
    });

    await run("git", ["config", "core.hooksPath", ".husky"], { cwd: projectPath });

    const huskyDir = path.join(projectPath, ".husky");
    if (!fs.existsSync(huskyDir)) fs.mkdirSync(huskyDir, { recursive: true });

    const hookCmd = config.typescript
        ? "npx tsc --noEmit && npx lint-staged"
        : "npx lint-staged";
    const preCommit = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${hookCmd}
`;
    const preCommitPath = path.join(huskyDir, "pre-commit");
    fs.writeFileSync(preCommitPath, preCommit);
    fs.chmodSync(preCommitPath, 0o755);

    const jsGlob = config.typescript ? "*.{js,jsx,ts,tsx}" : "*.{js,jsx}";
    const lintStagedConfig = {
        [jsGlob]: ["eslint --fix", "prettier --write"],
        "*.{json,css,scss,md,mdx,yml,yaml,html}": ["prettier --write"],
    };
    fs.writeFileSync(
        path.join(projectPath, ".lintstagedrc.json"),
        JSON.stringify(lintStagedConfig, null, 2) + "\n"
    );

    const prettierrc = {
        semi: true,
        singleQuote: false,
        tabWidth: 2,
        trailingComma: "es5",
        printWidth: 100,
        arrowParens: "always",
        endOfLine: "lf",
    };
    fs.writeFileSync(path.join(projectPath, ".prettierrc"), JSON.stringify(prettierrc, null, 2) + "\n");

    const prettierIgnore = [
        "node_modules",
        "dist",
        "build",
        "coverage",
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "bun.lockb",
        "",
    ].join("\n");
    fs.writeFileSync(path.join(projectPath, ".prettierignore"), prettierIgnore);
}

function baseInstallFor(pm) {
    switch (pm) {
        case "pnpm":
            return { cmd: "pnpm", args: ["install"] };
        case "yarn":
            return { cmd: "yarn", args: ["install"] };
        case "bun":
            return { cmd: "bun", args: ["install"] };
        case "npm":
        default:
            return { cmd: "npm", args: ["install"] };
    }
}

function installerFor(pm, dev = true) {
    switch (pm) {
        case "pnpm":
            return { cmd: "pnpm", args: dev ? ["add", "-D"] : ["add"] };
        case "yarn":
            return { cmd: "yarn", args: dev ? ["add", "-D"] : ["add"] };
        case "bun":
            return { cmd: "bun", args: dev ? ["add", "-d"] : ["add"] };
        case "npm":
        default:
            return { cmd: "npm", args: dev ? ["install", "-D"] : ["install"] };
    }
}

function runnerFor(pm) {
    switch (pm) {
        case "pnpm":
            return { cmd: "pnpm", args: ["dlx"] };
        case "yarn":
            return { cmd: "yarn", args: ["dlx"] };
        case "bun":
            return { cmd: "bunx", args: [] };
        case "npm":
        default:
            return { cmd: "npx", args: [] };
    }
}
