import type {
  ColorScheme,
  StartScreenPrompt,
  ThemeOption,
} from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const CHATKIT_SCRIPT_URL =
  process.env.NEXT_PUBLIC_CHATKIT_SCRIPT_URL?.trim() ??
  "https://cdn.platform.openai.com/deployments/chatkit/chatkit.js";

export const DOMAIN_KEY = process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY?.trim();

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "Summarize",
    prompt: "Summarize the last message in 3 bullet points.",
  },
  {
    label: "Brainstorm",
    prompt: "Generate three feature ideas and their pros/cons.",
  },
  {
    label: "Rewrite",
    prompt: "Rewrite the previous response to be concise and friendly.",
  },
];

export const PLACEHOLDER_INPUT = "Ask the assistant to run your workflow";

export const GREETING = "How can I help you explore your workflow today?";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 220,
      tint: 6,
      shade: theme === "dark" ? -1 : -4,
    },
    accent: {
      primary: theme === "dark" ? "#f1f5f9" : "#0f172a",
      level: 1,
    },
  },
  radius: "round",
});
