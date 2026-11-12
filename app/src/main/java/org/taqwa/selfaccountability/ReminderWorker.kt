package org.taqwa.selfaccountability

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Worker
import androidx.work.WorkerParameters

object ReminderNotifications {
    const val CHANNEL = "taqwa_reminders"
    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= 26) {
            val channel = NotificationChannel(CHANNEL, "التذكيرات الإيمانية", NotificationManager.IMPORTANCE_DEFAULT)
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}

class ReminderWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        if (Build.VERSION.SDK_INT >= 33 && applicationContext.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return Result.success()
        val messages = listOf(
            "أَلَمْ يَعْلَمْ بِأَنَّ اللَّهَ يَرَىٰ؟ — العلق: 14",
            "فَاذْكُرُونِي أَذْكُرْكُمْ — البقرة: 152",
            "هل هذا العمل مما يرضي الله؟",
            "تذكّر أن الله مطّلع على السر والعلن.",
            "أَفَحَسِبْتُمْ أَنَّمَا خَلَقْنَاكُمْ عَبَثًا — المؤمنون: 115"
        )
        val index = ((System.currentTimeMillis() / 60000) % messages.size).toInt()
        val notification = NotificationCompat.Builder(applicationContext, ReminderNotifications.CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("تقوى | وقفة مع النفس")
            .setContentText(messages[index])
            .setStyle(NotificationCompat.BigTextStyle().bigText(messages[index]))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(applicationContext).notify(1001, notification)
        return Result.success()
    }
}
