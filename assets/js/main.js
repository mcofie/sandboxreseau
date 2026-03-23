// Date + Year Logic
const d = new Date();
const dateEl = document.getElementById('dateline');
const yearEl = document.getElementById('year');

if (dateEl) dateEl.textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
if (yearEl) yearEl.textContent = d.getFullYear();

// Theme + Accent Logic
(function () {
    const THEME_KEY = 'srz_theme_v1';
    const ACCENT_KEY = 'srz_accent_v1';
    const THEMES = ['white', 'black', 'yellow'];
    const ACCENTS = ['blue', 'emerald', 'violet', 'amber', 'red', 'fuchsia'];
    const root = document.documentElement;

    // init from storage
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) root.setAttribute('data-theme', savedTheme);
    const savedAccent = localStorage.getItem(ACCENT_KEY);
    if (savedAccent) root.setAttribute('data-accent', savedAccent);

    // swatches
    document.querySelectorAll('[data-theme-swatch]').forEach(btn => {
        btn.addEventListener('click', () => {
            const v = btn.getAttribute('data-theme-swatch');
            root.setAttribute('data-theme', v);
            try { localStorage.setItem(THEME_KEY, v); } catch { }
            updateThemeToggleTitle();
        });
    });
    document.querySelectorAll('[data-accent-swatch]').forEach(btn => {
        btn.addEventListener('click', () => {
            const v = btn.getAttribute('data-accent-swatch');
            root.setAttribute('data-accent', v);
            try { localStorage.setItem(ACCENT_KEY, v); } catch { }
        });
    });

    // Cycle buttons
    const themeBtn = document.getElementById('themeToggle');
    const accentBtn = document.getElementById('accentToggle');

    function cycleTheme() {
        const cur = root.getAttribute('data-theme') || THEMES[0];
        const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
        root.setAttribute('data-theme', next);
        try { localStorage.setItem(THEME_KEY, next); } catch { }
        updateThemeToggleTitle();
    }

    function cycleAccent() {
        const cur = root.getAttribute('data-accent') || ACCENTS[0];
        const next = ACCENTS[(ACCENTS.indexOf(cur) + 1) % ACCENTS.length];
        root.setAttribute('data-accent', next);
        try { localStorage.setItem(ACCENT_KEY, next); } catch { }
    }

    function updateThemeToggleTitle() {
        if (!themeBtn) return;
        const cur = root.getAttribute('data-theme');
        themeBtn.title = `Switch theme (current: ${cur})`;
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', cycleTheme);
        updateThemeToggleTitle();
    }

    if (accentBtn) {
        accentBtn.addEventListener('click', cycleAccent);
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'j') {
            e.preventDefault();
            cycleTheme();
        }
        if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            cycleAccent();
        }
    });
})();

// Scroll & Sticky Logic
(function () {
    const secondaryNav = document.getElementById('secondaryNav');
    const progressBar = document.getElementById('progressBar');
    const readingState = document.getElementById('readingState');
    const sections = document.querySelectorAll('article[id]');

    if (!secondaryNav) return;

    const navTop = secondaryNav.offsetTop;

    function handleScroll() {
        const scrolled = window.scrollY;

        // Sticky class
        if (scrolled > navTop) {
            secondaryNav.classList.add('is-stuck');
            readingState.style.opacity = '1';
        } else {
            secondaryNav.classList.remove('is-stuck');
            readingState.style.opacity = '0';
        }

        // Progress Bar
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolledPercent = (winScroll / height) * 100;
        if (progressBar) progressBar.style.width = scrolledPercent + "%";

        // Active Section
        let currentSection = "Digest";
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (scrolled >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });

        if (readingState) {
            readingState.textContent = `Section: ${currentSection.replace('-', ' ')}`;
        }
    }

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Init
})();

// Lightbox Logic
(function () {
    let currentLightboxIndex = -1;
    let lightbox;
    let lightboxImg;
    let lastFocusedElement = null;

    function initLightbox() {
        if (document.querySelector('.lightbox-overlay')) return;
        
        lightbox = document.createElement('div');
        lightbox.className = 'lightbox-overlay';
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Image Lightbox');

        lightbox.innerHTML = `
        <button class="lightbox-close" aria-label="Close Lightbox">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <button class="lightbox-nav lightbox-prev" aria-label="Previous Image">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
        </button>
        <div class="lightbox-content">
            <img class="lightbox-img" src="" alt="Expanded View" referrerpolicy="no-referrer" />
        </div>
        <button class="lightbox-nav lightbox-next" aria-label="Next Image">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
        </button>
    `;
        document.body.appendChild(lightbox);
        lightboxImg = lightbox.querySelector('.lightbox-img');

        // Listeners
        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox-next').addEventListener('click', nextImage);
        lightbox.querySelector('.lightbox-prev').addEventListener('click', prevImage);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    window.openLightbox = (input) => {
        if (!lightbox) initLightbox();
        lastFocusedElement = document.activeElement;

        if (typeof input === 'number') {
            currentLightboxIndex = input;
            updateLightbox();
        } else if (typeof input === 'string') {
            currentLightboxIndex = -1;
            lightboxImg.src = input;
            lightbox.querySelector('.lightbox-next').style.display = 'none';
            lightbox.querySelector('.lightbox-prev').style.display = 'none';
        }

        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
        lightbox.querySelector('.lightbox-close').focus();
    };

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
        lightbox.querySelector('.lightbox-next').style.display = '';
        lightbox.querySelector('.lightbox-prev').style.display = '';
        if (lastFocusedElement) lastFocusedElement.focus();
        setTimeout(() => {
            if (lightboxImg) lightboxImg.src = '';
        }, 300);
    }

    function updateLightbox() {
        // Safe check for GALLERY_IMAGES
        const images = window.GALLERY_IMAGES || [];
        if (currentLightboxIndex >= 0 && currentLightboxIndex < images.length) {
            const url = images[currentLightboxIndex];
            lightboxImg.src = url;
            lightbox.querySelector('.lightbox-next').style.display = images.length > 1 ? '' : 'none';
            lightbox.querySelector('.lightbox-prev').style.display = images.length > 1 ? '' : 'none';
        } else {
            // Case for single image or missing gallery
            lightbox.querySelector('.lightbox-next').style.display = 'none';
            lightbox.querySelector('.lightbox-prev').style.display = 'none';
        }
    }

    function nextImage(e) {
        if (e) e.stopPropagation();
        const images = window.GALLERY_IMAGES || [];
        if (images.length === 0 || currentLightboxIndex < 0) return;
        currentLightboxIndex = (currentLightboxIndex + 1) % images.length;
        updateLightbox();
    }

    function prevImage(e) {
        if (e) e.stopPropagation();
        const images = window.GALLERY_IMAGES || [];
        if (images.length === 0 || currentLightboxIndex < 0) return;
        currentLightboxIndex = (currentLightboxIndex - 1 + images.length) % images.length;
        updateLightbox();
    }

    document.addEventListener('keydown', (e) => {
        if (!lightbox || !lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLightbox);
    } else {
        initLightbox();
    }
})();
