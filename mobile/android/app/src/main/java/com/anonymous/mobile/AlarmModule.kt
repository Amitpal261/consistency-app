package com.anonymous.mobile

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    // Set by AlarmActivity (or MainActivity.onNewIntent) whenever the alarm's
    // full-screen wake UI opens the app directly. Consumed exactly once from
    // JS via consumePendingHabitId() — see nativeAlarm.ts.
    var pendingHabitId: String? = null
  }

  override fun getName(): String = "AlarmModule"

  @ReactMethod
  fun playAlarm(habitId: String, ringtoneUri: String?) {
    val context = reactApplicationContext
    val intent = Intent(context, AlarmService::class.java).apply {
      putExtra(AlarmService.EXTRA_HABIT_ID, habitId)
      putExtra(AlarmService.EXTRA_RINGTONE_URI, ringtoneUri)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent)
    } else {
      context.startService(intent)
    }
  }

  @ReactMethod
  fun stopAlarm() {
    AlarmService.stop(reactApplicationContext)
  }

  @ReactMethod
  fun consumePendingHabitId(promise: Promise) {
    val value = pendingHabitId
    pendingHabitId = null
    promise.resolve(value)
  }
}