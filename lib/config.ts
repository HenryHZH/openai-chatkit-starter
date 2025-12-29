import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
];

export const PLACEHOLDER_INPUT = "在此上传文档 或 直接键入";

export const GREETING = "Case Report";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 220,
      tint: 4,
      shade: theme === "dark" ? -2 : -5,
    },
    accent: {
      primary: theme === "dark" ? "#cbd5e1" : "#0b1f3a",
      level: 0.8,
    },
  },
  radius: "soft",
  // Add other theme options here
  // chatkit.studio/playground to explore config options
});
