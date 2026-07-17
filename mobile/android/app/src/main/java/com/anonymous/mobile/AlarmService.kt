package com.anonymous.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Foreground service that plays the alarm sound on STREAM_ALARM in a loop.
 * Using STREAM_ALARM (instead of the notification channel's own sound) is
 * what lets this bypass Do Not Disturb / silent mode by design on Android.
 *
 * Stopped either by:
 *  - AlarmModule.stopAlarm() from JS (called when the user captures proof)
 *  - the "Stop" action on the persistent notification
 */
class AlarmService : Service() {

  companion object {
    const val CHANNEL_ID = "alarm_service_channel"
    const val NOTIFICATION_ID = 4821
    const val EXTRA_HABIT_ID = "habitId"
    const val EXTRA_RINGTONE_URI = "ringtoneUri"
    const val ACTION_STOP = "com.anonymous.mobile.action.STOP_ALARM"

    fun stop(context: Context) {
      val intent = Intent(context, AlarmService::class.java).setAction(ACTION_STOP)
      context.startService(intent)
    }
  }

  private var mediaPlayer: MediaPlayer? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSound()
      stopForeground(true)
      stopSelf()
      return START_NOT_STICKY
    }

    val habitId = intent?.getStringExtra(EXTRA_HABIT_ID) ?: ""
    val ringtoneUri = intent?.getStringExtra(EXTRA_RINGTONE_URI)

    startForeground(NOTIFICATION_ID, buildNotification())
    playSound(ringtoneUri)

    // Bring up the full-screen wake UI over the lock screen too.
    try {
      val activityIntent = Intent(this, AlarmActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        putExtra(EXTRA_HABIT_ID, habitId)
      }
      startActivity(activityIntent)
    } catch (_: Exception) {
      // If the activity can't be launched (rare edge cases on some OEM
      // skins), the loud sound + notification is still enough to wake the user.
    }

    return START_STICKY
  }

  private fun playSound(ringtoneUri: String?) {
    stopSound()

    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val uri: Uri = if (!ringtoneUri.isNullOrEmpty()) {
      // A custom local file the user picked in-app (copied into the app's
      // own private storage by ringtone.ts) — a plain file path/uri works
      // fine here since this same app process reads it.
      if (ringtoneUri.startsWith("file://")) Uri.parse(ringtoneUri) else Uri.parse("file://$ringtoneUri")
    } else {
      RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    }

    try {
      mediaPlayer = MediaPlayer().apply {
        setAudioAttributes(attrs)
        setDataSource(applicationContext, uri)
        isLooping = true
        setOnPreparedListener { it.start() }
        setOnErrorListener { _, _, _ ->
          // Custom file failed to load (deleted/corrupted/unsupported) —
          // fall back to the device's default alarm sound instead of
          // ringing silently.
          if (!ringtoneUri.isNullOrEmpty()) playSound(null)
          true
        }
        prepareAsync()
      }

      val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)
    } catch (e: Exception) {
      if (!ringtoneUri.isNullOrEmpty()) playSound(null)
    }
  }

  private fun stopSound() {
    mediaPlayer?.apply {
      try {
        if (isPlaying) stop()
      } catch (_: IllegalStateException) {
      }
      release()
    }
    mediaPlayer = null
  }

  private fun buildNotification(): android.app.Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Alarm playback", NotificationManager.IMPORTANCE_LOW)
      manager.createNotificationChannel(channel)
    }

    val stopIntent = Intent(this, AlarmService::class.java).setAction(ACTION_STOP)
    val stopPendingIntent = PendingIntent.getService(
      this,
      0,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Habit alarm ringing")
      .setContentText("Open the app and check in to stop the alarm.")
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .addAction(0, "Stop", stopPendingIntent)
      .build()
  }

  override fun onDestroy() {
    stopSound()
    super.onDestroy()
  }
}