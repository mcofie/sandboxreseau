/**
 * Sandbox Réseau - Content Manager
 * Helper functions to render dynamic content from db.js
 **/

const ContentManager = {
    /**
     * Renders company cards into a container
     * @param {string} containerId 
     * @param {Array} companies 
     */
    renderCompanies: function(containerId, companies) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = companies.map(company => `
            <div class="company-card group flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded border border-[var(--rule)] bg-[var(--paper)] p-5">
                <div class="w-16 h-16 rounded border border-[var(--rule)] bg-white p-2 flex items-center justify-center overflow-hidden shrink-0 ${company.logoAltTheme === 'black' ? 'bg-black text-white' : ''}">
                    ${(company.logo.startsWith('http') || company.logo.startsWith('/') || company.logo.startsWith('assets/') || company.logo.includes('.')) 
                        ? `<img src="${company.logo}" alt="${company.name} Logo" class="w-full h-full object-contain">`
                        : `<span class="font-serif text-2xl font-bold">${company.logo}</span>`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                        <h3 class="font-serif text-xl font-bold leading-tight group-hover:accent-text transition-colors">${company.name}</h3>
                        <span class="px-2 py-0.5 rounded border border-[var(--rule)]/20 text-[9px] font-bold uppercase tracking-widest bg-[color:color-mix(in_oklab,var(--paper)_95%,var(--ink)_5%)]">${company.industry}</span>
                        <span class="px-2 py-0.5 rounded border border-[var(--rule)]/20 text-[9px] font-bold uppercase tracking-widest bg-[color:color-mix(in_oklab,var(--paper)_95%,var(--ink)_5%)]">${company.status}</span>
                    </div>
                    <p class="text-sm text-[var(--muted)] leading-relaxed mb-2">
                        ${company.description}
                    </p>
                    <div class="flex flex-wrap gap-2">
                        <span class="text-[10px] font-semibold text-[color:color-mix(in_oklab,var(--ink)_60%,var(--paper)_40%)]">${company.tags.join(' • ')}</span>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2 shrink-0 self-stretch justify-between sm:border-l border-[var(--rule)]/10 sm:pl-6 pt-4 sm:pt-0">
                    <span class="text-[11px] font-serif  text-[var(--muted)]">${company.location || company.founded}</span>
                    <a href="${company.url}" target="_blank" class="text-[11px] font-bold uppercase tracking-widest hover:underline accent-text">${company.cta} →</a>
                </div>
            </div>
        `).join('');
    },

    /**
     * Renders edition cards into a container
     * @param {string} containerId 
     * @param {Array} editions 
     */
    renderEditions: function(containerId, editions) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = editions.map((edition, i) => `
            <div class="animate-enter">
                <article class="h-full flex flex-col group relative overflow-hidden rounded border border-[var(--rule)] bg-[color:color-mix(in_oklab,var(--paper)_92%,var(--ink)_8%)] p-2 hatch ${edition.image ? 'cursor-zoom-in' : ''}" 
                    ${edition.image ? `onclick="openLightbox(${i})"` : ''}>
                    
                    ${edition.image ? `
                        <div class="relative overflow-hidden aspect-[4/3] border border-[var(--rule)] shrink-0">
                            <img src="${edition.image}" alt="${edition.title}" class="w-full h-full object-cover transition duration-700 group-hover:scale-110">
                        </div>
                    ` : `
                        <div class="relative overflow-hidden aspect-[4/3] border border-[var(--rule)] bg-[var(--accent)]/10 flex items-center justify-center p-8 text-center shrink-0">
                            <div class="space-y-2">
                                <div class="font-serif  text-2xl accent-text">${edition.status}</div>
                                <div class="text-[10px] uppercase tracking-[0.2em] opacity-40">${edition.date}</div>
                            </div>
                        </div>
                    `}

                    <div class="mt-4 px-2 pb-2 flex-grow flex flex-col">
                        <div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">
                            <span>Vol. ${edition.vol}, No. ${edition.no}</span>
                            <span class="${edition.status === 'In Preparation' ? 'accent-text' : ''}">${edition.date}</span>
                        </div>
                        <h2 class="font-serif text-xl border-b border-[var(--rule)] pb-1 mb-2">${edition.title}</h2>
                        <p class="text-sm text-neutral-600 leading-relaxed ">${edition.description}</p>
                        
                        ${edition.lumaUrl ? `
                            <div class="mt-auto pt-4">
                                <a href="${edition.lumaUrl}" target="_blank" class="inline-block w-full text-center border border-[var(--rule)] py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors">Register on Luma</a>
                            </div>
                        ` : ''}
                    </div>
                </article>
            </div>
        `).join('');

        // Re-run intersection observer for animations if defined
        if (typeof observer !== 'undefined') {
            document.querySelectorAll('.animate-enter').forEach(el => observer.observe(el));
        }
    },

    /**
     * Renders gallery images into a container
     * @param {string} containerId 
     * @param {Array} images 
     */
    renderGallery: function(containerId, images) {
        const grid = document.getElementById(containerId);
        if (!grid) return;

        grid.innerHTML = ''; // Clear existing

        images.forEach((img, index) => {
            const base = img.url.split('=')[0];
            const srcSet = `${base}=w400 400w, ${base}=w800 800w, ${base}=w1600 1600w`;
            const sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

            const item = document.createElement('div');
            item.className = 'masonry-item group relative overflow-hidden rounded border border-[var(--rule)] bg-[color:color-mix(in_oklab,var(--paper)_90%,var(--ink)_10%)] animate-enter';

            item.innerHTML = `
                <img src="${base}=w1600"
                     srcset="${srcSet}"
                     sizes="${sizes}"
                     alt="${img.title || `Gallery Image ${index + 1}`}"
                     class="w-full h-auto transition duration-700 group-hover:scale-105 cursor-zoom-in"
                     loading="lazy"
                     referrerpolicy="no-referrer"
                     onclick="openLightbox(${index})"
                     onerror="this.parentElement.innerHTML='<div class=\\'p-4 text-center text-xs text-[var(--muted)]\\'>Image not found</div>'"/>
            `;

            grid.appendChild(item);
            if (typeof observer !== 'undefined') observer.observe(item);
        });
    },

    /**
     * Renders newsletter archive into a container
     * @param {string} containerId 
     * @param {Array} newsletters 
     */
    renderNewsletters: function(containerId, newsletters) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = newsletters.map(newsletter => `
            <article class="newsletter-item group border-b border-[var(--rule)] pb-8 mb-8 last:border-0 last:mb-0">
                <div class="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                    <div class="md:w-32 shrink-0">
                        <div class="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">Issue ${newsletter.issue}</div>
                        <div class="text-[13px] font-serif  text-neutral-500">${newsletter.date}</div>
                    </div>
                    <div class="flex-1">
                        <h2 class="font-serif text-2xl mb-2 group-hover:accent-text transition-colors">
                            <a href="${newsletter.url}" aria-label="Read Issue ${newsletter.issue}: ${newsletter.title}">${newsletter.title}</a>
                        </h2>
                        <p class="text-[17px] text-neutral-600 leading-relaxed mb-4 font-serif ">
                            "${newsletter.excerpt}"
                        </p>
                        <div class="flex flex-wrap items-center gap-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                            <span class="flex items-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                ${newsletter.author}
                            </span>
                            <span class="flex items-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                ${newsletter.readTime} read
                            </span>
                            <div class="flex items-center gap-2 ml-auto">
                                ${newsletter.tags.map(tag => `<span class="px-2 py-0.5 rounded-full border border-[var(--rule)] text-[9px]">${tag}</span>`).join('')}
                            </div>
                            <a href="${newsletter.url}" class="underline accent-text font-bold uppercase tracking-widest text-[10px]" aria-label="Full text for Issue ${newsletter.issue}">
                                Read Full Dispatch →
                            </a>
                        </div>
                    </div>
                </div>
            </article>
        `).join('');
    },

    /**
     * Renders a single newsletter detail
     * @param {string} containerId 
     * @param {Object} newsletter 
     */
    renderNewsletterDetail: function(containerId, newsletter) {
        const container = document.getElementById(containerId);
        if (!container || !newsletter) {
            if (container) container.innerHTML = '<div class="text-center py-20 font-serif  text-neutral-500">Edition not found. <a href="newsletters" class="underline">Back to Archive</a></div>';
            return;
        }

        // Update document title
        document.title = `${newsletter.title} | Newsletter — Sandbox Réseau`;

        container.innerHTML = `
            <div class="mb-12">
                <div class="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] mb-4">
                    <a href="newsletters" class="hover:accent-text">Archive</a>
                    <span class="opacity-30">/</span>
                    <span>Issue ${newsletter.issue}</span>
                </div>
                <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6 text-[var(--ink)]">${newsletter.title}</h1>
                <div class="flex flex-wrap items-center gap-6 py-6 border-y border-[var(--rule)]/10 text-[13px] text-[var(--muted)]">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-[var(--ink)] uppercase tracking-widest text-[10px]">Author:</span>
                        <span class="font-serif  text-neutral-600">${newsletter.author}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-[var(--ink)] uppercase tracking-widest text-[10px]">Date:</span>
                        <span class="font-serif  text-neutral-600">${newsletter.date}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-[var(--ink)] uppercase tracking-widest text-[10px]">Read:</span>
                        <span class="font-serif  text-neutral-600">${newsletter.readTime}</span>
                    </div>
                    <div class="flex items-center gap-2 ml-auto">
                        ${newsletter.tags.map(tag => `<span class="px-2 py-0.5 rounded-full border border-[var(--rule)] text-[9px] uppercase font-bold">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>

            <article class="prose-news max-w-none">
                <div class="newsletter-content-body font-serif text-[18px] sm:text-[20px] leading-relaxed text-neutral-800 space-y-6">
                    ${newsletter.content}
                </div>
            </article>

            <div class="mt-20 pt-12 border-t border-[var(--rule)]">
                <div class="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full border border-[var(--rule)] bg-white p-1">
                            <img src="assets/img/favicon.png" alt="Sandbox Logo" class="w-full h-full object-contain grayscale">
                        </div>
                        <div>
                            <div class="font-bold text-[13px] uppercase tracking-wider text-[var(--ink)]">Sandbox Réseau</div>
                            <div class="text-[11px] text-[var(--muted)] font-serif  mb-2">Accra, Ghana</div>
                        </div>
                    </div>
                    <div class="flex gap-4">
                        <a href="newsletters" class="text-xs font-bold uppercase tracking-wider border border-[var(--ink)] px-6 py-3 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-all">
                        ← Back to Archive
                        </a>
                        <a href="https://luma.com/sandbox-reseau" target="_blank" class="text-xs font-bold uppercase tracking-wider bg-[var(--ink)] text-[var(--paper)] px-6 py-3 hover:opacity-90 transition-all">
                        Subscribe
                        </a>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renders podcast episodes from an RSS feed
     * @param {string} containerId 
     * @param {string} rssUrl 
     */
    renderPodcastFromRSS: async function(containerId, rssUrl) {
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            // Use a CORS proxy if needed, or assume the user has configured CORS
            // For general stability, we fetch and parse
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
            const data = await response.json();

            if (data.status !== 'ok') throw new Error('RSS fetch failed');

            const episodes = data.items.map(item => ({
                id: item.guid,
                title: item.title,
                description: item.description.replace(/<[^>]*>?/gm, '').substring(0, 180) + '...',
                date: new Date(item.pubDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
                duration: item.itunes_duration || '5:00',
                thumbnail: item.thumbnail || 'assets/img/podcast-logo.png',
                audioUrl: item.enclosure ? item.enclosure.link : null, // The direct MP3 link
                spotifyUrl: item.link, 
                appleUrl: 'https://podcasts.apple.com/gh/podcast/the-reverb/id1884282478'
            }));

            this.renderPodcast(containerId, episodes);
            
            // Re-apply animations
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, i) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('visible');
                        }, i * 100);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            container.querySelectorAll('.animate-enter').forEach(el => observer.observe(el));

        } catch (err) {
            console.error('RSS Error:', err);
            container.innerHTML = `<p class="text-center text-neutral-500">Failed to load live feed. <a href="https://podcasts.apple.com/gh/podcast/the-reverb/id1884282478" class="underline">Listen on Apple Podcasts</a></p>`;
        }
    },

    /**
     * Renders podcast episodes
     * @param {string} containerId 
     * @param {Array} episodes 
     */
    renderPodcast: function(containerId, episodes) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Create or get global audio player
        if (!window._audioPlayer) {
            window._audioPlayer = new Audio();
            window._activeEpisodeId = null;
            this.initGlobalPlayer();
        }

        container.innerHTML = episodes.map(ep => `
            <div class="group relative flex flex-col sm:flex-row gap-6 p-6 rounded border border-[var(--rule)] bg-white hover:border-[var(--ink)] transition-all animate-enter" 
                 data-episode-id="${ep.id}" 
                 data-title="${ep.title.replace(/"/g, '&quot;')}" 
                 data-meta="${ep.date} • ${ep.duration}" 
                 data-thumb="${ep.thumbnail}"
                 data-audio-url="${ep.audioUrl}">
                
                <div class="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-neutral-100 rounded border border-[var(--rule)] overflow-hidden relative group/art cursor-pointer" onclick="openLightbox('${ep.thumbnail}')">
                    <img src="${ep.thumbnail}" alt="${ep.title}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500">
                    
                    ${ep.audioUrl ? `
                    <button onclick="event.stopPropagation(); ContentManager.togglePlay('${ep.id}', '${ep.audioUrl}')" 
                            class="absolute inset-0 flex items-center justify-center bg-[var(--ink)]/40 opacity-0 group-hover/art:opacity-100 transition-opacity text-[var(--paper)]">
                        <div class="play-icon w-12 h-12 flex items-center justify-center rounded-full border-2 border-[var(--paper)]">
                            <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </button>
                    ` : ''}
                </div>
                
                <div class="flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest text-[var(--muted)] mb-2">
                             <span>${ep.date}</span>
                             <span class="w-1 h-1 rounded-full bg-[var(--rule)]"></span>
                             <span>${ep.duration}</span>
                        </div>
                        <h3 class="font-serif text-xl sm:text-2xl mb-2 text-[var(--ink)]">${ep.title}</h3>
                        <p class="text-[14px] text-neutral-600 leading-relaxed mb-4">${ep.description}</p>
                    </div>
                    
                    <div class="flex flex-wrap items-center justify-between gap-4 mt-auto">
                        <div class="flex flex-wrap gap-2">
                            <a href="${ep.spotifyUrl}" target="_blank" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--rule)] text-[10px] font-bold uppercase tracking-widest hover:bg-[#1DB954] hover:text-white hover:border-[#1DB954] transition-all">
                                Spotify
                            </a>
                            <a href="${ep.appleUrl}" target="_blank" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--rule)] text-[10px] font-bold uppercase tracking-widest hover:bg-[#8e3ee5] hover:text-white hover:border-[#8e3ee5] transition-all">
                                Apple
                            </a>
                        </div>
                        
                        ${ep.audioUrl ? `
                        <div class="audio-wave hidden">
                            <div></div><div></div><div></div><div></div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    },

    initGlobalPlayer: function() {
        const player = window._audioPlayer;
        const bar = document.getElementById('global-player');
        const progress = document.getElementById('playerProgressBar');
        const progressContainer = document.getElementById('playerProgressContainer');
        const mainToggle = document.getElementById('playerMainToggle');
        const currentTimeEl = document.getElementById('playerCurrentTime');
        const durationEl = document.getElementById('playerDuration');
        const speedToggle = document.getElementById('speedToggle');
        const speedDropdown = document.getElementById('speedDropdown');

        if (!bar) return;

        // Progress Updates
        player.ontimeupdate = () => {
            const pct = (player.currentTime / player.duration) * 100;
            progress.style.width = pct + '%';
            currentTimeEl.textContent = this.formatTime(player.currentTime);
        };

        player.onloadedmetadata = () => {
            durationEl.textContent = this.formatTime(player.duration);
        };

        // Main Toggle Logic
        mainToggle.addEventListener('click', () => {
            if (window._activeEpisodeId) {
                const card = document.querySelector(`[data-episode-id="${window._activeEpisodeId}"]`);
                const audioUrl = card.dataset.audioUrl;
                this.togglePlay(window._activeEpisodeId, audioUrl);
            }
        });

        // Seek on Progress Click
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            player.currentTime = pos * player.duration;
        });

        // Speed Toggle
        speedToggle.addEventListener('click', () => speedDropdown.classList.toggle('active'));
        document.addEventListener('click', (e) => {
            if (!speedToggle.contains(e.target)) speedDropdown.classList.remove('active');
        });

        // Global key controls (Space to Play/Pause)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && window._activeEpisodeId && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                mainToggle.click();
            }
        });
    },

    togglePlay: function(episodeId, audioUrl) {
        const player = window._audioPlayer;
        const bar = document.getElementById('global-player');
        
        if (window._activeEpisodeId === episodeId) {
            if (player.paused) {
                player.play();
            } else {
                player.pause();
            }
        } else {
            // New Episode
            player.src = audioUrl;
            player.play();
            window._activeEpisodeId = episodeId;
            
            // Update Global Bar Info
            const card = document.querySelector(`[data-episode-id="${episodeId}"]`);
            document.getElementById('playerTitle').textContent = card.dataset.title;
            document.getElementById('playerMeta').textContent = card.dataset.meta;
            document.getElementById('playerThumbnail').src = card.dataset.thumb;
            bar.classList.add('active');
        }

        // Global Listeners for UI Sync
        player.onplay = () => this.syncUI(true);
        player.onpause = () => this.syncUI(false);
        player.onended = () => {
            this.syncUI(false);
            window._activeEpisodeId = null;
            bar.classList.remove('active');
        };
    },

    syncUI: function(isPlaying) {
        const episodeId = window._activeEpisodeId;
        const mainToggle = document.getElementById('playerMainToggle');
        const cards = document.querySelectorAll('[data-episode-id]');
        
        // Update Card UI
        cards.forEach(card => {
            const isActive = card.dataset.episodeId === episodeId;
            const playBtn = card.querySelector('.play-icon svg');
            const wave = card.querySelector('.audio-wave');
            
            if (isActive && isPlaying) {
                playBtn.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
                wave?.classList.remove('hidden');
                card.classList.add('border-[var(--ink)]');
            } else {
                playBtn.innerHTML = '<path d="M8 5v14l11-7z"/>';
                wave?.classList.add('hidden');
                if (!isActive || !isPlaying) card.classList.remove('border-[var(--ink)]');
            }
        });

        // Update Main Toggle UI
        mainToggle.innerHTML = isPlaying 
            ? '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
            : '<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    },

    seek: function(seconds) {
        window._audioPlayer.currentTime += seconds;
    },

    setPlaybackSpeed: function(speed) {
        window._audioPlayer.playbackRate = speed;
        document.getElementById('speedToggle').textContent = speed === 1 ? '1x Speed' : speed + 'x Speed';
        
        // UI Active State
        document.querySelectorAll('.speed-option').forEach(opt => {
            opt.classList.toggle('active', parseFloat(opt.textContent) === speed);
        });
    },

    formatTime: function(seconds) {
        if (isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    },

    /**
     * Generates and injects JSON-LD structured data for SEO
     * @param {string} type - 'podcast', 'newsletter', 'event', 'organization'
     * @param {Object} data 
     */
    injectStructuredData: function(type, data) {
        let schema = {};
        const siteUrl = 'https://sandboxreseau.com';

        if (type === 'podcast') {
            schema = {
                "@context": "https://schema.org",
                "@type": "PodcastSeries",
                "name": "The Reverb",
                "description": "The high-bandwidth audio-log for the African builder.",
                "url": `${siteUrl}/podcast`,
                "author": { "@type": "Person", "name": "Maxwell Cofie" },
                "publisher": { "@type": "Organization", "name": "Sandbox Réseau" }
            };
        } else if (type === 'newsletter' && data) {
            schema = {
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": data.title,
                "description": data.excerpt,
                "author": { "@type": "Person", "name": data.author },
                "datePublished": data.date,
                "url": `${siteUrl}/newsletter?id=${data.id}`
            };
        }

        const script = document.createElement('script');
        script.type = "application/ld+json";
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
    }
};
