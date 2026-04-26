import type { IQXOEvent } from "./types"

export async function exportEventsToPDF(events: IQXOEvent[], userName: string | undefined) {
  // Since we don't have access to pdf libraries, we'll create a structured HTML document
  // that can be printed to PDF using browser's print functionality
  
  const doc = createPDFContent(events, userName)
  
  // Trigger print dialog
  const printWindow = window.open("", "", "height=600,width=800")
  if (!printWindow) {
    console.error("Could not open print window")
    return
  }

  printWindow.document.write(doc)
  printWindow.document.close()

  // Wait for content to load then print
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 250)
}

function createPDFContent(events: IQXOEvent[], userName: string | undefined): string {
  const now = new Date()
  const userName2 = userName?.split("@")?.[0] || "User"

  // Group events by category
  const urgentEvents = events.filter((e) => {
    const eventDate = new Date(e.date)
    const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntil <= 7 && daysUntil >= 0
  })

  const upcomingEvents = events.filter((e) => {
    const eventDate = new Date(e.date)
    const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntil > 7 && daysUntil <= 30
  })

  const futureEvents = events.filter((e) => {
    const eventDate = new Date(e.date)
    const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntil > 30
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>IQXO Event Summary - ${now.toLocaleDateString()}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
          background: white;
          padding: 40px;
        }
        
        .header {
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 5px;
          color: #1a1a1a;
        }
        
        .header p {
          color: #666;
          font-size: 14px;
        }
        
        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .summary-card {
          background: #f3f4f6;
          padding: 15px;
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
        
        .summary-card h3 {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-card .value {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
        }
        
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .section h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #1a1a1a;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .event {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 6px;
          page-break-inside: avoid;
        }
        
        .event h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        
        .event-meta {
          display: flex;
          gap: 15px;
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .event-meta span {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .event-notes {
          font-size: 13px;
          color: #666;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 IQXO Event Summary</h1>
        <p>Personal Assistant Report for ${userName2}</p>
        <p>Generated on ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
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
          <h3>Future (Beyond)</h3>
          <div class="value">${futureEvents.length}</div>
        </div>
        <div class="summary-card">
          <h3>Total Tasks</h3>
          <div class="value">${events.length}</div>
        </div>
      </div>
      
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
      
      <div class="footer">
        <p>This document was generated by IQXO - Your Personal Intelligence Assistant</p>
        <p style="margin-top: 10px; font-size: 11px;">For questions or support, visit your account dashboard.</p>
      </div>
    </body>
    </html>
  `
}

function renderEventHTML(event: IQXOEvent): string {
  return `
    <div class="event">
      <h3>${escapeHTML(event.title)}</h3>
      <div class="event-meta">
        <span>📍 ${event.date} at ${event.time || "TBD"}</span>
        ${event.location ? `<span>📌 ${escapeHTML(event.location)}</span>` : ""}
        ${event.phone ? `<span>📞 ${escapeHTML(event.phone)}</span>` : ""}
      </div>
      ${event.notes ? `<div class="event-notes"><strong>Notes:</strong> ${escapeHTML(event.notes)}</div>` : ""}
    </div>
  `
}

function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
