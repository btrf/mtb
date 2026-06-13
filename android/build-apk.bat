@echo off
chcp 65001 >nul
echo Building MTB Service APK...
echo.
echo Make sure you have:
echo   - Android SDK (set ANDROID_HOME)
echo   - Java 17+ (set JAVA_HOME)
echo.
cd /d "%~dp0"
call gradlew assembleDebug
if %ERRORLEVEL% equ 0 (
    echo.
    echo APK created: app\build\outputs\apk\debug\app-debug.apk
) else (
    echo.
    echo Build failed. See errors above.
)
pause
