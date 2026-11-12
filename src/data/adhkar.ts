export type AdhkarCategory = "morning" | "evening" | "sleep" | "after-prayer";

export const ADHKAR_CATEGORY_LABELS: Record<AdhkarCategory, string> = {
  morning: "الصباح",
  evening: "المساء",
  sleep: "النوم",
  "after-prayer": "بعد الصلاة",
};

export interface Dhikr {
  id: string;
  categories: AdhkarCategory[];
  text: string;
  count: number;
  source: string;
}

// نصوص وأعداد ثابتة بالتخريج المذكور. لا تُذكر فضائل هنا تجنباً للنقل غير الدقيق.
export const ADHKAR: Dhikr[] = [
  { id: "kursi", categories: ["morning", "evening", "sleep"], count: 1,
    text: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
    source: "آية الكرسي — البقرة 255. عند النوم: البخاري (2311)" },
  { id: "muawwidhat", categories: ["morning", "evening"], count: 3,
    text: "قراءة سورة الإخلاص والمعوّذتين (الفلق والناس)",
    source: "رواه أبو داود (5082) والترمذي (3575) وقال: حسن صحيح غريب" },
  { id: "sayyid-istighfar", categories: ["morning", "evening"], count: 1,
    text: "اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك عليّ، وأبوء بذنبي فاغفر لي، فإنه لا يغفر الذنوب إلا أنت",
    source: "سيد الاستغفار — رواه البخاري (6306)" },
  { id: "bismillah-la-yadur", categories: ["morning", "evening"], count: 3,
    text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم",
    source: "رواه أبو داود (5088) والترمذي (3388) وقال: حسن صحيح غريب" },
  { id: "subhanallah-wabihamdih", categories: ["morning", "evening"], count: 100,
    text: "سبحان الله وبحمده",
    source: "رواه مسلم (2692)" },
  { id: "bismika-amut", categories: ["sleep"], count: 1,
    text: "باسمك اللهم أموت وأحيا",
    source: "رواه البخاري (6324)" },
  { id: "sleep-tasbih", categories: ["sleep"], count: 100,
    text: "سبحان الله (33)، الحمد لله (33)، الله أكبر (34)",
    source: "متفق عليه: البخاري (3113) ومسلم (2727)" },
  { id: "astaghfirullah-3", categories: ["after-prayer"], count: 3,
    text: "أستغفر الله",
    source: "رواه مسلم (591)" },
  { id: "antas-salam", categories: ["after-prayer"], count: 1,
    text: "اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام",
    source: "رواه مسلم (591)" },
  { id: "prayer-tasbih", categories: ["after-prayer"], count: 100,
    text: "سبحان الله (33)، الحمد لله (33)، الله أكبر (33)، ثم: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير",
    source: "رواه مسلم (597)" },
];