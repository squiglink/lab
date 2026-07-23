/* Live-sound: audio chain, pink noise, tone generator, music player.
 * Extracted from addExtra() — loaded before graphtool.js so initLiveSoundExtra is defined
 * when addExtra() calls it. Classic script; no modules. */
function initLiveSoundExtra() {
    // Shell is now rendered — resolve audio-engine.js DOM element references and bind listeners
    if (typeof initAudioEngineUiBindings === "function") initAudioEngineUiBindings();

    // Live playback output trim after EQ (linear gain; tune per source)
    let livePinkNoisePlaybackGain = 0.5;
    let liveToneGeneratorPlaybackGain = 0.2;
    let liveMusicPlaybackGain = 1;
    /** User-facing Sound Tools master (1 = 100%); multiplies each source after its app-level trim / music preamp math. */
    let liveSoundToolsUserVolume = 1;
    let applyLiveSoundToolsUserVolumeToAudioNodes = () => {
        let v = liveSoundToolsUserVolume;
        if (pinkNoiseUserGain) {
            pinkNoiseUserGain.gain.value = v;
        }
        if (toneGeneratorUserGain) {
            toneGeneratorUserGain.gain.value = v;
        }
        if (musicUserGain) {
            musicUserGain.gain.value = v;
        }
    };
    let lastEqPlaybackSource = "pink";
    // Pink noise (parametric EQ in audio path)
    let pinkNoisePlayButton = document.querySelector("div.extra-pink-noise .play");
    let pinkNoisePlaying = false;
    let pinkNoiseContext = null;
    let pinkNoiseProcessor = null;
    let pinkNoiseMasterGain = null;
    /** Multiplies app trim (pink/tone/music) without disturbing sweep/fade automation on master gains. */
    let pinkNoiseUserGain = null;
    let pinkNoiseAnalyser = null;
    let pinkNoiseBiquads = [];
    let pinkNoiseBandFilters = [];
    let pinkNoiseBiquadsLeft = [];
    let pinkNoiseBiquadsRight = [];
    let pinkNoiseBandFiltersLeft = [];
    let pinkNoiseBandFiltersRight = [];
    let pinkNoiseMerger = null;
    let toneGeneratorBiquads = [];
    let toneGeneratorBiquadsLeft = [];
    let toneGeneratorBiquadsRight = [];
    let toneGeneratorBandFiltersLeft = [];
    let toneGeneratorBandFiltersRight = [];
    /** Mono tone path: HP/LP (or parallel band branches) before parametric EQ when range limits apply. */
    let toneGeneratorBandFiltersMono = [];
    let toneGeneratorMerger = null;
    let toneGeneratorMasterGain = null;
    let toneGeneratorUserGain = null;
    let toneGeneratorAnalyser = null;
    let musicBiquads = [];
    let musicBandFilters = [];
    let musicBiquadsLeft = [];
    let musicBiquadsRight = [];
    let musicBandFiltersLeft = [];
    let musicBandFiltersRight = [];
    let musicStereoSplitter = null;
    let musicStereoMerger = null;
    let musicContext = null;
    let musicAudio = null;
    let musicMediaSourceNode = null;
    let musicMasterGain = null;
    let musicUserGain = null;
    let musicAnalyser = null;
    let musicObjectUrl = null;
    let musicFileLoaded = false;
    /** Set when the playing track is identified by Apple catalog / iTunes store id (share URL `amSong`). */
    let musicAppleShareSongId = null;
    Object.defineProperty(window, 'musicAppleShareSongId', { get: () => musicAppleShareSongId, set: v => { musicAppleShareSongId = v; }, configurable: true });
    let isExtraTabSelectedForShortcuts = () => {
        let tab = document.querySelector("div.select");
        return !!(typeof extraEnabled !== "undefined" && extraEnabled && tab
            && tab.getAttribute("data-selected") === "extra");
    };
    let suppressEqExtraGlobalShortcutsForAppleSearch = () =>
        (typeof GraphToolPlugin !== "undefined"
            && typeof GraphToolPlugin.isAppleMusicSearchModeOpen === "function"
            && GraphToolPlugin.isAppleMusicSearchModeOpen())
        && isExtraTabSelectedForShortcuts();
    let musicSeekDragging = false;
    let musicSegStartU = 0;
    let musicSegEndU = 1;
    Object.defineProperty(window, 'musicSegStartU', { get: () => musicSegStartU, set: v => { musicSegStartU = v; }, configurable: true });
    Object.defineProperty(window, 'musicSegEndU',   { get: () => musicSegEndU,   set: v => { musicSegEndU = v; },   configurable: true });
    let musicTrimDragging = null;
    let musicTrimIdleTimer = null;
    /* Segment endpoints in localStorage; audio bytes in IndexedDB (localStorage cannot hold files). */
    let musicRestoreCancelToken = 0;
    GraphToolPlugin.isMusicFileLoaded = () => musicFileLoaded;
    GraphToolPlugin.incrementMusicRestoreCancelToken = () => { musicRestoreCancelToken++; };
    const CRINGRAPH_MUSIC_SEG_LS = "cringraph_music_segment_v1";
    const CRINGRAPH_MUSIC_IDB_NAME = "cringraphMusic";
    const CRINGRAPH_MUSIC_IDB_VER = 1;
    const CRINGRAPH_MUSIC_STORE = "track";
    const CRINGRAPH_MUSIC_KEY = "current";
    /* Skip IndexedDB save/restore above this size (typical song ≈3–10 MB; cap avoids quota/slow writes). */
    const CRINGRAPH_MUSIC_MAX_PERSIST_BYTES = 100 * 1024 * 1024;
    let openCringraphMusicDb = () => {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error("no idb"));
                return;
            }
            let req = indexedDB.open(CRINGRAPH_MUSIC_IDB_NAME, CRINGRAPH_MUSIC_IDB_VER);
            req.onupgradeneeded = (ev) => {
                let db = ev.target.result;
                if (!db.objectStoreNames.contains(CRINGRAPH_MUSIC_STORE)) {
                    db.createObjectStore(CRINGRAPH_MUSIC_STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    };
    let idbPutCringraphMusicRecord = (rec) => {
        return openCringraphMusicDb().then((db) => new Promise((resolve, reject) => {
            let tx = db.transaction(CRINGRAPH_MUSIC_STORE, "readwrite");
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
            tx.onabort = () => {
                db.close();
                reject(tx.error);
            };
            tx.objectStore(CRINGRAPH_MUSIC_STORE).put(rec, CRINGRAPH_MUSIC_KEY);
        }));
    };
    let idbGetCringraphMusicRecord = () => {
        return openCringraphMusicDb().then((db) => new Promise((resolve, reject) => {
            if (!db.objectStoreNames.contains(CRINGRAPH_MUSIC_STORE)) {
                db.close();
                resolve(null);
                return;
            }
            let tx = db.transaction(CRINGRAPH_MUSIC_STORE, "readonly");
            let getReq = tx.objectStore(CRINGRAPH_MUSIC_STORE).get(CRINGRAPH_MUSIC_KEY);
            getReq.onerror = () => {
                db.close();
                reject(getReq.error);
            };
            tx.oncomplete = () => {
                db.close();
                resolve(getReq.result || null);
            };
        }));
    };
    let idbDeleteCringraphMusicRecord = () => {
        return openCringraphMusicDb().then((db) => new Promise((resolve, reject) => {
            if (!db.objectStoreNames.contains(CRINGRAPH_MUSIC_STORE)) {
                db.close();
                resolve();
                return;
            }
            let tx = db.transaction(CRINGRAPH_MUSIC_STORE, "readwrite");
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
            tx.objectStore(CRINGRAPH_MUSIC_STORE).delete(CRINGRAPH_MUSIC_KEY);
        })).catch(() => {});
    };
    let loadMusicSegmentFromLocalStorage = () => {
        try {
            let raw = localStorage.getItem(CRINGRAPH_MUSIC_SEG_LS);
            if (!raw) {
                return null;
            }
            let o = JSON.parse(raw);
            if (typeof o.segStartU === "number" && typeof o.segEndU === "number") {
                return { segStartU: o.segStartU, segEndU: o.segEndU };
            }
        } catch (e) { /* noop */ }
        return null;
    };
    let persistMusicSegmentToLocalStorage = () => {
        if (!musicFileLoaded) {
            return;
        }
        try {
            localStorage.setItem(CRINGRAPH_MUSIC_SEG_LS, JSON.stringify({
                v: 1,
                segStartU: musicSegStartU,
                segEndU: musicSegEndU
            }));
        } catch (e) { /* quota / private mode */ }
        if (typeof ifURL !== "undefined" && ifURL && musicAppleShareSongId && typeof addPhonesToUrl === "function") {
            addPhonesToUrl();
        }
    };
    let persistMusicFileToIndexedDb = (file) => {
        if (!window.indexedDB || !file) {
            return;
        }
        if (typeof file.size === "number" && file.size > CRINGRAPH_MUSIC_MAX_PERSIST_BYTES) {
            void clearPersistedMusic();
            return;
        }
        idbPutCringraphMusicRecord({
            blob: file,
            name: file.name || "",
            type: file.type || "",
            size: file.size,
            lastModified: file.lastModified
        }).catch(() => {});
    };
    let clearPersistedMusic = () => {
        try {
            localStorage.removeItem(CRINGRAPH_MUSIC_SEG_LS);
        } catch (e) { /* noop */ }
        return idbDeleteCringraphMusicRecord();
    };
    window.clearPersistedMusic = clearPersistedMusic;
    window.persistMusicSegmentToLocalStorage = persistMusicSegmentToLocalStorage;
    let liveEqSyncRafId = null;
    let livePlaybackEqToggle = document.querySelector("input.live-sound-eq-toggle");
    let isLivePlaybackEqEnabled = () =>
        !livePlaybackEqToggle || livePlaybackEqToggle.checked;
    /** Single source for parent vs EQ trace dimming (L/R bank, live A/B, no-audio case). `baseNum`
     *  is the opacity factor from graphPathOpacityForCurve / parametric focus (1 when null). */
    let eqComposeListeningOpacityForCurve = (curve, baseNum) => {
        if (!curve || !curve.p || curve.p.hide) {
            return 0;
        }
        let p = curve.p;
        let b = (typeof baseNum === "number" && Number.isFinite(baseNum)) ? baseNum : 1;
        let audioPlaying = pinkNoisePlaying || !!toneGeneratorOsc
            || (musicAudio && !musicAudio.paused);
        let eqOn = isLivePlaybackEqEnabled();
        if (p.eqParent) {
            let bankDim = 1;
            if (isEqTwoChannelSupportEnabled()
                    && eq2chActiveBank !== "both"
                    && LR && LR.length > 1
                    && p.activeCurves && p.activeCurves.length > 1) {
                let ix = p.activeCurves.indexOf(curve);
                if (ix >= 0 && ix < LR.length) {
                    let side = LR[ix];
                    if ((eq2chActiveBank === "L" && side !== "L")
                            || (eq2chActiveBank === "R" && side !== "R")) {
                        bankDim = 0.5;
                    }
                }
            }
            let aud = (audioPlaying && !eqOn) ? 0.5 : 1;
            let op = b * bankDim * aud;
            return Math.abs(op - 1) < 1e-9 ? null : op;
        }
        if (p.eq) {
            let dimParent = !audioPlaying || eqOn;
            let op = b * (dimParent ? 0.5 : 1);
            return Math.abs(op - 1) < 1e-9 ? null : op;
        }
        return Math.abs(b - 1) < 1e-9 ? null : b;
    };
    if (typeof window !== "undefined") {
        window.__eqComposeListeningOpacityForCurve = eqComposeListeningOpacityForCurve;
    }
    window.suppressEqExtraGlobalShortcutsForAppleSearch = suppressEqExtraGlobalShortcutsForAppleSearch;
    window.livePlaybackEqToggle = livePlaybackEqToggle;
    window.isLivePlaybackEqEnabled = isLivePlaybackEqEnabled;
    window.eqComposeListeningOpacityForCurve = eqComposeListeningOpacityForCurve;
    Object.defineProperty(window, 'liveEqSyncRafId', { get: () => liveEqSyncRafId, set: v => { liveEqSyncRafId = v; }, configurable: true });
    Object.defineProperty(window, 'pinkNoisePlaying', { get: () => pinkNoisePlaying, set: v => { pinkNoisePlaying = v; }, configurable: true });
    Object.defineProperty(window, 'pinkNoiseContext', { get: () => pinkNoiseContext, set: v => { pinkNoiseContext = v; }, configurable: true });
    Object.defineProperty(window, 'musicAudio', { get: () => musicAudio, set: v => { musicAudio = v; }, configurable: true });
    Object.defineProperty(window, 'musicContext', { get: () => musicContext, set: v => { musicContext = v; }, configurable: true });
    let mapFilterTypeToBiquad = (t) =>
        (t === "LSQ" ? "lowshelf" : t === "HSQ" ? "highshelf" : "peaking");
    /* Same bands as live biquads; independent of the Compare toggle (used for
       preamp + A/B level match when EQ is bypassed). */
    let elemToLiveEqSpecsClamped = () => {
        let rows;
        if (isEqTwoChannelSupportEnabled()) {
            eq2chFlushDomToActiveBank();
            rows = elemToFiltersClampedRowsForEqualizerApply(
                eq2chPadBankToEqBands(eq2chBankData.both), false).filter(
                (f) => !f.disabled && f.type && f.freq && f.q);
        } else {
            rows = elemToFilters();
        }
        return rows.map((f) => ({
            type: f.type,
            freq: Math.min(20000, Math.max(20, f.freq)),
            q: Math.max(1e-4, Math.min(1000, f.q)),
            gain: Math.max(-40, Math.min(40, f.gain)),
        }));
    };
    let computeLiveEqSpecs = () => {
        if (!isLivePlaybackEqEnabled()) {
            let ps = elemToPinnedLivePlaybackSpecs();
            return ps.length ? ps : [];
        }
        return elemToLiveEqSpecsClamped();
    };
    let liveStereoEqActive = () =>
        isEqTwoChannelSupportEnabled() && isLivePlaybackEqEnabled();
    let liveStereoEqChannelIndices = () => {
        let li = LR.indexOf("L");
        let ri = LR.indexOf("R");
        if (li < 0) {
            li = 0;
        }
        if (ri < 0) {
            ri = LR.length > 1 ? 1 : 0;
        }
        return { li, ri };
    };
    let computeLiveEqSpecsForStereoPaths = () => {
        eq2chFlushDomToActiveBank();
        let { li, ri } = liveStereoEqChannelIndices();
        return {
            specL: eq2chMergedSpecsForChannelIndex(li),
            specR: eq2chMergedSpecsForChannelIndex(ri)
        };
    };
    let getLiveMusicEqFrAnalysis = (sampleRate) => {
        let phoneObj = resolveEqGraphPhoneObj();
        if (!phoneObj || !phoneObj.rawChannels) {
            return null;
        }
        let pinSpecs = elemToPinnedLivePlaybackSpecs();
        let aPathDry = !isLivePlaybackEqEnabled() && !pinSpecs.length;
        /* A path with a pin: chain plays pinned EQ — preamp from pinned FR; skip dry-vs-live norm. */
        if (!isLivePlaybackEqEnabled() && pinSpecs.length) {
            let rawCh = eq2chSharedMeasurementBaseRaw(phoneObj)
                || firstPresentChannel(phoneObj.rawChannels);
            if (!rawCh || !rawCh.length) {
                return null;
            }
            if (eqPinnedSnapshotBody) {
                let pack = computePinnedEqFrForModel(phoneObj, eqPinnedSnapshotBody);
                if (pack.ok && pack.frSingle) {
                    let preDb = Equalizer.calc_preamp(rawCh, pack.frSingle);
                    return { raw: rawCh, frEq: pack.frSingle, preDb };
                }
            }
            let frEq = Equalizer.apply(rawCh, pinSpecs, sampleRate);
            let preDb = Equalizer.calc_preamp(rawCh, frEq);
            return { raw: rawCh, frEq, preDb };
        }
        /* B path, or A dry: use live EQ for stereo/mono FR + preamp (A dry norm bypass vs B). */
        if (isLivePlaybackEqEnabled() || aPathDry) {
            if (isEqTwoChannelSupportEnabled() && LR && LR.length > 1) {
                let { specL, specR } = computeLiveEqSpecsForStereoPaths();
                if (!specL.length && !specR.length) {
                    return null;
                }
                let { li, ri } = liveStereoEqChannelIndices();
                let base2 = eq2chSharedMeasurementBaseRaw(phoneObj);
                if (base2) {
                    let frEqL = specL.length ? Equalizer.apply(base2, specL, sampleRate) : base2;
                    let frEqR = specR.length ? Equalizer.apply(base2, specR, sampleRate) : base2;
                    let preL = specL.length ? Equalizer.calc_preamp(base2, frEqL) : 0;
                    let preR = specR.length ? Equalizer.calc_preamp(base2, frEqR) : 0;
                    return { raw: base2, frEq: frEqL, preDb: (preL + preR) / 2 };
                }
                let rawL = phoneObj.rawChannels[li];
                let rawR = phoneObj.rawChannels[ri];
                if (!rawL || !rawL.length) {
                    return null;
                }
                let frEqL = specL.length ? Equalizer.apply(rawL, specL, sampleRate) : rawL;
                let preL = specL.length ? Equalizer.calc_preamp(rawL, frEqL) : 0;
                let preR = preL;
                if (rawR && rawR.length && specR.length) {
                    let frEqR = Equalizer.apply(rawR, specR, sampleRate);
                    preR = Equalizer.calc_preamp(rawR, frEqR);
                }
                return { raw: rawL, frEq: frEqL, preDb: (preL + preR) / 2 };
            }
            let specs = elemToLiveEqSpecsClamped();
            if (!specs.length) {
                return null;
            }
            let raw = phoneObj.rawChannels.filter(Boolean)[0];
            if (!raw || !raw.length) {
                return null;
            }
            let frEq = Equalizer.apply(raw, specs, sampleRate);
            let preDb = Equalizer.calc_preamp(raw, frEq);
            return { raw, frEq, preDb };
        }
        return null;
    };
    /* Match export semantics: headroom from max EQ boost vs raw FR (see Equalizer.calc_preamp). */
    let computeLiveMusicPreampDb = (sampleRate) => {
        let a = getLiveMusicEqFrAnalysis(sampleRate);
        return a ? a.preDb : 0;
    };
    /* Bypass level-match using the same normalization algorithm as the graph display.
       Returns dB adjustment so that toggling EQ off sounds level-matched. */
    let computeNormBypassAdjustDb = (rawCh, eqCh) => {
        if (!rawCh || !eqCh) return 0;
        if (norm_sel) {
            let i = fr_to_ind(norm_fr);
            if (i < rawCh.length && i < eqCh.length)
                return eqCh[i][1] - rawCh[i][1];
            return 0;
        }
        return find_offset(rawCh, norm_phon) - find_offset(eqCh, norm_phon);
    };
    const LIVE_EQ_PARAM_TAU_SEC = 0.016;
    let smoothAudioParamTo = (param, value, ctx) => {
        let t = ctx.currentTime;
        try {
            param.cancelScheduledValues(t);
            param.setTargetAtTime(value, t, LIVE_EQ_PARAM_TAU_SEC);
        } catch (e) {
            param.value = value;
        }
    };
    let syncMusicOutputGain = (ctx) => {
        if (!musicMasterGain || !ctx) {
            return;
        }
        let preDb = computeLiveMusicPreampDb(ctx.sampleRate);
        let lin = liveMusicPlaybackGain * Math.pow(10, preDb / 20);
        /* A dry only: level-match raw output to the live EQ curve. A + pinned EQ is already shaped
           in the biquad chain — do not apply the dry-vs-live graph offset on top. */
        if (!isLivePlaybackEqEnabled() && !elemToPinnedLivePlaybackSpecs().length) {
            let a = getLiveMusicEqFrAnalysis(ctx.sampleRate);
            if (a) {
                let adjDb = computeNormBypassAdjustDb(a.raw, a.frEq);
                adjDb = Math.max(-30, Math.min(30, adjDb));
                lin *= Math.pow(10, adjDb / 20);
            }
        }
        smoothAudioParamTo(musicMasterGain.gain, lin, ctx);
    };
    let syncEqBiquadsInPlace = (ctx, biquadsArr, specs) => {
        if (biquadsArr.length !== specs.length) {
            return false;
        }
        for (let i = 0; i < specs.length; i++) {
            let bf = biquadsArr[i];
            let s = specs[i];
            let wantType = mapFilterTypeToBiquad(s.type);
            if (bf.type !== wantType) {
                bf.type = wantType;
            }
            smoothAudioParamTo(bf.frequency, s.freq, ctx);
            smoothAudioParamTo(bf.Q, s.q, ctx);
            smoothAudioParamTo(bf.gain, s.gain, ctx);
        }
        return true;
    };
    let syncBandShelfFiltersInPlace = (ctx, bandArr, fromHz, toHz) => {
        if (!bandArr || bandArr.length !== 2) {
            return false;
        }
        smoothAudioParamTo(bandArr[0].frequency, fromHz, ctx);
        smoothAudioParamTo(bandArr[1].frequency, toHz, ctx);
        return true;
    };
    let readLiveSoundBandEdgeHz = () => {
        let fromEl = document.querySelector("div.live-sound-tools input[name='tone-generator-from']");
        let toEl = document.querySelector("div.live-sound-tools input[name='tone-generator-to']");
        let fromHz = Math.min(Math.max(parseInt(fromEl && fromEl.value) || 0, 20), 20000);
        let toHz = Math.min(Math.max(parseInt(toEl && toEl.value) || 0, fromHz), 20000);
        return { fromHz, toHz };
    };
    let liveSoundBandDatasetRoot = () =>
        document.querySelector("div.live-sound-tools div.live-sound-band");
    /* Sound Tools playback band (HP/LP) must stay full-range unless the user trims it in the Range
     * fields — not the parametric EQ constraint min/max (those only govern filter rows / AutoEQ). */
    const LIVE_SOUND_BAND_HZ_MIN = 20;
    const LIVE_SOUND_BAND_HZ_MAX = 20000;
    function normalizeLiveSoundIntervalPair(lo, hi) {
        let fLo = LIVE_SOUND_BAND_HZ_MIN;
        let fHi = LIVE_SOUND_BAND_HZ_MAX;
        lo = Math.round(Math.min(fHi, Math.max(fLo, lo)));
        hi = Math.round(Math.min(fHi, Math.max(fLo, hi)));
        if (hi <= lo) {
            hi = Math.min(fHi, lo + 1);
        }
        return { lo, hi };
    }
    function mergeLiveSoundIntervalsSorted(intervals) {
        if (!intervals.length) {
            return [];
        }
        let sorted = intervals.slice().sort((a, b) => a.lo - b.lo);
        let out = [];
        let cur = { lo: sorted[0].lo, hi: sorted[0].hi };
        for (let i = 1; i < sorted.length; i++) {
            let n = sorted[i];
            if (n.lo <= cur.hi) {
                cur.hi = Math.max(cur.hi, n.hi);
            } else {
                out.push(cur);
                cur = { lo: n.lo, hi: n.hi };
            }
        }
        out.push(cur);
        return out;
    }
    function readLiveSoundBandIntervals() {
        let root = liveSoundBandDatasetRoot();
        let raw = root && root.dataset && root.dataset.liveSoundIntervals;
        if (raw) {
            try {
                let parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) {
                    let ivs = [];
                    for (let i = 0; i < parsed.length; i++) {
                        let o = parsed[i];
                        if (!o || typeof o !== "object") {
                            continue;
                        }
                        let lo = Number(o.lo);
                        let hi = Number(o.hi);
                        if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
                            continue;
                        }
                        ivs.push(normalizeLiveSoundIntervalPair(lo, hi));
                    }
                    ivs = mergeLiveSoundIntervalsSorted(ivs);
                    if (ivs.length) {
                        return ivs;
                    }
                }
            } catch (e) { /* noop */ }
        }
        let { fromHz, toHz } = readLiveSoundBandEdgeHz();
        let lo = Math.min(fromHz, toHz);
        let hi = Math.max(fromHz, toHz);
        return [normalizeLiveSoundIntervalPair(lo, hi)];
    }
    function writeLiveSoundIntervalsState(intervals) {
        if (!toneGeneratorFromInput || !toneGeneratorToInput) {
            return;
        }
        let merged = mergeLiveSoundIntervalsSorted(intervals.map((iv) =>
            normalizeLiveSoundIntervalPair(iv.lo, iv.hi)));
        if (!merged.length) {
            merged.push(normalizeLiveSoundIntervalPair(20, 20000));
        }
        let loMin = merged.reduce((m, iv) => Math.min(m, iv.lo), merged[0].lo);
        let hiMax = merged.reduce((m, iv) => Math.max(m, iv.hi), merged[0].hi);
        toneGeneratorFromInput.value = String(loMin);
        toneGeneratorToInput.value = String(hiMax);
        let root = liveSoundBandDatasetRoot();
        if (root) {
            if (merged.length <= 1) {
                delete root.dataset.liveSoundIntervals;
            } else {
                root.dataset.liveSoundIntervals = JSON.stringify(merged);
            }
        }
    }
    function clearLiveSoundIntervalsDatasetIfPresent() {
        let root = liveSoundBandDatasetRoot();
        if (root && root.dataset.liveSoundIntervals) {
            delete root.dataset.liveSoundIntervals;
        }
    }
    /** Sum of parallel HP→LP branches (optional gain per branch); bandStorageArr owns hp, lp, norm for each branch plus summer. */
    function connectParallelHpLpBandBranches(ctx, sourceNode, bandStorageArr, intervals) {
        let summer = ctx.createGain();
        summer.gain.value = 1;
        let n = intervals.length;
        let normMul = n > 1 ? 1 / Math.sqrt(n) : 1;
        intervals.forEach((iv) => {
            let norm = ctx.createGain();
            norm.gain.value = normMul;
            let hp = ctx.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = iv.lo;
            hp.Q.value = 0.707;
            let lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = iv.hi;
            lp.Q.value = 0.707;
            sourceNode.connect(hp);
            hp.connect(lp);
            lp.connect(norm);
            norm.connect(summer);
            bandStorageArr.push(hp, lp, norm);
        });
        bandStorageArr.push(summer);
        return summer;
    }
    /** Same as connectParallelHpLpBandBranches but input is a stereo splitter channel. */
    function connectParallelHpLpMusicSide(ctx, splitter, splitChannel, bandStorageArr, intervals) {
        let summer = ctx.createGain();
        summer.gain.value = 1;
        let n = intervals.length;
        let normMul = n > 1 ? 1 / Math.sqrt(n) : 1;
        intervals.forEach((iv) => {
            let norm = ctx.createGain();
            norm.gain.value = normMul;
            let hp = ctx.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = iv.lo;
            hp.Q.value = 0.707;
            let lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = iv.hi;
            lp.Q.value = 0.707;
            splitter.connect(hp, splitChannel);
            hp.connect(lp);
            lp.connect(norm);
            norm.connect(summer);
            bandStorageArr.push(hp, lp, norm);
        });
        bandStorageArr.push(summer);
        return summer;
    }
    let disconnectEqBiquads = (biquadsArr) => {
        biquadsArr.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        biquadsArr.length = 0;
    };
    let disconnectPinkBandFilters = () => {
        pinkNoiseBandFilters.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        pinkNoiseBandFilters.length = 0;
        pinkNoiseBandFiltersLeft.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        pinkNoiseBandFiltersLeft.length = 0;
        pinkNoiseBandFiltersRight.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        pinkNoiseBandFiltersRight.length = 0;
        if (pinkNoiseMerger) {
            try {
                pinkNoiseMerger.disconnect();
            } catch (e) { /* noop */ }
            pinkNoiseMerger = null;
        }
    };
    let disconnectMusicBandFilters = () => {
        musicBandFilters.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        musicBandFilters.length = 0;
        musicBandFiltersLeft.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        musicBandFiltersLeft.length = 0;
        musicBandFiltersRight.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        musicBandFiltersRight.length = 0;
        if (musicStereoMerger) {
            try {
                musicStereoMerger.disconnect();
            } catch (e) { /* noop */ }
            musicStereoMerger = null;
        }
        if (musicStereoSplitter) {
            try {
                musicStereoSplitter.disconnect();
            } catch (e) { /* noop */ }
            musicStereoSplitter = null;
        }
    };
    let rebuildLiveEqChain = (sourceNode, audioContext, masterGain, biquadsArr) => {
        let specs = computeLiveEqSpecs();
        if (biquadsArr.length === specs.length && specs.length > 0) {
            syncEqBiquadsInPlace(audioContext, biquadsArr, specs);
            return;
        }
        sourceNode.disconnect();
        disconnectEqBiquads(biquadsArr);
        let last = sourceNode;
        if (isLivePlaybackEqEnabled() || specs.length > 0) {
            specs.forEach((s) => {
                let bf = audioContext.createBiquadFilter();
                bf.type = mapFilterTypeToBiquad(s.type);
                bf.frequency.value = s.freq;
                bf.Q.value = s.q;
                bf.gain.value = s.gain;
                last.connect(bf);
                last = bf;
                biquadsArr.push(bf);
            });
        }
        last.connect(masterGain);
    };
    let rebuildPinkNoiseEqChainStereo = () => {
        if (!pinkNoisePlaying || !pinkNoiseContext || !pinkNoiseProcessor || !pinkNoiseMasterGain) {
            return;
        }
        let intervals = readLiveSoundBandIntervals();
        let multiBand = intervals.length > 1;
        let iv0 = intervals[0];
        let fromHz = iv0.lo;
        let toHz = iv0.hi;
        let { specL, specR } = computeLiveEqSpecsForStereoPaths();
        if (!multiBand && pinkNoiseBandFiltersLeft.length === 2 && pinkNoiseBandFiltersRight.length === 2
                && specL.length === pinkNoiseBiquadsLeft.length
                && specR.length === pinkNoiseBiquadsRight.length
                && syncBandShelfFiltersInPlace(pinkNoiseContext, pinkNoiseBandFiltersLeft, fromHz, toHz)
                && syncBandShelfFiltersInPlace(pinkNoiseContext, pinkNoiseBandFiltersRight, fromHz, toHz)) {
            if ((specL.length === 0 || syncEqBiquadsInPlace(pinkNoiseContext, pinkNoiseBiquadsLeft, specL))
                    && (specR.length === 0 || syncEqBiquadsInPlace(pinkNoiseContext, pinkNoiseBiquadsRight, specR))) {
                return;
            }
        }
        pinkNoiseProcessor.disconnect();
        disconnectEqBiquads(pinkNoiseBiquads);
        disconnectEqBiquads(pinkNoiseBiquadsLeft);
        disconnectEqBiquads(pinkNoiseBiquadsRight);
        disconnectPinkBandFilters();
        pinkNoiseMerger = pinkNoiseContext.createChannelMerger(2);
        let wireSide = (specs, bandArr, bqArr, mergerCh) => {
            let last;
            if (multiBand) {
                last = connectParallelHpLpBandBranches(pinkNoiseContext, pinkNoiseProcessor, bandArr, intervals);
            } else {
                last = pinkNoiseProcessor;
                let hp = pinkNoiseContext.createBiquadFilter();
                hp.type = "highpass";
                hp.frequency.value = fromHz;
                hp.Q.value = 0.707;
                last.connect(hp);
                last = hp;
                bandArr.push(hp);
                let lp = pinkNoiseContext.createBiquadFilter();
                lp.type = "lowpass";
                lp.frequency.value = toHz;
                lp.Q.value = 0.707;
                last.connect(lp);
                last = lp;
                bandArr.push(lp);
            }
            specs.forEach((s) => {
                let bf = pinkNoiseContext.createBiquadFilter();
                bf.type = mapFilterTypeToBiquad(s.type);
                bf.frequency.value = s.freq;
                bf.Q.value = s.q;
                bf.gain.value = s.gain;
                last.connect(bf);
                last = bf;
                bqArr.push(bf);
            });
            last.connect(pinkNoiseMerger, 0, mergerCh);
        };
        wireSide(specL, pinkNoiseBandFiltersLeft, pinkNoiseBiquadsLeft, 0);
        wireSide(specR, pinkNoiseBandFiltersRight, pinkNoiseBiquadsRight, 1);
        pinkNoiseMerger.connect(pinkNoiseMasterGain);
    };
    let rebuildPinkNoiseEqChainMono = () => {
        if (!pinkNoisePlaying || !pinkNoiseContext || !pinkNoiseProcessor || !pinkNoiseMasterGain) {
            return;
        }
        let intervals = readLiveSoundBandIntervals();
        let multiBand = intervals.length > 1;
        let iv0 = intervals[0];
        let fromHz = iv0.lo;
        let toHz = iv0.hi;
        let specs = computeLiveEqSpecs();
        if (!multiBand && pinkNoiseBandFilters.length === 2
                && specs.length === pinkNoiseBiquads.length
                && syncBandShelfFiltersInPlace(pinkNoiseContext, pinkNoiseBandFilters, fromHz, toHz)) {
            if (specs.length === 0 || syncEqBiquadsInPlace(pinkNoiseContext, pinkNoiseBiquads, specs)) {
                return;
            }
        }
        pinkNoiseProcessor.disconnect();
        disconnectEqBiquads(pinkNoiseBiquads);
        disconnectEqBiquads(pinkNoiseBiquadsLeft);
        disconnectEqBiquads(pinkNoiseBiquadsRight);
        disconnectPinkBandFilters();
        let last;
        if (multiBand) {
            last = connectParallelHpLpBandBranches(pinkNoiseContext, pinkNoiseProcessor, pinkNoiseBandFilters, intervals);
        } else {
            last = pinkNoiseProcessor;
            let hp = pinkNoiseContext.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = fromHz;
            hp.Q.value = 0.707;
            last.connect(hp);
            last = hp;
            pinkNoiseBandFilters.push(hp);
            let lp = pinkNoiseContext.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = toHz;
            lp.Q.value = 0.707;
            last.connect(lp);
            last = lp;
            pinkNoiseBandFilters.push(lp);
        }
        specs.forEach((s) => {
            let bf = pinkNoiseContext.createBiquadFilter();
            bf.type = mapFilterTypeToBiquad(s.type);
            bf.frequency.value = s.freq;
            bf.Q.value = s.q;
            bf.gain.value = s.gain;
            last.connect(bf);
            last = bf;
            pinkNoiseBiquads.push(bf);
        });
        last.connect(pinkNoiseMasterGain);
    };
    let rebuildPinkNoiseEqChain = () => {
        if (!pinkNoisePlaying || !pinkNoiseContext || !pinkNoiseProcessor || !pinkNoiseMasterGain) {
            return;
        }
        if (liveStereoEqActive()) {
            rebuildPinkNoiseEqChainStereo();
        } else {
            rebuildPinkNoiseEqChainMono();
        }
    };
    let rebuildToneGeneratorEqChainStereo = () => {
        if (!toneGeneratorOsc || !toneGeneratorContext || !toneGeneratorMasterGain) {
            return;
        }
        toneGeneratorBandFiltersMono.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        toneGeneratorBandFiltersMono.length = 0;
        let intervals = readLiveSoundBandIntervals();
        let multiBand = intervals.length > 1;
        let iv0 = intervals[0];
        let fromHz = iv0.lo;
        let toHz = iv0.hi;
        let { specL, specR } = computeLiveEqSpecsForStereoPaths();
        if (!multiBand && toneGeneratorBandFiltersLeft.length === 2 && toneGeneratorBandFiltersRight.length === 2
                && specL.length === toneGeneratorBiquadsLeft.length
                && specR.length === toneGeneratorBiquadsRight.length
                && syncBandShelfFiltersInPlace(toneGeneratorContext, toneGeneratorBandFiltersLeft, fromHz, toHz)
                && syncBandShelfFiltersInPlace(toneGeneratorContext, toneGeneratorBandFiltersRight, fromHz, toHz)) {
            if ((specL.length === 0 || syncEqBiquadsInPlace(toneGeneratorContext, toneGeneratorBiquadsLeft, specL))
                    && (specR.length === 0 || syncEqBiquadsInPlace(toneGeneratorContext, toneGeneratorBiquadsRight, specR))) {
                return;
            }
        }
        toneGeneratorOsc.disconnect();
        disconnectEqBiquads(toneGeneratorBiquads);
        disconnectEqBiquads(toneGeneratorBiquadsLeft);
        disconnectEqBiquads(toneGeneratorBiquadsRight);
        toneGeneratorBandFiltersLeft.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        toneGeneratorBandFiltersLeft.length = 0;
        toneGeneratorBandFiltersRight.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        toneGeneratorBandFiltersRight.length = 0;
        if (toneGeneratorMerger) {
            try {
                toneGeneratorMerger.disconnect();
            } catch (e) { /* noop */ }
            toneGeneratorMerger = null;
        }
        toneGeneratorMerger = toneGeneratorContext.createChannelMerger(2);
        let wireSide = (specs, bandArr, bqArr, mergerCh) => {
            let last;
            if (multiBand) {
                last = connectParallelHpLpBandBranches(toneGeneratorContext, toneGeneratorOsc, bandArr, intervals);
            } else {
                last = toneGeneratorOsc;
                let hp = toneGeneratorContext.createBiquadFilter();
                hp.type = "highpass";
                hp.frequency.value = fromHz;
                hp.Q.value = 0.707;
                last.connect(hp);
                last = hp;
                bandArr.push(hp);
                let lp = toneGeneratorContext.createBiquadFilter();
                lp.type = "lowpass";
                lp.frequency.value = toHz;
                lp.Q.value = 0.707;
                last.connect(lp);
                last = lp;
                bandArr.push(lp);
            }
            specs.forEach((s) => {
                let bf = toneGeneratorContext.createBiquadFilter();
                bf.type = mapFilterTypeToBiquad(s.type);
                bf.frequency.value = s.freq;
                bf.Q.value = s.q;
                bf.gain.value = s.gain;
                last.connect(bf);
                last = bf;
                bqArr.push(bf);
            });
            last.connect(toneGeneratorMerger, 0, mergerCh);
        };
        wireSide(specL, toneGeneratorBandFiltersLeft, toneGeneratorBiquadsLeft, 0);
        wireSide(specR, toneGeneratorBandFiltersRight, toneGeneratorBiquadsRight, 1);
        toneGeneratorMerger.connect(toneGeneratorMasterGain);
    };
    let rebuildToneGeneratorEqChainMono = () => {
        if (!toneGeneratorOsc || !toneGeneratorContext || !toneGeneratorMasterGain) {
            return;
        }
        let intervals = readLiveSoundBandIntervals();
        let multiBand = intervals.length > 1;
        let iv0 = intervals[0];
        let singleFullBand = intervals.length === 1 && iv0.lo <= 20 && iv0.hi >= 20000;
        if (!multiBand && singleFullBand) {
            toneGeneratorBandFiltersMono.forEach((b) => {
                try { b.disconnect(); } catch (e) { /* noop */ }
            });
            toneGeneratorBandFiltersMono.length = 0;
            rebuildLiveEqChain(toneGeneratorOsc, toneGeneratorContext, toneGeneratorMasterGain, toneGeneratorBiquads);
            return;
        }
        let fromHz = iv0.lo;
        let toHz = iv0.hi;
        let specs = computeLiveEqSpecs();
        if (!multiBand && toneGeneratorBandFiltersMono.length === 2
                && specs.length === toneGeneratorBiquads.length
                && syncBandShelfFiltersInPlace(toneGeneratorContext, toneGeneratorBandFiltersMono, fromHz, toHz)) {
            if (specs.length === 0 || syncEqBiquadsInPlace(toneGeneratorContext, toneGeneratorBiquads, specs)) {
                return;
            }
        }
        toneGeneratorOsc.disconnect();
        disconnectEqBiquads(toneGeneratorBiquads);
        toneGeneratorBandFiltersMono.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        toneGeneratorBandFiltersMono.length = 0;
        let last;
        if (multiBand) {
            last = connectParallelHpLpBandBranches(toneGeneratorContext, toneGeneratorOsc, toneGeneratorBandFiltersMono, intervals);
        } else {
            last = toneGeneratorOsc;
            let hp = toneGeneratorContext.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = fromHz;
            hp.Q.value = 0.707;
            last.connect(hp);
            last = hp;
            toneGeneratorBandFiltersMono.push(hp);
            let lp = toneGeneratorContext.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = toHz;
            lp.Q.value = 0.707;
            last.connect(lp);
            last = lp;
            toneGeneratorBandFiltersMono.push(lp);
        }
        specs.forEach((s) => {
            let bf = toneGeneratorContext.createBiquadFilter();
            bf.type = mapFilterTypeToBiquad(s.type);
            bf.frequency.value = s.freq;
            bf.Q.value = s.q;
            bf.gain.value = s.gain;
            last.connect(bf);
            last = bf;
            toneGeneratorBiquads.push(bf);
        });
        last.connect(toneGeneratorMasterGain);
    };
    let rebuildToneGeneratorEqChain = () => {
        if (!toneGeneratorOsc || !toneGeneratorContext || !toneGeneratorMasterGain) {
            return;
        }
        if (liveStereoEqActive()) {
            rebuildToneGeneratorEqChainStereo();
        } else {
            disconnectEqBiquads(toneGeneratorBiquadsLeft);
            disconnectEqBiquads(toneGeneratorBiquadsRight);
            toneGeneratorBandFiltersLeft.forEach((b) => {
                try { b.disconnect(); } catch (e) { /* noop */ }
            });
            toneGeneratorBandFiltersLeft.length = 0;
            toneGeneratorBandFiltersRight.forEach((b) => {
                try { b.disconnect(); } catch (e) { /* noop */ }
            });
            toneGeneratorBandFiltersRight.length = 0;
            if (toneGeneratorMerger) {
                try {
                    toneGeneratorMerger.disconnect();
                } catch (e) { /* noop */ }
                toneGeneratorMerger = null;
            }
            rebuildToneGeneratorEqChainMono();
        }
    };
    let rebuildMusicEqChainStereo = () => {
        if (!musicMediaSourceNode || !musicContext || !musicMasterGain) {
            return;
        }
        let intervals = readLiveSoundBandIntervals();
        let multiBand = intervals.length > 1;
        let iv0 = intervals[0];
        let fromHz = iv0.lo;
        let toHz = iv0.hi;
        let { specL, specR } = computeLiveEqSpecsForStereoPaths();
        if (!multiBand && musicBandFiltersLeft.length === 2 && musicBandFiltersRight.length === 2
                && specL.length === musicBiquadsLeft.length
                && specR.length === musicBiquadsRight.length
                && syncBandShelfFiltersInPlace(musicContext, musicBandFiltersLeft, fromHz, toHz)
                && syncBandShelfFiltersInPlace(musicContext, musicBandFiltersRight, fromHz, toHz)) {
            if ((specL.length === 0 || syncEqBiquadsInPlace(musicContext, musicBiquadsLeft, specL))
                    && (specR.length === 0 || syncEqBiquadsInPlace(musicContext, musicBiquadsRight, specR))) {
                syncMusicOutputGain(musicContext);
                return;
            }
        }
        musicMediaSourceNode.disconnect();
        disconnectEqBiquads(musicBiquads);
        disconnectEqBiquads(musicBiquadsLeft);
        disconnectEqBiquads(musicBiquadsRight);
        disconnectMusicBandFilters();
        musicStereoSplitter = musicContext.createChannelSplitter(2);
        musicStereoMerger = musicContext.createChannelMerger(2);
        musicMediaSourceNode.connect(musicStereoSplitter);
        let wireSide = (splitOut, specs, bandArr, bqArr, mergerCh) => {
            let last;
            if (multiBand) {
                last = connectParallelHpLpMusicSide(musicContext, musicStereoSplitter, splitOut, bandArr, intervals);
            } else {
                let hp = musicContext.createBiquadFilter();
                hp.type = "highpass";
                hp.frequency.value = fromHz;
                hp.Q.value = 0.707;
                musicStereoSplitter.connect(hp, splitOut);
                last = hp;
                bandArr.push(hp);
                let lp = musicContext.createBiquadFilter();
                lp.type = "lowpass";
                lp.frequency.value = toHz;
                lp.Q.value = 0.707;
                last.connect(lp);
                last = lp;
                bandArr.push(lp);
            }
            specs.forEach((s) => {
                let bf = musicContext.createBiquadFilter();
                bf.type = mapFilterTypeToBiquad(s.type);
                bf.frequency.value = s.freq;
                bf.Q.value = s.q;
                bf.gain.value = s.gain;
                last.connect(bf);
                last = bf;
                bqArr.push(bf);
            });
            last.connect(musicStereoMerger, 0, mergerCh);
        };
        wireSide(0, specL, musicBandFiltersLeft, musicBiquadsLeft, 0);
        wireSide(1, specR, musicBandFiltersRight, musicBiquadsRight, 1);
        musicStereoMerger.connect(musicMasterGain);
        syncMusicOutputGain(musicContext);
    };
    let rebuildMusicEqChainMono = () => {
        if (!musicMediaSourceNode || !musicContext || !musicMasterGain) {
            return;
        }
        let intervals = readLiveSoundBandIntervals();
        let multiBand = intervals.length > 1;
        let iv0 = intervals[0];
        let fromHz = iv0.lo;
        let toHz = iv0.hi;
        let specs = computeLiveEqSpecs();
        if (!multiBand && musicBandFilters.length === 2
                && specs.length === musicBiquads.length
                && syncBandShelfFiltersInPlace(musicContext, musicBandFilters, fromHz, toHz)) {
            if (specs.length === 0 || syncEqBiquadsInPlace(musicContext, musicBiquads, specs)) {
                syncMusicOutputGain(musicContext);
                return;
            }
        }
        musicMediaSourceNode.disconnect();
        disconnectEqBiquads(musicBiquads);
        disconnectEqBiquads(musicBiquadsLeft);
        disconnectEqBiquads(musicBiquadsRight);
        disconnectMusicBandFilters();
        let last;
        if (multiBand) {
            last = connectParallelHpLpBandBranches(musicContext, musicMediaSourceNode, musicBandFilters, intervals);
        } else {
            last = musicMediaSourceNode;
            let hp = musicContext.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = fromHz;
            hp.Q.value = 0.707;
            last.connect(hp);
            last = hp;
            musicBandFilters.push(hp);
            let lp = musicContext.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = toHz;
            lp.Q.value = 0.707;
            last.connect(lp);
            last = lp;
            musicBandFilters.push(lp);
        }
        specs.forEach((s) => {
            let bf = musicContext.createBiquadFilter();
            bf.type = mapFilterTypeToBiquad(s.type);
            bf.frequency.value = s.freq;
            bf.Q.value = s.q;
            bf.gain.value = s.gain;
            last.connect(bf);
            last = bf;
            musicBiquads.push(bf);
        });
        last.connect(musicMasterGain);
        syncMusicOutputGain(musicContext);
    };
    let rebuildMusicEqChain = () => {
        if (!musicMediaSourceNode || !musicContext || !musicMasterGain) {
            return;
        }
        if (liveStereoEqActive()) {
            rebuildMusicEqChainStereo();
        } else {
            rebuildMusicEqChainMono();
        }
    };
    window.rebuildPinkNoiseEqChain = rebuildPinkNoiseEqChain;
    window.rebuildToneGeneratorEqChain = rebuildToneGeneratorEqChain;
    window.rebuildMusicEqChain = rebuildMusicEqChain;
    // Bridge all audio-engine.js bare-name references to addExtra()-scoped let vars
    window.disconnectEqBiquads = disconnectEqBiquads;
    window.disconnectPinkBandFilters = disconnectPinkBandFilters;
    window.disconnectMusicBandFilters = disconnectMusicBandFilters;
    Object.defineProperty(window, 'pinkNoiseProcessor',     { get: () => pinkNoiseProcessor,     set: v => { pinkNoiseProcessor = v; },     configurable: true });
    Object.defineProperty(window, 'pinkNoiseMasterGain',    { get: () => pinkNoiseMasterGain,    set: v => { pinkNoiseMasterGain = v; },    configurable: true });
    Object.defineProperty(window, 'pinkNoiseUserGain',      { get: () => pinkNoiseUserGain,      set: v => { pinkNoiseUserGain = v; },      configurable: true });
    Object.defineProperty(window, 'pinkNoiseAnalyser',      { get: () => pinkNoiseAnalyser,      set: v => { pinkNoiseAnalyser = v; },      configurable: true });
    Object.defineProperty(window, 'pinkNoiseMerger',        { get: () => pinkNoiseMerger,        set: v => { pinkNoiseMerger = v; },        configurable: true });
    Object.defineProperty(window, 'pinkNoiseBiquads',       { get: () => pinkNoiseBiquads,       set: v => { pinkNoiseBiquads = v; },       configurable: true });
    Object.defineProperty(window, 'pinkNoiseBiquadsLeft',   { get: () => pinkNoiseBiquadsLeft,   set: v => { pinkNoiseBiquadsLeft = v; },   configurable: true });
    Object.defineProperty(window, 'pinkNoiseBiquadsRight',  { get: () => pinkNoiseBiquadsRight,  set: v => { pinkNoiseBiquadsRight = v; },  configurable: true });
    Object.defineProperty(window, 'pinkNoiseBandFilters',   { get: () => pinkNoiseBandFilters,   set: v => { pinkNoiseBandFilters = v; },   configurable: true });
    Object.defineProperty(window, 'pinkNoiseBandFiltersLeft',  { get: () => pinkNoiseBandFiltersLeft,  set: v => { pinkNoiseBandFiltersLeft = v; },  configurable: true });
    Object.defineProperty(window, 'pinkNoiseBandFiltersRight', { get: () => pinkNoiseBandFiltersRight, set: v => { pinkNoiseBandFiltersRight = v; }, configurable: true });
    Object.defineProperty(window, 'toneGeneratorAnalyser',  { get: () => toneGeneratorAnalyser,  set: v => { toneGeneratorAnalyser = v; },  configurable: true });
    Object.defineProperty(window, 'toneGeneratorMerger',    { get: () => toneGeneratorMerger,    set: v => { toneGeneratorMerger = v; },    configurable: true });
    Object.defineProperty(window, 'toneGeneratorMasterGain',{ get: () => toneGeneratorMasterGain,set: v => { toneGeneratorMasterGain = v; },configurable: true });
    Object.defineProperty(window, 'toneGeneratorUserGain',  { get: () => toneGeneratorUserGain,  set: v => { toneGeneratorUserGain = v; },  configurable: true });
    Object.defineProperty(window, 'toneGeneratorBiquads',       { get: () => toneGeneratorBiquads,       set: v => { toneGeneratorBiquads = v; },       configurable: true });
    Object.defineProperty(window, 'toneGeneratorBiquadsLeft',   { get: () => toneGeneratorBiquadsLeft,   set: v => { toneGeneratorBiquadsLeft = v; },   configurable: true });
    Object.defineProperty(window, 'toneGeneratorBiquadsRight',  { get: () => toneGeneratorBiquadsRight,  set: v => { toneGeneratorBiquadsRight = v; },  configurable: true });
    Object.defineProperty(window, 'toneGeneratorBandFiltersMono',  { get: () => toneGeneratorBandFiltersMono,  set: v => { toneGeneratorBandFiltersMono = v; },  configurable: true });
    Object.defineProperty(window, 'toneGeneratorBandFiltersLeft',  { get: () => toneGeneratorBandFiltersLeft,  set: v => { toneGeneratorBandFiltersLeft = v; },  configurable: true });
    Object.defineProperty(window, 'toneGeneratorBandFiltersRight', { get: () => toneGeneratorBandFiltersRight, set: v => { toneGeneratorBandFiltersRight = v; }, configurable: true });
    Object.defineProperty(window, 'musicMasterGain',     { get: () => musicMasterGain,     set: v => { musicMasterGain = v; },     configurable: true });
    Object.defineProperty(window, 'musicAnalyser',       { get: () => musicAnalyser,       set: v => { musicAnalyser = v; },       configurable: true });
    Object.defineProperty(window, 'musicMediaSourceNode',{ get: () => musicMediaSourceNode, set: v => { musicMediaSourceNode = v; },configurable: true });
    Object.defineProperty(window, 'musicUserGain',       { get: () => musicUserGain,       set: v => { musicUserGain = v; },       configurable: true });
    Object.defineProperty(window, 'musicStereoSplitter', { get: () => musicStereoSplitter, set: v => { musicStereoSplitter = v; }, configurable: true });
    Object.defineProperty(window, 'musicStereoMerger',   { get: () => musicStereoMerger,   set: v => { musicStereoMerger = v; },   configurable: true });
    Object.defineProperty(window, 'musicBiquads',        { get: () => musicBiquads,        set: v => { musicBiquads = v; },        configurable: true });
    Object.defineProperty(window, 'musicBiquadsLeft',    { get: () => musicBiquadsLeft,    set: v => { musicBiquadsLeft = v; },    configurable: true });
    Object.defineProperty(window, 'musicBiquadsRight',   { get: () => musicBiquadsRight,   set: v => { musicBiquadsRight = v; },   configurable: true });
    Object.defineProperty(window, 'musicBandFilters',    { get: () => musicBandFilters,    set: v => { musicBandFilters = v; },    configurable: true });
    Object.defineProperty(window, 'musicBandFiltersLeft',  { get: () => musicBandFiltersLeft,  set: v => { musicBandFiltersLeft = v; },  configurable: true });
    Object.defineProperty(window, 'musicBandFiltersRight', { get: () => musicBandFiltersRight, set: v => { musicBandFiltersRight = v; }, configurable: true });
    Object.defineProperty(window, 'musicFileLoaded',     { get: () => musicFileLoaded,     set: v => { musicFileLoaded = v; },     configurable: true });
    Object.defineProperty(window, 'musicSeekDragging',   { get: () => musicSeekDragging,   set: v => { musicSeekDragging = v; },   configurable: true });
    Object.defineProperty(window, 'musicTrimDragging',   { get: () => musicTrimDragging,   set: v => { musicTrimDragging = v; },   configurable: true });
    Object.defineProperty(window, 'musicTrimIdleTimer',  { get: () => musicTrimIdleTimer,  set: v => { musicTrimIdleTimer = v; },  configurable: true });
    Object.defineProperty(window, 'musicObjectUrl',      { get: () => musicObjectUrl,      set: v => { musicObjectUrl = v; },      configurable: true });
    Object.defineProperty(window, 'musicRestoreCancelToken', { get: () => musicRestoreCancelToken, set: v => { musicRestoreCancelToken = v; }, configurable: true });
    Object.defineProperty(window, 'liveSoundToolsUserVolume',      { get: () => liveSoundToolsUserVolume,      set: v => { liveSoundToolsUserVolume = v; },      configurable: true });
    Object.defineProperty(window, 'lastEqPlaybackSource',           { get: () => lastEqPlaybackSource,           set: v => { lastEqPlaybackSource = v; },           configurable: true });
    Object.defineProperty(window, 'liveToneGeneratorPlaybackGain',  { get: () => liveToneGeneratorPlaybackGain,  set: v => { liveToneGeneratorPlaybackGain = v; },  configurable: true });
    Object.defineProperty(window, 'livePinkNoisePlaybackGain',      { get: () => livePinkNoisePlaybackGain,      set: v => { livePinkNoisePlaybackGain = v; },      configurable: true });
    Object.defineProperty(window, 'liveMusicPlaybackGain',          { get: () => liveMusicPlaybackGain,          set: v => { liveMusicPlaybackGain = v; },          configurable: true });
    window.applyLiveSoundToolsUserVolumeToAudioNodes = applyLiveSoundToolsUserVolumeToAudioNodes;
    if (typeof initEqLive === "function") {
        initEqLive();
    }

    let musicPlayButton = document.querySelector("div.extra-music .play");
    window.musicPlayButton = musicPlayButton;
    window.pinkNoisePlayButton = pinkNoisePlayButton;
    let musicAddRemoveButton = document.querySelector("div.extra-music button.music-add-remove");
    window.musicAddRemoveButton = musicAddRemoveButton;
    let musicFileInput = document.querySelector("div.extra-music input.music-file-input");
    let musicCard = document.querySelector("div.extra-music");
    window.musicCard = musicCard;
    let musicSegmentSliderEl = musicCard && musicCard.querySelector(".music-segment-slider");
    window.musicSegmentSliderEl = musicSegmentSliderEl;
    let musicSegmentTrackEl = musicSegmentSliderEl && musicSegmentSliderEl.querySelector(".music-segment-track");
    window.musicSegmentTrackEl = musicSegmentTrackEl;
    let musicSegmentSeekEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-seek");
    window.musicSegmentSeekEl = musicSegmentSeekEl;
    let musicSegmentProgressEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-progress");
    window.musicSegmentProgressEl = musicSegmentProgressEl;
    let musicSegmentOutsideLeftEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-outside-l");
    window.musicSegmentOutsideLeftEl = musicSegmentOutsideLeftEl;
    let musicSegmentOutsideRightEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-outside-r");
    window.musicSegmentOutsideRightEl = musicSegmentOutsideRightEl;
    let musicSegmentLoopedEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-looped");
    window.musicSegmentLoopedEl = musicSegmentLoopedEl;
    let musicSegmentHandleStart = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-handle-start");
    window.musicSegmentHandleStart = musicSegmentHandleStart;
    let musicSegmentHandleEnd = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-handle-end");
    window.musicSegmentHandleEnd = musicSegmentHandleEnd;
    let musicSegmentHandleInsetPx = 8;
    window.musicSegmentHandleInsetPx = musicSegmentHandleInsetPx;
    let musicFileInput_exposed = musicFileInput;
    window.musicFileInput = musicFileInput_exposed;
    GraphToolPlugin._call('musicPanelReady');
    if (typeof initExtraBootstrap === "function") {
        initExtraBootstrap();
    }

    const EQ_GRAPH_BASE_GAIN = 0.1;
    /* Movement past this (px) starts a drag; first motion picks freq-only vs gain-only by |dx| vs |dy|. */
    const EQ_GRAPH_DRAG_THRESHOLD_PX = 5;
    /* Hysteresis: lock when pointer (svg space) leaves plot; unlock when it returns inside this inset. */
    const EQ_GRAPH_POINTER_LOCK_INSET = 3;
    let roundEqGraphGainDb = (db) => {
        if (!Number.isFinite(db)) {
            return EQ_GRAPH_BASE_GAIN;
        }
        return Math.round(db * 10) / 10;
    };
    let clampEqGraphGainToInputRange = (db) => {
        let [gLo, gHi] = getEqConstraintGainLoHi();
        return Math.min(gHi, Math.max(gLo, db));
    };
    /** Gain from plot Y vs drag-start ref: 1:1 with graph Y-axis dB (same d3 `y` as curves). */
    let eqGraphGainFromPlotY = (anchorDb, refPlotY, currentPlotY) => {
        let dDb = y.invert(currentPlotY) - y.invert(refPlotY);
        return clampEqGraphGainToInputRange(roundEqGraphGainDb(anchorDb + dDb));
    };
    let scheduleApplyEqDuringGraphDrag = () => {
        if (eqGraphApplyEqDragTimer != null) return;
        eqGraphApplyEqDragTimer = requestAnimationFrame(() => {
            eqGraphApplyEqDragTimer = null;
            cancelDeferredApplyEQ();
            applyEQExec({ skipRestoreFocus: true, liveGraphEqDrag: true });
            scheduleLiveEqSync();
        });
    };
    /** @returns {number} row index, or -1 if max bands */
    let addPeakingFilterFromHz = (hz, initialGain, options) => {
        options = options || {};
        eqFiltersUserHasEdited = true;
        if (initialGain === undefined) {
            initialGain = 0;
        }
        let [fLo, fHi] = getEqConstraintFreqLoHi();
        hz = Math.min(fHi, Math.max(fLo, Math.round(hz)));
        let [gLo, gHi] = getEqConstraintGainLoHi();
        initialGain = Math.min(gHi, Math.max(gLo, initialGain));
        let [qLo, qHi] = getEqConstraintQLoHi();
        let defaultQ = Math.min(qHi, Math.max(qLo, 1));
        let maxA = getEffectiveEqMaxBands();
        let activeBound = Math.min(eqBands, maxA);
        let targetIdx = -1;
        for (let i = 0; i < activeBound; i++) {
            if (filterRowIsAllZeros(i)) {
                targetIdx = i;
                break;
            }
        }
        let focusGainIndex;
        if (targetIdx >= 0) {
            filterEnabledInput[targetIdx].checked = true;
            filterTypeSelect[targetIdx].value = firstAllowedEqFilterType();
            filterFreqInput[targetIdx].value = String(hz);
            filterQInput[targetIdx].value = String(defaultQ);
            filterGainInput[targetIdx].value = String(initialGain);
            focusGainIndex = targetIdx;
        } else if (eqBands < maxA) {
            eqBands = Math.min(eqBands + 1, maxA);
            updateFilterElements();
            let j = eqBands - 1;
            filterEnabledInput[j].checked = true;
            filterTypeSelect[j].value = firstAllowedEqFilterType();
            filterFreqInput[j].value = String(hz);
            filterQInput[j].value = String(defaultQ);
            filterGainInput[j].value = String(initialGain);
            focusGainIndex = j;
        } else {
            alert("No free filter slot within Max filters. Raise the limit or clear a band in the active rows.");
            return -1;
        }
        if (options.skipFocus) {
            cancelDeferredApplyEQ();
            applyEQExec({ skipRestoreFocus: true });
        } else {
            applyEQ();
        }
        scheduleLiveEqSync();
        if (!options.skipFocus) {
            setTimeout(() => {
                let gainEl = filterGainInput[focusGainIndex];
                if (gainEl && !gainEl.disabled) {
                    gainEl.focus();
                    gainEl.select();
                }
            }, 150);
        }
        return focusGainIndex;
    };
    window.addPeakingFilterFromHz = addPeakingFilterFromHz;
    window.EQ_GRAPH_BASE_GAIN = EQ_GRAPH_BASE_GAIN;
    window.clearLiveSoundIntervalsDatasetIfPresent = clearLiveSoundIntervalsDatasetIfPresent;
    window.syncEqSoundRangeBrushFromLiveSoundInputs = syncEqSoundRangeBrushFromLiveSoundInputs;
    tryEqGraphClickAddFilter = (m) => {
        let st = computeEqNodePreviewAtMouse(m);
        if (!st) {
            return false;
        }
        if (findEqGraphMarkerHit(m)) {
            return false;
        }
        let yOff = y(getOffset(st.tracePhone)) - y(0);
        let cx = x(st.fHz);
        let cy = y(st.db) + yOff;
        if (eqGraphPlotDistPx(m, cx, cy) > EQ_GRAPH_MARKER_HIT_PX) {
            return false;
        }
        /* skipFocus: immediate applyEQExec + updateEqFilterMarkers so syncEqHoverPreview can
           hit the new marker; avoid focusing gain (OS cursor) so the next click can target the graph. */
        let newIx = addPeakingFilterFromHz(st.fHz, EQ_GRAPH_BASE_GAIN, { skipFocus: true });
        if (newIx < 0) {
            return false;
        }
        setEqFilterSelectedRow(newIx, true);
        return true;
    };
    let eqGraphRemoveDragListeners = () => {
        eqGraphRemoveDragSelectLock();
        document.removeEventListener("pointermove", eqGraphDragMove, true);
        document.removeEventListener("pointerup", eqGraphDragEnd, true);
        document.removeEventListener("pointercancel", eqGraphDragEnd, true);
    };
    let eqGraphExitPointerLockIfAny = () => {
        let ex = document.exitPointerLock
            || document.webkitExitPointerLock
            || document.mozExitPointerLock;
        if (ex) {
            try {
                ex.call(document);
            } catch (err) { /* noop */ }
        }
    };
    let eqGraphTypeCycleOrder = { PK: "LSQ", LSQ: "HSQ", HSQ: "PK" };
    let eqGraphPerformDragCleanup = (st, endEvent) => {
        if (st.mode === "soundRange") {
            if (st.soundRangeActive) {
                applyLiveSoundRangeFromHzPair(st.soundRangeAnchorHz, st.soundRangeLastHz,
                    st.soundRangeAppend);
                let bandEl = document.querySelector("div.live-sound-tools .live-sound-band");
                if (bandEl && typeof bandEl.scrollIntoView === "function") {
                    bandEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
                }
                if (toneGeneratorToInput) {
                    requestAnimationFrame(() => {
                        toneGeneratorToInput.focus();
                        toneGeneratorToInput.select();
                    });
                }
            }
            syncEqSoundRangeBrushFromLiveSoundInputs();
            if (graphPlotHitRect && graphPlotHitRect.node()) {
                graphPlotHitRect.node().style.cursor = "";
            }
            if (endEvent && typeof endEvent.clientX === "number"
                    && typeof endEvent.clientY === "number") {
                lastGraphPlotPointerClient = { x: endEvent.clientX, y: endEvent.clientY };
            }
            eqGraphExitPointerLockIfAny();
            if (st.captureEl) {
                st.captureEl.style.cursor = "";
                try {
                    st.captureEl.releasePointerCapture(st.pointerId);
                } catch (err) { /* noop */ }
            }
            eqGraphRemoveDragListeners();
            cancelAnimationFrame(eqGraphApplyEqDragTimer);
            eqGraphApplyEqDragTimer = null;
            eqGraphPointerState = null;
            eqGraphSkipNextClick = true;
            if (eqGraphSkipClickClearTimer) {
                clearTimeout(eqGraphSkipClickClearTimer);
            }
            eqGraphSkipClickClearTimer = setTimeout(() => {
                eqGraphSkipClickClearTimer = null;
                eqGraphSkipNextClick = false;
            }, 800);
            if (endEvent) {
                let mUp = clientToGraphPlotXY(endEvent.clientX, endEvent.clientY);
                if (mUp) {
                    syncEqHoverPreview(mUp);
                }
            }
            return;
        }
        let didTapAddNewBand = !st.dragging && st.filterIndex === null;
        if (endEvent && typeof endEvent.clientX === "number"
                && typeof endEvent.clientY === "number") {
            lastGraphPlotPointerClient = { x: endEvent.clientX, y: endEvent.clientY };
        }
        eqGraphExitPointerLockIfAny();
        if (st.captureEl) {
            st.captureEl.style.cursor = "";
            try {
                st.captureEl.releasePointerCapture(st.pointerId);
            } catch (err) { /* noop */ }
        }
        eqGraphRemoveDragListeners();
        cancelAnimationFrame(eqGraphApplyEqDragTimer);
        eqGraphApplyEqDragTimer = null;
        eqGraphPointerState = null;
        eqGraphSkipNextClick = true;
        if (eqGraphSkipClickClearTimer) {
            clearTimeout(eqGraphSkipClickClearTimer);
        }
        eqGraphSkipClickClearTimer = setTimeout(() => {
            eqGraphSkipClickClearTimer = null;
            eqGraphSkipNextClick = false;
        }, 800);
        if (didTapAddNewBand) {
            /* Same as graph click-add: immediate markers, no gain focus / refocus steal */
            let newIx = addPeakingFilterFromHz(st.fHz, EQ_GRAPH_BASE_GAIN, { skipFocus: true });
            if (newIx >= 0) {
                setEqFilterSelectedRow(newIx, true);
                eqHistoryCommitTransaction();
            }
        } else if (st.filterIndex !== null && st.dragging) {
            cancelDeferredApplyEQ();
            applyEQExec();
            scheduleLiveEqSync();
            eqHistoryCommitTransaction(st.beforeDragSnap || null);
        }
        if (st.filterIndex !== null && st.dragging && st.axisLock) {
            let ix = st.filterIndex;
            let el = null;
            if (st.axisLock === "gain" && filterGainInput[ix]) {
                el = filterGainInput[ix];
            } else if (st.axisLock === "freq" && filterFreqInput[ix]) {
                el = filterFreqInput[ix];
            }
            /* Touch: focusing number inputs opens the on-screen keyboard; desktop mouse/pen keep focus for editing. */
            if (el && endEvent && endEvent.pointerType !== "touch") {
                requestAnimationFrame(() => {
                    el.focus();
                    el.select();
                });
            }
        }
        if (endEvent) {
            let mUp = clientToGraphPlotXY(endEvent.clientX, endEvent.clientY);
            if (mUp) {
                syncEqHoverPreview(mUp);
            }
            /* Touch has no hover; clear stored client pos for stale hit-tests. */
            if (endEvent.pointerType === "touch") {
                lastGraphPlotPointerClient = null;
            }
        }
        /* applyEqGraphTraceStrokeEmphasis + input focus scheduling can paint after applyEQExec; run
           trace dimming on the next frame so parent vs EQ opacity does not flash full on release. */
        if (extraEnabled && extraEQEnabled && st.mode === "eq") {
            requestAnimationFrame(() => {
                applyParametricEqGraphTraceFocus();
                updateEqTraceOpacity();
            });
        }
    };
    function eqGraphOnPointerLockChange() {
        if (document.pointerLockElement || !eqGraphPointerState) {
            return;
        }
        eqGraphPointerState.pointerLockActive = false;
    }
    document.addEventListener("pointerlockchange", eqGraphOnPointerLockChange);
    function eqGraphDragMove(e) {
        if (!eqGraphPointerState || e.pointerId !== eqGraphPointerState.pointerId) {
            return;
        }
        let st = eqGraphPointerState;
        if (st.mode === "soundRange") {
            let mClient = clientToGraphPlotXY(e.clientX, e.clientY);
            if (!mClient) {
                return;
            }
            let mx = Math.min(pad.l + W, Math.max(pad.l, mClient[0]));
            let [fLoSr, fHiSr] = getEqConstraintFreqLoHi();
            let hz = Math.round(Math.min(fHiSr, Math.max(fLoSr, x.invert(mx))));
            st.soundRangeLastHz = hz;
            let dx = e.clientX - st.startClientX;
            let dy = e.clientY - st.downClientY;
            if (!st.soundRangeActive
                    && Math.abs(dx) >= EQ_GRAPH_DRAG_THRESHOLD_PX
                    && Math.abs(dx) > Math.abs(dy)) {
                st.soundRangeActive = true;
            }
            if (st.soundRangeActive) {
                if (st.soundRangeAppend) {
                    renderEqSoundRangeBrushFromIntervals(readLiveSoundBandIntervals(),
                        st.soundRangeAnchorHz, st.soundRangeLastHz);
                } else {
                    renderEqSoundRangeBrush(st.soundRangeAnchorHz, st.soundRangeLastHz);
                }
                gEqSoundRangeBrush.raise();
                gEqFilterMarkers.raise();
                gEqHoverPreview.raise();
            }
            lastGraphPlotPointerClient = { x: e.clientX, y: e.clientY };
            syncEqHoverPreview(mClient);
            return;
        }
        let svg = st.captureEl;
        let locked = document.pointerLockElement === svg;
        let coalesced = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
        let eventList = (coalesced && coalesced.length) ? coalesced : [e];
        for (let ei = 0; ei < eventList.length; ei++) {
            let ev = eventList[ei];
            let mx;
            let mClient = null;
            if (locked) {
                st.pointerLockActive = true;
                st.accumMovementX += ev.movementX;
                st.accumMovementY += ev.movementY;
                st.accumPlotY += ev.movementY;
                mx = st.originPlotMx + st.accumMovementX * st.svgScaleX;
                mx = Math.min(pad.l + W, Math.max(pad.l, mx));
                let plotX = st.originPlotMx + st.accumMovementX * st.svgScaleX;
                let plotY = st.originPlotMy + st.accumPlotY * st.svgScaleY;
                let ins = EQ_GRAPH_POINTER_LOCK_INSET;
                if (plotX >= pad.l + ins && plotX <= pad.l + W - ins
                        && plotY >= pad.t + ins && plotY <= pad.t + H - ins) {
                    eqGraphExitPointerLockIfAny();
                    st.pointerLockActive = false;
                }
            } else {
                let refX = ev.clientX - st.grabOffClientX;
                let refY = ev.clientY - st.grabOffClientY;
                mClient = clientToGraphPlotXY(refX, refY);
                if (!mClient) {
                    continue;
                }
                mx = Math.min(pad.l + W, Math.max(pad.l, mClient[0]));
                let rawDy = st.startClientY - refY;
                st.accumMovementX = (mx - st.originPlotMx) / st.svgScaleX;
                st.accumMovementY = -rawDy;
                st.accumPlotY = (mClient[1] - st.originPlotMy) / st.svgScaleY;
                /* Do not request pointer lock: on unlock the OS restores the cursor to the pre-lock
                   position, which desyncs it from the node after a drag. Pointer capture on the SVG
                   already keeps move/up events while the button is held. */
            }
            let currentPlotY = locked
                ? st.originPlotMy + st.accumPlotY * st.svgScaleY
                : mClient[1];
            let gainT = eqGraphGainFromPlotY(
                st.gainDragAnchorDb,
                st.gainDragRefPlotY,
                currentPlotY);
            let [fLoG, fHiG] = getEqConstraintFreqLoHi();
            let freqT = Math.round(Math.min(fHiG, Math.max(fLoG, x.invert(mx))));
            let adx;
            let ady;
            if (locked) {
                if (st.filterIndex === null) {
                    adx = st.accumMovementX;
                    ady = st.accumMovementY;
                } else {
                    adx = st.accumMovementX;
                    ady = st.accumMovementY - st.baseAccumMovementY;
                }
            } else {
                adx = ev.clientX - st.startClientX;
                ady = ev.clientY - st.downClientY;
            }
            if (st.filterIndex === null) {
                let dist = locked
                    ? Math.hypot(st.accumMovementX, st.accumMovementY)
                    : Math.hypot(ev.clientX - st.startClientX, ev.clientY - st.startClientY);
                if (dist < EQ_GRAPH_DRAG_THRESHOLD_PX) {
                    continue;
                }
                /* Before axis lock / addPeakingFilterFromHz: Safari can deliver pointerup reentrantly
                   while this handler runs; didTapAddNewBand uses !dragging — set dragging early so
                   cleanup cannot spawn a duplicate band mid-creation. */
                st.dragging = true;
                if (st.axisLock === null) {
                    st.axisLock = Math.abs(adx) >= Math.abs(ady) ? "freq" : "gain";
                    if (st.axisLock === "freq") {
                        /* Ignore vertical bleed before axis lock: keep gain at pointer-down anchor. */
                        st.lockGainDb = roundEqGraphGainDb(st.gainDragAnchorDb);
                    } else {
                        /* Ignore horizontal bleed before lock: keep freq at drag start. */
                        let [fLoL, fHiL] = getEqConstraintFreqLoHi();
                        st.lockFreqHz = Math.round(Math.min(fHiL, Math.max(fLoL, st.fHz)));
                    }
                }
                let freq = st.axisLock === "freq" ? freqT : st.lockFreqHz;
                let gain = st.axisLock === "gain" ? gainT : st.lockGainDb;
                let idx = addPeakingFilterFromHz(freq, gain, {
                    skipFocus: true,
                });
                if (idx < 0) {
                    eqGraphSkipNextClick = true;
                    eqGraphPointerState = null;
                    eqGraphRemoveDragListeners();
                    eqGraphExitPointerLockIfAny();
                    if (eqGraphSkipClickClearTimer) {
                        clearTimeout(eqGraphSkipClickClearTimer);
                    }
                    eqGraphSkipClickClearTimer = setTimeout(() => {
                        eqGraphSkipClickClearTimer = null;
                        eqGraphSkipNextClick = false;
                    }, 800);
                    if (st.captureEl) {
                        try {
                            st.captureEl.releasePointerCapture(st.pointerId);
                        } catch (err) { /* noop */ }
                    }
                    return;
                }
                st.filterIndex = idx;
                st.liveFHz = freq;
                setEqFilterSelectedRow(idx, true);
                scheduleApplyEqDuringGraphDrag();
                if (st.axisLock === "freq") {
                    syncToneGeneratorToEqFrequencyHz(freq);
                }
                continue;
            }
            let distExisting = locked
                ? Math.hypot(st.accumMovementX,
                    st.accumMovementY - st.baseAccumMovementY)
                : Math.hypot(ev.clientX - st.startClientX,
                    ev.clientY - st.downClientY);
            if (distExisting < EQ_GRAPH_DRAG_THRESHOLD_PX) {
                continue;
            }
            st.dragging = true;
            if (st.axisLock === null) {
                st.axisLock = Math.abs(adx) >= Math.abs(ady) ? "freq" : "gain";
                if (st.axisLock === "freq") {
                    st.lockGainDb = roundEqGraphGainDb(st.gainDragAnchorDb);
                } else {
                    let [fLoL, fHiL] = getEqConstraintFreqLoHi();
                    st.lockFreqHz = Math.round(Math.min(fHiL, Math.max(fLoL, st.fHz)));
                }
            }
            let freq = st.axisLock === "freq" ? freqT : st.lockFreqHz;
            let gain = st.axisLock === "gain" ? gainT : st.lockGainDb;
            st.liveFHz = freq;
            eqFiltersUserHasEdited = true;
            filterFreqInput[st.filterIndex].value = String(freq);
            filterGainInput[st.filterIndex].value = String(gain);
            scheduleApplyEqDuringGraphDrag();
            if (st.axisLock === "freq") {
                syncToneGeneratorToEqFrequencyHz(freq);
            }
        }
        if (!locked) {
            lastGraphPlotPointerClient = { x: e.clientX, y: e.clientY };
        }
    }
    function eqGraphDragEnd(e) {
        if (!eqGraphPointerState || e.pointerId !== eqGraphPointerState.pointerId) {
            return;
        }
        eqGraphPerformDragCleanup(eqGraphPointerState, e);
    }
    function eqGraphPointerDown(e) {
        if (interactInspect) {
            return;
        }
        /* Real touch devices: skip graph pointer path + suppress follow-up synthetic click (EQ add).
           Safari desktop can report pointerType "touch" for trackpad; (pointer: coarse) keeps this
           branch for phones/tablets only so Sound Tools / range drag still work on Mac Safari. */
        if (e.pointerType === "touch" && typeof window.matchMedia === "function"
                && window.matchMedia("(pointer: coarse)").matches) {
            eqGraphSuppressClickAddFromTouch = true;
            if (eqGraphTouchSuppressClearTimer) {
                clearTimeout(eqGraphTouchSuppressClearTimer);
            }
            eqGraphTouchSuppressClearTimer = setTimeout(() => {
                eqGraphTouchSuppressClearTimer = null;
                eqGraphSuppressClickAddFromTouch = false;
            }, 600);
            return;
        }
        if (e.pointerType === "mouse" && e.button !== 0) {
            return;
        }
        let node = graphPlotHitRect && graphPlotHitRect.node();
        if (!node) {
            return;
        }
        let m = clientToGraphPlotXY(e.clientX, e.clientY);
        if (!m) {
            return;
        }
        lastGraphPlotPointerClient = { x: e.clientX, y: e.clientY };
        let hit = findEqGraphMarkerHit(m);
        let stPreview;
        let soundRangeSelect = false;
        let initialAccumMovementY = 0;
        let initialFilterIndex = null;
        let gainDragAnchorDb = EQ_GRAPH_BASE_GAIN;
        if (hit) {
            let g0 = parseFloat(filterGainInput[hit.rowIndex].value) || 0;
            if (!Number.isFinite(g0)) {
                g0 = 0;
            }
            gainDragAnchorDb = g0;
            initialFilterIndex = hit.rowIndex;
            let fCell = parseInt(filterFreqInput[hit.rowIndex].value, 10) || 20;
            stPreview = { fHz: Math.min(20000, Math.max(20, fCell)) };
            setEqFilterSelectedRow(hit.rowIndex, true);
        } else {
            let tabEq = document.querySelector("div.select");
            if (!extraEnabled || !extraEQEnabled || !tabEq
                    || tabEq.getAttribute("data-selected") !== "extra") {
                return;
            }
            stPreview = computeEqNodePreviewAtMouse(m);
            let nearTrace = false;
            if (stPreview) {
                let yOff = y(getOffset(stPreview.tracePhone)) - y(0);
                let cx = x(stPreview.fHz);
                let cy = y(stPreview.db) + yOff;
                let dist = eqGraphPlotDistPx(m, cx, cy);
                nearTrace = dist <= EQ_GRAPH_MARKER_HIT_PX;
            }
            if (nearTrace) {
                setEqFilterSelectedRow(null);
            } else {
                soundRangeSelect = true;
                setEqFilterSelectedRow(null);
            }
        }
        let svg = node.ownerSVGElement || node;
        let plotRect = svg.getBoundingClientRect();
        let vb = svg.viewBox.baseVal;
        let svgScaleX = vb.width / Math.max(1e-6, plotRect.width);
        let svgScaleY = vb.height / Math.max(1e-6, plotRect.height);
        let grabOffClientX = 0;
        let grabOffClientY = 0;
        let originMx = Math.min(pad.l + W, Math.max(pad.l, m[0]));
        let originMy = Math.min(pad.t + H, Math.max(pad.t, m[1]));
        let startClientYVal = e.clientY;
        if (hit) {
            let nc = graphPlotXYToClient(hit.cx, hit.cy);
            if (nc) {
                grabOffClientX = e.clientX - nc[0];
                grabOffClientY = e.clientY - nc[1];
                startClientYVal = nc[1];
                originMx = hit.cx;
                originMy = hit.cy;
            }
        }
        let gainDragRefPlotY = originMy;
        let mxClampFreq = Math.min(pad.l + W, Math.max(pad.l, m[0]));
        let [fLoPtr, fHiPtr] = getEqConstraintFreqLoHi();
        let freqAtPointer = Math.round(Math.min(fHiPtr, Math.max(fLoPtr, x.invert(mxClampFreq))));
        let previewFHz = stPreview ? stPreview.fHz : freqAtPointer;
        cancelAnimationFrame(eqGraphApplyEqDragTimer);
        eqGraphApplyEqDragTimer = null;
        pathHL(false);
        if (!soundRangeSelect) {
            eqHistoryPendingPreEditSnap = null;
        }
        eqGraphPointerState = {
            mode: soundRangeSelect ? "soundRange" : "eq",
            soundRangeAnchorHz: soundRangeSelect ? freqAtPointer : null,
            soundRangeLastHz: soundRangeSelect ? freqAtPointer : null,
            soundRangeAppend: Boolean(soundRangeSelect && e.shiftKey),
            soundRangeActive: false,
            startClientX: e.clientX,
            startClientY: startClientYVal,
            grabOffClientX: grabOffClientX,
            grabOffClientY: grabOffClientY,
            downClientY: e.clientY,
            fHz: soundRangeSelect ? freqAtPointer : previewFHz,
            liveFHz: soundRangeSelect ? freqAtPointer : previewFHz,
            filterIndex: initialFilterIndex,
            dragging: false,
            axisLock: null,
            lockFreqHz: null,
            lockGainDb: null,
            gainDragAnchorDb: gainDragAnchorDb,
            gainDragRefPlotY: gainDragRefPlotY,
            pointerId: e.pointerId,
            captureEl: svg,
            originPlotMx: originMx,
            originPlotMy: originMy,
            accumMovementX: 0,
            accumMovementY: initialAccumMovementY,
            baseAccumMovementY: initialAccumMovementY,
            accumPlotY: 0,
            svgScaleX: svgScaleX,
            svgScaleY: svgScaleY,
            pointerLockActive: false,
            beforeDragSnap: (!soundRangeSelect && initialFilterIndex !== null)
                ? eqHistoryTakeSnapshot()
                : null,
        };
        /* Sound Tools range drag: avoid preventDefault so Safari keeps default gesture handling;
           EQ drag still uses it to block stray text selection. Selection lock is fine for both. */
        if (!soundRangeSelect) {
            e.preventDefault();
        }
        eqGraphInstallDragSelectLock();
        svg.style.cursor = "grabbing";
        if (graphPlotHitRect && graphPlotHitRect.node()) {
            graphPlotHitRect.node().style.cursor = "grabbing";
        }
        try {
            svg.setPointerCapture(e.pointerId);
        } catch (err) { /* noop */ }
        document.addEventListener("pointermove", eqGraphDragMove, true);
        document.addEventListener("pointerup", eqGraphDragEnd, true);
        document.addEventListener("pointercancel", eqGraphDragEnd, true);
    }
    /* Wheel Q: normalize to ~pixel scale, then sublinear steps. Above Q_FINE_MAX use 0.1; at that
       value and below use 0.01 for smoother low-Q tweaks. Sensitivity tapers toward Qmin; a float per
       band accumulates until rounding (manual Q edits resync via |float − input|). */
    /* Keep in sync with EQ_FILTER_KEYBOARD_Q_* (parametric row arrow keys in filtersContainer). */
    const EQ_GRAPH_WHEEL_Q_STEP = 0.1;
    const EQ_GRAPH_WHEEL_Q_STEP_FINE = 0.01;
    const EQ_GRAPH_WHEEL_Q_FINE_MAX = 0.3;
    const EQ_GRAPH_WHEEL_Q_SYNC_TOL_FINE = 0.009;
    const EQ_GRAPH_WHEEL_SENS_REF_PX = 42;
    const EQ_GRAPH_WHEEL_MAX_STEPS = 5;
    const EQ_GRAPH_WHEEL_Q_SENS_KNEE = 2;
    const EQ_GRAPH_WHEEL_Q_SENS_FLOOR = 0.22;
    const EQ_GRAPH_WHEEL_Q_SENS_GAMMA = 1.2;
    let eqGraphWheelQFloat = Object.create(null);
    window.eqGraphWheelQFloat = eqGraphWheelQFloat;
    let eqGraphWheelQSensitivity = (q) => {
        if (!Number.isFinite(q)) {
            return 1;
        }
        if (q >= EQ_GRAPH_WHEEL_Q_SENS_KNEE) {
            return 1;
        }
        let t = (q - 0.1) / (EQ_GRAPH_WHEEL_Q_SENS_KNEE - 0.1);
        t = Math.max(0, Math.min(1, t));
        return EQ_GRAPH_WHEEL_Q_SENS_FLOOR
            + (1 - EQ_GRAPH_WHEEL_Q_SENS_FLOOR) * Math.pow(t, EQ_GRAPH_WHEEL_Q_SENS_GAMMA);
    };
    function eqGraphPlotWheel(e) {
        if (interactInspect) {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab
                || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        let stWheel = eqGraphPointerState;
        let wheelDuringEqDrag = Boolean(stWheel && stWheel.mode === "eq"
            && stWheel.filterIndex !== null);
        if (stWheel && !wheelDuringEqDrag) {
            return;
        }
        let i = -1;
        if (wheelDuringEqDrag) {
            i = stWheel.filterIndex;
        } else {
            let m = clientToGraphPlotXY(e.clientX, e.clientY);
            if (!m) {
                return;
            }
            let hit = findEqGraphMarkerHit(m);
            if (!hit) {
                return;
            }
            i = hit.rowIndex;
        }
        e.preventDefault();
        let qDisplay = parseFloat(filterQInput[i].value);
        if (!Number.isFinite(qDisplay)) {
            qDisplay = 1;
        }
        let qFloat = eqGraphWheelQFloat[i];
        let qSyncTol = qDisplay <= EQ_GRAPH_WHEEL_Q_FINE_MAX
            ? EQ_GRAPH_WHEEL_Q_SYNC_TOL_FINE
            : 0.051;
        if (!Number.isFinite(qFloat) || Math.abs(qFloat - qDisplay) > qSyncTol) {
            eqGraphWheelQFloat[i] = qDisplay;
            qFloat = qDisplay;
        }
        let qFloatBeforeWheel = qFloat;
        let dy = e.deltaY;
        if (e.deltaMode === 1) {
            dy *= 16;
        } else if (e.deltaMode === 2) {
            dy *= 100;
        }
        let dir = dy > 0 ? 1 : dy < 0 ? -1 : 0;
        if (!dir) {
            return;
        }
        let mag = Math.abs(dy);
        let notchEq = Math.pow(mag, 0.58) / Math.pow(EQ_GRAPH_WHEEL_SENS_REF_PX, 0.58);
        let steps = Math.max(1, Math.min(EQ_GRAPH_WHEEL_MAX_STEPS, Math.round(notchEq)));
        let sens = eqGraphWheelQSensitivity(qFloat);
        let qStep = qFloat <= EQ_GRAPH_WHEEL_Q_FINE_MAX
            ? EQ_GRAPH_WHEEL_Q_STEP_FINE
            : EQ_GRAPH_WHEEL_Q_STEP;
        let dq = dir * qStep * steps * sens;
        let [qLo, qHi] = getEqConstraintQLoHi();
        /* Scroll up → lower Q, scroll down → higher Q (invert raw deltaY convention). */
        qFloat = Math.min(qHi, Math.max(qLo, qFloat - dq));
        eqGraphWheelQFloat[i] = qFloat;
        let q;
        if (qFloat <= EQ_GRAPH_WHEEL_Q_FINE_MAX) {
            q = Math.round(qFloat * 100) / 100;
        } else {
            q = Math.round(qFloat * 10) / 10;
            /* 0.31…0.34 rounds to one decimal as 0.3 — same as fine cap, so display/input never
               advances and tight fine-band resync fights the float (feels “stuck”). Leaving the
               fine band upward: jump to the next tenth (0.4). */
            if (q <= EQ_GRAPH_WHEEL_Q_FINE_MAX && qFloat > EQ_GRAPH_WHEEL_Q_FINE_MAX
                    && qFloatBeforeWheel <= EQ_GRAPH_WHEEL_Q_FINE_MAX) {
                q = Math.min(qHi, EQ_GRAPH_WHEEL_Q_FINE_MAX + EQ_GRAPH_WHEEL_Q_STEP);
                eqGraphWheelQFloat[i] = q;
            }
        }
        q = Math.max(qLo, Math.min(qHi, q));
        filterQInput[i].value = q <= EQ_GRAPH_WHEEL_Q_FINE_MAX
            ? q.toFixed(2)
            : String(q);
        cancelDeferredApplyEQ();
        if (wheelDuringEqDrag) {
            applyEQExec({ skipRestoreFocus: true, liveGraphEqDrag: true });
        } else {
            applyEQExec();
        }
        scheduleLiveEqSync();
        eqHistoryNotifyChange();
        setEqFilterSelectedRow(i);
        if (!wheelDuringEqDrag) {
            requestAnimationFrame(() => {
                let qEl = filterQInput[i];
                if (qEl) {
                    qEl.focus();
                    qEl.select();
                }
            });
        }
    }
    function eqGraphPlotContextMenu(e) {
        if (interactInspect || eqGraphPointerState) {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab
                || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        let m = clientToGraphPlotXY(e.clientX, e.clientY);
        if (!m) {
            return;
        }
        let hit = findEqGraphMarkerHit(m);
        if (!hit) {
            return;
        }
        e.preventDefault();
        let sel = filterTypeSelect[hit.rowIndex];
        if (sel) {
            let cur = (sel.value || "").trim();
            sel.value = eqGraphTypeCycleOrder[cur] || "PK";
        }
        cancelDeferredApplyEQ();
        applyEQExec();
        scheduleLiveEqSync();
        setEqFilterSelectedRow(hit.rowIndex);
        syncEqHoverPreview(m);
    }
    if (graphPlotHitRect && graphPlotHitRect.node()) {
        graphPlotHitRect.node().addEventListener("pointerdown", eqGraphPointerDown, {
            passive: false,
        });
        graphPlotHitRect.node().addEventListener("wheel", eqGraphPlotWheel, { passive: false });
        graphPlotHitRect.node().addEventListener("contextmenu", eqGraphPlotContextMenu, {
            passive: false,
        });
    }
    let clientPointOverGraphPlot = (clientX, clientY) => {
        let plot = graphPlotHitRect && graphPlotHitRect.node();
        if (!plot) {
            return false;
        }
        let r = plot.getBoundingClientRect();
        return clientX >= r.left && clientX <= r.right
            && clientY >= r.top && clientY <= r.bottom;
    };
    document.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) {
            return;
        }
        if (eqFilterSelectedRow === null) {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab
                || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        let t = e.target;
        if (filtersContainer && filtersContainer.contains(t)) {
            return;
        }
        if (clientPointOverGraphPlot(e.clientX, e.clientY)) {
            let m = clientToGraphPlotXY(e.clientX, e.clientY);
            if (m && findEqGraphMarkerHit(m)) {
                return;
            }
        }
        setEqFilterSelectedRow(null);
    }, true);
    if (typeof initToneControls === "function") {
        initToneControls();
    }
    pinkNoisePlayButton.addEventListener("click", () => {
        if (pinkNoisePlaying) {
            stopPinkNoisePlayback();
            return;
        }
        if (!window.AudioContext && !window.webkitAudioContext) {
            alert("Web audio api is disabled, please enable it if you want to use pink noise.");
            return;
        }
        if (toneGeneratorOsc) {
            fadeStopToneGeneratorPlayback();
        }
        pauseMusicForLiveSoundSwitch();
        pinkNoiseContext = pinkNoiseContext || new (window.AudioContext || window.webkitAudioContext)();
        pinkNoiseProcessor = createPinkNoiseProcessor(pinkNoiseContext);
        pinkNoiseMasterGain = pinkNoiseContext.createGain();
        pinkNoiseMasterGain.gain.value = livePinkNoisePlaybackGain;
        pinkNoiseUserGain = pinkNoiseContext.createGain();
        pinkNoiseUserGain.gain.value = liveSoundToolsUserVolume;
        // rebuildPinkNoiseEqChain requires pinkNoisePlaying — set before first build
        pinkNoisePlaying = true;
        rebuildPinkNoiseEqChain();
        pinkNoiseAnalyser = pinkNoiseAnalyser || pinkNoiseContext.createAnalyser();
        configureLiveSpectrumAnalyser(pinkNoiseAnalyser);
        pinkNoiseMasterGain.disconnect();
        pinkNoiseMasterGain.connect(pinkNoiseUserGain);
        pinkNoiseUserGain.connect(pinkNoiseAnalyser);
        pinkNoiseAnalyser.connect(pinkNoiseContext.destination);
        pinkNoisePlayButton.classList.add("playback-active");
        lastEqPlaybackSource = "pink";
        activeLiveSoundPlayer = "pink";
        if (pinkNoiseContext.state !== "running") {
            void pinkNoiseContext.resume();
        }
        musicSpectrumViz.syncSpectrumViz();
        updateEqTraceOpacity();
    });
    // Tone Generator
    if (musicPlayButton && musicSegmentSliderEl && musicSegmentTrackEl && musicSegmentSeekEl
        && musicSegmentHandleStart && musicSegmentHandleEnd && musicAddRemoveButton && musicFileInput && musicCard) {
        musicAddRemoveButton.addEventListener("click", () => {
            if (!musicFileLoaded) {
                musicFileInput.click();
            } else {
                removeMusicTrack();
            }
        });
        musicFileInput.addEventListener("change", () => {
            let file = musicFileInput.files && musicFileInput.files[0];
            if (!file) {
                return;
            }
            if (!window.AudioContext && !window.webkitAudioContext) {
                alert("Web audio API is disabled; music playback is unavailable.");
                musicFileInput.value = "";
                return;
            }
            musicRestoreCancelToken++;
            if (!initMusicAudioGraph()) {
                musicFileInput.value = "";
                return;
            }
            wireMusicLoadedFromBlob(file, null, { autoPlay: true });
            persistMusicFileToIndexedDb(file);
            musicFileInput.value = "";
            setTimeout(() => {
                musicAddRemoveButton.blur();
                musicFileInput.blur();
            }, 0);
        });
        GraphToolPlugin._call('musicPanelReady');
        musicPlayButton.addEventListener("click", () => {
            if (!musicFileLoaded || !musicAudio || !musicContext) {
                return;
            }
            activeLiveSoundPlayer = "music";
            if (musicAudio.paused) {
                startMusicPlayback().catch(() => {
                    alert("Playback could not be started.");
                });
            } else {
                musicAudio.pause();
                musicPlayButton.classList.remove("playback-active");
                musicSpectrumViz.syncSpectrumViz();
                updateEqTraceOpacity();
            }
        });
        let finishTrimStart = () => {
            let d = getMusicDuration();
            if (d > 0 && musicAudio) {
                musicAudio.currentTime = musicSegStartU * d;
            }
            startMusicPlayback().catch(() => {
                /* autoplay or resume may fail */
            });
        };
        let finishTrimEnd = () => {
            let d = getMusicDuration();
            if (d > 0 && musicAudio) {
                let t0 = musicSegStartU * d;
                let t1 = musicSegEndU * d;
                musicAudio.currentTime = Math.max(t0, t1 - 0.5);
            }
            startMusicPlayback().catch(() => {
                /* autoplay or resume may fail */
            });
        };
        let musicTrimIdleApplyMs = 100;
        let clearMusicTrimIdleTimer = () => {
            if (musicTrimIdleTimer !== null) {
                clearTimeout(musicTrimIdleTimer);
                musicTrimIdleTimer = null;
            }
        };
        let scheduleMusicTrimIdleApply = (which) => {
            clearMusicTrimIdleTimer();
            musicTrimIdleTimer = setTimeout(() => {
                musicTrimIdleTimer = null;
                if (musicTrimDragging !== which) {
                    return;
                }
                if (which === "start") {
                    finishTrimStart();
                } else {
                    finishTrimEnd();
                }
                persistMusicSegmentToLocalStorage();
            }, musicTrimIdleApplyMs);
        };
        let bindTrimHandle = (handleEl, which) => {
            handleEl.addEventListener("pointerdown", (e) => {
                if (!musicFileLoaded || e.button !== 0) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                musicTrimDragging = which;
                handleEl.setPointerCapture(e.pointerId);
                scheduleMusicTrimIdleApply(which);
            });
            handleEl.addEventListener("pointermove", (e) => {
                if (musicTrimDragging !== which) {
                    return;
                }
                let u = pointerToMusicHandleU(e.clientX);
                if (which === "start") {
                    musicSegStartU = Math.min(u, musicSegEndU - musicSegMinGapU());
                } else {
                    musicSegEndU = Math.max(u, musicSegStartU + musicSegMinGapU());
                }
                clampMusicSegmentBounds();
                syncMusicSegmentVisuals();
                scheduleMusicTrimIdleApply(which);
            });
            let endDrag = (e, applyRelease) => {
                if (musicTrimDragging !== which) {
                    return;
                }
                clearMusicTrimIdleTimer();
                musicTrimDragging = null;
                try {
                    handleEl.releasePointerCapture(e.pointerId);
                } catch (err) { /* noop */ }
                if (applyRelease) {
                    if (which === "start") {
                        finishTrimStart();
                    } else {
                        finishTrimEnd();
                    }
                    persistMusicSegmentToLocalStorage();
                }
            };
            handleEl.addEventListener("pointerup", (e) => {
                endDrag(e, true);
            });
            handleEl.addEventListener("pointercancel", (e) => {
                endDrag(e, false);
            });
        };
        bindTrimHandle(musicSegmentHandleStart, "start");
        bindTrimHandle(musicSegmentHandleEnd, "end");
        musicSegmentSeekEl.addEventListener("pointerdown", (e) => {
            if (!musicFileLoaded || e.button !== 0) {
                return;
            }
            musicSeekDragging = true;
            musicSegmentSeekEl.setPointerCapture(e.pointerId);
            seekMusicToClientX(e.clientX);
        });
        musicSegmentSeekEl.addEventListener("pointermove", (e) => {
            if (!musicSeekDragging) {
                return;
            }
            seekMusicToClientX(e.clientX);
        });
        let endSeekDrag = (e) => {
            if (!musicSeekDragging) {
                return;
            }
            musicSeekDragging = false;
            try {
                musicSegmentSeekEl.releasePointerCapture(e.pointerId);
            } catch (err) { /* noop */ }
            syncMusicSegmentVisuals();
            persistMusicSegmentToLocalStorage();
        };
        musicSegmentSeekEl.addEventListener("pointerup", endSeekDrag);
        musicSegmentSeekEl.addEventListener("pointercancel", endSeekDrag);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden" && musicFileLoaded) {
                persistMusicSegmentToLocalStorage();
            }
        });
        let tryRestorePersistedMusic = () => {
            if (!window.indexedDB || musicFileLoaded) {
                return;
            }
            let tRestore = musicRestoreCancelToken;
            idbGetCringraphMusicRecord().then((rec) => {
                if (tRestore !== musicRestoreCancelToken || musicFileLoaded || !rec || !rec.blob) {
                    return;
                }
                let blobBytes = typeof rec.blob.size === "number" ? rec.blob.size
                    : (typeof rec.size === "number" ? rec.size : 0);
                if (blobBytes > CRINGRAPH_MUSIC_MAX_PERSIST_BYTES) {
                    void clearPersistedMusic();
                    return;
                }
                if (!window.AudioContext && !window.webkitAudioContext) {
                    return;
                }
                if (!initMusicAudioGraph()) {
                    return;
                }
                let seg = loadMusicSegmentFromLocalStorage();
                wireMusicLoadedFromBlob(rec.blob, seg);
            }).catch(() => {
                /* private mode / quota / unsupported */
            });
        };
        let pendingAppleSongFromUrl = window.__pendingAppleMusicCatalogSongId;
        let pendingAppleSegFromUrl = window.__pendingAppleMusicSegment;
        if (pendingAppleSongFromUrl && (window.AudioContext || window.webkitAudioContext)) {
            window.__pendingAppleMusicCatalogSongId = null;
            window.__pendingAppleMusicSegment = null;
            GraphToolPlugin._call('appleMusicUrlRestore', pendingAppleSongFromUrl, pendingAppleSegFromUrl, tryRestorePersistedMusic);
        } else {
            window.__pendingAppleMusicSegment = null;
            tryRestorePersistedMusic();
        }
    }
    const EQ_SOUND_BRUSH_DISMISS_PAD_PX = 10;
    const EQ_SOUND_BRUSH_DISMISS_ICON_PX = 16;
    const EQ_SOUND_BRUSH_DISMISS_BOX_PX = 2 * EQ_SOUND_BRUSH_DISMISS_PAD_PX + EQ_SOUND_BRUSH_DISMISS_ICON_PX;
    let eqSoundRangeBrushDismissOverlay = null;
    /** @type {{ xRight: number, yTop: number }|null} */
    let eqSoundRangeBrushDismissLast = null;
    let eqSoundRangeBrushDismissListeners = false;
    let hideEqSoundRangeBrushDismissOverlay = () => {
        eqSoundRangeBrushDismissLast = null;
        if (eqSoundRangeBrushDismissOverlay) {
            eqSoundRangeBrushDismissOverlay.style.display = "none";
        }
    };
    let syncEqSoundRangeBrushDismissOverlay = () => {
        let o = eqSoundRangeBrushDismissOverlay;
        let last = eqSoundRangeBrushDismissLast;
        if (!o || !last) {
            return;
        }
        let pBr = graphPlotXYToClient(last.xRight, last.yTop);
        if (!pBr) {
            o.style.display = "none";
            return;
        }
        let box = EQ_SOUND_BRUSH_DISMISS_BOX_PX;
        o.style.display = "block";
        o.style.left = Math.round(pBr[0] - box) + "px";
        o.style.top = Math.round(pBr[1]) + "px";
        o.style.width = box + "px";
        o.style.height = box + "px";
    };
    let ensureEqSoundRangeBrushDismissOverlay = () => {
        if (eqSoundRangeBrushDismissOverlay) {
            return;
        }
        let o = document.createElement("div");
        o.className = "eq-sound-range-brush-dismiss-overlay";
        o.style.display = "none";
        let btn = document.createElement("button");
        btn.type = "button";
        btn.className = "eq-sound-range-brush-dismiss";
        btn.title = "Clear band highlight (full 20 Hz – 20 kHz range)";
        btn.setAttribute("aria-label", "Clear sound tools band highlight on graph");
        let icon = document.createElement("span");
        icon.className = "eq-sound-range-brush-dismiss-icon";
        icon.setAttribute("aria-hidden", "true");
        btn.appendChild(icon);
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            resetLiveSoundFrequencyRangeToFullBand(ev);
        });
        o.appendChild(btn);
        document.body.appendChild(o);
        eqSoundRangeBrushDismissOverlay = o;
        if (!eqSoundRangeBrushDismissListeners) {
            eqSoundRangeBrushDismissListeners = true;
            window.addEventListener("resize", syncEqSoundRangeBrushDismissOverlay, true);
            window.addEventListener("scroll", syncEqSoundRangeBrushDismissOverlay, true);
        }
    };
    function clearEqSoundRangeBrush() {
        hideEqSoundRangeBrushDismissOverlay();
        gEqSoundRangeBrush.selectAll("*").remove();
    }
    function resetLiveSoundFrequencyRangeToFullBand(ev) {
        if (ev && ev.stopPropagation) {
            ev.stopPropagation();
        }
        if (ev && ev.preventDefault) {
            ev.preventDefault();
        }
        if (!toneGeneratorFromInput || !toneGeneratorToInput) {
            return;
        }
        clearLiveSoundIntervalsDatasetIfPresent();
        toneGeneratorFromInput.value = "20";
        toneGeneratorToInput.value = "20000";
        let midHz = Math.round(Math.exp((Math.log(20) + Math.log(20000)) / 2));
        syncToneGeneratorToEqFrequencyHz(midHz);
        scheduleLiveEqSync();
        clearEqSoundRangeBrush();
    }
    let liveSoundRangeResetBtn = document.getElementById("live-sound-range-reset-btn");
    if (liveSoundRangeResetBtn) {
        liveSoundRangeResetBtn.addEventListener("click", resetLiveSoundFrequencyRangeToFullBand);
    }
    document.addEventListener("keydown", (e) => {
        if (e.code !== "Escape") {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !tab || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        if (e.target !== toneGeneratorFromInput && e.target !== toneGeneratorToInput) {
            return;
        }
        e.preventDefault();
        resetLiveSoundFrequencyRangeToFullBand(e);
        if (typeof e.target.blur === "function") {
            e.target.blur();
        }
    });
    function renderEqSoundRangeBrush(hz1, hz2) {
        gEqSoundRangeBrush.selectAll("*").remove();
        hideEqSoundRangeBrushDismissOverlay();
        if (hz1 === null || hz1 === undefined || hz2 === null || hz2 === undefined) {
            return;
        }
        if (!Number.isFinite(hz1) || !Number.isFinite(hz2)) {
            return;
        }
        let lo = Math.min(hz1, hz2);
        let hi = Math.max(hz1, hz2);
        let [fLo, fHi] = getEqConstraintFreqLoHi();
        lo = Math.min(fHi, Math.max(fLo, lo));
        hi = Math.min(fHi, Math.max(fLo, hi));
        if (hi <= lo) {
            return;
        }
        let xa = Math.min(x(lo), x(hi));
        let xb = Math.max(x(lo), x(hi));
        let w = Math.max(0.5, xb - xa);
        let inner = gEqSoundRangeBrush.append("g").attr("class", "eq-sound-range-brush-inner");
        inner.append("rect")
            .attr("class", "eq-sound-range-brush-rect")
            .attr("x", xa)
            .attr("y", 20)
            .attr("width", w)
            .attr("height", 302);
        ensureEqSoundRangeBrushDismissOverlay();
        eqSoundRangeBrushDismissLast = { xRight: xa + w, yTop: 20 };
        syncEqSoundRangeBrushDismissOverlay();
    }
    function renderEqSoundRangeBrushFromIntervals(intervals, liveHz1, liveHz2) {
        gEqSoundRangeBrush.selectAll("*").remove();
        hideEqSoundRangeBrushDismissOverlay();
        let [fLo, fHi] = getEqConstraintFreqLoHi();
        let maxXRight = 0;
        let any = false;
        let yTop = 20;
        let pushRect = (lo, hi) => {
            if (lo <= fLo && hi >= fHi) {
                return;
            }
            if (hi <= lo) {
                return;
            }
            let xa = Math.min(x(lo), x(hi));
            let xb = Math.max(x(lo), x(hi));
            let w = Math.max(0.5, xb - xa);
            let inner = gEqSoundRangeBrush.append("g").attr("class", "eq-sound-range-brush-inner");
            inner.append("rect")
                .attr("class", "eq-sound-range-brush-rect")
                .attr("x", xa)
                .attr("y", yTop)
                .attr("width", w)
                .attr("height", 302);
            maxXRight = Math.max(maxXRight, xa + w);
            any = true;
        };
        if (intervals && intervals.length) {
            intervals.forEach((iv) => {
                pushRect(iv.lo, iv.hi);
            });
        }
        if (liveHz1 !== undefined && liveHz2 !== undefined
                && Number.isFinite(liveHz1) && Number.isFinite(liveHz2)) {
            let lo = Math.min(liveHz1, liveHz2);
            let hi = Math.max(liveHz1, liveHz2);
            lo = Math.min(fHi, Math.max(fLo, lo));
            hi = Math.min(fHi, Math.max(fLo, hi));
            if (hi > lo) {
                pushRect(lo, hi);
            }
        }
        if (!any) {
            return;
        }
        ensureEqSoundRangeBrushDismissOverlay();
        eqSoundRangeBrushDismissLast = { xRight: maxXRight, yTop: yTop };
        syncEqSoundRangeBrushDismissOverlay();
    }
    function syncEqSoundRangeBrushFromLiveSoundInputs() {
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab
                || tab.getAttribute("data-selected") !== "extra") {
            clearEqSoundRangeBrush();
            return;
        }
        if (!toneGeneratorFromInput || !toneGeneratorToInput) {
            clearEqSoundRangeBrush();
            return;
        }
        let intervals = readLiveSoundBandIntervals();
        let full = intervals.length === 1 && intervals[0].lo <= 20 && intervals[0].hi >= 20000;
        if (!full) {
            renderEqSoundRangeBrushFromIntervals(intervals);
            gEqSoundRangeBrush.raise();
            gEqFilterMarkers.raise();
            gEqHoverPreview.raise();
        } else {
            clearEqSoundRangeBrush();
        }
    }
    function applyLiveSoundRangeFromHzPair(hz1, hz2, appendRange) {
        if (!toneGeneratorFromInput || !toneGeneratorToInput) {
            return;
        }
        if (hz1 === null || hz1 === undefined || hz2 === null || hz2 === undefined) {
            return;
        }
        if (!Number.isFinite(hz1) || !Number.isFinite(hz2)) {
            return;
        }
        let lo = Math.round(Math.min(hz1, hz2));
        let hi = Math.round(Math.max(hz1, hz2));
        let [fLo, fHi] = getEqConstraintFreqLoHi();
        lo = Math.min(fHi, Math.max(fLo, lo));
        hi = Math.min(fHi, Math.max(fLo, hi));
        if (hi < lo) {
            let t = lo;
            lo = hi;
            hi = t;
        }
        if (hi <= lo) {
            hi = Math.min(fHi, lo + 1);
        }
        let newIv = normalizeLiveSoundIntervalPair(lo, hi);
        let next;
        if (appendRange) {
            let existing = readLiveSoundBandIntervals();
            next = mergeLiveSoundIntervalsSorted(existing.concat([newIv]));
        } else {
            next = [newIv];
        }
        writeLiveSoundIntervalsState(next);
        let loAg = next.reduce((m, iv) => Math.min(m, iv.lo), next[0].lo);
        let hiAg = next.reduce((m, iv) => Math.max(m, iv.hi), next[0].hi);
        let midHz = Math.round(Math.exp((Math.log(Math.max(loAg, 20.001)) + Math.log(hiAg)) / 2));
        syncToneGeneratorToEqFrequencyHz(midHz);
        scheduleLiveEqSync();
    }
    eqSoundRangeUiHooks.syncBrushFromInputs = syncEqSoundRangeBrushFromLiveSoundInputs;
    filtersContainer.addEventListener("focusin", (e) => {
        let rowEl = e.target.closest && e.target.closest("div.filter");
        if (rowEl && filtersContainer.contains(rowEl)) {
            let rows = filtersContainer.querySelectorAll("div.filter");
            let ix = Array.prototype.indexOf.call(rows, rowEl);
            if (ix >= 0) {
                setEqFilterSelectedRow(ix);
            }
        }
        if (!(e.target.matches && e.target.matches("input[name='freq']"))) {
            return;
        }
        let hz = parseInt(e.target.value, 10);
        if (!Number.isFinite(hz)) {
            hz = 20;
        }
        syncToneGeneratorToEqFrequencyHz(hz);
    });
    let eqFreqToToneDebounceTimer = null;
    filtersContainer.addEventListener("input", (e) => {
        if (!(e.target.matches && e.target.matches("input[name='freq']"))) {
            return;
        }
        let inputEl = e.target;
        clearTimeout(eqFreqToToneDebounceTimer);
        eqFreqToToneDebounceTimer = setTimeout(() => {
            eqFreqToToneDebounceTimer = null;
            let hz = parseInt(inputEl.value, 10);
            if (!Number.isFinite(hz)) {
                hz = 20;
            }
            syncToneGeneratorToEqFrequencyHz(hz);
        }, 100);
    });
}
