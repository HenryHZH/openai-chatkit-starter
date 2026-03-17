import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "提炼案情摘要",
    prompt:
      "请先基于当前材料输出“案件背景-关键事实-争议焦点-裁判结论”四段式摘要，要求每段不超过120字。",
  },
  {
    label: "列证据链",
    prompt:
      "请把案件中的关键证据整理为时间序列，指出每条证据证明了什么、还缺什么、下一步应补什么。",
  },
  {
    label: "生成出庭提纲",
    prompt:
      "请根据材料生成一份出庭提纲，包含主张、法律依据、对方可能抗辩以及对应反驳思路。",
  },
];

export const PLACEHOLDER_INPUT = "上传案卷材料，或直接输入你的分析任务";

export const GREETING = "请选择一个起始任务，或直接输入你的问题";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 233,
      tint: theme === "dark" ? 8 : 6,
      shade: theme === "dark" ? -3 : -4,
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
