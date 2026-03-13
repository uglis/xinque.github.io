const fileInput = document.getElementById("md-file");
const tokenInput = document.getElementById("admin-token");
const contentInput = document.getElementById("md-content");
const publishButton = document.getElementById("publish-btn");
const previewButton = document.getElementById("preview-btn");
const statusText = document.getElementById("admin-status");

const STORAGE_KEY = "homepage-admin-token";

const setStatus = (message, mode = "") => {
  if (!(statusText instanceof HTMLElement)) return;
  statusText.textContent = message;
  statusText.classList.remove("ok", "error");
  if (mode) {
    statusText.classList.add(mode);
  }
};

if (tokenInput instanceof HTMLInputElement) {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) tokenInput.value = saved;

  tokenInput.addEventListener("input", () => {
    window.localStorage.setItem(STORAGE_KEY, tokenInput.value.trim());
  });
}

if (previewButton instanceof HTMLButtonElement && contentInput instanceof HTMLTextAreaElement) {
  previewButton.addEventListener("click", () => {
    const markdown = contentInput.value;
    const preview = window.open("./post.html", "_blank", "noopener,noreferrer");
    if (!preview) {
      setStatus("预览窗口被拦截，请允许弹窗后重试", "error");
      return;
    }
    preview.document.write(`<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;line-height:1.6;padding:24px;">${markdown
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>`);
    preview.document.close();
  });
}

if (
  publishButton instanceof HTMLButtonElement &&
  fileInput instanceof HTMLInputElement &&
  tokenInput instanceof HTMLInputElement &&
  contentInput instanceof HTMLTextAreaElement
) {
  publishButton.addEventListener("click", async () => {
    const file = fileInput.value.trim();
    const token = tokenInput.value.trim();
    const markdown = contentInput.value;

    if (!file.startsWith("posts/")) {
      setStatus("文件路径必须以 posts/ 开头", "error");
      return;
    }

    if (!token) {
      setStatus("请输入管理员令牌", "error");
      return;
    }

    if (!markdown.trim()) {
      setStatus("Markdown 内容不能为空", "error");
      return;
    }

    publishButton.disabled = true;
    setStatus("发布中...");

    try {
      const response = await fetch("http://127.0.0.1:8787/api/publish-md", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
        },
        body: JSON.stringify({ file, markdown }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "发布失败");
      }

      setStatus(`发布成功：${data.slug}`, "ok");
    } catch (error) {
      setStatus(`发布失败：${error instanceof Error ? error.message : "未知错误"}`, "error");
    } finally {
      publishButton.disabled = false;
    }
  });
}
