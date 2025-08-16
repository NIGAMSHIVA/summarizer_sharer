async function upload() {
  const f = document.getElementById("file").files?.[0];
  const status = document.getElementById("uploadStatus");
  status.textContent = "";
  if (!f) {
    status.textContent = "Please choose a file first.";
    status.className = "small err";
    return;
  }
  const fd = new FormData();
  fd.append("file", f);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    document.getElementById("transcript").value = data.text || "";
    status.textContent = `Loaded ${f.name} (${(f.size/1024).toFixed(1)} KB)`;
    status.className = "small ok";
  } catch (e) {
    status.textContent = e.message;
    status.className = "small err";
  }
}

async function summarize() {
  const text = document.getElementById("transcript").value.trim();
  const prompt = document.getElementById("prompt").value.trim();
  const status = document.getElementById("sumStatus");
  status.textContent = "Summarizing…";
  status.className = "small";
  try {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Summarization failed");
    document.getElementById("summary").value = data.summary || "";
    status.textContent = "Done.";
    status.className = "small ok";
  } catch (e) {
    status.textContent = e.message;
    status.className = "small err";
  }
}

async function sendEmail() {
  const to = document.getElementById("to").value.trim();
  const subject = document.getElementById("subject").value.trim() || "Meeting Summary";
  const html = document.getElementById("summary").value.trim()
    .replace(/\n/g, "<br/>");
  const status = document.getElementById("emailStatus");
  status.textContent = "Sending…";
  status.className = "small";

  try {
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Email failed");
    status.textContent = "Sent! Message ID: " + (data.messageId || "(provider did not return id)");
    status.className = "small ok";
  } catch (e) {
    status.textContent = e.message;
    status.className = "small err";
  }
}
