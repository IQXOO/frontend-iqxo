"use client"

import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"

export const PDF_PREVIEW_STORAGE_KEY = "iqxo_pdf_preview_html"

export function PdfPreviewPage() {
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Read HTML from sessionStorage
  const html = sessionStorage.getItem(PDF_PREVIEW_STORAGE_KEY) || ""

  const isNativeApp =
    typeof window !== "undefined" &&
    ((window as any).isNativeApp === true ||
      (window as any).__IQXO_IS_NATIVE === true ||
      typeof (window as any).ReactNativeWebView !== "undefined")

  // Write content imperatively — srcdoc is unreliable in WKWebView (iOS)
  useEffect(() => {
    if (!html) return
    const iframe = iframeRef.current
    if (!iframe) return

    const writeContent = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc) {
          doc.open()
          doc.write(html)
          doc.close()
        }
      } catch (e) {
        console.error("[PdfPreviewPage] iframe write error:", e)
      }
    }

    // Write immediately (iframe is blank/about:blank by default, contentDocument is ready)
    writeContent()
  }, [html])

  const handleDownload = () => {
    if (!html) {
      alert("No report data. Please go back and try again.")
      return
    }

    if (isNativeApp) {
      // We are in the MAIN React window — bridge is fully alive
      const postFn =
        (window as any).__IQXO_postMessage ||
        (window as any).ReactNativeWebView?.postMessage
      if (typeof postFn === "function") {
        postFn(JSON.stringify({ type: "exportPDF", html, title: "IQXO - Event Summary" }))
      }
    } else {
      // Web browser — print the iframe
      const iframe = iframeRef.current
      if (iframe?.contentWindow) {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } else {
        window.print()
      }
    }
  }

  // Show error if no data (sessionStorage was empty)
  if (!html) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0d0d12", color: "white", gap: "16px" }}>
        <p style={{ fontSize: "16px" }}>Could not load report. Please go back and try again.</p>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
        >
          Back / العودة
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "#0d0d12" }}>
      {/* Action bar */}
      <div style={{ display: "flex", gap: "10px", padding: "10px 16px", background: "#1a1a2e", borderBottom: "1px solid #2a2a3e", alignItems: "center", flexShrink: 0 }}>
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

      {/* Report iframe — written imperatively via useEffect */}
      <iframe
        ref={iframeRef}
        id="pdf-preview-frame"
        title="IQXO Event Report"
        style={{ flex: 1, border: "none", background: "white" }}
      />
    </div>
  )
}
