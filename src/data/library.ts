import type { QuranRef } from "@/lib/quran";

export type LibraryKind = "ayah" | "hadith" | "question" | "reflection";

export const LIBRARY_KIND_LABELS: Record<LibraryKind, string> = {
  ayah: "آية",
  hadith: "حديث",
  question: "سؤال محاسبة",
  reflection: "خاطرة",
};

export interface LibraryItem {
  id: string;
  kind: LibraryKind;
  text: string;
  /** للآيات: مرجع قرآني */
  quran?: QuranRef;
  /** جزء من آية */
  partial?: boolean;
  /** للأحاديث: التخريج والدرجة */
  source?: string;
}

// الآيات بالرسم الإملائي مع التشكيل. الأحاديث مقتصرة على الصحيح والحسن مع التخريج.
// الأسئلة والخواطر ليست نصوصاً شرعية بل كلام توجيهي.
export const LIBRARY: LibraryItem[] = [
  { id: "a-alaq-14", kind: "ayah", text: "أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ", quran: { surah: 96, ayah: 14 } },
  { id: "a-baqarah-152", kind: "ayah", text: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ", quran: { surah: 2, ayah: 152 } },
  { id: "a-muminun-115", kind: "ayah", text: "أَفَحَسِبْتُمْ أَنَّمَا خَلَقْنَاكُمْ عَبَثًا وَأَنَّكُمْ إِلَيْنَا لَا تُرْجَعُونَ", quran: { surah: 23, ayah: 115 } },
  { id: "a-hashr-18", kind: "ayah", text: "يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ ۖ وَاتَّقُوا اللَّهَ ۚ إِنَّ اللَّهَ خَبِيرٌ بِمَا تَعْمَلُونَ", quran: { surah: 59, ayah: 18 } },
  { id: "a-qaf-18", kind: "ayah", text: "مَّا يَلْفِظُ مِن قَوْلٍ إِلَّا لَدَيْهِ رَقِيبٌ عَتِيدٌ", quran: { surah: 50, ayah: 18 } },
  { id: "a-raad-28", kind: "ayah", text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", quran: { surah: 13, ayah: 28 }, partial: true },
  { id: "a-hadid-4", kind: "ayah", text: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ بَصِيرٌ", quran: { surah: 57, ayah: 4 }, partial: true },
  { id: "a-hadid-16", kind: "ayah", text: "أَلَمْ يَأْنِ لِلَّذِينَ آمَنُوا أَن تَخْشَعَ قُلُوبُهُمْ لِذِكْرِ اللَّهِ", quran: { surah: 57, ayah: 16 }, partial: true },
  { id: "a-qiyamah-2", kind: "ayah", text: "وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ", quran: { surah: 75, ayah: 2 } },
  { id: "a-qiyamah-14", kind: "ayah", text: "بَلِ الْإِنسَانُ عَلَىٰ نَفْسِهِ بَصِيرَةٌ", quran: { surah: 75, ayah: 14 } },
  { id: "a-shams-9", kind: "ayah", text: "قَدْ أَفْلَحَ مَن زَكَّاهَا ۝ وَقَدْ خَابَ مَن دَسَّاهَا", quran: { surah: 91, ayah: 9, ayahTo: 10 } },
  { id: "a-nisa-1", kind: "ayah", text: "إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا", quran: { surah: 4, ayah: 1 }, partial: true },
  { id: "a-zalzalah-7", kind: "ayah", text: "فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ ۝ وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ شَرًّا يَرَهُ", quran: { surah: 99, ayah: 7, ayahTo: 8 } },

  { id: "h-niyyat", kind: "hadith", text: "«إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى»", source: "متفق عليه: البخاري (1) ومسلم (1907)" },
  { id: "h-adwam", kind: "hadith", text: "«أحبُّ الأعمال إلى الله أدومها وإن قلّ»", source: "متفق عليه: البخاري (6464) ومسلم (783)" },
  { id: "h-ihsan", kind: "hadith", text: "«الإحسان أن تعبد الله كأنك تراه، فإن لم تكن تراه فإنه يراك»", source: "متفق عليه: البخاري (50) ومسلم (8)" },
  { id: "h-ittaqi", kind: "hadith", text: "«اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها، وخالق الناس بخلق حسن»", source: "رواه الترمذي (1987) وقال: حسن صحيح" },
  { id: "h-kalimatan", kind: "hadith", text: "«كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم»", source: "متفق عليه: البخاري (6406) ومسلم (2694)" },

  { id: "q-1", kind: "question", text: "لو عُرض عليك عملك اليوم، فبأيّ شيء تحب أن تلقى الله؟" },
  { id: "q-2", kind: "question", text: "ما آخر كلمة قلتها؟ هل كنت تحب أن تُكتب لك أم عليك؟" },
  { id: "q-3", kind: "question", text: "هل صليت صلاتك الأخيرة بقلب حاضر؟" },
  { id: "q-4", kind: "question", text: "من ظلمته أو قصّرت في حقه، وكيف تصلح ذلك اليوم؟" },
  { id: "q-5", kind: "question", text: "ما النعمة التي مرّت بك اليوم ولم تشكر الله عليها؟" },

  { id: "r-1", kind: "reflection", text: "توقّف لحظة: الله يراك الآن، في هذا المكان، بهذه النية." },
  { id: "r-2", kind: "reflection", text: "قليل دائم خير من كثير منقطع؛ خطوة صغيرة اليوم تكفي." },
  { id: "r-3", kind: "reflection", text: "الغفلة لا تحتاج إلى قرار، أما اليقظة فتحتاج إلى نية. جدّد نيتك." },
  { id: "r-4", kind: "reflection", text: "استغفارٌ واحدٌ صادق الآن أنفع من تأجيل التوبة إلى الغد." },
];

/** رسالة اليوم: اختيار ثابت لكل يوم (حتمي) */
export function messageOfDay(iso: string): LibraryItem {
  let h = 0;
  for (const c of iso) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LIBRARY[h % LIBRARY.length];
}