#!/usr/bin/env python3
"""
Hebelki Debug Viewer — Real-time log stream in a tkinter window.

Tails PM2 log files (/tmp/hebelki-out.log + /tmp/hebelki-error.log)
and displays them with color-coded output.

Usage: python3 scripts/debug-viewer.py
"""

import tkinter as tk
from tkinter import scrolledtext, font as tkfont
import os
import re
import threading
import time
import signal
import sys

LOG_FILES = [
    ("/tmp/hebelki-out.log", "stdout"),
    ("/tmp/hebelki-error.log", "stderr"),
]

# ANSI escape code pattern
ANSI_RE = re.compile(r'\x1b\[[0-9;]*m')


def strip_ansi(text: str) -> str:
    return ANSI_RE.sub('', text)


class DebugViewer:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Hebelki Debug — localhost:3005")
        self.root.geometry("1100x700")
        self.root.configure(bg="#1e1e2e")
        self.running = True

        # Icon (optional — skip if missing)
        try:
            self.root.iconname("Hebelki Debug")
        except Exception:
            pass

        # Fonts
        mono = tkfont.Font(family="JetBrains Mono", size=11)
        if "JetBrains Mono" not in tkfont.families():
            mono = tkfont.Font(family="monospace", size=11)

        # Header
        header = tk.Frame(self.root, bg="#1e1e2e", padx=10, pady=6)
        header.pack(fill=tk.X)

        tk.Label(
            header, text="Hebelki Debug Viewer", font=("sans-serif", 14, "bold"),
            fg="#cdd6f4", bg="#1e1e2e"
        ).pack(side=tk.LEFT)

        self.status_label = tk.Label(
            header, text="Streaming...", font=("sans-serif", 10),
            fg="#a6e3a1", bg="#1e1e2e"
        )
        self.status_label.pack(side=tk.LEFT, padx=20)

        # Buttons
        btn_frame = tk.Frame(header, bg="#1e1e2e")
        btn_frame.pack(side=tk.RIGHT)

        tk.Button(
            btn_frame, text="Clear", command=self.clear_log,
            bg="#313244", fg="#cdd6f4", relief=tk.FLAT, padx=10, pady=2
        ).pack(side=tk.LEFT, padx=4)

        self.auto_scroll_var = tk.BooleanVar(value=True)
        tk.Checkbutton(
            btn_frame, text="Auto-scroll", variable=self.auto_scroll_var,
            bg="#1e1e2e", fg="#cdd6f4", selectcolor="#313244",
            activebackground="#1e1e2e", activeforeground="#cdd6f4"
        ).pack(side=tk.LEFT, padx=4)

        # Filter
        tk.Label(
            btn_frame, text="Filter:", fg="#9399b2", bg="#1e1e2e",
            font=("sans-serif", 10)
        ).pack(side=tk.LEFT, padx=(10, 2))

        self.filter_var = tk.StringVar()
        self.filter_var.trace_add("write", lambda *_: None)  # placeholder
        filter_entry = tk.Entry(
            btn_frame, textvariable=self.filter_var, width=20,
            bg="#313244", fg="#cdd6f4", insertbackground="#cdd6f4",
            relief=tk.FLAT, font=("sans-serif", 10)
        )
        filter_entry.pack(side=tk.LEFT, padx=2)

        # Log area
        self.text = scrolledtext.ScrolledText(
            self.root, wrap=tk.WORD, bg="#1e1e2e", fg="#cdd6f4",
            insertbackground="#cdd6f4", font=mono,
            relief=tk.FLAT, padx=8, pady=8, state=tk.DISABLED,
            selectbackground="#45475a", selectforeground="#cdd6f4"
        )
        self.text.pack(fill=tk.BOTH, expand=True, padx=4, pady=(0, 4))

        # Tags for color coding
        self.text.tag_config("error", foreground="#f38ba8")       # red
        self.text.tag_config("warn", foreground="#fab387")        # orange
        self.text.tag_config("info", foreground="#89b4fa")        # blue
        self.text.tag_config("success", foreground="#a6e3a1")     # green
        self.text.tag_config("tool", foreground="#cba6f7")        # purple
        self.text.tag_config("stderr", foreground="#f38ba8")      # red
        self.text.tag_config("dim", foreground="#6c7086")         # dim
        self.text.tag_config("route", foreground="#94e2d5")       # teal
        self.text.tag_config("timestamp", foreground="#6c7086")   # dim

        # Right-click context menu
        self.context_menu = tk.Menu(self.root, tearoff=0, bg="#313244", fg="#cdd6f4",
                                    activebackground="#45475a", activeforeground="#cdd6f4")
        self.context_menu.add_command(label="Copy", command=self.copy_selection, accelerator="Ctrl+C")
        self.context_menu.add_command(label="Select All", command=self.select_all, accelerator="Ctrl+A")
        self.text.bind("<Button-3>", self.show_context_menu)
        self.text.bind("<Control-c>", lambda e: self.copy_selection())
        self.text.bind("<Control-a>", lambda e: self.select_all())

        # Close handling
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

        # Start tail threads
        for log_file, stream_name in LOG_FILES:
            t = threading.Thread(target=self.tail_file, args=(log_file, stream_name), daemon=True)
            t.start()

    def classify_line(self, line: str, stream: str) -> str:
        """Return a tag name based on line content."""
        if stream == "stderr":
            return "error"

        lower = line.lower()

        # Errors
        if any(k in lower for k in ["error", "err:", "failed", "exception", "traceback", "unhandled"]):
            return "error"

        # Warnings
        if any(k in lower for k in ["warn", "warning", "deprecated"]):
            return "warn"

        # Tool execution
        if "[chatbot]" in lower or "[tool" in lower:
            return "tool"

        # Routes / requests
        if any(k in lower for k in ["get /", "post /", "patch /", "delete /", "put /"]):
            return "route"

        # Success
        if any(k in lower for k in ["ready", "compiled", "success", "✓", "✅"]):
            return "success"

        # Next.js info
        if any(k in lower for k in ["compiling", "building", "hmr"]):
            return "info"

        # Timestamps at start
        if re.match(r'^\d{4}-\d{2}-\d{2}', line):
            return "dim"

        return ""

    def append_line(self, line: str, stream: str):
        """Thread-safe append to the text widget."""
        clean = strip_ansi(line)

        # Apply filter
        filter_text = self.filter_var.get().strip().lower()
        if filter_text and filter_text not in clean.lower():
            return

        tag = self.classify_line(clean, stream)

        def _insert():
            self.text.configure(state=tk.NORMAL)
            if tag:
                self.text.insert(tk.END, clean + "\n", tag)
            else:
                self.text.insert(tk.END, clean + "\n")

            # Limit to 5000 lines
            line_count = int(self.text.index('end-1c').split('.')[0])
            if line_count > 5000:
                self.text.delete("1.0", f"{line_count - 5000}.0")

            self.text.configure(state=tk.DISABLED)

            if self.auto_scroll_var.get():
                self.text.see(tk.END)

        self.root.after(0, _insert)

    def tail_file(self, filepath: str, stream: str):
        """Tail a log file, following new content."""
        # Wait for file to exist
        while self.running and not os.path.exists(filepath):
            time.sleep(0.5)

        if not self.running:
            return

        with open(filepath, "r") as f:
            # Start from end of file
            f.seek(0, 2)

            while self.running:
                line = f.readline()
                if line:
                    self.append_line(line.rstrip(), stream)
                else:
                    time.sleep(0.1)

    def show_context_menu(self, event):
        self.context_menu.tk_popup(event.x_root, event.y_root)

    def copy_selection(self):
        try:
            selected = self.text.get(tk.SEL_FIRST, tk.SEL_LAST)
            self.root.clipboard_clear()
            self.root.clipboard_append(selected)
        except tk.TclError:
            pass  # No selection

    def select_all(self):
        self.text.configure(state=tk.NORMAL)
        self.text.tag_add(tk.SEL, "1.0", tk.END)
        self.text.configure(state=tk.DISABLED)

    def clear_log(self):
        self.text.configure(state=tk.NORMAL)
        self.text.delete("1.0", tk.END)
        self.text.configure(state=tk.DISABLED)

    def on_close(self):
        self.running = False
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    # Handle Ctrl+C
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))

    viewer = DebugViewer()
    viewer.run()
