const content = window.PIKHUO_CONTENT || {};
document.documentElement.classList.add("js");

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && typeof value === "string") element.textContent = value;
}

function applyEditableContent() {
  if (content.hero?.title) {
    document.querySelectorAll("#hero-title span").forEach((line, index) => {
      if (content.hero.title[index]) line.textContent = content.hero.title[index];
    });
  }

  setText("#hero-description", content.hero?.description);
  setText("#hero-primary", content.hero?.primaryButton);

  const secondary = document.querySelector("#hero-secondary");
  if (secondary && content.hero?.secondaryButton) {
    secondary.firstChild.textContent = `${content.hero.secondaryButton} `;
  }

  document.querySelectorAll(".process-step").forEach((step, index) => {
    const data = content.process?.[index];
    if (!data) return;
    const indexLabel = step.querySelector(".process-step__index");
    const number = indexLabel?.querySelector("span")?.outerHTML || "";
    if (indexLabel) indexLabel.innerHTML = `${number} ${data.stage}`;
    setElementText(step.querySelector("h3"), data.title);
    setElementText(step.querySelector(".process-step__lead"), data.lead);
    setElementText(step.querySelector(".process-step__lead + p"), data.description);
    step.querySelectorAll(".process-tags li").forEach((tag, tagIndex) => {
      if (data.tags?.[tagIndex]) tag.textContent = data.tags[tagIndex];
    });
  });

  document.querySelectorAll(".service-item").forEach((item, index) => {
    const data = content.services?.[index];
    if (!data) return;
    setElementText(item.querySelector("h3"), data.title);
    setElementText(item.querySelector("p"), data.description);
  });

  document.querySelectorAll(".audience-item").forEach((item, index) => {
    const data = content.audiences?.[index];
    if (!data) return;
    setElementText(item.querySelector("h3"), data.title);
    setElementText(item.querySelector("p"), data.description);
  });

  document.querySelectorAll(".collaboration-item").forEach((item, index) => {
    const data = content.collaboration?.[index];
    if (!data) return;
    setElementText(item.querySelector("h3"), data.title);
    setElementText(item.querySelector("p"), data.description);
  });

  if (content.contact) {
    setElementText(document.querySelector("#contact-title"), content.contact.title);
    setElementText(document.querySelector(".contact__intro > p:not(.section-kicker)"), content.contact.description);
    const message = document.querySelector("#message");
    if (message && content.contact.messagePlaceholder) message.placeholder = content.contact.messagePlaceholder;
    setElementText(document.querySelector(".form-submit button"), content.contact.submitButton);
  }

  if (content.brand) {
    setText(".brand__zh", content.brand.chineseName);
    setText(".brand__en", content.brand.englishName);
    setText(".site-footer strong", content.brand.fullName);

    const emailLink = document.querySelector('.contact__direct a[href^="mailto:"]');
    if (emailLink && content.brand.email) {
      emailLink.href = `mailto:${content.brand.email}`;
      emailLink.textContent = content.brand.email;
    }

    const lineLink = document.querySelector('.contact__direct a[target="_blank"]');
    if (lineLink && content.brand.lineUrl) {
      lineLink.href = content.brand.lineUrl;
      lineLink.textContent = `LINE  ${content.brand.lineId}`;
    }
  }
}

function setElementText(element, value) {
  if (element && typeof value === "string") element.textContent = value;
}

function initHeader() {
  const header = document.querySelector("#site-header");
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav?.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggle?.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      document.body.classList.remove("menu-open");
    });
  });
}

function initReveal() {
  const elements = [...document.querySelectorAll(".reveal")];
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -10%", threshold: 0.08 });

  elements.forEach((element) => observer.observe(element));
}

function interpolateAnchors(value, anchors) {
  if (value <= anchors[0]) return 1;
  for (let index = 0; index < anchors.length - 1; index += 1) {
    if (value <= anchors[index + 1]) {
      const local = (value - anchors[index]) / Math.max(1, anchors[index + 1] - anchors[index]);
      return 1 + index + Math.min(1, Math.max(0, local));
    }
  }
  return 4;
}

async function initParticles() {
  const canvas = document.querySelector("#particle-canvas");
  if (!canvas) return;

  let experience;
  try {
    const module = await import("./particles.js");
    experience = new module.ParticleExperience(canvas);
  } catch (error) {
    console.warn("Particle module failed to load:", error);
    document.body.classList.add("no-webgl");
    return;
  }

  const hero = document.querySelector(".hero");
  const steps = [...document.querySelectorAll(".process-step")];
  const services = document.querySelector("#services");
  let ticking = false;

  const update = () => {
    const viewportHeight = window.innerHeight;
    const scenePosition = window.scrollY + viewportHeight * 0.56;
    const anchors = [
      hero.offsetTop + hero.offsetHeight * 0.46,
      ...steps.map((step) => step.offsetTop + step.offsetHeight * 0.52)
    ];

    experience.setProgress(interpolateAnchors(scenePosition, anchors));

    const fadeStart = services.offsetTop - viewportHeight * 0.8;
    const fadeEnd = services.offsetTop + viewportHeight * 0.18;
    const fade = (window.scrollY - fadeStart) / Math.max(1, fadeEnd - fadeStart);
    experience.setSceneOpacity(1 - Math.min(0.86, Math.max(0, fade) * 0.86));
    ticking = false;
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
}

function validateForm(form) {
  const rules = {
    name: "請填寫姓名。",
    company: "請填寫公司名稱。",
    email: "請填寫有效的電子郵件。",
    message: "請簡單說明你的需求。"
  };
  let valid = true;

  Object.entries(rules).forEach(([name, message]) => {
    const field = form.elements[name];
    const wrapper = field.closest(".form-field");
    const error = form.querySelector(`[data-error-for="${name}"]`);
    const isEmailInvalid = name === "email" && !/^\S+@\S+\.\S+$/.test(field.value.trim());
    const isInvalid = !field.value.trim() || isEmailInvalid;

    wrapper.classList.toggle("is-invalid", isInvalid);
    if (error) error.textContent = isInvalid ? message : "";
    if (isInvalid) valid = false;
  });

  return valid;
}

function initContactForm() {
  const form = document.querySelector("#contact-form");
  const status = document.querySelector("#form-status");
  const startedAt = document.querySelector("#started-at");
  if (!form || !status || !startedAt) return;

  startedAt.value = String(Date.now());

  form.addEventListener("input", (event) => {
    const field = event.target;
    if (!field.name) return;
    field.closest(".form-field")?.classList.remove("is-invalid");
    const error = form.querySelector(`[data-error-for="${field.name}"]`);
    if (error) error.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "form-status";
    status.textContent = "";

    if (!validateForm(form)) return;

    if (form.elements.website.value) return;

    const elapsed = Date.now() - Number(startedAt.value || Date.now());
    if (elapsed < 1800) {
      status.classList.add("is-error");
      status.textContent = "請確認資料後再送出。";
      return;
    }

    const endpoint = content.formEndpoint?.trim();
    if (!endpoint) {
      status.classList.add("is-error");
      status.textContent = `表單尚未完成串接，請改寄 ${content.brand?.email || "jackie@pikhuo.com"}。`;
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "傳送中…";

    const payload = {
      name: form.elements.name.value.trim(),
      company: form.elements.company.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim(),
      website: form.elements.website.value,
      startedAt: startedAt.value,
      source: window.location.href,
      submittedAt: new Date().toISOString()
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || "Submission failed");

      status.classList.add("is-success");
      status.textContent = "已收到你的合作需求，我們會透過電子郵件與你聯絡。";
      form.reset();
      startedAt.value = String(Date.now());
    } catch (error) {
      console.warn("Contact form submission failed:", error);
      status.classList.add("is-error");
      status.textContent = `目前無法送出，請稍後再試，或寄信至 ${content.brand?.email || "jackie@pikhuo.com"}。`;
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
}

applyEditableContent();
initHeader();
initReveal();
initContactForm();
initParticles();
document.querySelector("#current-year").textContent = String(new Date().getFullYear());
