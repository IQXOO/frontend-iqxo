"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Copy,
  Check,
  Share2,
  Mail,
  MessageSquare,
  Send,
  X,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import type { IQXOEvent } from "@/lib/types";

interface EventShareModalProps {
  event: IQXOEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: string;
}

export function buildEventShareText(
  event: IQXOEvent,
  language: string = "ar"
): string {
  const origin = "https://iqxo.ai";
  const dateStr = event.date || "";
  const timeStr =
    event.start_time && event.end_time
      ? `${event.start_time} - ${event.end_time}`
      : event.time || "";

  if (language === "ar") {
    return `🌟 *تفاصيل الحدث من IQXO* 🌟

📝 *العنوان:* ${event.title}
📅 *التاريخ:* ${dateStr}${timeStr ? `\n⏰ *الوقت:* ${timeStr}` : ""}${event.location ? `\n📍 *الموقع:* ${event.location}` : ""}${event.link ? `\n🔗 *الرابط:* ${event.link}` : ""}${event.phone ? `\n📞 *الهاتف:* ${event.phone}` : ""}${event.email ? `\n✉️ *البريد الإلكتروني:* ${event.email}` : ""}${event.notes ? `\n\n💬 *ملاحظات:*\n${event.notes}` : ""}

---
🔗 منظم المواعيد الذكي IQXO:
${origin}`;
  } else if (language === "fr") {
    return `🌟 *Détails de l'événement depuis IQXO* 🌟

📝 *Titre :* ${event.title}
📅 *Date :* ${dateStr}${timeStr ? `\n⏰ *Heure :* ${timeStr}` : ""}${event.location ? `\n📍 *Lieu :* ${event.location}` : ""}${event.link ? `\n🔗 *Lien :* ${event.link}` : ""}${event.phone ? `\n📞 *Téléphone :* ${event.phone}` : ""}${event.email ? `\n✉️ *E-mail :* ${event.email}` : ""}${event.notes ? `\n\n💬 *Remarques :*\n${event.notes}` : ""}

---
🔗 Organisez vos événements sur IQXO :
${origin}`;
  } else {
    return `🌟 *Event Details from IQXO* 🌟

📝 *Title:* ${event.title}
📅 *Date:* ${dateStr}${timeStr ? `\n⏰ *Time:* ${timeStr}` : ""}${event.location ? `\n📍 *Location:* ${event.location}` : ""}${event.link ? `\n🔗 *Link:* ${event.link}` : ""}${event.phone ? `\n📞 *Phone:* ${event.phone}` : ""}${event.email ? `\n✉️ *Email:* ${event.email}` : ""}${event.notes ? `\n\n💬 *Notes:*\n${event.notes}` : ""}

---
🔗 Smart Personal Organizer IQXO:
${origin}`;
  }
}

export function EventShareModal({
  event,
  open,
  onOpenChange,
  language = "ar",
}: EventShareModalProps) {
  const [copied, setCopied] = useState(false);
  const isRTL = language === "ar";

  if (!event) return null;

  const shareText = buildEventShareText(event, language);

  const postNativeMessage = (msg: Record<string, unknown>) => {
    try {
      if (
        typeof window !== "undefined" &&
        (window as any).ReactNativeWebView?.postMessage
      ) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify(msg));
        return true;
      }
    } catch (_) {}
    return false;
  };

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsApp = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const encoded = encodeURIComponent(shareText);
    const sent = postNativeMessage({
      type: "openExternal",
      url: `whatsapp://send?text=${encoded}`,
    });
    if (!sent) {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
    }
  };

  const handleTelegram = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const encoded = encodeURIComponent(shareText);
    const sent = postNativeMessage({
      type: "openExternal",
      url: `tg://msg_url?url=${encodeURIComponent("https://iqxo.ai")}&text=${encoded}`,
    });
    if (!sent) {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent("https://iqxo.ai")}&text=${encoded}`,
        "_blank"
      );
    }
  };

  const handleEmail = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const subject = encodeURIComponent(event.title);
    const body = encodeURIComponent(shareText);
    const mailUrl = `mailto:?subject=${subject}&body=${body}`;
    const sent = postNativeMessage({
      type: "openExternal",
      url: mailUrl,
    });
    if (!sent) {
      window.location.href = mailUrl;
    }
  };

  const handleSMS = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    const prefix = isIOS ? "sms:&body=" : "sms:?body=";
    const smsUrl = prefix + encodeURIComponent(shareText);
    const sent = postNativeMessage({
      type: "openExternal",
      url: smsUrl,
    });
    if (!sent) {
      window.location.href = smsUrl;
    }
  };

  const handleSystemShare = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const sent = postNativeMessage({
      type: "share",
      title: event.title,
      message: shareText,
      text: shareText,
      url: "https://iqxo.ai",
    });

    if (!sent) {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: event.title,
            text: shareText,
          });
        } catch (_) {}
      } else {
        handleCopy(e);
      }
    }
  };

  const L = {
    title:
      language === "ar"
        ? "مشاركة تفاصيل الموعد"
        : language === "fr"
          ? "Partager l'événement"
          : "Share Event",
    whatsapp: language === "ar" ? "واتساب" : "WhatsApp",
    telegram: language === "ar" ? "تيليجرام" : "Telegram",
    email: language === "ar" ? "البريد" : language === "fr" ? "E-mail" : "Email",
    sms: language === "ar" ? "رسالة SMS" : "SMS",
    more:
      language === "ar"
        ? "المزيد من التطبيقات"
        : language === "fr"
          ? "Plus d'options"
          : "More Apps",
    copy:
      language === "ar"
        ? "نسخ تفاصيل الموعد"
        : language === "fr"
          ? "Copier les détails"
          : "Copy Event Details",
    copied:
      language === "ar"
        ? "تم نسخ التفاصيل بنجاح!"
        : language === "fr"
          ? "Détails copiés avec succès !"
          : "Copied to clipboard!",
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop Overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
        />

        {/* Bottom Sheet Drawer Container */}
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center pointer-events-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onOpenChange(false);
            }
          }}
        >
          <DialogPrimitive.Content
            className="pointer-events-auto relative w-full max-w-md mx-auto bg-[#10141d] border-t border-white/10 rounded-t-[32px] p-5 pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] max-h-[88vh] overflow-y-auto outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom duration-300"
            style={{
              paddingBottom: "max(1.75rem, env(safe-area-inset-bottom, 24px))",
            }}
            dir={isRTL ? "rtl" : "ltr"}
            onPointerDownOutside={(e) => {
              e.preventDefault();
              onOpenChange(false);
            }}
            onInteractOutside={(e) => {
              e.preventDefault();
              onOpenChange(false);
            }}
          >
            {/* Accessibility hidden titles */}
            <DialogPrimitive.Title className="sr-only">
              {L.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {event.title}
            </DialogPrimitive.Description>

            {/* Pull handle indicator */}
            <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-3" />

            {/* Header: Exactly ONE title and ONE single close button */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5BC0DE]/15 border border-[#5BC0DE]/30 flex items-center justify-center text-[#5BC0DE]">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {L.title}
                </h3>
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChange(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </DialogPrimitive.Close>
            </div>

            {/* ── Event Summary Card ── */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 mb-4">
              <h4 className="text-sm font-semibold text-white/95 line-clamp-1">
                {event.title}
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                {event.date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#5BC0DE]" />
                    <span>{event.date}</span>
                  </div>
                )}
                {(event.time || event.start_time) && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{event.start_time || event.time}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1.5 line-clamp-1 max-w-[150px]">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Direct Sharing Options Grid ── */}
            <div className="grid grid-cols-4 gap-2.5 mb-4">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                type="button"
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 transition-all group active:scale-95 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-white/90">
                  {L.whatsapp}
                </span>
              </button>

              {/* Telegram */}
              <button
                onClick={handleTelegram}
                type="button"
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] hover:bg-sky-500/15 border border-white/10 hover:border-sky-500/30 transition-all group active:scale-95 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <Send className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-white/90">
                  {L.telegram}
                </span>
              </button>

              {/* Email */}
              <button
                onClick={handleEmail}
                type="button"
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 transition-all group active:scale-95 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-white/90">
                  {L.email}
                </span>
              </button>

              {/* SMS */}
              <button
                onClick={handleSMS}
                type="button"
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] hover:bg-violet-500/15 border border-white/10 hover:border-violet-500/30 transition-all group active:scale-95 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-white/90">
                  {L.sms}
                </span>
              </button>
            </div>

            {/* ── Copy Details Button ── */}
            <button
              onClick={handleCopy}
              type="button"
              className={`w-full py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-lg mb-2.5 ${
                copied
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30"
                  : "bg-[#5BC0DE] hover:bg-[#4ab0ce] text-[#0d1117] shadow-[#5BC0DE]/20"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>{L.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{L.copy}</span>
                </>
              )}
            </button>

            {/* ── System Share Trigger (More Apps) ── */}
            <button
              onClick={handleSystemShare}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-white/70 hover:text-white transition-all active:scale-[0.99] cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#5BC0DE]" />
              <span>{L.more}</span>
            </button>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
