"use client"

import { CheckCircle2, Circle, Sparkles } from "lucide-react"
import { useState } from "react"
import { useApp } from "@/lib/store"

interface PrepListItem {
  id: string
  text: string
  checked: boolean
}

interface AIPrepListProps {
  eventType: string
  eventTitle: string
  defaultItems?: PrepListItem[]
}

export function AIPrepList({ eventType, eventTitle, defaultItems }: AIPrepListProps) {
  const { language, t } = useApp()
  const isRTL = language === "ar"
  const [items, setItems] = useState<PrepListItem[]>(
    defaultItems || generatePrepList(eventType, language)
  )

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item))
  }

  const completedCount = items.filter(i => i.checked).length
  const progressPercent = (completedCount / items.length) * 100

  const prepLabel =
    language === "ar"
      ? `الاستعداد لـ ${eventTitle}`
      : language === "fr"
      ? `Préparation pour ${eventTitle}`
      : `Prepare for ${eventTitle}`

  return (
    <div className={`${isRTL ? "text-right" : "text-left"} px-5 py-3`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="glass rounded-2xl p-4 border border-primary/20">
        <div className={`flex items-start gap-2 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">{t("suggestion")}</p>
            <p className="text-sm font-semibold text-foreground">{prepLabel}</p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                isRTL ? "flex-row-reverse text-right" : "text-left"
              } ${item.checked ? "bg-primary/15" : "hover:bg-secondary/30"}`}
            >
              {item.checked ? (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.text}
              </span>
            </button>
          ))}
        </div>

        <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="w-full h-1 bg-secondary/50 rounded-full overflow-hidden mx-3">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">{completedCount}/{items.length}</span>
        </div>
      </div>
    </div>
  )
}

function generatePrepList(eventType: string, language: string = "en"): PrepListItem[] {
  const isFr = language === "fr"
  const isAr = language === "ar"

  const lists: Record<string, PrepListItem[]> = {
    doctor: [
      { id: "1", text: isAr ? "إحضار بطاقة التأمين" : isFr ? "Apporter la carte d'assurance" : "Bring insurance card", checked: false },
      { id: "2", text: isAr ? "كتابة الأدوية الحالية" : isFr ? "Lister les médicaments en cours" : "List current medications", checked: false },
      { id: "3", text: isAr ? "تدوين الأعراض والملاحظات" : isFr ? "Noter les symptômes / questions" : "Note symptoms/concerns", checked: false },
      { id: "4", text: isAr ? "الحضور قبل الموعد بـ 10 دقائق" : isFr ? "Arriver 10 min en avance" : "Arrive 10 min early", checked: false },
    ],
    meeting: [
      { id: "1", text: isAr ? "تجهيز جدول الأعمال" : isFr ? "Préparer l'ordre du jour" : "Prepare agenda", checked: false },
      { id: "2", text: isAr ? "مراجعة الملاحظات السابقة" : isFr ? "Relire les notes précédentes" : "Review previous notes", checked: false },
      { id: "3", text: isAr ? "تجربة الصوت والكاميرا" : isFr ? "Tester le micro / caméra" : "Test audio/video", checked: false },
      { id: "4", text: isAr ? "تجهيز كوب ماء" : isFr ? "Avoir de l'eau à portée de main" : "Have water nearby", checked: false },
    ],
    travel: [
      { id: "1", text: isAr ? "تجهيز الحقائب الأساسية" : isFr ? "Préparer les bagages essentiels" : "Pack essentials", checked: false },
      { id: "2", text: isAr ? "التحقق من حالة الطقس" : isFr ? "Vérifier la météo" : "Check weather", checked: false },
      { id: "3", text: isAr ? "تأكيد وسيلة التنقل" : isFr ? "Confirmer le moyen de transport" : "Confirm transport", checked: false },
      { id: "4", text: isAr ? "مشاركة خطة السفر" : isFr ? "Partager l'itinéraire" : "Share itinerary", checked: false },
    ],
  }

  return lists[eventType.toLowerCase()] || [
    { id: "1", text: isAr ? "تجهيز المستلزمات" : isFr ? "Préparer le matériel" : "Prepare materials", checked: false },
    { id: "2", text: isAr ? "ضبط التذكير" : isFr ? "Activer un rappel" : "Set reminder", checked: false },
    { id: "3", text: isAr ? "التخطيط للتنقل" : isFr ? "Planifier le trajet" : "Plan transport", checked: false },
  ]
}
