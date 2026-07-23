/* Apple Music preview search — self-contained plugin registered via GraphToolPlugin.
 * No feature flags required in the core graphtool.js entry point.
 * Reads music playback state through GraphToolPlugin.isMusicFileLoaded() /
 * incrementMusicRestoreCancelToken() so it never touches graphtool.js's closure directly. */
(function () {
    if (typeof extraMusicAllowsAppleFeatures !== "undefined" && !extraMusicAllowsAppleFeatures) return;
    if (typeof GraphToolPlugin === "undefined") return;

    // Plugin-owned mutable state (moved out of graphtool.js closure)
    let musicAppleSearchModeOpen = false;
    let appleMusicSearchDebounceTimer = null;
    /* Exposed so live-sound.js can gate Extra-tab keyboard shortcuts: shortcuts are suppressed
       only while the Apple-Music search box is open, not whenever the Extra tab is selected. */
    GraphToolPlugin.isAppleMusicSearchModeOpen = () => musicAppleSearchModeOpen;

    // ── iTunes network utilities (moved from graphtool.js) ──────────────────────
    let itunesStorefrontForSearch = () => {
        let s = typeof appleMusicStorefront !== "undefined" ? String(appleMusicStorefront || "").trim() : "";
        return (s || "us").toLowerCase();
    };
    /** Add nonce + no-store to avoid cross-origin cache poisoning between hosts. */
    let itunesUrlNoCache = (url) => {
        let u = new URL(url);
        u.searchParams.set("_", Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
        return u.href;
    };
    let itunesLookupPreviewByTrackId = (songId) => {
        let id = String(songId || "").trim();
        if (!id) return Promise.reject(new Error("empty song id"));
        let lookupUrl = itunesUrlNoCache(
            "https://itunes.apple.com/lookup?id=" + encodeURIComponent(id) + "&entity=song");
        return fetch(lookupUrl, { credentials: "omit", cache: "no-store" }).then((r) => {
            if (!r.ok) throw new Error("iTunes lookup HTTP " + r.status);
            return r.json();
        }).then((json) => {
            let r0 = json && json.results && json.results[0];
            let pv = r0 && r0.previewUrl;
            if (!pv) throw new Error("no preview from iTunes lookup");
            return { previewUrl: pv, title: r0.trackName || "", artist: r0.artistName || "" };
        });
    };
    let parseItunesSearchSongsPayload = (json) => {
        let out = [];
        let results = json && json.results;
        if (!Array.isArray(results)) return out;
        for (let i = 0; i < results.length; i++) {
            let r = results[i];
            let pv = r && r.previewUrl;
            if (!pv) continue;
            let songId = r.trackId != null ? String(r.trackId) : "";
            out.push({ id: songId, title: r.trackName || "", artist: r.artistName || "", previewUrl: pv });
        }
        return out;
    };
    let itunesSearchSongs = (term) => {
        let q = String(term || "").trim();
        if (!q) return Promise.resolve([]);
        let country = itunesStorefrontForSearch();
        let searchUrl = "https://itunes.apple.com/search?term=" + encodeURIComponent(q)
            + "&entity=song&limit=12&country=" + encodeURIComponent(country);
        return fetch(itunesUrlNoCache(searchUrl), { credentials: "omit", cache: "no-store" }).then((r) => {
            if (!r.ok) throw new Error("iTunes search HTTP " + r.status);
            return r.json();
        }).then(parseItunesSearchSongsPayload);
    };

    // ── UI initialisation ────────────────────────────────────────────────────────
    let _initialized = false;

    function initAppleMusicPlugin() {
        // Plugin queries its own DOM — no variables borrowed from graphtool.js
        let musicCard             = document.querySelector("div.extra-music");
        let appleMusicInlineWrap  = musicCard && musicCard.querySelector(".apple-music-search-inline");
        let appleMusicSearchInput = musicCard && musicCard.querySelector("#apple-music-preview-search");
        let appleMusicResultsUl   = appleMusicInlineWrap && appleMusicInlineWrap.querySelector("ul.apple-music-preview-results");
        let musicSearchAppleButton= document.querySelector("div.extra-music button.music-search-apple");
        let musicFileActionsRow   = document.querySelector("div.extra-music .music-file-actions-row");
        let musicPlayButton       = document.querySelector("div.extra-music .play");
        let musicPlaybackPanel    = document.querySelector("div.extra-music .music-playback-panel");
        window.musicPlaybackPanel = musicPlaybackPanel;

        if (!appleMusicInlineWrap || !musicSearchAppleButton || !appleMusicSearchInput
                || !appleMusicResultsUl || !musicFileActionsRow) {
            return;
        }
        if (_initialized) return;
        _initialized = true;

        const APPLE_MUSIC_RECENT_LS = "cringraph_apple_music_recent_v1";
        const APPLE_MUSIC_RECENT_MAX = 10;
        let readAppleMusicRecentStored = () => {
            try {
                let raw = localStorage.getItem(APPLE_MUSIC_RECENT_LS);
                if (!raw) return [];
                let arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr : [];
            } catch (e) {
                return [];
            }
        };
        let persistAppleMusicRecentPlayed = (row) => {
            if (!row || typeof row !== "object") return;
            let id = String(row.id || "").trim();
            let previewUrl = String(row.previewUrl || "").trim();
            if (!id && !previewUrl) return;
            try {
                let entry = {
                    id,
                    title: String(row.title || "").trim(),
                    artist: String(row.artist || "").trim(),
                    previewUrl
                };
                let arr = readAppleMusicRecentStored().filter((x) => {
                    if (!x || typeof x !== "object") return false;
                    if (entry.id && String(x.id || "") === entry.id) return false;
                    if (!entry.id && String(x.previewUrl || "") === previewUrl) return false;
                    return true;
                });
                arr.unshift(entry);
                localStorage.setItem(APPLE_MUSIC_RECENT_LS, JSON.stringify(arr.slice(0, APPLE_MUSIC_RECENT_MAX)));
            } catch (err) {
                /* quota / private mode */
            }
        };
        let appleMusicNormalizeStoredRow = (x) => {
            if (!x || typeof x !== "object") return null;
            let id = String(x.id || "").trim();
            let previewUrl = String(x.previewUrl || "").trim();
            if (!id && !previewUrl) return null;
            return {
                id,
                title: String(x.title || "").trim(),
                artist: String(x.artist || "").trim(),
                previewUrl
            };
        };
        let appleMusicSearchIgnoreFocusOutUntil = 0;
        let appleMusicSearchHighlightIx = -1;
        let appleMusicSearchLastRows = [];
        let appleMusicApplySearchHighlight = () => {
            if (!appleMusicResultsUl) return;
            let btns = appleMusicResultsUl.querySelectorAll("li > button[role=\"option\"]");
            btns.forEach((bt, i) => {
                let on = i === appleMusicSearchHighlightIx;
                bt.classList.toggle("apple-music-preview-highlight", on);
                bt.setAttribute("aria-selected", on ? "true" : "false");
            });
            if (appleMusicSearchHighlightIx >= 0 && btns[appleMusicSearchHighlightIx]) {
                try {
                    btns[appleMusicSearchHighlightIx].scrollIntoView({ block: "nearest" });
                } catch (err) { /* noop */ }
            }
        };
        let appleMusicPointerHighlightRow = (ix) => {
            if (!musicAppleSearchModeOpen || !appleMusicResultsUl || appleMusicResultsUl.hidden) return;
            let n = appleMusicSearchLastRows.length;
            if (ix < 0 || ix >= n) return;
            appleMusicSearchHighlightIx = ix;
            appleMusicApplySearchHighlight();
        };
        let appleMusicActivatePreviewRow = (row, refreshPreviewFromCatalog) => {
            appleMusicResultsUl.hidden = true;
            if (!window.AudioContext && !window.webkitAudioContext) {
                alert("Web audio API is disabled; music playback is unavailable.");
                return;
            }
            let norm = {
                id: String(row.id || "").trim(),
                title: row.title || "",
                artist: row.artist || "",
                previewUrl: String(row.previewUrl || "").trim()
            };
            let startPlay = (url) => {
                GraphToolPlugin.incrementMusicRestoreCancelToken();
                if (!initMusicAudioGraph()) return;
                persistAppleMusicRecentPlayed({ ...norm, previewUrl: url });
                wireMusicLoadedFromSource(url, null, {
                    autoPlay: true,
                    appleCatalogSongId: norm.id || ""
                });
            };
            if (refreshPreviewFromCatalog === true && norm.id) {
                itunesLookupPreviewByTrackId(norm.id).then((meta) => {
                    norm = {
                        ...norm,
                        previewUrl: meta.previewUrl,
                        title: meta.title || norm.title,
                        artist: meta.artist || norm.artist
                    };
                    startPlay(meta.previewUrl);
                }).catch(() => {
                    if (norm.previewUrl) {
                        startPlay(norm.previewUrl);
                    } else {
                        alert("Could not load Apple Music preview.");
                    }
                });
                return;
            }
            if (norm.previewUrl) { startPlay(norm.previewUrl); return; }
            if (norm.id) {
                itunesLookupPreviewByTrackId(norm.id).then((meta) => startPlay(meta.previewUrl)).catch(() => {
                    alert("Could not load Apple Music preview.");
                });
                return;
            }
            alert("Could not load Apple Music preview.");
        };
        let appleMusicSearchFieldKeydown = (e) => {
            if (!musicAppleSearchModeOpen || document.activeElement !== appleMusicSearchInput) return;
            if (e.isComposing) return;
            let optBtns = appleMusicResultsUl ? appleMusicResultsUl.querySelectorAll("li > button[role=\"option\"]") : [];
            let n = optBtns.length;
            let listOpen = appleMusicResultsUl && !appleMusicResultsUl.hidden && n > 0;
            if (e.code === "ArrowDown" && listOpen) {
                e.preventDefault();
                e.stopImmediatePropagation();
                appleMusicSearchHighlightIx = appleMusicSearchHighlightIx < 0 ? 0 : (appleMusicSearchHighlightIx + 1) % n;
                appleMusicApplySearchHighlight();
                appleMusicSearchIgnoreFocusOutUntil = performance.now() + 600;
                return;
            }
            if (e.code === "ArrowUp" && listOpen) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (appleMusicSearchHighlightIx < 0) {
                    appleMusicSearchHighlightIx = n - 1;
                } else if (appleMusicSearchHighlightIx === 0) {
                    appleMusicSearchHighlightIx = -1;
                } else {
                    appleMusicSearchHighlightIx--;
                }
                appleMusicApplySearchHighlight();
                appleMusicSearchIgnoreFocusOutUntil = performance.now() + 600;
                return;
            }
            let isEnter = e.code === "Enter" || e.code === "NumpadEnter" || e.key === "Enter" || e.keyCode === 13;
            if (!isEnter) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            if (listOpen && appleMusicSearchHighlightIx >= 0 && appleMusicSearchLastRows[appleMusicSearchHighlightIx]) {
                appleMusicSearchIgnoreFocusOutUntil = performance.now() + 600;
                appleMusicActivatePreviewRow(appleMusicSearchLastRows[appleMusicSearchHighlightIx]);
                return;
            }
            appleMusicSearchIgnoreFocusOutUntil = performance.now() + 600;
            appleMusicShowRecentIfInputEmpty();
        };
        let appleMusicRenderResults = (rows) => {
            appleMusicResultsUl.innerHTML = "";
            let safeRows = (rows || []).filter((r) => !!r && (r.title || r.artist || r.previewUrl));
            appleMusicSearchLastRows = safeRows.map((r) => ({
                id: String(r.id || "").trim(),
                title: String(r.title || "").trim(),
                artist: String(r.artist || "").trim(),
                previewUrl: String(r.previewUrl || "").trim()
            }));
            if (!appleMusicSearchLastRows.length) {
                appleMusicSearchHighlightIx = -1;
                appleMusicResultsUl.hidden = true;
                return;
            }
            appleMusicSearchLastRows.forEach((row, ix) => {
                let li = document.createElement("li");
                let bt = document.createElement("button");
                bt.type = "button";
                bt.setAttribute("role", "option");
                bt.className = "apple-music-preview-row";
                bt.textContent = row.title || row.artist || row.id || row.previewUrl || "Preview";
                bt.addEventListener("pointermove", () => appleMusicPointerHighlightRow(ix));
                bt.addEventListener("click", () => appleMusicActivatePreviewRow(row, !row.previewUrl));
                li.appendChild(bt);
                appleMusicResultsUl.appendChild(li);
            });
            appleMusicResultsUl.hidden = false;
            appleMusicSearchHighlightIx = 0;
            appleMusicApplySearchHighlight();
        };
        let appleMusicShowRecentIfInputEmpty = () => {
            if (!musicAppleSearchModeOpen || !appleMusicSearchInput || !appleMusicResultsUl) return;
            let recent = readAppleMusicRecentStored().map(appleMusicNormalizeStoredRow).filter(Boolean);
            if (!recent.length) {
                appleMusicResultsUl.innerHTML = "";
                appleMusicResultsUl.hidden = true;
                return;
            }
            appleMusicResultsUl.innerHTML = "";
            appleMusicSearchLastRows = recent;
            appleMusicSearchHighlightIx = -1;
            let headLi = document.createElement("li");
            let head = document.createElement("div");
            head.className = "apple-music-preview-recent-heading";
            head.textContent = "Recent";
            headLi.appendChild(head);
            appleMusicResultsUl.appendChild(headLi);
            recent.forEach((r, ix) => {
                let li = document.createElement("li");
                let bt = document.createElement("button");
                bt.type = "button";
                bt.setAttribute("role", "option");
                bt.className = "apple-music-preview-row";
                bt.textContent = r.title || r.artist || r.id || r.previewUrl || "Preview";
                bt.addEventListener("pointermove", () => appleMusicPointerHighlightRow(ix));
                bt.addEventListener("click", () => appleMusicActivatePreviewRow(r, !r.previewUrl));
                li.appendChild(bt);
                appleMusicResultsUl.appendChild(li);
            });
            appleMusicResultsUl.hidden = false;
        };
        let resetAppleMusicSearchUi = (opts) => {
            opts = opts || {};
            let collapseEmptyPlaybackPanel = opts.collapseEmptyPlaybackPanel === true;
            musicAppleSearchModeOpen = false;
            if (appleMusicSearchDebounceTimer !== null) {
                clearTimeout(appleMusicSearchDebounceTimer);
                appleMusicSearchDebounceTimer = null;
            }
            if (musicCard) musicCard.classList.remove("music-apple-search-mode");
            if (appleMusicInlineWrap) appleMusicInlineWrap.hidden = true;
            if (appleMusicResultsUl) {
                appleMusicResultsUl.hidden = true;
                appleMusicResultsUl.innerHTML = "";
            }
            if (appleMusicSearchInput) appleMusicSearchInput.value = "";
            if (musicFileActionsRow) musicFileActionsRow.hidden = false;
            if (!GraphToolPlugin.isMusicFileLoaded() && collapseEmptyPlaybackPanel && musicPlaybackPanel) {
                musicPlaybackPanel.setAttribute("aria-hidden", "true");
            }
        };
        /* Exposed so audio-engine.js (wireMusicLoadedFromSource) can collapse search mode
           when a track loads — it lives in a different module from this plugin closure. */
        GraphToolPlugin.resetAppleMusicSearchUi = resetAppleMusicSearchUi;
        let openAppleMusicSearchMode = () => {
            if (GraphToolPlugin.isMusicFileLoaded() || musicAppleSearchModeOpen) return;
            if (!musicCard || !musicPlaybackPanel || !musicPlayButton || !appleMusicInlineWrap
                    || !appleMusicSearchInput || !appleMusicResultsUl || !musicFileActionsRow) {
                return;
            }
            musicAppleSearchModeOpen = true;
            musicCard.classList.add("music-apple-search-mode");
            musicPlaybackPanel.setAttribute("aria-hidden", "false");
            appleMusicInlineWrap.hidden = false;
            musicFileActionsRow.hidden = true;
            appleMusicResultsUl.hidden = true;
            let focusSearch = () => {
                if (!musicAppleSearchModeOpen || !appleMusicSearchInput) return;
                appleMusicSearchInput.focus({ preventScroll: true });
                try { appleMusicSearchInput.select(); } catch (err) { /* noop */ }
            };
            if (typeof requestAnimationFrame === "function") {
                requestAnimationFrame(() => requestAnimationFrame(focusSearch));
            } else {
                focusSearch();
            }
        };
        let appleMusicPreviewForm = appleMusicInlineWrap.querySelector("form.apple-music-preview-form");
        if (appleMusicPreviewForm) {
            appleMusicPreviewForm.addEventListener("submit", (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
            });
        }
        appleMusicSearchInput.addEventListener("keydown", appleMusicSearchFieldKeydown, true);
        appleMusicSearchInput.addEventListener("focus", () => {
            if ((appleMusicSearchInput.value || "").trim() === "") {
                appleMusicShowRecentIfInputEmpty();
            }
        });
        let appleMusicOutsidePointerDismiss = (e) => {
            if (!musicAppleSearchModeOpen) return;
            let t = e.target;
            if (t && t.closest && t.closest(".apple-music-search-inline")) return;
            resetAppleMusicSearchUi({ collapseEmptyPlaybackPanel: true });
        };
        document.addEventListener("pointerdown", appleMusicOutsidePointerDismiss, true);
        let appleMusicEscapeDismiss = (e) => {
            if (!musicAppleSearchModeOpen || e.code !== "Escape") return;
            if (!appleMusicInlineWrap.contains(document.activeElement)) return;
            e.preventDefault();
            resetAppleMusicSearchUi({ collapseEmptyPlaybackPanel: true });
        };
        document.addEventListener("keydown", appleMusicEscapeDismiss, true);
        appleMusicSearchInput.addEventListener("input", () => {
            let v = appleMusicSearchInput.value.trim();
            if (appleMusicSearchDebounceTimer !== null) {
                clearTimeout(appleMusicSearchDebounceTimer);
                appleMusicSearchDebounceTimer = null;
            }
            if (v.length === 0) { appleMusicShowRecentIfInputEmpty(); return; }
            if (v.length < 2) {
                appleMusicSearchLastRows = [];
                appleMusicSearchHighlightIx = -1;
                appleMusicResultsUl.hidden = true;
                appleMusicResultsUl.innerHTML = "";
                return;
            }
            appleMusicSearchDebounceTimer = setTimeout(() => {
                appleMusicSearchDebounceTimer = null;
                itunesSearchSongs(v).then((rows) => {
                    appleMusicRenderResults(rows);
                }).catch((err) => {
                    console.warn(err);
                    appleMusicSearchLastRows = [];
                    appleMusicSearchHighlightIx = -1;
                    appleMusicResultsUl.innerHTML = "";
                    let li = document.createElement("li");
                    let msg = document.createElement("div");
                    msg.style.padding = "10px 16px";
                    msg.style.fontSize = "12px";
                    msg.style.lineHeight = "1.3";
                    msg.textContent = "iTunes search failed (network, rate limits, or browser restrictions).";
                    li.appendChild(msg);
                    appleMusicResultsUl.appendChild(li);
                    appleMusicResultsUl.hidden = false;
                });
            }, 380);
        });
        appleMusicInlineWrap.addEventListener("focusout", (ev) => {
            let rel = ev.relatedTarget;
            if (rel && appleMusicInlineWrap.contains(rel)) return;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (performance.now() < appleMusicSearchIgnoreFocusOutUntil) {
                        if (appleMusicSearchInput && document.activeElement !== appleMusicSearchInput) {
                            try { appleMusicSearchInput.focus({ preventScroll: true }); } catch (err) { /* noop */ }
                        }
                        return;
                    }
                    if (!musicAppleSearchModeOpen) return;
                    if (appleMusicInlineWrap.contains(document.activeElement)) return;
                    resetAppleMusicSearchUi({ collapseEmptyPlaybackPanel: true });
                });
            });
        });
        musicSearchAppleButton.addEventListener("click", () => {
            openAppleMusicSearchMode();
            setTimeout(() => {
                if (musicAppleSearchModeOpen && appleMusicSearchInput
                        && (appleMusicSearchInput.value || "").trim() === "") {
                    appleMusicShowRecentIfInputEmpty();
                }
            }, 0);
        });
    }

    // ── URL restore handler ──────────────────────────────────────────────────────
    function handleAppleMusicUrlRestore(songId, segment, fallback) {
        itunesLookupPreviewByTrackId(songId).then((meta) => {
            if (GraphToolPlugin.isMusicFileLoaded()) { fallback && fallback(); return; }
            GraphToolPlugin.incrementMusicRestoreCancelToken();
            if (!initMusicAudioGraph()) { fallback && fallback(); return; }
            /* Restore-from-URL only loads/arms the preview; playback waits for a user gesture
               (browsers block autoplay without one, and it shouldn't auto-play on load anyway). */
            wireMusicLoadedFromSource(meta.previewUrl, segment || null, {
                appleCatalogSongId: songId
            });
        }).catch((err) => {
            console.warn("Shared Apple Music track could not be loaded", err);
            fallback && fallback();
        });
    }

    // ── Self-register with core ──────────────────────────────────────────────────
    GraphToolPlugin.on('musicPanelReady', initAppleMusicPlugin);
    GraphToolPlugin.on('appleMusicUrlRestore', handleAppleMusicUrlRestore);
}());
