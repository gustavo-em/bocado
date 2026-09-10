package com.gustavoem.bocado

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate

/**
 * The Android mirror of the appearance the user picked in "Metas".
 *
 * JavaScript owns the choice (MMKV), but the launch window is drawn long
 * before React is up: without this mirror, a cold start with "Escuro" chosen
 * paints the splash in bone paper and only turns dark once the first frame
 * lands. Reading it in `MainApplication.onCreate` and handing it to
 * `AppCompatDelegate` is what makes `values-night/` and `drawable-night/`
 * resolve by the choice instead of by the device.
 */
object AppearanceStore {

  private const val PREFS_NAME = "bocado.appearance"
  private const val KEY_MODE = "mode"
  private const val SYSTEM = "system"
  private const val LIGHT = "light"
  private const val DARK = "dark"

  /** Stores the choice, using the same three words JavaScript uses. */
  fun save(context: Context, mode: String) {
    context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_MODE, mode)
        .apply()
  }

  /** The stored choice, or "system" when there is none or it is unknown. */
  fun read(context: Context): String {
    val stored =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_MODE, SYSTEM)
    return when (stored) {
      LIGHT, DARK, SYSTEM -> stored
      else -> SYSTEM
    }
  }

  fun nightModeOf(mode: String): Int =
      when (mode) {
        DARK -> AppCompatDelegate.MODE_NIGHT_YES
        LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
        else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
      }

  /**
   * Applies the stored choice. Called before React is loaded, so the splash and
   * every night-qualified resource already answer for the right palette.
   */
  fun apply(context: Context) {
    AppCompatDelegate.setDefaultNightMode(nightModeOf(read(context)))
  }
}
