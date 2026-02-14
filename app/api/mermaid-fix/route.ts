const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-5.2";

const MERMAID_FIX_PROMPT = `你是 Mermaid 语法修复器。
任务：修复输入 Mermaid 图表中的语法错误，让它可以被 Mermaid 正常解析。

严格要求：
1) 只修复语法错误，不改变图表语义与内容，但去掉所有括号。
2) 保留原有节点文案、连线关系、方向、子图结构、样式意图。
3) 如果提供了渲染器报错信息，请优先据此修复对应语法问题。
4) 不添加解释，不添加 Markdown 代码块标记。
5) 只输出修复后的 Mermaid 原文。`;

type FixRequestBody = {
  code?: string;
  renderError?: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "Missing OPENAI_API_KEY environment variable" }, 500);
  }

  const parsed = (await request.json().catch(() => null)) as FixRequestBody | null;
  const code = parsed?.code?.trim();
  const renderError = parsed?.renderError?.trim();
  if (!code) {
    return jsonResponse({ error: "Missing mermaid code" }, 400);
  }

  try {
    const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL;
    const model = process.env.MERMAID_FIX_MODEL ?? DEFAULT_MODEL;

    const upstream = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: MERMAID_FIX_PROMPT }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildFixUserMessage(code, renderError),
              },
            ],
          },
        ],
      }),
    });

    const result = (await upstream.json().catch(() => ({}))) as OpenAIResponse & {
      error?: { message?: string };
    };

    if (!upstream.ok) {
      return jsonResponse(
        {
          error:
            result?.error?.message ??
            `Failed to fix Mermaid syntax: ${upstream.status} ${upstream.statusText}`,
        },
        upstream.status
      );
    }

    const fixedCode = extractFixedCode(result);
    if (!fixedCode) {
      return jsonResponse({ error: "Model returned empty result" }, 502);
    }

    return jsonResponse({ fixedCode }, 200);
  } catch (error) {
    console.error("Mermaid fix API error", error);
    return jsonResponse({ error: "Unexpected error while fixing Mermaid" }, 500);
  }
}

function buildFixUserMessage(code: string, renderError?: string): string {
  if (!renderError) {
    return `请修复以下 Mermaid 语法，仅输出修复后的 Mermaid：\n\n${code}`;
  }

  return [
    "请修复以下 Mermaid 语法，仅输出修复后的 Mermaid。",
    "",
    "渲染器报错（可作为修复依据）：",
    renderError,
    "",
    "待修复 Mermaid：",
    code,
  ].join("\n");
}

function extractFixedCode(result: OpenAIResponse): string | null {
  const outputText = result.output_text?.trim();
  if (outputText) {
    return outputText;
  }

  for (const item of result.output ?? []) {
    if (item.type !== "message") {
      continue;
    }

    for (const content of item.content ?? []) {
      if (content.type !== "output_text") {
        continue;
      }

      const text = content.text?.trim();
      if (text) {
        return text;
      }
    }
  }

  return null;
}

function jsonResponse(payload: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
