(() => {
  'use strict';

  /* -----------------------------------------------------------
     Shared helpers
  ----------------------------------------------------------- */

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  function rafThrottle(fn) {
    let scheduled = false;
    return (...args) => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fn(...args);
      });
    };
  }

  /* =============================================================
     1. RUNTIME STYLE INJECTION
     Keeps this file fully self-contained — drop in script.js and
     every visual it needs (cursor, modal, header transitions)
     ships with it. Nothing here overrides Milestone 1 styles;
     it only adds new, additive rules.
     ============================================================= */
  function injectRuntimeStyles() {
    const style = document.createElement('style');
    style.id = 'rawcuts-runtime-styles';
    style.textContent = `
      /* ---- Custom cursor ---- */
      .cursor-dot,
      .cursor-ring {
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 9999;
        border-radius: 50%;
        will-change: transform;
        transform: translate(-50%, -50%);
      }
      .cursor-dot {
        width: 8px;
        height: 8px;
        background-color: var(--color-accent, #FFD700);
        box-shadow: 0 0 12px 2px var(--color-accent, #FFD700);
        transition: opacity 0.2s ease;
      }
      .cursor-ring {
        width: 40px;
        height: 40px;
        border: 1px solid var(--color-accent, #FFD700);
        transition: width 0.25s ease, height 0.25s ease,
                    border-color 0.25s ease, background-color 0.25s ease,
                    opacity 0.2s ease;
      }
      .cursor-ring--hover {
        width: 64px;
        height: 64px;
        background-color: var(--color-accent, #FFD700);
        mix-blend-mode: difference;
      }
      body.has-custom-cursor,
      body.has-custom-cursor a,
      body.has-custom-cursor .project-card {
        cursor: none;
      }

      /* ---- Header show/hide ---- */
      .site-header {
        transition: transform 0.35s ease, background-color 0.35s ease;
      }
      .site-header--hidden {
        transform: translateY(-120%);
      }
      .site-header--solid .nav {
        background: rgba(10, 10, 10, 0.7);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      /* ---- Active nav link ---- */
      .nav__link.is-active {
        color: var(--color-accent, #FFD700);
      }

      /* ---- Video lightbox modal ---- */
      .video-modal {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5vh 5vw;
        background: rgba(10, 10, 10, 0.92);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      .video-modal.is-open {
        opacity: 1;
        visibility: visible;
      }
      .video-modal__frame {
        position: relative;
        max-width: min(90vw, 960px);
        max-height: 90vh;
        width: 100%;
        transform: scale(0.96);
        transition: transform 0.3s ease;
      }
      .video-modal.is-open .video-modal__frame {
        transform: scale(1);
      }
      .video-modal__video {
        width: 100%;
        max-height: 90vh;
        display: block;
        background: #000;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .video-modal__close {
        position: absolute;
        top: -48px;
        right: 0;
        background: transparent;
        border: 1px solid var(--color-accent, #FFD700);
        color: var(--color-accent, #FFD700);
        font-family: var(--font-mono, monospace);
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.2s ease, color 0.2s ease;
      }
      .video-modal__close:hover {
        background-color: var(--color-accent, #FFD700);
        color: #0A0A0A;
      }

      /* Cards signal they're clickable once JS has wired them up */
      .project-card {
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  /* =============================================================
     2. PREMIUM CUSTOM CURSOR
     Two-layer cursor (a tight glowing dot + a lagging ring) for
     depth. The ring eases toward the pointer every frame; the dot
     tracks it exactly. Disabled entirely on touch devices and for
     reduced-motion users, falling back to the native cursor.
     ============================================================= */
  function initCustomCursor() {
    if (!hasFinePointer || prefersReducedMotion) return;

    document.body.classList.add('has-custom-cursor');

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;

    window.addEventListener(
      'mousemove',
      (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        dot.style.transform = `translate(-50%, -50%) translate(${targetX}px, ${targetY}px)`;
      },
      { passive: true }
    );

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    });

    function tick() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ring.style.transform = `translate(-50%, -50%) translate(${ringX}px, ${ringY}px)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const HOVER_SELECTOR = 'a, .project-card';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(HOVER_SELECTOR)) {
        ring.classList.add('cursor-ring--hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const leavingTarget = e.target.closest(HOVER_SELECTOR);
      if (!leavingTarget) return;
      if (!leavingTarget.contains(e.relatedTarget)) {
        ring.classList.remove('cursor-ring--hover');
      }
    });
  }

  /* =============================================================
     3. SMART VIDEO CARDS + LIGHTBOX MODAL
     - Hover/focus  -> muted autoplay preview
     - Mouse leave   -> pause + reset to frame 0
     - Click/Enter   -> open the same source full-screen in a modal
     All wiring uses event delegation on the shared .showreel
     container instead of looping and attaching N listeners.
     ============================================================= */
  function initVideoCards() {
    const showreel = document.querySelector('.showreel');
    if (!showreel) return;

    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.innerHTML = `
      <div class="video-modal__frame">
        <button class="video-modal__close" type="button" aria-label="Close video">CLOSE ✕</button>
        <video class="video-modal__video" controls playsinline controlsList="nodownload"></video>
      </div>
    `;
    document.body.appendChild(modal);

    const modalVideo = modal.querySelector('.video-modal__video');
    const closeBtn = modal.querySelector('.video-modal__close');
    let lastFocusedCard = null;

    function openModal(card) {
      const sourceEl = card.querySelector('.project-card__media source');
      if (!sourceEl) return;

      const cardVideo = card.querySelector('.project-card__media');
      cardVideo.pause();

      modalVideo.querySelectorAll('source').forEach((s) => s.remove());
      const clonedSource = document.createElement('source');
      clonedSource.src = sourceEl.src;
      clonedSource.type = sourceEl.type;
      modalVideo.appendChild(clonedSource);
      modalVideo.poster = cardVideo.poster;
      modalVideo.load();

      lastFocusedCard = card;
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden'; 
      modalVideo.play().catch(() => {
      });
      closeBtn.focus();
    }

    function closeModal() {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      modalVideo.pause();
      modalVideo.removeAttribute('src');
      modalVideo.querySelectorAll('source').forEach((s) => s.remove());
      modalVideo.load(); 
      if (lastFocusedCard) lastFocusedCard.focus();
    }

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(); 
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    showreel.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.project-card');
      if (!card || card.contains(e.relatedTarget)) return;

      const video = card.querySelector('.project-card__media');
      if (!video) return;
      video.muted = true;
      video.play().catch(() => {
      });
    });

    showreel.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.project-card');
      if (!card || card.contains(e.relatedTarget)) return;

      const video = card.querySelector('.project-card__media');
      if (!video) return;
      video.pause();
      video.currentTime = 0; 
    });

    showreel.addEventListener('click', (e) => {
      const card = e.target.closest('.project-card');
      if (!card) return;
      if (e.target.closest('.project-card__media')) {
        const rect = e.target.getBoundingClientRect();
        const clickedControlsArea = e.clientY > rect.bottom - 40;
        if (clickedControlsArea) return;
      }
      openModal(card);
    });

    showreel.addEventListener('keydown', (e) => {
      const card = e.target.closest('.project-card');
      if (!card) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card);
      }
    });

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            const video = entry.target.querySelector('.project-card__media');
            if (video && !video.paused) video.pause();
          }
        });
      },
      { threshold: 0 }
    );
    showreel
      .querySelectorAll('.project-card')
      .forEach((card) => visibilityObserver.observe(card));
  }

  /* =============================================================
     4. SMOOTH SCROLL + SCROLLSPY ACTIVE NAV
     One delegated click handler for every in-page anchor, plus an
     IntersectionObserver that toggles `.is-active` on the matching
     nav link as each section crosses the viewport center band.
     ============================================================= */
  function initSmoothScrollAndActiveNav() {
    const header = document.querySelector('.site-header');
    const navLinks = Array.from(document.querySelectorAll('.nav__link, .nav__cta'));
    const headerHeight = header ? header.offsetHeight : 0;

    document.body.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const targetId = link.getAttribute('href');

      if (targetId === '#') {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
        return;
      }

      const targetSection = document.querySelector(targetId);
      if (!targetSection) return;

      e.preventDefault();
      const offsetTop =
        targetSection.getBoundingClientRect().top +
        window.pageYOffset -
        headerHeight -
        16; 

      window.scrollTo({
        top: offsetTop,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });

    const sections = Array.from(document.querySelectorAll('main section[id]'));
    if (!sections.length) return;

    function setActiveLink(id) {
      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        const isMatch = href === `#${id}` || (id === 'home' && href === '#');
        link.classList.toggle('is-active', isMatch);
      });
    }

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveLink(entry.target.id);
          }
        });
      },
      {
        rootMargin: `-${headerHeight + 40}px 0px -60% 0px`,
        threshold: 0,
      }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* =============================================================
     5. HIDE-ON-SCROLL-DOWN / REVEAL-ON-SCROLL-UP HEADER
     Tracks scroll direction with a single rAF-throttled listener.
     Scrolling down past a small threshold hides the navbar;
     scrolling up reveals it instantly with a blurred background.
     ============================================================= */
  function initHeaderScrollBehavior() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const HIDE_AFTER_PX = 120; 
    let lastScrollY = window.scrollY;

    const onScroll = rafThrottle(() => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;

      header.classList.toggle('site-header--solid', currentScrollY > 40);

      if (scrollingDown && currentScrollY > HIDE_AFTER_PX) {
        header.classList.add('site-header--hidden');
      } else {
        header.classList.remove('site-header--hidden');
      }

      lastScrollY = currentScrollY;
    });

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* =============================================================
     6. BOOT
     Defer all DOM work until the document is parsed. If this
     script tag uses the `defer` attribute (recommended — see the
     linking notes below), DOMContentLoaded has usually already
     fired by the time this runs, so we guard for both cases.
     ============================================================= */
  function boot() {
    injectRuntimeStyles();
    initCustomCursor();
    initVideoCards();
    initSmoothScrollAndActiveNav();
    initHeaderScrollBehavior();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();