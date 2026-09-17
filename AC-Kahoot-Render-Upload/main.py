"""
AC-Kahoot! - វេទិកាសំណួរ & សិក្សាល្បែងអន្តរកម្មកម្ពុជា
Main Python Launcher (Auto Setup, IP Discovery & Browser Launch)
"""

import os
import sys
import subprocess
import webbrowser
import time
import socket
import signal

def get_local_ip():
    """Get the local network IPv4 address for QR code / phone connections"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"

def print_banner(local_ip, port=3333):
    banner = f"""
======================================================================
  🎯 AC-Kahoot! - វេទិកាសំណួរ & សិក្សាល្បែងអន្តរកម្មកម្ពុជា
  ⚡ Powered by Font Kantumruy Pro & Gemini AI
======================================================================

  👉 ផ្ទាំងគ្រូ (Host / PC View):
     http://localhost:{port}

  👉 ផ្ទាំងសិស្សចូលលេង (Student / Mobile):
     http://{local_ip}:{port}
     (សិស្សអាច Scan QR Code លើផ្ទាំងគ្រូ ឬវាយ Link ខាងលើ)

======================================================================
  💡 ចុច Ctrl + C ដើម្បីបិទ Server
======================================================================
"""
    print(banner)

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    server_script = os.path.join(base_dir, "server", "server.js")
    if not os.path.exists(server_script):
        print("❌ Error: server/server.js not found!")
        sys.exit(1)

    # Check node modules
    node_modules = os.path.join(base_dir, "node_modules")
    if not os.path.exists(node_modules):
        print("📦 កំពុងដំឡើង Dependencies (Installing npm packages)...")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        subprocess.run([npm_cmd, "install"], cwd=base_dir)

    local_ip = get_local_ip()
    port = 3333

    print_banner(local_ip, port)

    # Launch node server.js process
    node_cmd = "node"
    process = subprocess.Popen([node_cmd, server_script], cwd=base_dir)

    # Wait 1.5s for server to start, then automatically open browser
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{port}")

    def signal_handler(sig, frame):
        print("\n🛑 កំពុងបិទ AC-Kahoot Server... សូមអរគុណ!")
        process.terminate()
        try:
            process.wait(timeout=3)
        except Exception:
            process.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    try:
        process.wait()
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
