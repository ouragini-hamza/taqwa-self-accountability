import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Bell, BookOpen, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Compass, Download, Heart, Home, Moon, Plus, Settings, ShieldCheck,
  Sparkles, Sun, Trash2, Pencil, X, Flame, BookMarked, RotateCcw, Upload, BellRing, Menu,
  MoreHorizontal, CalendarClock, Quote, CircleCheck, ListChecks
} from "lucide-react";
import { repository, uid } from "./lib/storage/repository";
import type { AppData } from "./lib/storage/schema";
import { todayIso, formatHijri, toHijri, formatGregorian, addDays, weekday, HIJRI_MONTHS } from "./lib/hijri";
import { eventsForDay, eventsInRange, nextEvents, EVENT_KIND_LABELS, type AgendaEvent, type EventKind } from "./lib/events";
import { DEFAULT_ITEMS, dayProgress, presenceStreak, toggleDone } from "./lib/muhasaba";
import { LIBRARY, messageOfDay, LIBRARY_KIND_LABELS } from "./data/library";
import { ADHKAR, ADHKAR_CATEGORY_LABELS, type AdhkarCategory } from "./data/adhkar";
import { validateReminder, describeSchedule, INTERVAL_OPTIONS, type ReminderDraft, type Schedule, type UserReminder, REMINDER_KIND_LABELS } from "./lib/reminders";
import { SURAH_NAMES } from "./lib/quran";
import { tick } from "./lib/notifications/scheduler";
import { getNotifier } from "./lib/notifications";
import { syncNativeReminders } from "./lib/notifications/native";

type Tab = "home" | "reminders" | "muhasaba" | "agenda" | "adhkar" | "settings";
const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "الرئيسية", icon: Home },
  { id: "reminders", label: "التذكيرات", icon: Bell },
  { id: "muhasaba", label: "المحاسبة", icon: ListChecks },
  { id: "agenda", label: "الأجندة", icon: CalendarDays },
  { id: "adhkar", label: "الأذكار", icon: BookOpen },
  { id: "settings", label: "الإعدادات", icon: Settings },
];
const today = () => todayIso("Africa/Tunis");
const dateLabel = (d: string) => formatGregorian(d, { weekday: undefined });
const eventColor = (kind: EventKind) => kind === "eid" ? "gold" : kind === "fasting" ? "green" : kind === "friday" ? "blue" : "muted";

function useData() {
  return useSyncExternalStore(repository.subscribe, repository.get, repository.getServer);
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`surface-card ${className}`}>{children}</section>;
}
function Heading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-panel"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="إغلاق"><X size={19}/></button></div>{children}</div></div>;
}
function Button({ children, onClick, variant = "primary", type = "button", disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "soft" | "ghost" | "danger"; type?: "button" | "submit"; disabled?: boolean }) {
  return <button type={type} disabled={disabled} className={`btn btn-${variant}`} onClick={onClick}>{children}</button>;
}

export default function App() {
  const data = useData();
  const [tab, setTab] = useState<Tab>("home");
  const [now, setNow] = useState(new Date());
  const [reminderModal, setReminderModal] = useState(false);
  const [editing, setEditing] = useState<UserReminder | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const iso = today();
  const hijri = toHijri(iso, data.settings.hijriMethod, data.settings.hijriOffset);
  const todayEvents = eventsForDay(iso, { method: data.settings.hijriMethod, offset: data.settings.hijriOffset });
  const msg = messageOfDay(iso);
  const record = data.muhasaba.records[iso];
  const progress = dayProgress(data.muhasaba.items, record);
  const streak = presenceStreak(data.muhasaba.records, iso);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    document.documentElement.classList.toggle("dark", data.settings.theme === "dark");
  }, [data.settings.theme]);
  useEffect(() => { void syncNativeReminders(data.reminders); }, [data.reminders]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
      const result = tick(repository.get(), new Date());
      if (result.payloads.length) {
        repository.update(() => result.next);
        result.payloads.forEach(p => void getNotifier().show(p));
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setReminderModal(false); setEditing(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openNewReminder = () => { setEditing(null); setReminderModal(true); };
  const saveReminder = (draft: ReminderDraft) => {
    const errors = validateReminder(draft);
    if (Object.keys(errors).length) { notify(Object.values(errors)[0] || "راجع البيانات"); return; }
    const next: UserReminder = {
      id: editing?.id ?? uid(), text: draft.text.trim(), kind: draft.kind,
      ...(draft.kind === "ayah" && draft.quran?.surah && draft.quran.ayah ? { quran: { surah: draft.quran.surah, ayah: draft.quran.ayah, ...(draft.quran.ayahTo ? { ayahTo: draft.quran.ayahTo } : {}) } } : {}),
      schedule: draft.schedule, enabled: editing?.enabled ?? true, createdAt: editing?.createdAt ?? Date.now(),
      ...(editing?.lastFiredAt ? { lastFiredAt: editing.lastFiredAt } : {}),
      ...(editing?.linkedEventId ? { linkedEventId: editing.linkedEventId, linkedEventTitle: editing.linkedEventTitle } : {})
    };
    repository.update(d => ({ ...d, reminders: editing && d.reminders.some(r => r.id === editing.id) ? d.reminders.map(r => r.id === editing.id ? next : r) : [...d.reminders, next] }));
    setReminderModal(false); setEditing(null); notify(editing ? "تم تحديث التذكير" : "تمت إضافة التذكير");
  };
  const toggleReminder = (id: string, enabled: boolean) => repository.update(d => ({ ...d, reminders: d.reminders.map(r => r.id === id ? { ...r, enabled } : r) }));
  const deleteReminder = (id: string) => { if (confirm("هل تريد حذف هذا التذكير؟")) repository.update(d => ({ ...d, reminders: d.reminders.filter(r => r.id !== id) })); };

  const go = (id: Tab) => { setTab(id); setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><span>ت</span><i/></div><div><strong>تَقْوَى</strong><small>مَحاسبة النفس</small></div></div>
      <div className="side-caption">مساحتك الإيمانية</div>
      <nav>{tabs.map(t => { const Icon = t.icon; return <button key={t.id} className={`nav-link ${tab === t.id ? "active" : ""}`} onClick={() => go(t.id)}><Icon size={19}/><span>{t.label}</span>{t.id === "reminders" && data.reminders.length > 0 && <small>{data.reminders.length}</small>}</button>; })}</nav>
      <div className="sidebar-verse"><Quote size={17}/><p>وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ</p><small>الحشر · ١٨</small></div>
      <div className="sidebar-foot"><span className="status-dot"/> بياناتك محفوظة على جهازك</div>
    </aside>
    {mobileMenu && <div className="mobile-scrim" onClick={() => setMobileMenu(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={21}/></button><div className="topbar-date"><Sun size={16}/><span>{dateLabel(iso)}</span><span className="topbar-sep">·</span><span>{formatHijri(hijri)}</span></div><div className="topbar-actions"><button className="icon-btn" title="التذكيرات" onClick={() => go("reminders")}><Bell size={19}/>{data.reminders.some(r => r.enabled) && <i className="notify-dot"/>}</button><button className="avatar-btn" onClick={() => go("settings")}>ت</button></div></header>
      <div className="page-content">
        {tab === "home" && <HomePage data={data} iso={iso} hijri={hijri} msg={msg} progress={progress} streak={streak} events={todayEvents} onGo={go} onNew={openNewReminder}/>}
        {tab === "reminders" && <RemindersPage data={data} onNew={openNewReminder} onEdit={r => { setEditing(r); setReminderModal(true); }} onToggle={toggleReminder} onDelete={deleteReminder}/>}
        {tab === "muhasaba" && <MuhasabaPage data={data} iso={iso} onToast={notify}/>}
        {tab === "agenda" && <AgendaPage data={data} onAddReminder={event => {
          const text = `تذكير: ${event.title}`;
          setEditing({ id: uid(), text, kind: "message", schedule: { type: "once", at: `${event.date}T09:00` }, enabled: true, createdAt: Date.now(), linkedEventId: event.id, linkedEventTitle: event.title });
          setReminderModal(true);
        }}/>}
        {tab === "adhkar" && <AdhkarPage data={data}/>}
        {tab === "settings" && <SettingsPage data={data} onToast={notify}/>}
      </div>
      <footer className="app-footer"><span>تَقْوَى</span><span>اللهم أعنّا على ذكرك وشكرك وحسن عبادتك</span></footer>
    </main>
    {reminderModal && <ReminderEditor initial={editing} onSave={saveReminder} onClose={() => { setReminderModal(false); setEditing(null); }}/>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function HomePage({ data, iso, hijri, msg, progress, streak, events, onGo, onNew }: { data: AppData; iso: string; hijri: ReturnType<typeof toHijri>; msg: typeof LIBRARY[number]; progress: { done: number; total: number }; streak: number; events: AgendaEvent[]; onGo: (t: Tab) => void; onNew: () => void }) {
  const percent = progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  return <div className="page-stack">
    <div className="welcome-row"><div><div className="eyebrow">السَّلَامُ عَلَيْكَ</div><h1>مرحباً بك في <em>تقوى</em></h1><p>لحظة صدق مع النفس… تقرّبك إلى الله.</p></div><div className="welcome-symbol"><Sparkles size={29}/></div></div>
    <div className="hero-card"><div className="hero-pattern"/><div className="hero-content"><Pill tone="gold">وَقْفَةُ الْيَوْم</Pill><p className="hero-verse">{msg.text}</p><div className="hero-source">{msg.kind === "ayah" && msg.quran ? `سورة ${SURAH_NAMES[msg.quran.surah - 1]} · الآية ${msg.quran.ayah}` : msg.source || LIBRARY_KIND_LABELS[msg.kind]}</div><div className="hero-bottom"><span><Heart size={15}/> جدّد نيتك الآن</span><button onClick={() => onGo("reminders")}>كل التذكيرات <ChevronLeft size={15}/></button></div></div></div>
    <div className="stats-grid"><Card className="stat-card"><div className="stat-icon green"><CheckCheck size={19}/></div><div><small>إنجاز اليوم</small><strong>{progress.done}<i> / {progress.total}</i></strong><div className="mini-progress"><span style={{width:percent+"%"}}/></div></div></Card><Card className="stat-card"><div className="stat-icon gold"><Flame size={19}/></div><div><small>أيام المواظبة</small><strong>{streak}<i> يوم</i></strong><span className="stat-note">خطوة صغيرة كل يوم</span></div></Card><Card className="stat-card"><div className="stat-icon blue"><BellRing size={19}/></div><div><small>تذكيرات مفعّلة</small><strong>{data.reminders.filter(r=>r.enabled).length}<i> تذكير</i></strong><span className="stat-note">تذكّر ولا تغفل</span></div></Card></div>
    <div className="home-columns"><div className="column-main"><Heading title="محاسبة اليوم" subtitle="راجع أعمالك برفق وصدق." action={<button className="text-action" onClick={() => onGo("muhasaba")}>عرض الكل <ChevronLeft size={15}/></button>}/><Card className="check-card"><div className="check-card-top"><div><strong>خطواتك لهذا اليوم</strong><small>{progress.done} من {progress.total} أعمال أُنجزت</small></div><div className="progress-ring" style={{"--progress":percent} as React.CSSProperties}><span>{percent}%</span></div></div><div className="check-preview">{data.muhasaba.items.slice(0,4).map(item => <div key={item.id}><span className={data.muhasaba.records[iso]?.done.includes(item.id) ? "checked-dot" : "empty-dot"}>{data.muhasaba.records[iso]?.done.includes(item.id) && <Check size={11}/>}</span>{item.label}</div>)}</div><Button variant="soft" onClick={() => onGo("muhasaba")}>أكمل محاسبتك <ChevronLeft size={16}/></Button></Card>
    <Heading title="تذكيراتك القادمة" subtitle="رسائل تعيد قلبك إلى الحضور." action={<button className="text-action" onClick={() => onGo("reminders")}>إدارة التذكيرات <ChevronLeft size={15}/></button>}/>{data.reminders.filter(r=>r.enabled).slice(0,2).map(r=><Card key={r.id} className="reminder-mini"><div className="mini-bell"><Bell size={17}/></div><div><strong>{r.text}</strong><small>{describeSchedule(r.schedule)}</small></div></Card>)}{data.reminders.filter(r=>r.enabled).length===0 && <Card className="empty-inline"><p>لم تضف تذكيراتك بعد. اختر كلمات تحب أن توقظ قلبك.</p><Button onClick={onNew}><Plus size={16}/> أضف تذكيراً</Button></Card>}</div>
    <div className="column-side"><Heading title="مناسبات اليوم" subtitle={formatHijri(hijri)}/>{events.length ? events.map(e=><EventCard key={e.id} event={e}/>) : <Card className="quiet-card"><CalendarDays size={21}/><p>لا توجد مناسبة محددة اليوم.</p><small>اجعل يومك عامراً بالذكر والعمل الصالح.</small></Card>}<Card className="quick-card"><div className="quick-head"><Compass size={18}/><strong>مساراتك الإيمانية</strong></div><button onClick={() => onGo("agenda")}><CalendarDays size={17}/> الأجندة الذكية <ChevronLeft size={15}/></button><button onClick={() => onGo("adhkar")}><BookOpen size={17}/> الأذكار اليومية <ChevronLeft size={15}/></button></Card></div></div>
  </div>;
}

function RemindersPage({ data, onNew, onEdit, onToggle, onDelete }: { data: AppData; onNew: () => void; onEdit: (r: UserReminder) => void; onToggle: (id:string,v:boolean)=>void; onDelete:(id:string)=>void }) {
  const enabled = data.reminders.filter(r=>r.enabled).length;
  return <div className="page-stack"><Heading eyebrow="حضور القلب" title="تذكيراتك الإيمانية" subtitle="اجعل في يومك وقفات توقظ قلبك وتجدّد نيتك." action={<Button onClick={onNew}><Plus size={17}/> تذكير جديد</Button>}/><div className="reminder-summary"><div><BellRing size={22}/><div><strong>{enabled} تذكيرات نشطة</strong><small>من أصل {data.reminders.length} تذكير</small></div></div><span>اختر ما يلامس قلبك</span></div>
    <div className="reminder-list">{data.reminders.map(r=><Card key={r.id} className={`reminder-card ${!r.enabled?"is-disabled":""}`}><div className="reminder-card-icon"><Bell size={19}/></div><div className="reminder-card-body"><div className="reminder-card-top"><Pill tone={r.kind==="ayah"?"green":r.kind==="question"?"gold":"muted"}>{REMINDER_KIND_LABELS[r.kind]}</Pill><span className="schedule-text"><Clock3 size={13}/>{describeSchedule(r.schedule)}</span></div><p>{r.text}</p>{r.quran && <small className="quran-ref">سورة {SURAH_NAMES[r.quran.surah-1]} · الآية {r.quran.ayah}</small>}</div><div className="reminder-controls"><button className="icon-btn" onClick={()=>onEdit(r)} aria-label="تعديل"><Pencil size={16}/></button><button className="icon-btn danger-icon" onClick={()=>onDelete(r.id)} aria-label="حذف"><Trash2 size={16}/></button><label className="switch"><input type="checkbox" checked={r.enabled} onChange={e=>onToggle(r.id,e.target.checked)}/><span/></label></div></Card>)}
    {data.reminders.length===0 && <Card className="empty-state"><div className="empty-illustration"><BellRing size={34}/></div><h3>ابدأ بصناعة وقفاتك الإيمانية</h3><p>أضف آية تحبها، أو سؤالاً يذكّرك بمحاسبة نفسك، أو رسالة خاصة بك.</p><Button onClick={onNew}><Plus size={17}/> أضف أول تذكير</Button></Card>}</div>
    <Card className="info-note"><ShieldCheck size={18}/><p>تُحفظ تذكيراتك على جهازك. قد يؤخر نظام التشغيل أو المتصفح الإشعارات في الخلفية، لذلك لا نعتمد عليها للتنبيهات الدقيقة.</p></Card></div>;
}

function ReminderEditor({ initial, onSave, onClose }: { initial: UserReminder | null; onSave: (d:ReminderDraft)=>void; onClose:()=>void }) {
  const [text,setText]=useState(initial?.text??"");
  const [kind,setKind]=useState<ReminderDraft["kind"]>(initial?.kind??"question");
  const [scheduleType,setScheduleType]=useState<Schedule["type"]>(initial?.schedule.type??"daily");
  const [minutes,setMinutes]=useState(initial?.schedule.type==="interval"?initial.schedule.minutes:30);
  const [time,setTime]=useState(initial?.schedule.type==="daily"||initial?.schedule.type==="weekly"?initial.schedule.time:"09:00");
  const [days,setDays]=useState<number[]>(initial?.schedule.type==="weekly"?initial.schedule.days:[1,4]);
  const [once,setOnce]=useState(initial?.schedule.type==="once"?initial.schedule.at:`${today()}T09:00`);
  const [surah,setSurah]=useState(initial?.quran?.surah??96);
  const [ayah,setAyah]=useState(initial?.quran?.ayah??14);
  const [ayahTo,setAyahTo]=useState(initial?.quran?.ayahTo??"");
  const schedule:Schedule = scheduleType==="interval"?{type:"interval",minutes}:scheduleType==="daily"?{type:"daily",time}:scheduleType==="weekly"?{type:"weekly",days,time}:{type:"once",at:once};
  const toggleDay=(d:number)=>setDays(old=>old.includes(d)?old.filter(x=>x!==d):[...old,d]);
  return <Modal title={initial?"تعديل التذكير":"إضافة تذكير جديد"} onClose={onClose}><form className="form-stack" onSubmit={e=>{e.preventDefault();onSave({text,kind,schedule,...(kind==="ayah"?{quran:{surah,ayah,...(ayahTo?{ayahTo:Number(ayahTo)}:{})}}:{})});}}>
    <label className="field-label">نوع التذكير</label><div className="kind-grid">{(["ayah","dhikr","question","message"] as const).map(k=><button type="button" className={kind===k?"kind-option selected":"kind-option"} onClick={()=>setKind(k)} key={k}>{k==="ayah"?"آية":k==="dhikr"?"ذكر شخصي":k==="question"?"سؤال محاسبة":"رسالة"}</button>)}</div>
    <label className="field-label">نص التذكير</label><textarea required maxLength={400} rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="اكتب ما تريد أن يذكّرك بالله..." />
    {kind==="ayah" && <div className="two-fields"><div><label className="field-label">السورة</label><select value={surah} onChange={e=>setSurah(Number(e.target.value))}>{SURAH_NAMES.map((s,i)=><option key={s} value={i+1}>{i+1}. {s}</option>)}</select></div><div><label className="field-label">رقم الآية</label><input type="number" min="1" value={ayah} onChange={e=>setAyah(Number(e.target.value))}/></div><div><label className="field-label">إلى آية (اختياري)</label><input type="number" min={ayah} value={ayahTo} onChange={e=>setAyahTo(e.target.value)}/></div></div>}
    <label className="field-label">موعد التذكير</label><div className="schedule-options">{([{v:"daily",l:"يومياً"},{v:"weekly",l:"أيام محددة"},{v:"interval",l:"كل فترة"},{v:"once",l:"مرة واحدة"}] as const).map(o=><button type="button" key={o.v} className={scheduleType===o.v?"schedule-option selected":"schedule-option"} onClick={()=>setScheduleType(o.v)}>{o.l}</button>)}</div>
    {scheduleType==="interval" && <div><label className="field-label">الفاصل الزمني</label><select value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>{INTERVAL_OPTIONS.map(m=><option value={m} key={m}>{m<60?`كل ${m} دقيقة`:`كل ${m/60} ساعة`}</option>)}</select></div>}
    {(scheduleType==="daily"||scheduleType==="weekly") && <div><label className="field-label">الوقت</label><input type="time" value={time} onChange={e=>setTime(e.target.value)}/>{scheduleType==="weekly" && <><label className="field-label">أيام الأسبوع</label><div className="weekday-picks">{["أحد","اثن","ثلا","أرب","خمي","جمع","سبت"].map((d,i)=><button type="button" key={i} onClick={()=>toggleDay(i)} className={days.includes(i)?"day-pick active":"day-pick"}>{d}</button>)}</div></>}</div>}
    {scheduleType==="once" && <div><label className="field-label">التاريخ والوقت</label><input type="datetime-local" value={once} min={`${today()}T00:00`} onChange={e=>setOnce(e.target.value)}/></div>}
    <div className="form-hint"><ShieldCheck size={15}/> تذكيرات الخلفية قد تتأخر حسب إعدادات الجهاز وتوفير البطارية.</div>
    <div className="modal-actions"><Button type="submit"><Check size={16}/> حفظ التذكير</Button><Button variant="ghost" onClick={onClose}>إلغاء</Button></div>
  </form></Modal>;
}

function MuhasabaPage({ data, iso, onToast }: { data:AppData; iso:string; onToast:(s:string)=>void }) {
  const rec=data.muhasaba.records[iso]??{done:[]};
  const [note,setNote]=useState(rec.note??"");
  const [newLabel,setNewLabel]=useState("");
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editLabel,setEditLabel]=useState("");
  const p=dayProgress(data.muhasaba.items,rec);
  const updateRecord=(next:{done:string[];note?:string})=>repository.update(d=>({...d,muhasaba:{...d.muhasaba,records:{...d.muhasaba.records,[iso]:next}}}));
  return <div className="page-stack"><Heading eyebrow="مراجعة اليوم" title="محاسبة النفس" subtitle="حاسب نفسك برفق؛ فالمقصود إصلاح القلب لا إثقاله."/><Card className="muhasaba-summary"><div className="summary-progress"><div className="progress-ring large" style={{"--progress":p.total?Math.round(p.done/p.total*100):0} as React.CSSProperties}><span>{p.total?Math.round(p.done/p.total*100):0}%</span></div><div><strong>أحسنت، واصل السعي</strong><p>أنجزت {p.done} من {p.total} أعمال اليوم</p><small>لا تجعل ما فاتك يمنعك من البدء الآن.</small></div></div></Card>
    <div className="list-title"><div><h3>أعمال اليوم</h3><p>اضغط على الدائرة عند إتمام العمل.</p></div><Pill tone="green">{p.done}/{p.total}</Pill></div>
    <div className="task-list">{data.muhasaba.items.map(item=>{const done=rec.done.includes(item.id);return <div className={`task-row ${done?"task-done":""}`} key={item.id}><button className="task-check" onClick={()=>updateRecord(toggleDone(rec,item.id))}>{done&&<Check size={16}/>}</button>{editingId===item.id?<input autoFocus value={editLabel} onChange={e=>setEditLabel(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){repository.update(d=>({...d,muhasaba:{...d.muhasaba,items:d.muhasaba.items.map(x=>x.id===item.id?{...x,label:editLabel.trim()||x.label}:x)}}));setEditingId(null);}}}/>:<span>{item.label}</span>}<div className="task-actions"><button className="icon-btn" onClick={()=>{if(editingId===item.id){repository.update(d=>({...d,muhasaba:{...d.muhasaba,items:d.muhasaba.items.map(x=>x.id===item.id?{...x,label:editLabel.trim()||x.label}:x)}}));setEditingId(null);}else{setEditingId(item.id);setEditLabel(item.label);}}}>{editingId===item.id?<Check size={15}/>:<Pencil size={15}/>}</button><button className="icon-btn danger-icon" onClick={()=>{if(confirm("حذف هذا البند؟"))repository.update(d=>({...d,muhasaba:{...d.muhasaba,items:d.muhasaba.items.filter(x=>x.id!==item.id)}}));}}><Trash2 size={15}/></button></div></div>})}</div>
    <form className="add-task" onSubmit={e=>{e.preventDefault();const label=newLabel.trim();if(!label)return;repository.update(d=>({...d,muhasaba:{...d.muhasaba,items:[...d.muhasaba.items,{id:uid(),label}]}}));setNewLabel("");onToast("تمت إضافة البند");}}><input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="أضف عملاً تريد مراجعته..."/><Button type="submit" disabled={!newLabel.trim()}><Plus size={16}/> إضافة</Button></form>
    <Card className="note-card"><label className="field-label">وقفة مع النفس · ملاحظات اليوم</label><textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="ما الذي يسعدك اليوم؟ وما الذي تريد إصلاحه غداً؟"/><div className="note-footer"><small>تبقى ملاحظاتك خاصة على جهازك.</small><Button variant="soft" onClick={()=>{updateRecord({...rec,note});onToast("تم حفظ ملاحظات اليوم");}}>حفظ الملاحظات</Button></div></Card>
    <Card className="history-card"><div><CalendarClock size={19}/><strong>سجل الأيام السابقة</strong></div><div className="history-grid">{Object.entries(data.muhasaba.records).sort(([a],[b])=>b.localeCompare(a)).slice(0,7).map(([d,r])=><div key={d}><small>{d.slice(5)}</small><b>{r.done.length}</b></div>)}</div><small>تُحفظ سجلاتك السابقة ولا تُحذف عند بدء يوم جديد.</small></Card>
  </div>;
}

function EventCard({event, onAdd}:{event:AgendaEvent;onAdd?:()=>void}) {
  return <Card className="event-card"><div className="event-date"><strong>{Number(event.date.slice(8))}</strong><small>{HIJRI_MONTHS[event.hijri.month-1]}</small></div><div className="event-body"><div className="event-meta"><Pill tone={eventColor(event.kind)}>{EVENT_KIND_LABELS[event.kind]}</Pill>{event.approximate&&<small>تاريخ تقديري</small>}</div><strong>{event.title}</strong><p>{event.description}</p>{event.source&&<small className="event-source">{event.source}</small>}{onAdd&&<button className="text-action" onClick={onAdd}>أضف تذكيراً <Plus size={14}/></button>}</div></Card>;
}

function AgendaPage({data,onAddReminder}:{data:AppData;onAddReminder:(e:AgendaEvent)=>void}) {
  const [month,setMonth]=useState(()=>today().slice(0,7));
  const [filter,setFilter]=useState<EventKind|"all">("all");
  const start=`${month}-01`;
  const [y,m]=month.split("-").map(Number);
  const firstWd=weekday(start);
  const daysInMonth=new Date(y,m,0).getDate();
  const events=eventsInRange(start,daysInMonth,{method:data.settings.hijriMethod,offset:data.settings.hijriOffset});
  const byDate=new Map<string,AgendaEvent[]>();events.forEach(e=>byDate.set(e.date,[...(byDate.get(e.date)||[]),e]));
  const upcoming=nextEvents(today(),{method:data.settings.hijriMethod,offset:data.settings.hijriOffset},10,filter==="all"?undefined:[filter],400);
  const monthLabel=new Intl.DateTimeFormat("ar-TN",{month:"long",year:"numeric"}).format(new Date(y,m-1,1));
  return <div className="page-stack"><Heading eyebrow="نظّم أيامك" title="الأجندة الإيمانية" subtitle="مناسبات تتجدد مع التقويم الهجري وأيام الأسبوع."/><Card className="calendar-card"><div className="calendar-head"><button className="icon-btn" onClick={()=>setMonth(addDays(start,-1).slice(0,7))}><ChevronRight/></button><strong>{monthLabel}</strong><button className="icon-btn" onClick={()=>setMonth(addDays(`${month}-28`,5).slice(0,7))}><ChevronLeft/></button></div><div className="calendar-grid">{["أحد","اثن","ثلا","أرب","خمي","جمع","سبت"].map(d=><span className="weekday-label" key={d}>{d}</span>)}{Array.from({length:firstWd},(_,i)=><span key={"e"+i}/>)}{Array.from({length:daysInMonth},(_,i)=>{const d=i+1;const date=`${month}-${String(d).padStart(2,"0")}`;const ev=byDate.get(date)||[];return <button key={date} className={`calendar-day ${date===today()?"is-today":""} ${ev.length?"has-event":""}`} onClick={()=>{const el=document.getElementById("agenda-events");el?.scrollIntoView({behavior:"smooth"});}}><span>{d}</span>{ev.length>0&&<i/>}</button>;})}</div><div className="calendar-legend"><span><i className="legend-today"/> اليوم</span><span><i className="legend-event"/> مناسبة</span></div></Card>
    <div className="filter-row"><strong>المناسبات القادمة</strong><select value={filter} onChange={e=>setFilter(e.target.value as EventKind|"all")}><option value="all">كل المناسبات</option>{Object.entries(EVENT_KIND_LABELS).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></div>
    <div id="agenda-events" className="event-list">{upcoming.map(e=><EventCard key={e.id} event={e} onAdd={()=>onAddReminder(e)}/>)}</div>
    <Card className="info-note"><ShieldCheck size={18}/><p>التواريخ الهجرية محسوبة وفق أم القرى، وقد تختلف يوماً بحسب رؤية الهلال والجهة الرسمية في تونس. مناسبات دخول الشهور والأعياد تقديرية وليست إعلاناً شرعياً.</p></Card>
  </div>;
}

function AdhkarPage({data}:{data:AppData}) {
  const [category,setCategory]=useState<AdhkarCategory>("morning");
  const date=today();
  const counts=data.adhkar.date===date?data.adhkar.counts:{};
  const items=ADHKAR.filter(a=>a.categories.includes(category));
  const increment=(id:string,max:number)=>repository.update(d=>({ ...d, adhkar:{date,counts:{...(d.adhkar.date===date?d.adhkar.counts:{}),[id]:Math.min(max,(d.adhkar.date===date?d.adhkar.counts[id]??0:0)+1)}}}));
  return <div className="page-stack"><Heading eyebrow="زاد اليوم" title="الأذكار" subtitle="خذ من الذكر ما يطمئن به قلبك، وداوم عليه."/><div className="adhkar-tabs">{(Object.entries(ADHKAR_CATEGORY_LABELS) as [AdhkarCategory,string][]).map(([k,v])=><button key={k} className={category===k?"active":""} onClick={()=>setCategory(k)}>{v}</button>)}</div><div className="adhkar-list">{items.map(item=>{const count=counts[item.id]??0;return <Card className="dhikr-card" key={item.id}><div className="dhikr-top"><Pill tone="green">{category==="morning"?"ذكر الصباح":category==="evening"?"ذكر المساء":category==="sleep"?"ذكر النوم":"بعد الصلاة"}</Pill><span>التكرار: {item.count}</span></div><p>{item.text}</p><small className="event-source">{item.source}</small><div className="dhikr-action"><div className="counter"><button onClick={()=>increment(item.id,item.count)} disabled={count>=item.count} aria-label="زيادة"><Plus size={17}/></button><strong>{count}<small> / {item.count}</small></strong><button onClick={()=>repository.update(d=>({...d,adhkar:{date,counts:{...counts,[item.id]:Math.max(0,count-1)}}}))} disabled={count===0} aria-label="إنقاص">−</button></div><span>{count>=item.count?"أتممت الذكر":`باقي ${item.count-count}`}</span></div></Card>;})}</div><p className="subtle-note">تُعاد العدادات مع بداية اليوم، والأذكار المعروضة مرفقة بمراجعها. يمكنك التوقف أو المتابعة دون ضغط.</p></div>;
}

function SettingsPage({data,onToast}:{data:AppData;onToast:(s:string)=>void}) {
  const fileRef=useState<HTMLInputElement|null>(null);
  const requestNotifications=async()=>{const p=await getNotifier().requestPermission();if(p==="granted")await syncNativeReminders(repository.get().reminders);onToast(p==="granted"?"تم السماح بالإشعارات":p==="denied"?"تم رفض الإشعارات":"الإشعارات غير متاحة في هذا المتصفح");};
  const download=()=>{const blob=new Blob([repository.exportJSON()],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`taqwa-backup-${today()}.json`;a.click();URL.revokeObjectURL(url);};
  return <div className="page-stack"><Heading eyebrow="تحكم وخصوصية" title="الإعدادات" subtitle="خصّص تقوى كما يناسب يومك، واحتفظ ببياناتك تحت سيطرتك."/>
    <Card className="settings-group"><div className="settings-title"><Bell size={19}/><div><strong>الإشعارات</strong><small>إدارة أذونات التذكير</small></div></div><div className="settings-row"><div><strong>السماح بالإشعارات</strong><small>اطلب إذن الجهاز لإظهار التنبيهات أثناء استخدام التطبيق.</small></div><Button variant="soft" onClick={requestNotifications}>طلب الإذن</Button></div><div className="settings-row"><div><strong>التذكير الدوري العام</strong><small>رسالة إيمانية من المكتبة كل فترة أثناء تشغيل التطبيق.</small></div><label className="switch"><input type="checkbox" checked={data.settings.periodic.enabled} onChange={e=>repository.update(d=>({...d,settings:{...d.settings,periodic:{...d.settings.periodic,enabled:e.target.checked,lastFiredAt:undefined}}}))}/><span/></label></div><div className="settings-row"><div><strong>الفاصل الزمني</strong><small>الحد الأدنى 15 دقيقة.</small></div><select value={data.settings.periodic.minutes} onChange={e=>repository.update(d=>({...d,settings:{...d.settings,periodic:{...d.settings.periodic,minutes:Number(e.target.value)}}}))}>{INTERVAL_OPTIONS.map(m=><option value={m} key={m}>{m<60?`${m} دقيقة`:`${m/60} ساعة`}</option>)}</select></div></Card>
    <Card className="settings-group"><div className="settings-title"><CalendarDays size={19}/><div><strong>التقويم الهجري</strong><small>إعداد طريقة الحساب والتعديل المحلي</small></div></div><div className="settings-row"><div><strong>طريقة الحساب</strong><small>قد تختلف بداية الشهر حسب رؤية الهلال.</small></div><select value={data.settings.hijriMethod} onChange={e=>repository.update(d=>({...d,settings:{...d.settings,hijriMethod:e.target.value as "umalqura"|"civil"}}))}><option value="umalqura">تقويم أم القرى</option><option value="civil">التقويم الهجري الحسابي</option></select></div><div className="settings-row"><div><strong>تعديل التاريخ الهجري</strong><small>لتقريب التاريخ من الإعلان المحلي (± يومين).</small></div><select value={data.settings.hijriOffset} onChange={e=>repository.update(d=>({...d,settings:{...d.settings,hijriOffset:Number(e.target.value)}}))}>{[-2,-1,0,1,2].map(n=><option key={n} value={n}>{n===0?"بدون تعديل":n>0?`تقديم ${n} يوم`:`تأخير ${-n} يوم`}</option>)}</select></div><div className="settings-row"><div><strong>المنطقة الزمنية</strong><small>تونس</small></div><Pill tone="green">Africa/Tunis</Pill></div></Card>
    <Card className="settings-group"><div className="settings-title"><Moon size={19}/><div><strong>المظهر</strong><small>اختر الألوان المناسبة لك</small></div></div><div className="settings-row"><div><strong>الوضع الداكن</strong><small>تغيير مظهر التطبيق.</small></div><label className="switch"><input type="checkbox" checked={data.settings.theme==="dark"} onChange={e=>repository.update(d=>({...d,settings:{...d.settings,theme:e.target.checked?"dark":"light"}}))}/><span/></label></div></Card>
    <Card className="settings-group"><div className="settings-title"><ShieldCheck size={19}/><div><strong>بياناتك وخصوصيتك</strong><small>لا تحتاج إلى حساب؛ بياناتك محلية على جهازك.</small></div></div><div className="settings-actions"><Button variant="soft" onClick={download}><Download size={16}/> تصدير نسخة احتياطية</Button><label className="btn btn-soft upload-label"><Upload size={16}/> استيراد نسخة<input type="file" accept="application/json,.json" hidden onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{repository.importJSON(await f.text());onToast("تم استيراد بياناتك بنجاح");}catch{onToast("ملف النسخة الاحتياطية غير صالح");}e.target.value="";}}/></label><Button variant="danger" onClick={()=>{if(confirm("سيتم حذف جميع بياناتك المحلية. هل أنت متأكد؟")){repository.reset();onToast("تمت إعادة ضبط التطبيق");}}}><Trash2 size={16}/> حذف البيانات</Button></div></Card>
    <div className="about-note"><Sparkles size={18}/><p>تقوى مشروع تذكير ومحاسبة، لا يصدر أحكاماً شرعية. راجع مصادر النصوص، وتأكد من إعلان بلدك في التواريخ المرتبطة برؤية الهلال.</p></div>
  </div>;
}
