import prompts from "prompts";
import pc from "picocolors";
import { isValidProjectName } from "./utils.js";

const ADDON_CHOICES = [
    { title: "@mui/icons-material (Material icons)", value: "@mui/icons-material", selected: true },
    { title: "@fontsource/roboto (Roboto font)", value: "@fontsource/roboto", selected: true },
    { title: "@mui/lab (experimental components)", value: "@mui/lab", selected: false },
    { title: "@mui/x-data-grid (data grid)", value: "@mui/x-data-grid", selected: false },
    { title: "@mui/x-date-pickers (date/time pickers)", value: "@mui/x-date-pickers", selected: false },
    { title: "@mui/x-charts (charts)", value: "@mui/x-charts", selected: false },
    { title: "@mui/x-tree-view (tree view)", value: "@mui/x-tree-view", selected: false },
    { title: "notistack (snackbar stack)", value: "notistack", selected: false },
    { title: "react-router-dom (routing)", value: "react-router-dom", selected: false },
];

const onCancel = () => {
    console.log();
    console.log(pc.red("✖") + " Cancelled");
    process.exit(1);
};

export async function promptConfig(args) {
    if (args.yes) {
        return {
            projectName: args.projectName || "my-app",
            typescript: args.typescript ?? true,
            importAlias: "@/*",
            packageManager: args.packageManager || "npm",
            husky: args.husky ?? true,
            state: args.state || "redux",
            addons: ["@mui/icons-material", "@fontsource/roboto"],
        };
    }

    const questions = [];

    if (!args.projectName) {
        questions.push({
            type: "text",
            name: "projectName",
            message: "Project name:",
            initial: "my-app",
            validate: (v) => (isValidProjectName(v) ? true : "Invalid project name"),
        });
    }

    if (args.typescript === undefined) {
        questions.push({
            type: "toggle",
            name: "typescript",
            message: "Use TypeScript?",
            initial: true,
            active: "yes",
            inactive: "no",
        });
    }

    questions.push({
        type: "text",
        name: "importAlias",
        message: "Import alias:",
        initial: "@/*",
    });

    if (!args.packageManager) {
        questions.push({
            type: "select",
            name: "packageManager",
            message: "Package manager:",
            choices: [
                { title: "npm", value: "npm" },
                { title: "pnpm", value: "pnpm" },
                { title: "yarn", value: "yarn" },
                { title: "bun", value: "bun" },
            ],
            initial: 0,
        });
    }

    if (args.husky === undefined) {
        questions.push({
            type: "toggle",
            name: "husky",
            message: "Set up Husky + lint-staged (pre-commit hooks)?",
            initial: true,
            active: "yes",
            inactive: "no",
        });
    }

    if (!args.state) {
        questions.push({
            type: "select",
            name: "state",
            message: "State management:",
            choices: [
                { title: "Redux Toolkit", value: "redux" },
                { title: "Zustand", value: "zustand" },
                { title: "None", value: "none" },
            ],
            initial: 0,
        });
    }

    questions.push({
        type: "multiselect",
        name: "addons",
        message: "Pre-install MUI add-ons:",
        choices: ADDON_CHOICES,
        hint: "(space to toggle, enter to confirm)",
        instructions: false,
    });

    const answers = await prompts(questions, { onCancel });

    return {
        projectName: args.projectName || answers.projectName,
        typescript: args.typescript ?? answers.typescript,
        importAlias: answers.importAlias || "@/*",
        packageManager: args.packageManager || answers.packageManager,
        husky: args.husky ?? answers.husky ?? true,
        state: args.state || answers.state || "redux",
        addons: answers.addons || [],
    };
}
