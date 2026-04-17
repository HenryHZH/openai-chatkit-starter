"use client";

import { useCallback, useRef, useState } from "react";
import { BouncingBalls } from "@/components/BouncingBalls";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import {
  MermaidPlayground,
  type MermaidPlaygroundExportHandle,
} from "@/components/MermaidPlayground";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function App() {
  const { scheme, setScheme } = useColorScheme();
  const mermaidExportRef = useRef<MermaidPlaygroundExportHandle | null>(null);
  const analysisExportRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end");
    }
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const status = await mermaidExportRef.current?.ensureRenderableForExport();
      if (!status?.success) {
        setExportError(status?.message ?? "图表渲染失败，暂时无法导出");
        return;
      }

      const [html2canvasModule, jsPdfModule] = await Promise.all([
        // @ts-expect-error Runtime ESM CDN import for browser-side PDF export.
        import(
          /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm"
        ),
        // @ts-expect-error Runtime ESM CDN import for browser-side PDF export.
        import(
          /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm"
        ),
      ]);

      const html2canvas = html2canvasModule.default;
      const JsPdf = jsPdfModule.default;
      const mermaidTarget = mermaidExportRef.current?.getExportElement();
      const analysisTarget = analysisExportRef.current;

      if (!mermaidTarget || !analysisTarget) {
        setExportError("未找到可导出的内容区域，请刷新页面后重试");
        return;
      }

      const [mermaidCanvas, analysisCanvas] = await Promise.all([
        html2canvas(mermaidTarget, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        }),
        html2canvas(analysisTarget, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        }),
      ]);

      const pdf = new JsPdf({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      const appendCanvas = (canvas: HTMLCanvasElement) => {
        const sourceWidth = canvas.width;
        const sourceHeight = canvas.height;
        const ratio = contentWidth / sourceWidth;
        const renderedHeight = sourceHeight * ratio;

        if (renderedHeight <= pageHeight - margin * 2) {
          const image = canvas.toDataURL("image/png");
          pdf.addImage(image, "PNG", margin, margin, contentWidth, renderedHeight);
          return;
        }

        let offsetY = 0;
        const printableHeightPx = Math.floor(((pageHeight - margin * 2) / ratio) * 0.98);
        while (offsetY < sourceHeight) {
          const sliceHeight = Math.min(printableHeightPx, sourceHeight - offsetY);
          const part = document.createElement("canvas");
          part.width = sourceWidth;
          part.height = sliceHeight;
          const ctx = part.getContext("2d");
          if (!ctx) {
            break;
          }
          ctx.drawImage(
            canvas,
            0,
            offsetY,
            sourceWidth,
            sliceHeight,
            0,
            0,
            sourceWidth,
            sliceHeight
          );
          const image = part.toDataURL("image/png");
          const partHeight = sliceHeight * ratio;
          pdf.addImage(image, "PNG", margin, margin, contentWidth, partHeight);
          offsetY += sliceHeight;
          if (offsetY < sourceHeight) {
            pdf.addPage();
          }
        }
      };

      appendCanvas(mermaidCanvas);
      pdf.addPage();
      appendCanvas(analysisCanvas);
      pdf.save(`案件分析-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("导出 PDF 失败", error);
      }
      setExportError("导出失败，请稍后重试");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  return (
    <main className="app-shell relative min-h-screen text-[var(--ink-900)]">
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-5 pb-14 pt-8 sm:px-8 lg:gap-10 lg:px-12 lg:pt-12">
        <header className="intro-reveal grid gap-7">
          <div className="grid gap-7">
            <div className="space-y-5">
              <span className="badge-kicker">Case Studio · 5分钟结构化输出</span>
              <h1 className="section-title max-w-[14ch]">案例分析专家</h1>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="control-pill"
                  data-variant="primary"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                >
                  {isExporting ? "导出中..." : "一键导出 PDF"}
                </button>
                {exportError ? (
                  <span className="text-sm text-[var(--danger)]">{exportError}</span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section className="relative">
          <div className="surface-panel section-frame relative overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
            <div className="canvas-grid pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--ink-520)_14%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--ink-520)_14%,transparent)_1px,transparent_1px)] bg-[size:30px_30px]" />
            <BouncingBalls scheme={scheme} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-7 xl:grid-cols-[1.08fr_1fr]">
          <div className="section-frame">
            <MermaidPlayground ref={mermaidExportRef} scheme={scheme} />
          </div>
          <div
            ref={analysisExportRef}
            data-export-target="analysis"
            className="section-frame"
          >
            <ChatKitPanel
              theme={scheme}
              onWidgetAction={handleWidgetAction}
              onResponseEnd={handleResponseEnd}
              onThemeRequest={setScheme}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
