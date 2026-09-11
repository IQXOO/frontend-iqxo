"use client"

import { useNavigate } from "react-router-dom"

export const PDF_PREVIEW_STORAGE_KEY = "iqxo_pdf_preview_html"

export function PdfPreviewPage() {
  const navigate = useNavigate()
  const html = sessionStorage.getItem(PDF_PREVIEW_STORAGE_KEY) || ""

  const isNativeApp =
    typeof window !== "undefined" &&
    ((window as any).isNativeApp === true ||
      (window as any).__IQXO_IS_NATIVE === true ||
      typeof (window as any).ReactNativeWebView !== "undefined")

  const handleDownload = () => {
    if (isNativeApp) {
      const postFn =
        (window as any).__IQXO_postMessage ||
        (window as any).ReactNativeWebView?.postMessage
      if (typeof postFn === "function") {
        postFn(JSON.stringify({ type: "exportPDF", html, title: "IQXO - Event Summary" }))
      }
    } else {
      const iframe = document.querySelector<HTMLIFrameElement>("#pdf-preview-frame")
      if (iframe?.contentWindow) {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } else {
        window.print()
      }
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "#0d0d12" }}>
      <div style={{ display: "flex", gap: "10px", padding: "10px 16px", background: "#1a1a2e", borderBottom: "1px solid #2a2a3e", alignItems: "center" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "8px 14px", background: "#64748b", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
        >
          Back / العودة
        </button>
        <button
          onClick={handleDownload}
          style={{ padding: "8px 14px", background: "#3b82f6", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
        >
          {isNativeApp ? "Save PDF" : "Download PDF"}
        </button>
      </div>
      <iframe
        id="pdf-preview-frame"
        title="IQXO Event Report"
        srcDoc={html}
        style={{ flex: 1, border: "none", background: "white" }}
      />
    </div>
  )
}
