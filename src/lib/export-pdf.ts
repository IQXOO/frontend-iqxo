import type { IQXOEvent } from "./types"

export async function exportEventsToPDF(events: IQXOEvent[], userName: string | undefined) {
  const safeEvents = Array.isArray(events) ? events : []
  const doc = createPDFContent(safeEvents, userName)

  // ── Native App (React Native WebView) ────────────────────────────────────────
  // Send HTML content via postMessage to native app, which renders it via expo-print
  const isNativeApp =
    typeof window !== "undefined" &&
    ((window as any).isNativeApp === true || (window as any).__IQXO_IS_NATIVE === true)

  if (isNativeApp) {
    try {
      const postFn = (window as any).__IQXO_postMessage || (window as any).ReactNativeWebView?.postMessage
      if (typeof postFn === "function") {
        postFn(
          JSON.stringify({
            type: "exportPDF",
            html: doc,
            title: "IQXO – Event Summary",
          })
        )
      }
    } catch (err) {
      console.error("Native export postMessage failed:", err)
    }
    return
  }

  // ── Web browser: open in new window and trigger print dialog ─────────────────
  const printWindow = window.open("", "", "height=600,width=800")
  if (!printWindow) {
    console.error("Could not open print window")
    return
  }

  printWindow.document.write(doc)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 250)
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
        }
      </style>
    </head>
    <body>
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
