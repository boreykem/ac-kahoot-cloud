using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using Microsoft.Win32;

namespace ACKahoot
{
    static class ShortcutHelper
    {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);

        public static void EnsureShortcuts(string targetDir)
        {
            try
            {
                string exePath = Path.Combine(targetDir, "AC-Kahoot.exe");
                if (!File.Exists(exePath)) return;
                string iconPath = Path.Combine(targetDir, "app.ico");
                if (!File.Exists(iconPath)) iconPath = exePath;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                object shell = Activator.CreateInstance(shellType);
                if (shell == null) return;

                var desktopDirs = new System.Collections.Generic.HashSet<string>(StringComparer.OrdinalIgnoreCase);

                // 1. .NET SpecialFolders
                try
                {
                    string d1 = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                    if (!string.IsNullOrEmpty(d1) && Directory.Exists(d1)) desktopDirs.Add(d1);
                    string d2 = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    if (!string.IsNullOrEmpty(d2) && Directory.Exists(d2)) desktopDirs.Add(d2);
                }
                catch {}

                // 2. Registry User Shell Folders (OneDrive / Redirection)
                try
                {
                    using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"))
                    {
                        if (key != null)
                        {
                            object v = key.GetValue("Desktop");
                            if (v != null)
                            {
                                string exp = Environment.ExpandEnvironmentVariables(v.ToString());
                                if (Directory.Exists(exp)) desktopDirs.Add(exp);
                            }
                        }
                    }
                }
                catch {}

                // 3. User Profile & OneDrive Desktop
                try
                {
                    string profile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                    if (!string.IsNullOrEmpty(profile))
                    {
                        string pDesktop = Path.Combine(profile, "Desktop");
                        if (Directory.Exists(pDesktop)) desktopDirs.Add(pDesktop);
                        string oneDriveDesk = Path.Combine(profile, "OneDrive", "Desktop");
                        if (Directory.Exists(oneDriveDesk)) desktopDirs.Add(oneDriveDesk);
                    }
                }
                catch {}

                // 4. Public / Common Desktop
                try
                {
                    string cDesk = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);
                    if (!string.IsNullOrEmpty(cDesk) && Directory.Exists(cDesk)) desktopDirs.Add(cDesk);
                }
                catch {}

                // Start Menu Programs
                var progDirs = new System.Collections.Generic.HashSet<string>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    string p1 = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                    if (!string.IsNullOrEmpty(p1) && Directory.Exists(p1)) progDirs.Add(p1);
                }
                catch {}

                foreach (string dir in desktopDirs)
                {
                    try
                    {
                        // Clean up legacy/duplicate emoji shortcut if present
                        string legacyShortcut = Path.Combine(dir, "🎯 AC-Kahoot!.lnk");
                        if (File.Exists(legacyShortcut))
                        {
                            try { File.Delete(legacyShortcut); } catch {}
                        }

                        // Create or update single clean desktop shortcut
                        string shortcutPath = Path.Combine(dir, "AC-Kahoot.lnk");
                        object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                        if (shortcut != null)
                        {
                            Type scType = shortcut.GetType();
                            scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { exePath });
                            scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { targetDir });
                            scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "AC-Kahoot! Interactive Learning Platform" });
                            scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconPath + ",0" });
                            scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
                        }
                    }
                    catch {}
                }

                foreach (string dir in progDirs)
                {
                    try
                    {
                        string shortcutPath = Path.Combine(dir, "AC-Kahoot.lnk");
                        object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                        if (shortcut != null)
                        {
                            Type scType = shortcut.GetType();
                            scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { exePath });
                            scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { targetDir });
                            scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "AC-Kahoot! Interactive Learning Platform" });
                            scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconPath + ",0" });
                            scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
                        }
                    }
                    catch {}
                }

                SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
            }
            catch {}
        }

        public static void EnsureFirewallRules(string targetDir)
        {
            try
            {
                string nodeExe = Path.Combine(targetDir, "runtime", "node.exe");
                string cloudflaredExe = Path.Combine(targetDir, "bin", "cloudflared.exe");
                string ackExe = Path.Combine(targetDir, "AC-Kahoot.exe");

                string[] exes = new string[] { nodeExe, cloudflaredExe, ackExe };
                foreach (string exe in exes)
                {
                    if (File.Exists(exe))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo("netsh", "advfirewall firewall add rule name=\"AC-Kahoot Platform\" dir=in action=allow program=\"" + exe + "\" enable=yes profile=any");
                        psi.WindowStyle = ProcessWindowStyle.Hidden;
                        psi.CreateNoWindow = true;
                        psi.UseShellExecute = false;
                        try { Process p = Process.Start(psi); p.WaitForExit(1000); } catch {}
                    }
                }
            }
            catch {}
        }
    }

    class Program
    {
        static bool IsPortOpen(string host, int port, int timeoutMs = 200)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    var success = result.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        static void OpenBrowser(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch {}
        }

        [STAThread]
        static void Main(string[] args)
        {
            bool createdNew;
            using (Mutex mutex = new Mutex(true, "ACKahoot_SingleInstance_Mutex", out createdNew))
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;

                // Ensure Desktop and Start Menu shortcuts & firewall rules
                new Thread(() => { 
                    ShortcutHelper.EnsureShortcuts(baseDir); 
                    ShortcutHelper.EnsureFirewallRules(baseDir);
                }).Start();

                // If AC-Kahoot server is already running, immediately open browser
                for (int p = 3333; p <= 3336; p++)
                {
                    if (IsPortOpen("127.0.0.1", p, 150))
                    {
                        OpenBrowser("http://localhost:" + p);
                        return;
                    }
                }

                string nodePath = Path.Combine(baseDir, "runtime", "node.exe");
                if (!File.Exists(nodePath))
                {
                    nodePath = "node.exe";
                }

                string serverScript = Path.Combine(baseDir, "server.bundle.js");
                string nodeModulesPath = Path.Combine(baseDir, "node_modules");

                // Start backend silently
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodePath;
                psi.Arguments = "\"" + serverScript + "\"";
                psi.WorkingDirectory = baseDir;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.EnvironmentVariables["NODE_PATH"] = nodeModulesPath;
                psi.EnvironmentVariables["NODE_ENV"] = "production";
                psi.EnvironmentVariables["LAUNCHED_BY_WRAPPER"] = "1";

                try
                {
                    Process.Start(psi);
                }
                catch {}

                // Wait for the server to be ready and immediately launch the browser
                for (int i = 0; i < 40; i++)
                {
                    Thread.Sleep(250);
                    for (int p = 3333; p <= 3336; p++)
                    {
                        if (IsPortOpen("127.0.0.1", p, 150))
                        {
                            OpenBrowser("http://localhost:" + p);
                            return;
                        }
                    }
                }

                // Fallback attempt
                OpenBrowser("http://localhost:3333");
            }
        }
    }
}
