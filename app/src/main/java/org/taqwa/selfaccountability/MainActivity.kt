package org.taqwa.selfaccountability

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.work.*
import java.util.concurrent.TimeUnit

private val Forest = Color(0xFF174B3A)
private val Sand = Color(0xFFF6F3EA)
private val Gold = Color(0xFFC39A50)

class MainActivity : ComponentActivity() {
    private val permission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ReminderNotifications.createChannel(this)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        setContent {
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                MaterialTheme(colorScheme = lightColorScheme(primary = Forest, secondary = Gold, background = Sand)) {
                    TaqwaApp(this)
                }
            }
        }
    }
}

@Composable
private fun TaqwaApp(context: Context) {
    val prefs = remember { context.getSharedPreferences("taqwa", Context.MODE_PRIVATE) }
    var tab by remember { mutableIntStateOf(0) }
    var interval by remember { mutableIntStateOf(prefs.getInt("interval", 30)) }
    var enabled by remember { mutableStateOf(prefs.getBoolean("enabled", false)) }
    var tasks by remember { mutableStateOf(loadTasks(prefs)) }
    var newTask by remember { mutableStateOf("") }
    val reminders = listOf(
        "أَلَمْ يَعْلَمْ بِأَنَّ اللَّهَ يَرَىٰ؟  — العلق: 14",
        "فَاذْكُرُونِي أَذْكُرْكُمْ — البقرة: 152",
        "هل هذا العمل مما يرضي الله؟",
        "تذكّر أن الله مطّلع على السر والعلن.",
        "أَفَحَسِبْتُمْ أَنَّمَا خَلَقْنَاكُمْ عَبَثًا — المؤمنون: 115",
        "ما الخطوة الصغيرة التي تقرّبك إلى الله الآن؟"
    )
    Scaffold(containerColor = Sand, bottomBar = {
        NavigationBar(containerColor = Color.White) {
            listOf("التذكير", "المحاسبة", "الأجندة").forEachIndexed { i, label ->
                NavigationBarItem(selected = tab == i, onClick = { tab = i }, icon = { Text(listOf("♡", "✓", "☾")[i]) }, label = { Text(label) })
            }
        }
    }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item {
                Spacer(Modifier.height(16.dp))
                Text("تقوى", style = MaterialTheme.typography.headlineLarge, color = Forest, fontWeight = FontWeight.Bold)
                Text("وقفة صادقة مع النفس… كل يوم", color = Color.DarkGray)
                Spacer(Modifier.height(8.dp))
            }
            when (tab) {
                0 -> {
                    item { SectionCard("القلب أولاً", "اجعل ذكر الله حاضراً في يومك، لا مجرد إشعار على هاتفك.") }
                    item {
                        SectionCard("التذكيرات الإيمانية") {
                            Text("تصل إليك رسالة قصيرة لتجديد النية ومحاسبة القلب.")
                            Spacer(Modifier.height(12.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("تفعيل التذكيرات", Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                                Switch(checked = enabled, onCheckedChange = {
                                    enabled = it
                                    prefs.edit().putBoolean("enabled", it).apply()
                                    scheduleReminders(context, it, interval)
                                })
                            }
                            Text("الفترة بين التذكيرات: $interval دقيقة")
                            Slider(value = interval.toFloat(), onValueChange = { interval = it.toInt() }, valueRange = 15f..180f, steps = 10, onValueChangeFinished = {
                                prefs.edit().putInt("interval", interval).apply()
                                if (enabled) scheduleReminders(context, true, interval)
                            })
                            Text("ملاحظة: يسمح Android بفواصل دورية لا تقل عن 15 دقيقة، وقد تتأخر الإشعارات بسبب توفير البطارية.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                    }
                    item { SectionCard("وقفة اليوم", reminders[(System.currentTimeMillis() / 60000 % reminders.size).toInt()]) }
                }
                1 -> {
                    item { SectionCard("محاسبة النفس", "راجع يومك برفق وصدق. هذه وسيلة للتذكير وليست للحكم على نفسك.") }
                    items(tasks, key = { it.first }) { task ->
                        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                            Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Checkbox(checked = task.second, onCheckedChange = { checked ->
                                    tasks = tasks.map { if (it.first == task.first) it.first to checked else it }
                                    saveTasks(prefs, tasks)
                                })
                                Text(task.first, Modifier.weight(1f))
                            }
                        }
                    }
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(value = newTask, onValueChange = { newTask = it }, modifier = Modifier.weight(1f), label = { Text("أضف عملاً تود مراجعته") }, singleLine = true)
                            Spacer(Modifier.width(8.dp))
                            Button(onClick = {
                                val value = newTask.trim()
                                if (value.isNotEmpty() && tasks.none { it.first == value }) {
                                    tasks = tasks + (value to false); saveTasks(prefs, tasks); newTask = ""
                                }
                            }) { Text("إضافة") }
                        }
                    }
                    item {
                        OutlinedButton(onClick = { tasks = tasks.map { it.first to false }; saveTasks(prefs, tasks) }, modifier = Modifier.fillMaxWidth()) { Text("بدء محاسبة يوم جديد") }
                    }
                }
                else -> {
                    item { SectionCard("أجندة إيمانية", "تذكيرات تساعدك على تنظيم الطاعات، مع مراعاة اختلاف التقويم الهجري ورؤية الهلال.") }
                    item { AgendaRow("الاثنين والخميس", "تذكير بصيام التطوع لمن أراد") }
                    item { AgendaRow("الأيام البيض", "13 و14 و15 من الشهر الهجري — تحقق من التقويم المحلي") }
                    item { AgendaRow("يوم الجمعة", "الإكثار من الصلاة على النبي ﷺ وقراءة سورة الكهف") }
                    item { AgendaRow("أذكار يومية", "أذكار الصباح والمساء والنوم وبعد الصلاة") }
                    item { AgendaRow("تحدٍّ شخصي", "اختر لنفسك هدفاً للذكر أو الاستغفار أو قراءة القرآن") }
                    item { Text("الأعداد المقترحة أهداف شخصية وليست نسباً لأحاديث أو سنن محددة.", style = MaterialTheme.typography.bodySmall, color = Color.Gray) }
                }
            }
            item { Spacer(Modifier.height(12.dp)); Text("اللهم أعنّا على ذكرك وشكرك وحسن عبادتك.", color = Forest, modifier = Modifier.fillMaxWidth(), style = MaterialTheme.typography.bodyMedium) }
            item { Spacer(Modifier.height(10.dp)) }
        }
    }
}

@Composable
private fun SectionCard(title: String, body: String) {
    SectionCard(title) { Text(body, color = Color(0xFF454B47)) }
}

@Composable
private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable
private fun AgendaRow(title: String, body: String) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(title, color = Forest, fontWeight = FontWeight.Bold)
            Text(body, color = Color.DarkGray)
        }
    }
}

private fun loadTasks(prefs: android.content.SharedPreferences): List<Pair<String, Boolean>> {
    val defaults = listOf("الصلاة في وقتها", "أذكار الصباح والمساء", "قراءة القرآن", "الذكر والاستغفار", "غض البصر وحفظ اللسان", "قيام الليل")
    val raw = prefs.getString("tasks", null) ?: return defaults.map { it to false }
    return try {
        val arr = org.json.JSONArray(raw)
        (0 until arr.length()).map { val o = arr.getJSONObject(it); o.getString("name") to o.getBoolean("done") }
    } catch (_: Exception) { defaults.map { it to false } }
}

private fun saveTasks(prefs: android.content.SharedPreferences, tasks: List<Pair<String, Boolean>>) {
    val arr = org.json.JSONArray()
    tasks.forEach { (name, done) -> arr.put(org.json.JSONObject().put("name", name).put("done", done)) }
    prefs.edit().putString("tasks", arr.toString()).apply()
}

private fun scheduleReminders(context: Context, enabled: Boolean, minutes: Int) {
    val work = WorkManager.getInstance(context)
    if (!enabled) { work.cancelUniqueWork("taqwa-reminders"); return }
    val request = PeriodicWorkRequestBuilder<ReminderWorker>(minutes.toLong(), TimeUnit.MINUTES).build()
    work.enqueueUniquePeriodicWork("taqwa-reminders", ExistingPeriodicWorkPolicy.UPDATE, request)
}
