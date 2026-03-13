const revealTargets = document.querySelectorAll(".reveal-target");
const currentYear = document.getElementById("year");
const postsList = document.getElementById("posts-list");
const postDetail = document.getElementById("post-detail");
const postsSearch = document.getElementById("posts-search");
const postsTags = document.getElementById("posts-tags");
const postsResultStatus = document.getElementById("posts-result-status");
const postsFilters = document.querySelector(".posts-filters");
const momentsList = document.getElementById("moments-list");

const THEME_MODE_KEY = "homepage-theme-mode";

const applyThemeMode = (mode) => {
  const normalized = mode === "light" ? "light" : "dark";
  document.body.setAttribute("data-theme-mode", normalized);
  return normalized;
};

const getSystemThemeMode = () => (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

const getThemeIcon = (mode) => {
  if (mode === "light") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4.5V2.5M12 21.5v-2M6.35 6.35 4.93 4.93m14.14 14.14-1.42-1.42M4.5 12h-2m19 0h-2M6.35 17.65l-1.42 1.42m14.14-14.14-1.42 1.42M12 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" />
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19 15.2A8 8 0 1 1 8.8 5 6.5 6.5 0 1 0 19 15.2Z" />
    </svg>
  `;
};

const initThemeControls = () => {
  const header = document.querySelector(".header");
  if (!(header instanceof HTMLElement)) return;

  const savedMode = window.localStorage.getItem(THEME_MODE_KEY);

  let currentMode = applyThemeMode(savedMode || getSystemThemeMode());

  const controls = document.createElement("div");
  controls.className = "theme-controls";
  controls.innerHTML = `
    <button type="button" class="theme-mode-toggle" aria-label="切换白天/夜间模式">${getThemeIcon(currentMode)}</button>
  `;

  const nav = header.querySelector("nav");
  if (nav instanceof HTMLElement) {
    nav.insertAdjacentElement("afterend", controls);
  } else {
    header.appendChild(controls);
  }

  const modeButton = controls.querySelector(".theme-mode-toggle");

  if (modeButton instanceof HTMLButtonElement) {
    modeButton.setAttribute("aria-label", currentMode === "light" ? "切换到夜间模式" : "切换到白天模式");

    modeButton.addEventListener("click", () => {
      currentMode = applyThemeMode(currentMode === "light" ? "dark" : "light");
      window.localStorage.setItem(THEME_MODE_KEY, currentMode);
      modeButton.innerHTML = getThemeIcon(currentMode);
      modeButton.setAttribute("aria-label", currentMode === "light" ? "切换到夜间模式" : "切换到白天模式");
    });
  }
};

if (postsFilters instanceof HTMLElement) {
  postsFilters.classList.add("visible");
}

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const parseInlineMarkdown = (value) =>
  escapeHtml(value)
    .replace(
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\.\/?[^\s)]+)\)/g,
      '<img class="article-image" src="$2" alt="$1" loading="lazy" />'
    )
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="list-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");

const renderMarkdownToHtml = (markdown) => {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const chunks = [];
  let currentListType = "";
  let inCode = false;
  let codeLines = [];

  const closeList = () => {
    if (currentListType === "ul") {
      chunks.push("</ul>");
      currentListType = "";
    }
    if (currentListType === "ol") {
      chunks.push("</ol>");
      currentListType = "";
    }
  };

  const getIndentLevel = (line) => {
    const expanded = line.replace(/\t/g, "  ");
    const leading = (expanded.match(/^(\s*)/) || ["", ""])[1].length;
    return Math.min(Math.floor(leading / 2), 6);
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    const ulMatch = rawLine.match(/^(\s*)[-*]\s+(.*)$/);
    const olMatch = rawLine.match(/^(\s*)\d+\.\s+(.*)$/);

    if (line.startsWith("```")) {
      closeList();

      if (inCode) {
        chunks.push(`<pre class="md-code"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }

      return;
    }

    if (inCode) {
      codeLines.push(rawLine);
      return;
    }

    if (!line) {
      closeList();
      return;
    }

    if (/^#{1,6}\s+/.test(line)) {
      closeList();
      const level = Math.min((line.match(/^#+/) || [""])[0].length, 6);
      const text = line.replace(/^#{1,6}\s+/, "");
      chunks.push(`<h${level}>${parseInlineMarkdown(text)}</h${level}>`);
      return;
    }

    if (/^>\s+/.test(line)) {
      closeList();
      chunks.push(`<blockquote>${parseInlineMarkdown(line.replace(/^>\s+/, ""))}</blockquote>`);
      return;
    }

    if (ulMatch) {
      const text = ulMatch[2]?.trim() || "";
      const level = getIndentLevel(rawLine);

      if (currentListType === "ol") {
        chunks.push("</ol>");
        currentListType = "";
      }

      if (!currentListType) {
        chunks.push('<ul class="md-list md-list-ul">');
        currentListType = "ul";
      }

      chunks.push(`<li class="md-li md-level-${level}">${parseInlineMarkdown(text)}</li>`);
      return;
    }

    if (olMatch) {
      const text = olMatch[2]?.trim() || "";
      const level = getIndentLevel(rawLine);

      if (currentListType === "ul") {
        chunks.push("</ul>");
        currentListType = "";
      }

      if (!currentListType) {
        chunks.push('<ol class="md-list md-list-ol">');
        currentListType = "ol";
      }

      chunks.push(`<li class="md-li md-level-${level}">${parseInlineMarkdown(text)}</li>`);
      return;
    }

    if (/^---+$/.test(line)) {
      closeList();
      chunks.push("<hr />");
      return;
    }

    closeList();
    chunks.push(`<p>${parseInlineMarkdown(line)}</p>`);
  });

  if (inCode) {
    chunks.push(`<pre class="md-code"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  closeList();

  return chunks.join("");
};

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

initThemeControls();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reducedMotion && "IntersectionObserver" in window) {
  revealTargets.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 80, 260)}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealTargets.forEach((el) => observer.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("visible"));
}

const renderPosts = async () => {
  if (!postsList) return;

  postsList.classList.add("visible");

  try {
    const response = await fetch("./data/posts.json");
    if (!response.ok) throw new Error("posts fetch failed");
    const posts = await response.json();
    const normalizedPosts = Array.isArray(posts)
      ? posts.map((post) => {
          const tags = Array.isArray(post.tags)
            ? post.tags
                .map((tag) => String(tag || "").trim())
                .filter((tag) => Boolean(tag))
            : [];

          return {
            ...post,
            tags,
          };
        })
      : [];

    let selectedTag = "all";

    const renderTagFilter = () => {
      if (!postsTags) return;

      const uniqueTags = Array.from(new Set(normalizedPosts.flatMap((post) => post.tags)));
      const allTags = ["all", ...uniqueTags];

      postsTags.innerHTML = allTags
        .map((tag) => {
          const isAll = tag === "all";
          const label = isAll ? "全部" : tag;
          const activeClass = selectedTag === tag ? "active" : "";

          return `<button type="button" class="tag-chip ${activeClass}" data-tag="${escapeHtml(tag)}">${escapeHtml(label)}</button>`;
        })
        .join("");
    };

    const getFilteredPosts = () => {
      const keyword = postsSearch ? postsSearch.value.trim().toLowerCase() : "";

      return normalizedPosts.filter((post) => {
        const matchesTag = selectedTag === "all" || post.tags.includes(selectedTag);
        if (!matchesTag) return false;
        if (!keyword) return true;

        const haystack = [
          post.title || "",
          post.summary || "",
          Array.isArray(post.content) ? post.content.join(" ") : post.content || "",
          post.content_markdown || "",
          post.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      });
    };

    const renderPostCards = () => {
      const visiblePosts = getFilteredPosts();

      if (!visiblePosts.length) {
        postsList.innerHTML = '<article class="list-item"><p>没有找到匹配的文章，换个关键词或标签试试。</p></article>';
      } else {
        postsList.innerHTML = visiblePosts
          .map(
            (post) => `
              <article class="list-item reveal-target visible">
                <p class="meta">${escapeHtml(post.date || "未设置日期")}</p>
                <h3>${escapeHtml(post.title || "未命名文章")}</h3>
                <p>${escapeHtml(post.summary || "暂无摘要")}</p>
                ${
                  post.tags.length
                    ? `<div class="post-tags">${post.tags
                        .map((tag) => `<span class="post-tag">${escapeHtml(tag)}</span>`)
                        .join("")}</div>`
                    : ""
                }
                <a class="list-link" href="./post.html?slug=${encodeURIComponent(post.slug || "")}">阅读更多</a>
              </article>
            `
          )
          .join("");
      }

      if (postsResultStatus) {
        postsResultStatus.textContent = `共 ${visiblePosts.length} 篇文章`;
      }
    };

    renderTagFilter();
    renderPostCards();

    if (postsSearch) {
      postsSearch.addEventListener("input", () => {
        renderPostCards();
      });
    }

    if (postsTags) {
      postsTags.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const tag = target.getAttribute("data-tag");
        if (!tag) return;

        selectedTag = tag;
        renderTagFilter();
        renderPostCards();
      });
    }
  } catch (error) {
    postsList.innerHTML = '<article class="list-item"><p>文章加载失败，请稍后重试。</p></article>';
  }
};

const renderMoments = async () => {
  if (!momentsList) return;

  try {
    const response = await fetch("./data/moments.json");
    if (!response.ok) throw new Error("moments fetch failed");
    const moments = await response.json();

    const normalized = Array.isArray(moments) ? moments : [];
    const mode = momentsList.getAttribute("data-moments-mode") || "full";
    const items = mode === "preview" ? normalized.slice(0, 3) : normalized;

    momentsList.innerHTML = items
      .map((moment) => {
        const music = moment.music || {};
        const photo = moment.photo || {};
        const hasPhoto = Boolean(photo.src);
        const hasMusic = Boolean(music.url);

        const previewMeta = [];
        if (hasPhoto) previewMeta.push("图片");
        if (hasMusic) previewMeta.push(`音乐 · ${music.platform || "链接"}`);

        const previewText = String(moment.text || "").trim();
        const compactText = previewText.length > 38 ? `${previewText.slice(0, 38)}…` : previewText;

        if (mode === "preview") {
          return `
            <article class="moment-card moment-card-preview reveal-target visible">
              <div class="moment-timeline-marker" aria-hidden="true"></div>
              <p class="meta moment-date">${escapeHtml(moment.date || "未设置日期")}</p>
              <p class="moment-text">${escapeHtml(compactText || "一条动态")}</p>
              <p class="moment-preview-meta">${escapeHtml(previewMeta.join(" · ") || "文字")}</p>
            </article>
          `;
        }

        return `
          <article class="moment-card reveal-target visible">
            <div class="moment-timeline-marker" aria-hidden="true"></div>
            <p class="meta moment-date">${escapeHtml(moment.date || "未设置日期")}</p>
            <p class="moment-text">${escapeHtml(moment.text || "")}</p>
            ${
              photo.src
                ? `<img class="moment-photo article-zoomable" src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || "分享照片")}" loading="lazy" tabindex="0" role="button" aria-label="查看原图：${escapeHtml(photo.alt || "分享照片")}" data-article-img-src="${escapeHtml(photo.src)}" data-article-img-title="${escapeHtml(photo.alt || "分享照片")}" data-article-img-description="朋友圈原图" />`
                : ""
            }
            ${
              music.url
                ? `<p class="moment-music"><span class="moment-music-icon" aria-hidden="true">♫</span> ${escapeHtml(music.platform || "音乐")} · <a class="list-link" href="${escapeHtml(music.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(music.title || "打开链接")}</a></p>`
                : ""
            }
          </article>
        `;
      })
      .join("");
  } catch (error) {
    momentsList.innerHTML = '<article class="list-item"><p>动态加载失败，请稍后重试。</p></article>';
  }
};

const renderPostDetail = async () => {
  if (!postDetail) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    postDetail.innerHTML = '<p>缺少文章参数，请返回文章列表重新选择。</p>';
    return;
  }

  try {
    const response = await fetch("./data/posts.json");
    if (!response.ok) throw new Error("post detail fetch failed");
    const posts = await response.json();
    const post = Array.isArray(posts) ? posts.find((item) => item.slug === slug) : null;

    if (!post) {
      postDetail.innerHTML = '<p>未找到该文章，请返回文章列表查看。</p>';
      return;
    }

    const content =
      typeof post.content_markdown === "string" && post.content_markdown.trim()
        ? renderMarkdownToHtml(post.content_markdown)
        : Array.isArray(post.content)
          ? post.content.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
          : `<p>${escapeHtml(post.summary)}</p>`;

    const cover = post.cover
      ? `<img class="article-cover article-zoomable" src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" loading="lazy" data-article-img-src="${escapeHtml(post.cover)}" data-article-img-title="${escapeHtml(post.title)}" data-article-img-description="封面原图" />`
      : "";

    const tags = Array.isArray(post.tags)
      ? post.tags
          .map((tag) => String(tag || "").trim())
          .filter((tag) => Boolean(tag))
      : [];

    const tagsMarkup = tags.length
      ? `<div class="post-tags">${tags.map((tag) => `<span class="post-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
      : "";

    postDetail.innerHTML = `
      <p class="meta">${post.date}</p>
      <h1>${escapeHtml(post.title)}</h1>
      ${tagsMarkup}
      ${cover}
      <div class="article-content">${content}</div>
      <p><a class="list-link" href="./posts.html">← 返回文章列表</a></p>
    `;

    const articleImages = postDetail.querySelectorAll(".article-content img");
    articleImages.forEach((image) => {
      if (!(image instanceof HTMLImageElement)) return;
      const src = image.getAttribute("src");
      if (!src) return;
      image.classList.add("article-image", "article-zoomable");
      image.setAttribute("tabindex", "0");
      image.setAttribute("role", "button");
      image.setAttribute("data-article-img-src", src);
      image.setAttribute("data-article-img-title", image.getAttribute("alt") || post.title || "文章图片");
      image.setAttribute("data-article-img-description", "点击查看原图");
      image.setAttribute("aria-label", `查看原图：${image.getAttribute("alt") || post.title || "文章图片"}`);
    });
  } catch (error) {
    postDetail.innerHTML = '<p>文章加载失败，请稍后重试。</p>';
  }
};

const ensureLightbox = () => {
  let lightbox = document.querySelector(".lightbox");
  let lastFocused = null;

  const closeLightbox = () => {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocused instanceof HTMLElement) {
      lastFocused.focus();
    }
  };

  const openLightbox = () => {
    lastFocused = document.activeElement;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn instanceof HTMLElement) {
      closeBtn.focus();
    }
  };

  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.setAttribute("tabindex", "-1");
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="关闭预览">×</button>
      <img class="lightbox-image" alt="" />
      <p class="lightbox-caption"></p>
    `;
    document.body.appendChild(lightbox);

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    const closeBtn = lightbox.querySelector(".lightbox-close");
    closeBtn.addEventListener("click", () => {
      closeLightbox();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("open")) {
        closeLightbox();
      }
    });
  }

  return { lightbox, openLightbox };
};

const initPortraitLightbox = () => {
  const portraitCard = document.querySelector(".portrait-preview");
  if (!(portraitCard instanceof HTMLElement)) return;

  const { lightbox, openLightbox } = ensureLightbox();
  const lightboxImage = lightbox.querySelector(".lightbox-image");
  const lightboxCaption = lightbox.querySelector(".lightbox-caption");

  const openPortrait = () => {
    const src = portraitCard.getAttribute("data-portrait-src");
    const title = portraitCard.getAttribute("data-portrait-title") || "证件照";
    const description = portraitCard.getAttribute("data-portrait-description") || "";

    if (!src) return;

    lightboxImage.src = src;
    lightboxImage.alt = title;
    lightboxCaption.textContent = description ? `${title} · ${description}` : title;
    openLightbox();
  };

  portraitCard.addEventListener("click", () => {
    openPortrait();
  });

  portraitCard.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPortrait();
  });
};

const initArticleLightbox = () => {
  if (!postDetail && !momentsList) return;

  const { lightbox, openLightbox } = ensureLightbox();
  const lightboxImage = lightbox.querySelector(".lightbox-image");
  const lightboxCaption = lightbox.querySelector(".lightbox-caption");

  const openFromImage = (element) => {
    if (!(element instanceof HTMLElement)) return;

    const src = element.getAttribute("data-article-img-src");
    const title = element.getAttribute("data-article-img-title") || "文章图片";
    const description = element.getAttribute("data-article-img-description") || "";

    if (!src) return;

    lightboxImage.src = src;
    lightboxImage.alt = title;
    lightboxCaption.textContent = description ? `${title} · ${description}` : title;
    openLightbox();
  };

  const bindContainer = (container) => {
    if (!(container instanceof HTMLElement)) return;

    container.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const image = target.closest(".article-zoomable");
      openFromImage(image);
    });

    container.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const image = target.closest(".article-zoomable");
      if (!image) return;
      event.preventDefault();
      openFromImage(image);
    });
  };

  bindContainer(postDetail);
  bindContainer(momentsList);
};

renderPosts();
renderMoments();
renderPostDetail();
initPortraitLightbox();
initArticleLightbox();
