plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "co.taxassist.driver"
    compileSdk = 36
    // Required by Android plugins (NDK versions are backward compatible).
    ndkVersion = "27.1.12297006"

    lint {
        // We still get runtime crash reporting via Sentry; this avoids flaky/OOM lint
        // failures in CI/release builds from transitive Android libraries.
        checkReleaseBuilds = false
        abortOnError = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "co.taxassist.driver"
        minSdk = 23
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        debug {
            // Work around NDK toolchain host mismatches on some machines by skipping
            // symbol stripping for debug builds.
            ndk {
                debugSymbolLevel = "none"
            }
        }
        release {
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}

dependencies {}
