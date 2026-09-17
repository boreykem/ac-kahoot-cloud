using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace ACKahootInstaller
{
    static class ShortcutHelper
    {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);

        public static void CreateAllShortcuts(string targetDir)
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

                        // Create single clean desktop shortcut
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

    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblStatus;
        private Button btnAction;
        private Panel headerPanel;
        private BackgroundWorker worker;
        private string targetDir;
        private bool isFinished = false;

        public InstallerForm()
        {
            this.Text = "AC-Kahoot! Setup";
            this.Size = new Size(520, 340);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(245, 246, 250);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            targetDir = Path.Combine(localAppData, "AC-Kahoot");

            // Header Banner
            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 85;
            headerPanel.BackColor = Color.FromArgb(70, 23, 143);

            lblTitle = new Label();
            lblTitle.Text = "🎯 AC-Kahoot! Platform Setup";
            lblTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(20, 15);
            lblTitle.AutoSize = true;
            headerPanel.Controls.Add(lblTitle);

            lblSubtitle = new Label();
            lblSubtitle.Text = "កម្មវិធីដំឡើងស្វ័យប្រវត្តិសម្រាប់គ្រូបង្រៀន (Automatic Setup)";
            lblSubtitle.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(216, 180, 254);
            lblSubtitle.Location = new Point(22, 48);
            lblSubtitle.AutoSize = true;
            headerPanel.Controls.Add(lblSubtitle);

            this.Controls.Add(headerPanel);

            // Status Label
            lblStatus = new Label();
            lblStatus.Text = "កំពុងត្រៀមដំឡើងឯកសារ... (Preparing installation...)";
            lblStatus.Location = new Point(25, 115);
            lblStatus.Size = new Size(460, 25);
            lblStatus.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblStatus.ForeColor = Color.FromArgb(45, 55, 72);
            this.Controls.Add(lblStatus);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(25, 145);
            progressBar.Size = new Size(455, 26);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Value = 10;
            this.Controls.Add(progressBar);

            // Info text
            Label lblInfo = new Label();
            lblInfo.Text = "ទីតាំងដំឡើង (Install Path): %LOCALAPPDATA%\\AC-Kahoot";
            lblInfo.Location = new Point(25, 185);
            lblInfo.Size = new Size(460, 20);
            lblInfo.ForeColor = Color.Gray;
            lblInfo.Font = new Font("Segoe UI", 8.5F);
            this.Controls.Add(lblInfo);

            // Action Button (Close / Launch)
            btnAction = new Button();
            btnAction.Text = "កំពុងដំឡើង...";
            btnAction.Enabled = false;
            btnAction.Size = new Size(200, 38);
            btnAction.Location = new Point(280, 235);
            btnAction.BackColor = Color.FromArgb(107, 33, 168);
            btnAction.ForeColor = Color.White;
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnAction.Cursor = Cursors.Hand;
            btnAction.Click += BtnAction_Click;
            this.Controls.Add(btnAction);

            // Background Worker for smooth extraction
            worker = new BackgroundWorker();
            worker.WorkerReportsProgress = true;
            worker.DoWork += Worker_DoWork;
            worker.ProgressChanged += Worker_ProgressChanged;
            worker.RunWorkerCompleted += Worker_RunWorkerCompleted;

            this.Shown += (s, e) => { worker.RunWorkerAsync(); };
        }

        private void Worker_DoWork(object sender, DoWorkEventArgs e)
        {
            string tempZipPath = null;
            try
            {
                worker.ReportProgress(15, "កំពុងបិទដំណើរការចាស់ៗ... (Terminating old processes)");
                string[] processNames = new string[] { "AC-Kahoot", "ac-kahoot", "node", "cloudflared", "cloudflared.2026.7.2", "wscript" };
                int currentId = Process.GetCurrentProcess().Id;
                foreach (string name in processNames)
                {
                    try
                    {
                        foreach (var proc in Process.GetProcessesByName(name))
                        {
                            if (proc.Id == currentId) continue;
                            try
                            {
                                proc.Kill();
                                proc.WaitForExit(1000);
                            }
                            catch {}
                        }
                    }
                    catch {}
                }

                Thread.Sleep(600);

                worker.ReportProgress(35, "កំពុងពន្លាតឯកសារកម្មវិធី... (Extracting package)");
                if (!Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                }

                tempZipPath = Path.Combine(Path.GetTempPath(), "ack_setup_" + Guid.NewGuid().ToString("N") + ".zip");
                using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("ACKahootInstaller.archive.zip"))
                {
                    if (resStream == null)
                    {
                        throw new Exception("Could not find embedded archive resource!");
                    }
                    using (FileStream fileStream = new FileStream(tempZipPath, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        resStream.CopyTo(fileStream);
                    }
                }

                worker.ReportProgress(55, "កំពុងដំឡើងទិន្នន័យទៅកាន់ម៉ាស៊ីន... (Writing files)");

                using (ZipArchive archive = ZipFile.OpenRead(tempZipPath))
                {
                    int totalEntries = archive.Entries.Count;
                    int currentEntry = 0;

                    foreach (var entry in archive.Entries)
                    {
                        currentEntry++;
                        string fullPath = Path.Combine(targetDir, entry.FullName);
                        if (string.IsNullOrEmpty(entry.Name))
                        {
                            if (!Directory.Exists(fullPath)) Directory.CreateDirectory(fullPath);
                        }
                        else
                        {
                            string dir = Path.GetDirectoryName(fullPath);
                            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

                            int retries = 0;
                            while (true)
                            {
                                try
                                {
                                    if (File.Exists(fullPath))
                                    {
                                        try { File.Delete(fullPath); } catch {}
                                    }
                                    entry.ExtractToFile(fullPath, true);
                                    break;
                                }
                                catch (IOException)
                                {
                                    retries++;
                                    if (retries >= 6)
                                    {
                                        foreach (string name in processNames)
                                        {
                                            try { foreach (var p in Process.GetProcessesByName(name)) { if (p.Id != currentId) { p.Kill(); p.WaitForExit(500); } } } catch {}
                                        }
                                        Thread.Sleep(500);
                                        entry.ExtractToFile(fullPath, true);
                                        break;
                                    }
                                    Thread.Sleep(300);
                                }
                                catch (UnauthorizedAccessException)
                                {
                                    retries++;
                                    if (retries >= 5) throw;
                                    Thread.Sleep(300);
                                }
                            }
                        }

                        int progress = 55 + (int)((currentEntry / (float)Math.Max(1, totalEntries)) * 30);
                        worker.ReportProgress(progress, "កំពុងដំឡើងទិន្នន័យ... (" + currentEntry + "/" + totalEntries + ")");
                    }
                }

                try { if (File.Exists(tempZipPath)) File.Delete(tempZipPath); } catch {}

                worker.ReportProgress(90, "កំពុងបង្កើត Shortcut លើ Desktop... (Creating Shortcut)");
                ShortcutHelper.CreateAllShortcuts(targetDir);
                ShortcutHelper.EnsureFirewallRules(targetDir);

                worker.ReportProgress(100, "🎉 ការដំឡើងបានជោគជ័យ ១០០%! (Installed Successfully)");
            }
            catch (Exception ex)
            {
                try { if (tempZipPath != null && File.Exists(tempZipPath)) File.Delete(tempZipPath); } catch {}
                e.Result = ex;
            }
        }

        private void Worker_ProgressChanged(object sender, ProgressChangedEventArgs e)
        {
            progressBar.Value = Math.Min(100, Math.Max(0, e.ProgressPercentage));
            if (e.UserState != null)
            {
                lblStatus.Text = e.UserState.ToString();
            }
        }

        private void Worker_RunWorkerCompleted(object sender, RunWorkerCompletedEventArgs e)
        {
            if (e.Result is Exception)
            {
                Exception ex = (Exception)e.Result;
                lblStatus.ForeColor = Color.Red;
                lblStatus.Text = "❌ បរាជ័យក្នុងការដំឡើង៖ " + ex.Message;
                btnAction.Text = "បិទ (Close)";
                btnAction.Enabled = true;
                btnAction.BackColor = Color.Gray;
            }
            else
            {
                isFinished = true;
                progressBar.Value = 100;
                lblStatus.ForeColor = Color.FromArgb(22, 101, 52);
                lblStatus.Text = "✨ បានដំឡើងរួចរាល់ជាស្ថាពរ! ចុចប៊ូតុងខាងក្រោមដើម្បីចាប់ផ្តើម៖";
                btnAction.Text = "🚀 ចាប់ផ្តើម AC-Kahoot";
                btnAction.BackColor = Color.FromArgb(22, 163, 74);
                btnAction.Enabled = true;
            }
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (isFinished)
            {
                try
                {
                    string exePath = Path.Combine(targetDir, "AC-Kahoot.exe");
                    if (File.Exists(exePath))
                    {
                        ProcessStartInfo startPsi = new ProcessStartInfo(exePath);
                        startPsi.WorkingDirectory = targetDir;
                        Process.Start(startPsi);
                    }
                }
                catch {}
            }
            this.Close();
        }

        [STAThread]
        static void Main()
        {
            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new InstallerForm());
            }
            catch (Exception ex)
            {
                File.WriteAllText("installer_crash.log", ex.ToString());
                Console.WriteLine("CRASH ERROR:");
                Console.WriteLine(ex.ToString());
                MessageBox.Show("Crash: " + ex.Message);
                Console.WriteLine("Press ENTER to exit...");
                Console.ReadLine();
            }
        }
    }
}
