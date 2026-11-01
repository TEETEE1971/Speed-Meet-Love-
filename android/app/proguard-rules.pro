# Speed Meet Love Proguard Rules
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.teeteescreations.speedmeetlove.** { *; }
-dontwarn android.webkit.**
