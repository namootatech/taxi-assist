allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Some transitive Android libraries (e.g. package:jni) reference `flutter.ndkVersion`
// but are evaluated as plain Android library projects where the Flutter extension
// doesn't exist. Provide a minimal shim so release builds don't fail.
val flutterCompileSdkVersion = 36
val flutterMinSdkVersion = 23
val flutterTargetSdkVersion = 36
val flutterNdkVersion = "27.1.12297006"

if (!extra.has("flutter")) {
    extra.set(
        "flutter",
        mapOf(
            "compileSdkVersion" to flutterCompileSdkVersion,
            "minSdkVersion" to flutterMinSdkVersion,
            "targetSdkVersion" to flutterTargetSdkVersion,
            "ndkVersion" to flutterNdkVersion,
        ),
    )
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
