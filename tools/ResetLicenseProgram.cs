using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace ACKahootReset
{
    class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                // Kill running node and AC-Kahoot
                foreach (var p in Process.GetProcessesByName("node"))
                {
                    try { p.Kill(); } catch {}
                }
                foreach (var p in Process.GetProcessesByName("AC-Kahoot"))
                {
                    try { p.Kill(); } catch {}
                }

                Thread.Sleep(500);

                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string[] paths = new string[]
                {
                    Path.Combine(localApp, "license.active.json"),
                    Path.Combine(localApp, "AC-Kahoot", "license.active.json"),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "server", "license.active.json"),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "license.active.json")
                };

                int deleted = 0;
                foreach (var path in paths)
                {
                    if (File.Exists(path))
                    {
                        try { File.Delete(path); deleted++; } catch {}
                    }
                }

                // Restart AC-Kahoot
                string launcherPath = Path.Combine(localApp, "AC-Kahoot", "AC-Kahoot.exe");
                if (File.Exists(launcherPath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = launcherPath,
                        WorkingDirectory = Path.GetDirectoryName(launcherPath)
                    });
                }

                MessageBox.Show(
                    "✅ បានដក License ចេញពីកុំព្យូទ័រនេះដោយជោគជ័យ!\n\nកម្មវិធី AC-Kahoot ត្រូវបាន Restart ត្រឡប់ទៅជា Free Edition វិញហើយ។",
                    "AC-Kahoot! License Reset",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show("កំហុស៖ " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
