import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export const getLocalizedValue = (
  language: string,
  arabic?: string | null,
  english?: string | null,
  fallback = "",
) => {
  if (language === "ar") return arabic || english || fallback;
  return english || arabic || fallback;
};

export const useDirection = () => {
  const { language, isRTL, dir } = useLanguage();

  return {
    language,
    isRTL,
    dir,
    BackIcon: isRTL ? ArrowRight : ArrowLeft,
    PrevIcon: isRTL ? ChevronRight : ChevronLeft,
    NextIcon: isRTL ? ChevronLeft : ChevronRight,
  };
};
