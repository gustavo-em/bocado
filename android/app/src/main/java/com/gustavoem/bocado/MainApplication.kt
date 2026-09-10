package com.gustavoem.bocado

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Not autolinked: the app's own module, which carries the appearance
          // choice to Android (night mode and the navigation bar icons).
          add(BocadoPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Before React: the launch window is drawn while JavaScript is still
    // starting, so the stored choice has to reach AppCompat first for the
    // splash and every night-qualified resource to come out on the right one.
    AppearanceStore.apply(this)
    loadReactNative(this)
  }
}
