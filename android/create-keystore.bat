@echo off
set /p STORE_PW=Enter keystore password: 
set /p KEY_PW=Enter key password (or same): 
"%JAVA_HOME%\bin\keytool" -genkey -v -keystore keystore.jks -alias release -keyalg RSA -keysize 2048 -validity 10000 -storepass %STORE_PW% -keypass %KEY_PW%
echo.
echo Keystore created: keystore.jks
echo.
echo To get base64 for GitHub secret:
echo certutil -encode -f keystore.jks keystore.b64
echo type keystore.b64 ^| clip
echo echo Copy the BASE64 block (between BEGIN/END lines) into GitHub secret KEYSTORE_BASE64
echo.
pause
