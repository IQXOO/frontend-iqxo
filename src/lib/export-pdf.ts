import type { IQXOEvent } from "./types"

export async function exportEventsToPDF(events: IQXOEvent[], userName: string | undefined) {
  const safeEvents = Array.isArray(events) ? events : []
  const doc = createPDFContent(safeEvents, userName)

  // The preview page will be rendered universally. Native bridges are handled inside the HTML.

  // ── Web browser & Native Apps: Use a full-screen iframe to preserve app state and native bridges ──
  const iframe = document.createElement("iframe")
  iframe.id = "iqxo-pdf-preview-iframe"
  iframe.style.position = "fixed"
  iframe.style.top = "0"
  iframe.style.left = "0"
  iframe.style.width = "100%"
  iframe.style.height = "100%"
  iframe.style.zIndex = "9999999"
  iframe.style.border = "none"
  iframe.style.backgroundColor = "white"
  
  // Remove existing if any
  const existing = document.getElementById("iqxo-pdf-preview-iframe")
  if (existing) existing.remove()
  
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentWindow?.document
  if (iframeDoc) {
    iframeDoc.open()
    iframeDoc.write(doc)
    iframeDoc.close()
  }
}

function createPDFContent(events: IQXOEvent[], userName: string | undefined): string {
  const now = new Date()
  // Start of today at 00:00:00 local time for accurate day comparisons
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const userName2 = userName?.split("@")?.[0] || "User"

  // Group events into 4 distinct, non-overlapping categories so every single event is included
  const pastEvents: IQXOEvent[] = []
  const urgentEvents: IQXOEvent[] = []
  const upcomingEvents: IQXOEvent[] = []
  const futureEvents: IQXOEvent[] = []

  for (const e of events) {
    if (!e || !e.date) continue
    // Handle YYYY-MM-DD string safely by appending time if missing to avoid UTC shift
    const dateStr = e.date.includes("T") ? e.date : `${e.date}T00:00:00`
    const eventTime = new Date(dateStr).getTime()
    if (isNaN(eventTime)) continue

    const diffDays = (eventTime - startOfToday) / (1000 * 60 * 60 * 24)

    if (diffDays < 0) {
      pastEvents.push(e)
    } else if (diffDays <= 7) {
      urgentEvents.push(e)
    } else if (diffDays <= 30) {
      upcomingEvents.push(e)
    } else {
      futureEvents.push(e)
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="auto">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>IQXO Event Summary - ${now.toLocaleDateString()}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Cairo, Roboto, Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
          background: white;
          padding: 30px;
        }
        
        .header {
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 16px;
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4px;
        }
        
        .header p {
          color: #666;
          font-size: 13px;
        }
        
        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .summary-card {
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        
        .summary-card.urgent {
          border-left-color: #ef4444;
        }
        
        .summary-card.upcoming {
          border-left-color: #f59e0b;
        }
        
        .summary-card.future {
          border-left-color: #10b981;
        }
        
        .summary-card.past {
          border-left-color: #6b7280;
        }
        
        .summary-card h3 {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-card .value {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }
        
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .section h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #0f172a;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .event {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 14px;
          margin-bottom: 10px;
          border-radius: 8px;
          page-break-inside: avoid;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        
        .event h3 {
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 6px;
        }
        
        .event-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 6px;
        }
        
        .event-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .event-notes {
          font-size: 12px;
          color: #475569;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #f1f5f9;
          white-space: pre-wrap;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px dashed #cbd5e1;
        }
        
        @media print {
          body {
            padding: 15px;
          }
          .section {
            page-break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
        }
        
        .download-btn {
          display: block;
          width: 100%;
          max-width: 300px;
          margin: 0 auto 30px auto;
          background: #3b82f6;
          color: white;
          text-align: center;
          padding: 14px 20px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 16px;
          font-weight: bold;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);
        }
        .download-btn:active {
          transform: scale(0.98);
        }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <script>
        function handleDownload() {
          var isNativeApp = window.parent.isNativeApp === true || window.parent.__IQXO_IS_NATIVE === true || (typeof window.parent.ReactNativeWebView !== "undefined");
          var postFn = window.parent.__IQXO_postMessage || (window.parent.ReactNativeWebView && window.parent.ReactNativeWebView.postMessage);
          
          if (isNativeApp && typeof postFn === "function") {
            postFn(JSON.stringify({ type: "exportPDF", html: document.documentElement.outerHTML, title: "IQXO - Event Summary" }));
            return;
          }

          var buttons = document.querySelector('.no-print');
          buttons.style.display = 'none';
          
          try {
            if (typeof html2pdf === 'undefined') {
              throw new Error("PDF Engine not loaded from CDN");
            }
            
            var element = document.body;
            var opt = {
              margin:       10,
              filename:     'IQXO_Report.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, logging: false },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).output('blob').then(function(pdfBlob) {
              buttons.style.display = 'flex';
              
              var file = new File([pdfBlob], "IQXO_Report.pdf", { type: 'application/pdf' });
              var canShareFile = false;
              
              if (navigator.canShare) {
                canShareFile = navigator.canShare({ files: [file] });
              } else if (navigator.share) {
                canShareFile = true;
              }
              
              if (canShareFile) {
                navigator.share({
                  files: [file],
                  title: 'IQXO Event Summary'
                }).catch(function(err) {
                  console.error("Share failed", err);
                  fallbackDownload(pdfBlob);
                });
              } else {
                fallbackDownload(pdfBlob);
              }
            }).catch(function(err) {
              buttons.style.display = 'flex';
              console.error("PDF generation failed", err);
              window.print();
            });
          } catch (e) {
            buttons.style.display = 'flex';
            console.error(e);
            window.print();
          }
        }
        
        function fallbackDownload(blob) {
          try {
            var blobUrl = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = blobUrl;
            a.download = "IQXO_Report.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 100);
          } catch (e) {
            window.print();
          }
        }
        
        function closePreview() {
          var iframe = window.parent.document.getElementById('iqxo-pdf-preview-iframe');
          if (iframe) {
            iframe.remove();
          } else {
            window.parent.location.reload();
          }
        }
      </script>
    </head>
    <body>
      <div class="no-print" style="display: flex; gap: 10px; max-width: 400px; margin: 0 auto 30px auto;">
        <button onclick="handleDownload()" class="download-btn" style="margin: 0; flex: 1;">
          ⬇ Download PDF (حفظ)
        </button>
        <button onclick="closePreview()" class="download-btn" style="margin: 0; flex: 1; background: #64748b;">
          ⬅ Back (العودة)
        </button>
      </div>
      
      <div class="header">
        <div>
          <h1 dir="auto">📋 IQXO Event Summary</h1>
          <p>Personal Assistant Report for <strong>${escapeHTML(userName2)}</strong></p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 11px; color: #94a3b8;">Total Records: <strong>${events.length}</strong></p>
          <p style="font-size: 11px; color: #94a3b8;">${now.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </div>
      
      <div class="summary">
        <div class="summary-card urgent">
          <h3>Urgent (Next 7 Days)</h3>
          <div class="value">${urgentEvents.length}</div>
        </div>
        <div class="summary-card upcoming">
          <h3>Upcoming (1-4 Weeks)</h3>
          <div class="value">${upcomingEvents.length}</div>
        </div>
        <div class="summary-card future">
          <h3>Future</h3>
          <div class="value">${futureEvents.length}</div>
        </div>
        <div class="summary-card past">
          <h3>Past / History</h3>
          <div class="value">${pastEvents.length}</div>
        </div>
      </div>
      
      ${events.length === 0 ? `
        <div class="empty-state">
          <p>No events or records found in your account.</p>
        </div>
      ` : ""}
      
      ${urgentEvents.length > 0 ? `
        <div class="section">
          <h2>⚡ Urgent & Critical (Next 7 Days)</h2>
          ${urgentEvents.map((e) => renderEventHTML(e)).join("")}
        </div>
      ` : ""}
      
      ${upcomingEvents.length > 0 ? `
        <div class="section">
          <h2>📅 Upcoming (1-4 Weeks)</h2>
          ${upcomingEvents.map((e) => renderEventHTML(e)).join("")}
        </div>
      ` : ""}
      
      ${futureEvents.length > 0 ? `
        <div class="section">
          <h2>🔮 Future Events</h2>
          ${futureEvents.map((e) => renderEventHTML(e)).join("")}
        </div>
      ` : ""}

      ${pastEvents.length > 0 ? `
        <div class="section">
          <h2>📜 Previous / History Records</h2>
          ${pastEvents.map((e) => renderEventHTML(e)).join("")}
        </div>
      ` : ""}
      
      <div class="footer">
        <p>This document was generated by IQXO - Your Personal Intelligence Assistant</p>
      </div>
    </body>
    </html>
  `
}

function renderEventHTML(event: IQXOEvent): string {
  if (!event) return ""
  return `
    <div class="event" dir="auto">
      <h3 dir="auto">${escapeHTML(event.title || "Untitled Event")}</h3>
      <div class="event-meta">
        <span>📍 ${escapeHTML(event.date || "")}${event.time ? " at " + escapeHTML(event.time) : ""}</span>
        ${event.location ? `<span dir="auto">📌 ${escapeHTML(event.location)}</span>` : ""}
        ${event.phone ? `<span>📞 ${escapeHTML(event.phone)}</span>` : ""}
      </div>
      ${event.notes ? `<div class="event-notes" dir="auto"><strong>Notes:</strong> ${escapeHTML(event.notes)}</div>` : ""}
    </div>
  `
}

function escapeHTML(text: any): string {
  if (text === null || text === undefined) return ""
  const str = String(text)
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return str.replace(/[&<>"']/g, (m) => map[m])
}
