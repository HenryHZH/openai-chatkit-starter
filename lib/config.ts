import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [];

export const PLACEHOLDER_INPUT = "上传案件材料或直接输入你的分析任务";

export const GREETING = "";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 32,
      tint: theme === "dark" ? 18 : 12,
      shade: theme === "dark" ? -6 : -10,
    },
    accent: {
      primary: theme === "dark" ? "#e7c2a5" : "#8a3f2a",
      level: 3,
    },
  },
  radius: "soft",
  // Add other theme options here
  // chatkit.studio/playground to explore config options
});
