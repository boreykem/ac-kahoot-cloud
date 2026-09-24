using System;
using System.Drawing;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

namespace ACKahootKeygen
{
    public class MainForm : Form
    {
        private const string MasterSecret = "ACK-KHMER-SECURE-KEY-2026-X99-PRO-BAUREY-MASTER-SALT-084920";

        private TextBox txtHwid;
        private ComboBox cmbPlan;
        private TextBox txtClientName;
        private TextBox txtOutputKey;
        private Button btnGenerate;
        private Button btnCopy;
        private Button btnCopyTelegram;
        private Label lblStatus;

        public MainForm()
        {
            this.Text = "🎯 AC-Kahoot! Key Generator - សម្រាប់លោកគ្រូ បូរី";
            this.Size = new Size(580, 520);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(248, 249, 250);
            this.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);

            // Header Panel
            Panel header = new Panel();
            header.Dock = DockStyle.Top;
            header.Height = 80;
            header.BackColor = Color.FromArgb(70, 23, 143);

            Label lblTitle = new Label();
            lblTitle.Text = "🔑 AC-Kahoot! Official Key Generator";
            lblTitle.Font = new Font("Segoe UI", 13.5F, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(20, 14);
            lblTitle.AutoSize = true;
            header.Controls.Add(lblTitle);

            Label lblSubtitle = new Label();
            lblSubtitle.Text = "កម្មវិធីបង្កើត License Key ចាក់សោរតាម HWID ម៉ាស៊ីន (Offline Cryptographic)";
            lblSubtitle.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(216, 180, 254);
            lblSubtitle.Location = new Point(22, 45);
            lblSubtitle.AutoSize = true;
            header.Controls.Add(lblSubtitle);

            this.Controls.Add(header);

            int startY = 100;

            // HWID Input
            Label lblHwid = new Label();
            lblHwid.Text = "1. Hardware ID (HWID របស់អតិថិជន):";
            lblHwid.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblHwid.Location = new Point(25, startY);
            lblHwid.AutoSize = true;
            this.Controls.Add(lblHwid);

            txtHwid = new TextBox();
            txtHwid.Location = new Point(25, startY + 25);
            txtHwid.Size = new Size(515, 30);
            txtHwid.Font = new Font("Consolas", 10.5F, FontStyle.Bold);
            txtHwid.ForeColor = Color.FromArgb(70, 23, 143);
            this.Controls.Add(txtHwid);

            // Client Name (Optional)
            Label lblClient = new Label();
            lblClient.Text = "2. ឈ្មោះអតិថិជន (Client Name - Optional):";
            lblClient.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblClient.Location = new Point(25, startY + 68);
            lblClient.AutoSize = true;
            this.Controls.Add(lblClient);

            txtClientName = new TextBox();
            txtClientName.Location = new Point(25, startY + 93);
            txtClientName.Size = new Size(515, 30);
            txtClientName.Text = "លោកគ្រូ / អ្នកគ្រូ";
            this.Controls.Add(txtClientName);

            // Plan Selection
            Label lblPlan = new Label();
            lblPlan.Text = "3. ជ្រើសរើសប្រភេទគម្រោង (Select Plan):";
            lblPlan.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblPlan.Location = new Point(25, startY + 135);
            lblPlan.AutoSize = true;
            this.Controls.Add(lblPlan);

            cmbPlan = new ComboBox();
            cmbPlan.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbPlan.Items.Add("🌟 Pro Lifetime (គ្រូបង្រៀនទូទៅ - ប្រើមួយជីវិត)");
            cmbPlan.Items.Add("🏫 VIP School Lifetime (សាលារៀន/ស្ថាប័ន - ប្រើមួយជីវិត)");
            cmbPlan.Items.Add("📅 Pro Annual (គម្រោង ១ ឆ្នាំ / 365 ថ្ងៃ)");
            cmbPlan.Items.Add("⏳ Pro Monthly (គម្រោង ១ ខែ / 30 ថ្ងៃ)");
            cmbPlan.SelectedIndex = 0;
            cmbPlan.Location = new Point(25, startY + 160);
            cmbPlan.Size = new Size(515, 30);
            this.Controls.Add(cmbPlan);

            // Generate Button
            btnGenerate = new Button();
            btnGenerate.Text = "⚡ បង្កើត License Key (Generate Key)";
            btnGenerate.Location = new Point(25, startY + 205);
            btnGenerate.Size = new Size(515, 42);
            btnGenerate.BackColor = Color.FromArgb(22, 163, 74);
            btnGenerate.ForeColor = Color.White;
            btnGenerate.FlatStyle = FlatStyle.Flat;
            btnGenerate.FlatAppearance.BorderSize = 0;
            btnGenerate.Font = new Font("Segoe UI", 10.5F, FontStyle.Bold);
            btnGenerate.Cursor = Cursors.Hand;
            btnGenerate.Click += BtnGenerate_Click;
            this.Controls.Add(btnGenerate);

            // Output Key
            Label lblOutput = new Label();
            lblOutput.Text = "4. លេខកូដ License Key ដែលទើបបង្កើតរួច (Result):";
            lblOutput.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblOutput.Location = new Point(25, startY + 260);
            lblOutput.AutoSize = true;
            this.Controls.Add(lblOutput);

            txtOutputKey = new TextBox();
            txtOutputKey.Location = new Point(25, startY + 285);
            txtOutputKey.Size = new Size(515, 32);
            txtOutputKey.Font = new Font("Consolas", 12F, FontStyle.Bold);
            txtOutputKey.ForeColor = Color.FromArgb(22, 101, 52);
            txtOutputKey.BackColor = Color.FromArgb(240, 253, 244);
            txtOutputKey.ReadOnly = true;
            this.Controls.Add(txtOutputKey);

            // Buttons: Copy Key & Copy Telegram Message
            btnCopy = new Button();
            btnCopy.Text = "📋 Copy Key តែមួយគត់";
            btnCopy.Location = new Point(25, startY + 330);
            btnCopy.Size = new Size(250, 36);
            btnCopy.BackColor = Color.FromArgb(70, 23, 143);
            btnCopy.ForeColor = Color.White;
            btnCopy.FlatStyle = FlatStyle.Flat;
            btnCopy.FlatAppearance.BorderSize = 0;
            btnCopy.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnCopy.Cursor = Cursors.Hand;
            btnCopy.Click += (s, e) => {
                if (!string.IsNullOrEmpty(txtOutputKey.Text)) {
                    Clipboard.SetText(txtOutputKey.Text);
                    lblStatus.Text = "✅ បាន Copy License Key ចូល Clipboard រួចរាល់!";
                }
            };
            this.Controls.Add(btnCopy);

            btnCopyTelegram = new Button();
            btnCopyTelegram.Text = "💬 Copy សារសម្រាប់ផ្ញើតាម Telegram";
            btnCopyTelegram.Location = new Point(285, startY + 330);
            btnCopyTelegram.Size = new Size(255, 36);
            btnCopyTelegram.BackColor = Color.FromArgb(2, 132, 199);
            btnCopyTelegram.ForeColor = Color.White;
            btnCopyTelegram.FlatStyle = FlatStyle.Flat;
            btnCopyTelegram.FlatAppearance.BorderSize = 0;
            btnCopyTelegram.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnCopyTelegram.Cursor = Cursors.Hand;
            btnCopyTelegram.Click += BtnCopyTelegram_Click;
            this.Controls.Add(btnCopyTelegram);

            // Status label
            lblStatus = new Label();
            lblStatus.Location = new Point(25, startY + 375);
            lblStatus.Size = new Size(515, 25);
            lblStatus.ForeColor = Color.FromArgb(22, 101, 52);
            lblStatus.Font = new Font("Segoe UI", 9F, FontStyle.Italic);
            this.Controls.Add(lblStatus);
        }

        private static string ToBase36(long value)
        {
            const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            if (value == 0) return "0";
            string result = "";
            while (value > 0)
            {
                result = chars[(int)(value % 36)] + result;
                value /= 36;
            }
            return result;
        }

        private void BtnGenerate_Click(object sender, EventArgs e)
        {
            string hwid = txtHwid.Text.Trim().ToUpper();
            if (string.IsNullOrEmpty(hwid))
            {
                MessageBox.Show("សូមបញ្ចូល Hardware ID (HWID) របស់អតិថិជនជាមុនសិន!", "បញ្ជាក់", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string planType = "PRO_LIFETIME";
            string planPrefix = "PRO";
            int durationDays = 0;

            switch (cmbPlan.SelectedIndex)
            {
                case 1:
                    planType = "VIP_SCHOOL";
                    planPrefix = "VIP";
                    durationDays = 0; // Lifetime
                    break;
                case 2:
                    planType = "PRO_ANNUAL";
                    planPrefix = "ANN";
                    durationDays = 365;
                    break;
                case 3:
                    planType = "PRO_MONTHLY";
                    planPrefix = "MON";
                    durationDays = 30;
                    break;
                default:
                    planType = "PRO_LIFETIME";
                    planPrefix = "PRO";
                    durationDays = 0; // Lifetime
                    break;
            }

            string expiryCode = "LIFE";
            if (durationDays > 0)
            {
                long epochMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + ((long)durationDays * 24L * 60L * 60L * 1000L);
                expiryCode = ToBase36(epochMs);
            }

            string payload = hwid + "#" + planType + "#" + expiryCode;

            string signature = "";
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(MasterSecret)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < hash.Length; i++)
                {
                    sb.Append(hash[i].ToString("X2"));
                }
                signature = sb.ToString().Substring(0, 8).ToUpper();
            }

            string sigPart1 = signature.Substring(0, 4);
            string sigPart2 = signature.Substring(4, 4);

            string key = string.Format("ACK-{0}-{1}-{2}-{3}", planPrefix, expiryCode, sigPart1, sigPart2);
            txtOutputKey.Text = key;
            lblStatus.Text = "🎉 បង្កើត Key ជោគជ័យ! ចុច 'Copy Key' ដើម្បីផ្ញើជូនអតិថិជន។";
        }

        private void BtnCopyTelegram_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(txtOutputKey.Text))
            {
                MessageBox.Show("សូមចុចបង្កើត Key ជាមុនសិន!", "បញ្ជាក់", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            string client = txtClientName.Text.Trim();
            if (string.IsNullOrEmpty(client)) client = "លោកគ្រូ / អ្នកគ្រូ";

            string planName = cmbPlan.SelectedItem.ToString();
            string msg = string.Format("🎉 សួស្តី {0}!\n\nខាងក្រោមនេះជា License Key សម្រាប់ Activate កម្មវិធី AC-Kahoot! លើកុំព្យូទ័ររបស់លោកអ្នក៖\n\n🔑 License Key: `{1}`\n💻 HWID: `{2}`\n🏷️ គម្រោង: {3}\n\n👉 របៀបប្រើ៖ បើកកម្មវិធី AC-Kahoot រួចចុចលើ 'សោរម៉ាស៊ីន (Hardware ID)' -> Paste លេខកូដខាងលើ -> ចុច 'Activate' ជាការស្រេច!\n\nសូមអរគុណ!", 
                client, txtOutputKey.Text, txtHwid.Text.Trim(), planName);

            Clipboard.SetText(msg);
            lblStatus.Text = "💬 បាន Copy សារ Telegram រួចរាល់! អាចយកទៅ Paste ផ្ញើក្នុង Chat បានភ្លាម។";
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
