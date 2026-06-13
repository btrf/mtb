@rem Gradle wrapper script
@if "%DEBUG%"=="" @echo off
setlocal enabledelayedexpansion

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

set GRADLE_VERSION=8.4
set GRADLE_URL=https\://services.gradle.org/distributions/gradle-%GRADLE_VERSION%-bin.zip
set GRADLE_CACHE_DIR=%USERPROFILE%\.gradle\wrapper\dists

if not exist "%APP_HOME%gradle\wrapper\gradle-wrapper.jar" (
    echo Downloading Gradle wrapper jar...
    if not exist "%APP_HOME%gradle\wrapper" mkdir "%APP_HOME%gradle\wrapper"
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/gradle/gradle/v%GRADLE_VERSION%/gradle/wrapper/gradle-wrapper.jar' -OutFile '%APP_HOME%gradle\wrapper\gradle-wrapper.jar'" 2>nul
    if not exist "%APP_HOME%gradle\wrapper\gradle-wrapper.jar" (
        echo WARNING: Could not download gradle-wrapper.jar. Place it manually in:
        echo   %APP_HOME%gradle\wrapper\gradle-wrapper.jar
        pause
        exit /b 1
    )
)

"%JAVA_HOME%\bin\java.exe" -Xmx64m -Dorg.gradle.appname=%APP_BASE_NAME% -classpath "%APP_HOME%gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

endlocal
