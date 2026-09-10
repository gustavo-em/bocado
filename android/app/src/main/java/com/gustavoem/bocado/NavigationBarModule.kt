package com.gustavoem.bocado

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * The two things the appearance choice needs from Android.
 *
 * `setNightMode` mirrors the choice and hands it to `AppCompatDelegate`, so the
 * next cold start opens the splash on the same palette. `uiMode` is declared in
 * `configChanges`, so applying it does not recreate the activity.
 *
 * `setLightNavigationBars` and `setBarColors` exist only for the live switch:
 * the bar icons are fixed when edge-to-edge is configured, and the bar grounds
 * come from `android:statusBarColor`/`android:navigationBarColor` in
 * `values/styles.xml`, resolved when the activity's theme is inflated. Since
 * `uiMode` is in `configChanges` the activity is never recreated, so both have
 * to be written by hand or the bars keep the old palette.
 */
class NavigationBarModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun setNightMode(mode: String) {
    AppearanceStore.save(reactApplicationContext, mode)
    val nightMode = AppearanceStore.nightModeOf(mode)
    UiThreadUtil.runOnUiThread { AppCompatDelegate.setDefaultNightMode(nightMode) }
  }

  @ReactMethod
  fun setLightNavigationBars(light: Boolean) {
    UiThreadUtil.runOnUiThread {
      val window = reactApplicationContext.currentActivity?.window ?: return@runOnUiThread
      WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightNavigationBars = light
    }
  }

  /** The ground under both bars, so the window stays one surface after a switch. */
  @ReactMethod
  fun setBarColors(color: String) {
    val parsed =
        try {
          Color.parseColor(color)
        } catch (error: IllegalArgumentException) {
          return
        }
    UiThreadUtil.runOnUiThread {
      val window = reactApplicationContext.currentActivity?.window ?: return@runOnUiThread
      window.statusBarColor = parsed
      window.navigationBarColor = parsed
    }
  }

  /**
   * Drops the launch window's drawable once the opening is over.
   *
   * `MainActivity` keeps `Theme.App.SplashScreen` for the activity's whole
   * life, because that is what holds the disc on screen from the system's very
   * first frame until React Native has one of its own. After the overlay has
   * finished, though, the layer list is a bitmap sitting behind opaque content
   * with nothing left to show, so it is swapped for the flat ground: the
   * launch drawable can be released and there is no bitmap under every frame
   * from here on.
   *
   * The colour is read through the activity, so it resolves by the
   * configuration in play — bone or graphite, whichever `values{,-night}` gave
   * the window in the first place. The ground therefore does not change; only
   * what draws it does.
   */
  @ReactMethod
  fun releaseLaunchBackground() {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity ?: return@runOnUiThread
      activity.window.setBackgroundDrawable(
          ColorDrawable(activity.getColor(R.color.splash_background)))
    }
  }

  companion object {
    const val NAME = "BocadoNavigationBar"
  }
}
