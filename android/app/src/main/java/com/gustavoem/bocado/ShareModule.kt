package com.gustavoem.bocado

import android.content.ActivityNotFoundException
import android.content.Intent
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * The only way anything leaves the app.
 *
 * There is no account and no server: the picture is drawn on the device, saved
 * inside the app's own cache and handed to `Intent.createChooser`, so the user
 * picks the destination and Android — not this app — moves the bytes. Nothing
 * is uploaded, nothing is written outside the cache, and no storage permission
 * is asked for: the file is exposed by a `FileProvider` grant that lasts as
 * long as the chosen app needs it.
 */
class ShareModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun shareText(text: String, title: String, promise: Promise) {
    val intent =
        Intent(Intent.ACTION_SEND).apply {
          type = "text/plain"
          putExtra(Intent.EXTRA_TEXT, text)
        }
    startChooser(intent, title, promise)
  }

  /**
   * Writes the PNG the JavaScript side drew and shares the file itself, so
   * WhatsApp and any chat receive an image and not a link. The share folder is
   * emptied first: only the piece being shared right now ever exists on disk.
   */
  @ReactMethod
  fun shareImage(base64Png: String, fileName: String, title: String, promise: Promise) {
    val file =
        try {
          writePng(base64Png, fileName)
        } catch (error: Exception) {
          promise.reject(E_WRITE, error.message ?: "Could not write the image", error)
          return
        }
    val uri =
        try {
          FileProvider.getUriForFile(
              reactApplicationContext,
              "${reactApplicationContext.packageName}.fileprovider",
              file)
        } catch (error: IllegalArgumentException) {
          promise.reject(E_WRITE, error.message ?: "Could not expose the image", error)
          return
        }
    val intent =
        Intent(Intent.ACTION_SEND).apply {
          type = "image/png"
          putExtra(Intent.EXTRA_STREAM, uri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    startChooser(intent, title, promise)
  }

  private fun writePng(base64Png: String, fileName: String): File {
    val directory = File(reactApplicationContext.cacheDir, SHARE_DIRECTORY)
    if (directory.isDirectory) {
      directory.listFiles()?.forEach { it.delete() }
    } else {
      directory.delete()
      directory.mkdirs()
    }
    val file = File(directory, fileName)
    file.writeBytes(Base64.decode(base64Png, Base64.DEFAULT))
    return file
  }

  /**
   * Always a chooser, never a package this app picked: the destination is the
   * user's decision, every time.
   */
  private fun startChooser(intent: Intent, title: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    val chooser =
        Intent.createChooser(intent, title).apply {
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          if (activity == null) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    try {
      if (activity != null) {
        activity.startActivity(chooser)
      } else {
        reactApplicationContext.startActivity(chooser)
      }
      promise.resolve(null)
    } catch (error: ActivityNotFoundException) {
      promise.reject(E_NO_APP, error.message ?: "No app can receive this", error)
    }
  }

  companion object {
    const val NAME = "BocadoShare"
    /** Inside `cacheDir`, and declared as such in `res/xml/file_paths.xml`. */
    private const val SHARE_DIRECTORY = "share"
    /** The image could not be written or exposed. */
    private const val E_WRITE = "share_write_failed"
    /** Nothing on the phone can receive it. */
    private const val E_NO_APP = "share_no_app"
  }
}
