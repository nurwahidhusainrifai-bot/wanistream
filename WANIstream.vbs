Set WshShell = CreateObject("WScript.Shell")
' Get the current directory
strDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
' Run the electron app hidden (0 = hidden window)
WshShell.CurrentDirectory = strDir
WshShell.Run "cmd /c npm start", 0, false
