package com.gustavoem.bocado

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * The activity keeps the theme the manifest gives it, `Theme.App.SplashScreen`,
   * and that is deliberate.
   *
   * It used to call `setTheme(R.style.AppTheme)` here. The starting window does
   * show the disc, but it is handed over to the activity's own window as soon
   * as that window exists — long before React Native has a first frame to put
   * in it. From that moment until the overlay mounts, the window was painting
   * `AppTheme`'s background, which is a plain colour: four device captures in a
   * row caught the launch as bare bone with no symbol anywhere, which is the
   * defect this removes.
   *
   * `Theme.App.SplashScreen` extends `AppTheme`, so nothing else changes — the
   * bars, the light-icon flag and the edit-text background all resolve exactly
   * as before, per configuration. The only difference is that the window keeps
   * `@drawable/splash_background`, so the disc stays on screen until the app's
   * own first frame draws over it, where `SplashOverlay` continues it at the
   * same size in the same place.
   *
   * This costs no extra theme inflation. It is one theme for the activity's
   * life instead of two, and `Base.AppTheme` is left on its cheap colour.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Bocado"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
