Set WshShell = CreateObject("WScript.Shell")
' Start node server directly with absolute path in background (0 = completely invisible)
WshShell.CurrentDirectory = "d:\My apps\AC-Kahoot"
WshShell.Run "cmd /c node server/server.js", 0, False

' Wait 1.5s for server to start, then open browser directly
WScript.Sleep 1500
WshShell.Run "http://localhost:3000", 1, False
