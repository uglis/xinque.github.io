const revealTargets = document.querySelectorAll(".reveal-target");
const currentYear = document.getElementById("year");
const postsList = document.getElementById("posts-list");
const photosList = document.getElementById("photos-list");
const postDetail = document.getElementById("post-detail");
const postsSearch = document.getElementById("posts-search");
const postsTags = document.getElementById("posts-tags");
const postsResultStatus = document.getElementById("posts-result-status");
const postsFilters = document.querySelector(".posts-filters");

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

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

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

const renderPhotos = async () => {
  if (!photosList) return;

  try {
    const response = await fetch("./data/photos.json");
    if (!response.ok) throw new Error("photos fetch failed");
    const photos = await response.json();

    photosList.innerHTML = photos
      .map(
        (photo) => `
          <figure class="photo-card reveal-target visible" tabindex="0" role="button" aria-label="查看大图：${escapeHtml(photo.title)}" data-photo-src="${escapeHtml(photo.src)}" data-photo-title="${escapeHtml(photo.title)}" data-photo-description="${escapeHtml(photo.description)}">
            <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.title)}" loading="lazy" />
            <figcaption class="copy">
              <strong>${escapeHtml(photo.title)}</strong>
              <p>${escapeHtml(photo.description)}</p>
            </figcaption>
          </figure>
        `
      )
      .join("");
  } catch (error) {
    photosList.innerHTML = '<article class="list-item"><p>照片加载失败，请稍后重试。</p></article>';
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

    const content = Array.isArray(post.content)
      ? post.content.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
      : `<p>${escapeHtml(post.summary)}</p>`;

    const cover = post.cover
      ? `<img class="article-cover" src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" loading="lazy" />`
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

const initPhotoLightbox = () => {
  if (!photosList) return;

  const { lightbox, openLightbox } = ensureLightbox();
  const lightboxImage = lightbox.querySelector(".lightbox-image");
  const lightboxCaption = lightbox.querySelector(".lightbox-caption");

  const openFromCard = (card) => {
    if (!card) return;

    const src = card.getAttribute("data-photo-src");
    const title = card.getAttribute("data-photo-title");
    const description = card.getAttribute("data-photo-description");

    if (!src || !title) return;

    lightboxImage.src = src;
    lightboxImage.alt = title;
    lightboxCaption.textContent = description ? `${title} · ${description}` : title;
    openLightbox();
  };

  photosList.addEventListener("click", (event) => {
    const card = event.target.closest(".photo-card");
    openFromCard(card);
  });

  photosList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".photo-card");
    if (!card) return;
    event.preventDefault();
    openFromCard(card);
  });
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

renderPosts();
renderPhotos();
renderPostDetail();
initPhotoLightbox();
initPortraitLightbox();
