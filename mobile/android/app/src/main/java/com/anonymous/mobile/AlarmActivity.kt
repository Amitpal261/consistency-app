package com.anonymous.mobile

import android.app.Activity
import android.app.KeyguardManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager

/**
 * A thin, invisible-to-the-user activity whose only job is to force the
 * screen on and show over the lock screen when the alarm fires, then
 * immediately hand off to MainActivity (the real RN app) so the user lands
 * on the check-in screen. AlarmService keeps ringing until the user
 * actually captures their proof — see stopNativeAlarm() in CheckInScreen.tsx.
 */
class AlarmActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      val keyguardManager = getSystemService(KEYGUARD_SERVICE) as KeyguardManager
      keyguardManager.requestDismissKeyguard(this, null)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )
    }

    val habitId = intent.getStringExtra(AlarmService.EXTRA_HABIT_ID)
    // Stash it so JS can pick it up via AlarmModule.consumePendingHabitId()
    // even if this launch didn't go through notifee's own tap/press flow.
    AlarmModule.pendingHabitId = habitId

    val launchIntent = Intent(this, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtra(AlarmService.EXTRA_HABIT_ID, habitId)
    }
    startActivity(launchIntent)
    finish()
  }
}