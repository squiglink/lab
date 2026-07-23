// ============================================================
// === src/audio/live-sound.js ===
// ============================================================
/* Live-sound audio helpers. Classic script for ordered loading. */
configureLiveSpectrumAnalyser = (a) => {
    a.fftSize = 2048;
    a.smoothingTimeConstant = 0.82;
    /* getFloatFrequencyData() is clamped to [minDecibels, maxDecibels]; a low max
       flattens loud bass (many bins hit the ceiling -> horizontal line on the graph). */
    a.minDecibels = -100;
    a.maxDecibels = 0;
};

disconnectToneGeneratorAnalyser = () => {
    if (toneGeneratorAnalyser) {
        try {
            toneGeneratorAnalyser.disconnect();
        } catch (e) { /* noop */ }
        toneGeneratorAnalyser = null;
    }
};

stopPinkNoisePlayback = () => {
    if (!pinkNoisePlaying) {
        return;
    }
    pinkNoisePlaying = false;
    pinkNoisePlayButton.classList.remove("playback-active");
    if (liveEqSyncRafId !== null) {
        cancelAnimationFrame(liveEqSyncRafId);
        liveEqSyncRafId = null;
    }
    if (pinkNoiseProcessor) {
        pinkNoiseProcessor.disconnect();
        pinkNoiseProcessor.onaudioprocess = null;
        pinkNoiseProcessor = null;
    }
    disconnectEqBiquads(pinkNoiseBiquads);
    disconnectEqBiquads(pinkNoiseBiquadsLeft);
    disconnectEqBiquads(pinkNoiseBiquadsRight);
    disconnectPinkBandFilters();
    if (pinkNoiseMasterGain) {
        pinkNoiseMasterGain.disconnect();
        pinkNoiseMasterGain = null;
    }
    if (pinkNoiseUserGain) {
        try {
            pinkNoiseUserGain.disconnect();
        } catch (e) { /* noop */ }
        pinkNoiseUserGain = null;
    }
    if (pinkNoiseAnalyser) {
        try {
            pinkNoiseAnalyser.disconnect();
        } catch (e) { /* noop */ }
        pinkNoiseAnalyser = null;
    }
    musicSpectrumViz.syncSpectrumViz();
    updateEqTraceOpacity();
};

createPinkNoiseProcessor = (audioContext) => {
    let bufferSize = 4096;
    /* WebKit/Safari: ScriptProcessor with 0 inputs often never runs onaudioprocess (silent output
       while the node graph still looks "active" to the browser). One input channel fixes it;
       we only write the output buffer and do not use the input. */
    let processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    processor.onaudioprocess = (e) => {
        let output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) {
            let white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            b6 = white * 0.115926;
            output[i] = pink * 0.11;
        }
    };
    return processor;
};

// ============================================================
// === src/audio/live-controls.js ===
// ============================================================
/* Live-sound control bindings. Classic script for ordered loading. */
/* DOM elements are null here — shell not rendered yet. initAudioEngineUiBindings() resolves them. */
let toneGeneratorFromInput = null;
let toneGeneratorToInput = null;
let toneGeneratorSlider = null;
let toneGeneratorPlayButton = null;
let toneGeneratorText = null;
let toneGeneratorAddFilterButton = null;
const TONE_GENERATOR_DEFAULT_HZ = 1000;
let liveSoundMasterVolumeInput = null;
let liveSoundVolumePctText = null;
Object.defineProperty(window, 'toneGeneratorFromInput',      { get: () => toneGeneratorFromInput,      set: v => { toneGeneratorFromInput = v; },      configurable: true });
Object.defineProperty(window, 'toneGeneratorToInput',        { get: () => toneGeneratorToInput,        set: v => { toneGeneratorToInput = v; },        configurable: true });
Object.defineProperty(window, 'toneGeneratorSlider',         { get: () => toneGeneratorSlider,         set: v => { toneGeneratorSlider = v; },         configurable: true });
Object.defineProperty(window, 'toneGeneratorPlayButton',     { get: () => toneGeneratorPlayButton,     set: v => { toneGeneratorPlayButton = v; },     configurable: true });
Object.defineProperty(window, 'toneGeneratorText',           { get: () => toneGeneratorText,           set: v => { toneGeneratorText = v; },           configurable: true });
Object.defineProperty(window, 'toneGeneratorAddFilterButton',{ get: () => toneGeneratorAddFilterButton,set: v => { toneGeneratorAddFilterButton = v; },configurable: true });
Object.defineProperty(window, 'liveSoundMasterVolumeInput',  { get: () => liveSoundMasterVolumeInput,  set: v => { liveSoundMasterVolumeInput = v; },  configurable: true });
Object.defineProperty(window, 'liveSoundVolumePctText',      { get: () => liveSoundVolumePctText,      set: v => { liveSoundVolumePctText = v; },      configurable: true });

let syncLiveSoundMasterVolumeTrackFill = () => {
    let el = liveSoundMasterVolumeInput;
    if (!el) {
        return;
    }
    let min = parseFloat(el.min) || 0;
    let max = parseFloat(el.max) || 1;
    let v = parseFloat(el.value);
    if (!Number.isFinite(v)) {
        v = min;
    }
    let pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
    el.style.setProperty("--live-sound-vol-pct", pct + "%");
};

/* Called from initLiveSoundExtra() after the shell HTML exists in the DOM. */
function initAudioEngineUiBindings() {
    toneGeneratorFromInput      = document.querySelector("div.live-sound-tools input[name='tone-generator-from']");
    toneGeneratorToInput        = document.querySelector("div.live-sound-tools input[name='tone-generator-to']");
    toneGeneratorSlider         = document.querySelector("div.live-sound-tools input[name='tone-generator-freq']");
    toneGeneratorPlayButton     = document.querySelector("div.extra-tone-generator .play");
    toneGeneratorText           = document.querySelector("div.extra-tone-generator .freq-text");
    toneGeneratorAddFilterButton= document.querySelector("div.extra-tone-generator button.tone-generator-add-filter");
    liveSoundMasterVolumeInput  = document.querySelector("div.live-sound-tools input[name='live-sound-master-volume']");
    liveSoundVolumePctText      = document.querySelector("div.live-sound-tools .live-sound-volume-pct-text");

    if (liveSoundMasterVolumeInput) {
        liveSoundMasterVolumeInput.addEventListener("input", () => {
            liveSoundToolsUserVolume = Math.min(1, Math.max(0, parseFloat(liveSoundMasterVolumeInput.value) || 0));
            applyLiveSoundToolsUserVolumeToAudioNodes();
            syncLiveSoundMasterVolumeTrackFill();
            if (liveSoundVolumePctText) {
                liveSoundVolumePctText.textContent = String(Math.round(liveSoundToolsUserVolume * 100));
            }
        });
        syncLiveSoundMasterVolumeTrackFill();
    }

    (() => {
        let stCard = document.querySelector("div.live-sound-tools-settings");
        let stGear = document.querySelector("div.live-sound-tools button.live-sound-tools-settings-gear");
        let stBody = document.getElementById("live-sound-tools-settings-body");
        if (stGear && stCard && stBody) {
            stGear.addEventListener("click", () => {
                let exp = stCard.classList.toggle("live-sound-tools-settings-expanded");
                stGear.setAttribute("aria-expanded", exp ? "true" : "false");
                stBody.setAttribute("aria-hidden", exp ? "false" : "true");
            });
        }
    })();

    if (toneGeneratorSlider && toneGeneratorFromInput && toneGeneratorToInput && toneGeneratorText) {
        let from = Math.min(Math.max(parseInt(toneGeneratorFromInput.value, 10) || 20, 20), 20000);
        let to = Math.min(Math.max(parseInt(toneGeneratorToInput.value, 10) || from, from), 20000);
        let target = Math.min(Math.max(TONE_GENERATOR_DEFAULT_HZ, from), to);
        if (from < to) {
            let u = (Math.log(target) - Math.log(from)) / (Math.log(to) - Math.log(from));
            toneGeneratorSlider.value = String(Math.min(1, Math.max(0, u)));
        }
        toneGeneratorText.innerText = String(target);
    }
}

// ============================================================
// === src/audio/music.js ===
// ============================================================
/* Music playback segment helpers. Classic script for ordered loading. */
let getMusicDuration = () => {
    if (!musicAudio) {
        return 0;
    }
    let d = musicAudio.duration;
    return Number.isFinite(d) && d > 0 ? d : 0;
};

let musicSegMinGapU = () => {
    let d = getMusicDuration();
    if (d <= 0) {
        return 0.001;
    }
    let minSec = Math.min(0.15, d * 0.1);
    return minSec / d;
};

let clampMusicSegmentBounds = () => {
    let gap = musicSegMinGapU();
    musicSegStartU = Math.max(0, Math.min(1, musicSegStartU));
    musicSegEndU = Math.max(0, Math.min(1, musicSegEndU));
    if (musicSegEndU - musicSegStartU >= gap) {
        return;
    }
    if (musicTrimDragging === "start") {
        musicSegEndU = Math.min(1, musicSegStartU + gap);
    } else if (musicTrimDragging === "end") {
        musicSegStartU = Math.max(0, musicSegEndU - gap);
    } else {
        musicSegEndU = Math.min(1, musicSegStartU + gap);
    }
};

let syncMusicSegmentVisuals = () => {
    if (!musicSegmentTrackEl) {
        return;
    }
    let su = musicSegStartU;
    let eu = musicSegEndU;
    let inset = musicSegmentHandleInsetPx;
    let innerSpan = `(100% - ${2 * inset}px)`;
    let innerLeft = (u) => `calc(${inset}px + ${innerSpan} * ${u})`;
    if (musicSegmentOutsideLeftEl) {
        musicSegmentOutsideLeftEl.style.width = innerLeft(su);
    }
    if (musicSegmentOutsideRightEl) {
        musicSegmentOutsideRightEl.style.left = innerLeft(eu);
        musicSegmentOutsideRightEl.style.width = `calc(100% - ${inset}px - ${innerSpan} * ${eu})`;
    }
    if (musicSegmentLoopedEl) {
        musicSegmentLoopedEl.style.left = innerLeft(su);
        musicSegmentLoopedEl.style.width = `calc(${innerSpan} * ${eu - su})`;
    }
    if (musicSegmentHandleStart) {
        musicSegmentHandleStart.style.left = innerLeft(su);
    }
    if (musicSegmentHandleEnd) {
        musicSegmentHandleEnd.style.left = innerLeft(eu);
    }
    let d = getMusicDuration();
    let spanU = Math.max(0, eu - su);
    let uSeg = 0;
    if (d > 0 && spanU > 0 && musicAudio) {
        let t0 = su * d;
        let t1 = eu * d;
        let ct = Math.min(t1, Math.max(t0, musicAudio.currentTime));
        uSeg = (ct - t0) / (t1 - t0);
    }
    if (musicSegmentProgressEl) {
        musicSegmentProgressEl.style.left = innerLeft(su);
        musicSegmentProgressEl.style.width = `calc(${innerSpan} * ${uSeg * spanU})`;
    }
};

let pointerToMusicSegmentU = (clientX) => {
    if (!musicSegmentTrackEl) {
        return 0;
    }
    let rect = musicSegmentTrackEl.getBoundingClientRect();
    if (rect.width <= 0) {
        return 0;
    }
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
};

let pointerToMusicHandleU = (clientX) => {
    if (!musicSegmentTrackEl) {
        return 0;
    }
    let rect = musicSegmentTrackEl.getBoundingClientRect();
    let inset = musicSegmentHandleInsetPx;
    let usable = rect.width - 2 * inset;
    if (usable <= 0) {
        return 0.5;
    }
    return Math.min(1, Math.max(0, (clientX - rect.left - inset) / usable));
};

let seekMusicToClientX = (clientX) => {
    if (!musicFileLoaded || !musicAudio || !musicSegmentTrackEl) {
        return;
    }
    let d = getMusicDuration();
    if (d <= 0) {
        return;
    }
    let u = pointerToMusicSegmentU(clientX);
    let t = u * d;
    let t0 = musicSegStartU * d;
    let t1 = musicSegEndU * d;
    let margin = Math.min(1e-3, (t1 - t0) * 0.01);
    musicAudio.currentTime = Math.min(t1 - margin, Math.max(t0, t));
    syncMusicSegmentVisuals();
};

let musicAudioTimeUpdateHandler = () => {
    if (!musicFileLoaded || !musicAudio) {
        return;
    }
    let d = getMusicDuration();
    if (d <= 0) {
        return;
    }
    let t0 = musicSegStartU * d;
    let t1 = musicSegEndU * d;
    if (!musicAudio.paused && t1 > t0) {
        let span = t1 - t0;
        let wrapEps = Math.min(0.05, Math.max(0.001, span * 0.05));
        if (musicAudio.currentTime >= t1 - wrapEps) {
            musicAudio.currentTime = t0;
        } else if (musicAudio.currentTime + 0.001 < t0) {
            musicAudio.currentTime = t0;
        }
    }
    if (!musicSeekDragging) {
        syncMusicSegmentVisuals();
    }
};

let musicAudioEndedHandler = () => {
    if (!musicFileLoaded || !musicAudio) {
        return;
    }
    let d = getMusicDuration();
    if (d <= 0) {
        return;
    }
    musicAudio.currentTime = musicSegStartU * d;
    void startMusicPlayback().catch(() => {
        /* restart after natural EOF may fail without gesture */
    });
};

let pauseMusicForLiveSoundSwitch = () => {
    if (!musicAudio || musicAudio.paused) {
        return;
    }
    musicAudio.pause();
    if (musicPlayButton) {
        musicPlayButton.classList.remove("playback-active");
    }
    musicSpectrumViz.syncSpectrumViz();
    updateEqTraceOpacity();
};

// ============================================================
// === src/audio/music-graph.js ===
// ============================================================
/* Music playback graph lifecycle. Classic script for ordered loading. */
function initMusicGraphLifecycle() {
    musicSpectrumViz.isActive = function () {
        let v = musicSpectrumViz;
        if (v.analyser === musicAnalyser && musicContext) {
            return musicFileLoaded && musicAudio && !musicAudio.paused;
        }
        if (v.analyser === pinkNoiseAnalyser) {
            return !!pinkNoisePlaying;
        }
        if (v.analyser === toneGeneratorAnalyser) {
            return !!toneGeneratorOsc;
        }
        return false;
    };

    musicSpectrumViz.syncSpectrumViz = function () {
        musicSpectrumViz.stop();
        if (musicFileLoaded && musicAudio && !musicAudio.paused && musicContext && musicAnalyser) {
            musicSpectrumViz.analyser = musicAnalyser;
            musicSpectrumViz.context = musicContext;
            musicSpectrumViz.ensureBuffer();
            musicSpectrumViz.start();
            return;
        }
        if (pinkNoisePlaying && pinkNoiseContext && pinkNoiseAnalyser) {
            musicSpectrumViz.analyser = pinkNoiseAnalyser;
            musicSpectrumViz.context = pinkNoiseContext;
            musicSpectrumViz.ensureBuffer();
            musicSpectrumViz.start();
            return;
        }
        if (toneGeneratorOsc && toneGeneratorContext && toneGeneratorAnalyser) {
            musicSpectrumViz.analyser = toneGeneratorAnalyser;
            musicSpectrumViz.context = toneGeneratorContext;
            musicSpectrumViz.ensureBuffer();
            musicSpectrumViz.start();
            return;
        }
        musicSpectrumViz.analyser = null;
        musicSpectrumViz.context = null;
    };
}

let removeMusicTrack = () => {
    musicRestoreCancelToken++;
    void clearPersistedMusic();
    if (musicAudio) {
        musicAudio.removeEventListener("timeupdate", musicAudioTimeUpdateHandler);
        musicAudio.removeEventListener("ended", musicAudioEndedHandler);
        musicAudio.pause();
        musicAudio.removeAttribute("src");
        try {
            musicAudio.load();
        } catch (err) { /* noop */ }
    }
    if (musicObjectUrl) {
        URL.revokeObjectURL(musicObjectUrl);
        musicObjectUrl = null;
    }
    musicFileLoaded = false;
    musicAppleShareSongId = null;
    musicSeekDragging = false;
    musicTrimDragging = null;
    musicSpectrumViz.stop();
    if (musicTrimIdleTimer !== null) {
        clearTimeout(musicTrimIdleTimer);
        musicTrimIdleTimer = null;
    }
    musicSegStartU = 0;
    musicSegEndU = 1;
    if (musicPlayButton) {
        musicPlayButton.disabled = true;
        musicPlayButton.classList.remove("playback-active");
    }
    if (musicSegmentSliderEl) {
        musicSegmentSliderEl.classList.add("music-segment-slider-disabled");
    }
    syncMusicSegmentVisuals();
    if (musicPlaybackPanel) {
        musicPlaybackPanel.setAttribute("aria-hidden", "true");
    }
    if (musicCard) {
        musicCard.classList.remove("music-file-loaded");
    }
    if (musicAddRemoveButton) {
        musicAddRemoveButton.textContent = "+ Add Music";
    }
    if (musicFileInput) {
        musicFileInput.value = "";
    }
    disconnectEqBiquads(musicBiquads);
    disconnectEqBiquads(musicBiquadsLeft);
    disconnectEqBiquads(musicBiquadsRight);
    disconnectMusicBandFilters();
    if (musicMediaSourceNode) {
        try {
            musicMediaSourceNode.disconnect();
        } catch (err) { /* noop */ }
        musicMediaSourceNode = null;
    }
    if (musicMasterGain) {
        try {
            musicMasterGain.disconnect();
        } catch (err) { /* noop */ }
        musicMasterGain = null;
    }
    if (musicUserGain) {
        try {
            musicUserGain.disconnect();
        } catch (err) { /* noop */ }
        musicUserGain = null;
    }
    if (musicAnalyser) {
        try {
            musicAnalyser.disconnect();
        } catch (err) { /* noop */ }
        musicAnalyser = null;
    }
    if (musicContext && musicContext.state !== "closed") {
        void musicContext.close();
    }
    musicContext = null;
    musicAudio = null;
    if (lastEqPlaybackSource === "music") {
        lastEqPlaybackSource = "pink";
    }
    ensureActiveLiveSoundPlayerValid();
    musicSpectrumViz.syncSpectrumViz();
    if (typeof ifURL !== "undefined" && ifURL && typeof addPhonesToUrl === "function") {
        addPhonesToUrl();
    }
};

let initMusicAudioGraph = () => {
    if (musicContext) {
        return true;
    }
    if (!window.AudioContext && !window.webkitAudioContext) {
        return false;
    }
    musicContext = new (window.AudioContext || window.webkitAudioContext)();
    musicAudio = new Audio();
    /* Required for preview URLs (and harmless for blob: local files) so Web Audio can process the stream. */
    musicAudio.crossOrigin = "anonymous";
    musicAudio.loop = false;
    musicAudio.preload = "auto";
    musicAudio.addEventListener("timeupdate", musicAudioTimeUpdateHandler);
    musicAudio.addEventListener("ended", musicAudioEndedHandler);
    musicAudio.addEventListener("error", () => {
        alert("Could not load or play this audio file.");
        removeMusicTrack();
    });
    musicMediaSourceNode = musicContext.createMediaElementSource(musicAudio);
    musicMasterGain = musicContext.createGain();
    musicMasterGain.gain.value = liveMusicPlaybackGain;
    musicUserGain = musicContext.createGain();
    musicUserGain.gain.value = liveSoundToolsUserVolume;
    rebuildMusicEqChain();
    musicAnalyser = musicContext.createAnalyser();
    configureLiveSpectrumAnalyser(musicAnalyser);
    musicMasterGain.connect(musicUserGain);
    musicUserGain.connect(musicAnalyser);
    musicAnalyser.connect(musicContext.destination);
    musicSpectrumViz.syncSpectrumViz();
    return true;
};

let stopPinkAndToneForExclusiveMusic = () => {
    stopPinkNoisePlayback();
    if (toneGeneratorOsc) {
        fadeStopToneGeneratorPlayback();
    }
};

let startMusicPlayback = () => {
    if (!musicFileLoaded || !musicAudio || !musicContext || !musicPlayButton) {
        return Promise.reject(new Error("music not ready"));
    }
    let d = getMusicDuration();
    if (d > 0) {
        let t0 = musicSegStartU * d;
        let t1 = musicSegEndU * d;
        let ct = musicAudio.currentTime;
        if (ct < t0 || ct >= t1 - 0.02) {
            musicAudio.currentTime = t0;
        }
    }
    stopPinkAndToneForExclusiveMusic();
    void musicContext.resume();
    return musicAudio.play().then(() => {
        musicPlayButton.classList.add("playback-active");
        lastEqPlaybackSource = "music";
        activeLiveSoundPlayer = "music";
        musicSpectrumViz.syncSpectrumViz();
        updateEqTraceOpacity();
    });
};

let wireMusicLoadedFromSource = (src, segOpt, loadOpts) => {
    loadOpts = loadOpts || {};
    let autoPlayAfterLoad = loadOpts.autoPlay === true;
    if (!musicAudio || !musicPlayButton || !musicCard || !musicSegmentSliderEl || !musicAddRemoveButton) {
        return;
    }
    let isBlob = typeof Blob !== "undefined" && src instanceof Blob;
    if (!isBlob && (src == null || String(src).trim() === "")) {
        return;
    }
    musicAppleShareSongId = null;
    if (loadOpts.appleCatalogSongId != null) {
        let sid = String(loadOpts.appleCatalogSongId).trim();
        if (sid) {
            musicAppleShareSongId = sid;
        }
    }
    if (typeof GraphToolPlugin !== "undefined"
            && typeof GraphToolPlugin.resetAppleMusicSearchUi === "function") {
        GraphToolPlugin.resetAppleMusicSearchUi({ collapseEmptyPlaybackPanel: false });
    }
    if (musicObjectUrl) {
        URL.revokeObjectURL(musicObjectUrl);
        musicObjectUrl = null;
    }
    musicAudio.pause();
    musicSpectrumViz.stop();
    musicPlayButton.classList.remove("playback-active");
    if (isBlob) {
        musicObjectUrl = URL.createObjectURL(src);
        musicAudio.src = musicObjectUrl;
    } else {
        musicAudio.src = String(src).trim();
    }
    if (segOpt && typeof segOpt.segStartU === "number" && typeof segOpt.segEndU === "number") {
        musicSegStartU = segOpt.segStartU;
        musicSegEndU = segOpt.segEndU;
    } else {
        musicSegStartU = 0;
        musicSegEndU = 1;
    }
    musicAudio.load();
    musicFileLoaded = true;
    activeLiveSoundPlayer = "music";
    musicCard.classList.add("music-file-loaded");
    if (musicPlaybackPanel) {
        musicPlaybackPanel.setAttribute("aria-hidden", "false");
    }
    musicPlayButton.disabled = false;
    musicSegmentSliderEl.classList.remove("music-segment-slider-disabled");
    let onMusicMeta = () => {
        clampMusicSegmentBounds();
        syncMusicSegmentVisuals();
        persistMusicSegmentToLocalStorage();
    };
    musicAudio.addEventListener("loadedmetadata", onMusicMeta, { once: true });
    syncMusicSegmentVisuals();
    musicAddRemoveButton.textContent = "- Remove Music";
    rebuildMusicEqChain();
    if (autoPlayAfterLoad) {
        let autoPlayWhenReady = () => {
            startMusicPlayback().catch(() => {
                /* autoplay may be blocked without further gesture; user can press play */
            });
        };
        if (musicAudio.readyState >= 2) {
            autoPlayWhenReady();
        } else {
            musicAudio.addEventListener("canplay", autoPlayWhenReady, { once: true });
        }
    }
    if (typeof ifURL !== "undefined" && ifURL && typeof addPhonesToUrl === "function") {
        addPhonesToUrl();
    }
};

let wireMusicLoadedFromBlob = (blob, segOpt, loadOpts) =>
    wireMusicLoadedFromSource(blob, segOpt, loadOpts);

let resumeLiveSoundAfterSyncNativeDialog = (wantMusic, wantPink, wantTone) => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (wantMusic && musicFileLoaded && musicAudio && musicContext) {
                startMusicPlayback().catch(() => {});
            }
            if (wantPink && pinkNoisePlaying && pinkNoiseContext && pinkNoiseContext.state === "suspended") {
                void pinkNoiseContext.resume();
            }
            if (wantTone && toneGeneratorOsc && toneGeneratorContext
                    && toneGeneratorContext.state === "suspended") {
                void toneGeneratorContext.resume();
            }
        });
    });
};

// ============================================================
// === src/audio/tone-core.js ===
// ============================================================
/* Tone generator core. Classic script for ordered loading. */
let toneGeneratorContext = null;
let toneGeneratorOsc = null;
let toneGeneratorTimeoutHandle = null;
let toneSweepRafId = null;
// Bridge these let vars onto window so graphtool.js can read/write them as bare names
Object.defineProperty(window, 'toneGeneratorContext',      { get: () => toneGeneratorContext,      set: v => { toneGeneratorContext = v; },      configurable: true });
Object.defineProperty(window, 'toneGeneratorOsc',          { get: () => toneGeneratorOsc,          set: v => { toneGeneratorOsc = v; },          configurable: true });
Object.defineProperty(window, 'toneGeneratorTimeoutHandle',{ get: () => toneGeneratorTimeoutHandle,set: v => { toneGeneratorTimeoutHandle = v; },configurable: true });
Object.defineProperty(window, 'toneSweepRafId',            { get: () => toneSweepRafId,            set: v => { toneSweepRafId = v; },            configurable: true });
let toneSweepDurationSec = 30;
/** log(20k/20); sweep uses log-frequency interpolation — partial ranges use the same share of wall time as on a full 20–20k sweep. */
const TONE_SWEEP_FULL_LOG_SPAN = Math.log(20000 / 20);
const TONE_SWEEP_MIN_DURATION_SEC = 6;
/** Last Space keydown in Extra tab (any live sound source); two within `toneSpaceDoubleMs` → sine sweep. */
let lastToneSpaceKeydownTime = 0;
let toneSpaceDoubleMs = 200;
/** While true, tone sweep restarts from range low when a pass completes (Space held, or 2nd press held past TONE_PLAY_BTN_HOLD_MS on play). */
let toneSweepLoopSpaceHeld = false;
let toneSweepLoopPointerHeld = false;
/** For touch double-press sweep: pointerdown does not get a meaningful UIEvent.detail (unlike mousedown). */
let tonePlayBtnTouchPrevDownTs = 0;
const TONE_PLAY_BTN_TOUCH_DOUBLE_MS = 450;
/** Second click of a double-click: wait this long before treating as "hold" -> loop sweep; shorter = normal double-click sweep on mouseup (click detail 2). */
const TONE_PLAY_BTN_HOLD_MS = 100;
let tonePlayBtnHoldSweepTimer = null;
/** Skip mousedown hold-detect when touch just armed the same gesture (both fire on many devices). */
let tonePlayBtnTouchArmTs = 0;
/** Master-gain fade to avoid output discontinuities when starting/stopping the sine. */
const TONE_GEN_FADE_IN_SEC = 0.022;
const TONE_GEN_FADE_OUT_SEC = 0.042;
let toneGenFadeCleanupTimer = null;

let toneSweepPointerHoldUp = () => {
    toneSweepLoopPointerHeld = false;
    document.removeEventListener("pointerup", toneSweepPointerHoldUp, true);
    document.removeEventListener("pointercancel", toneSweepPointerHoldUp, true);
};

let tonePlayBtnClearHoldSweepTimer = () => {
    if (tonePlayBtnHoldSweepTimer !== null) {
        clearTimeout(tonePlayBtnHoldSweepTimer);
        tonePlayBtnHoldSweepTimer = null;
    }
};

/**
 * Second press of a double-click / double-tap: defer loop sweep until hold exceeds TONE_PLAY_BTN_HOLD_MS.
 * Shorter press: cancel timer — mouse gets a normal click(detail=2) for sweep on mouseup; touch runs onEarlyTapSweep.
 */
let tonePlayBtnArmLoopHoldAfterSecondPress = (onEarlyTapSweep) => {
    tonePlayBtnClearHoldSweepTimer();
    let settled = false;
    let cancelEarlyUp = (ev) => {
        if (ev.button !== 0) {
            return;
        }
        if (settled) {
            return;
        }
        settled = true;
        document.removeEventListener("pointerup", cancelEarlyUp, true);
        document.removeEventListener("pointercancel", cancelEarlyUp, true);
        tonePlayBtnClearHoldSweepTimer();
        if (typeof onEarlyTapSweep === "function") {
            onEarlyTapSweep();
        }
    };
    document.addEventListener("pointerup", cancelEarlyUp, true);
    document.addEventListener("pointercancel", cancelEarlyUp, true);
    tonePlayBtnHoldSweepTimer = setTimeout(() => {
        if (settled) {
            return;
        }
        settled = true;
        tonePlayBtnHoldSweepTimer = null;
        document.removeEventListener("pointerup", cancelEarlyUp, true);
        document.removeEventListener("pointercancel", cancelEarlyUp, true);
        toneSweepLoopPointerHeld = true;
        document.addEventListener("pointerup", toneSweepPointerHoldUp, true);
        document.addEventListener("pointercancel", toneSweepPointerHoldUp, true);
        startToneGeneratorSweep();
    }, TONE_PLAY_BTN_HOLD_MS);
};

let clearToneGenFadeCleanupTimer = () => {
    if (toneGenFadeCleanupTimer !== null) {
        clearTimeout(toneGenFadeCleanupTimer);
        toneGenFadeCleanupTimer = null;
    }
};

let toneGeneratorGraphTeardown = () => {
    disconnectEqBiquads(toneGeneratorBiquads);
    disconnectEqBiquads(toneGeneratorBiquadsLeft);
    disconnectEqBiquads(toneGeneratorBiquadsRight);
    toneGeneratorBandFiltersMono.forEach((b) => {
        try { b.disconnect(); } catch (e) { /* noop */ }
    });
    toneGeneratorBandFiltersMono.length = 0;
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
    if (toneGeneratorUserGain) {
        try {
            toneGeneratorUserGain.disconnect();
        } catch (e) { /* noop */ }
        toneGeneratorUserGain = null;
    }
    if (toneGeneratorMasterGain) {
        try {
            toneGeneratorMasterGain.disconnect();
        } catch (e) { /* noop */ }
        toneGeneratorMasterGain = null;
    }
    disconnectToneGeneratorAnalyser();
};

/** Ramp output gain to zero, stop the oscillator shortly after, then disconnect the graph after the ramp. */
let fadeStopToneGeneratorPlayback = () => {
    if (!toneGeneratorOsc || !toneGeneratorContext || !toneGeneratorMasterGain) {
        clearToneGenFadeCleanupTimer();
        toneGeneratorGraphTeardown();
        return;
    }
    if (toneSweepRafId !== null) {
        cancelAnimationFrame(toneSweepRafId);
        toneSweepRafId = null;
    }
    toneSweepPointerHoldUp();
    let ctx = toneGeneratorContext;
    let osc = toneGeneratorOsc;
    let g = toneGeneratorMasterGain.gain;
    let t = ctx.currentTime;
    let rel = TONE_GEN_FADE_OUT_SEC;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + rel);
    let tStop = t + rel + 0.001;
    try {
        osc.stop(tStop);
    } catch (e) {
        try {
            osc.stop();
        } catch (e2) { /* noop */ }
    }
    toneGeneratorOsc = null;
    toneGeneratorPlayButton.classList.remove("playback-active");
    musicSpectrumViz.syncSpectrumViz();
    updateEqTraceOpacity();
    clearToneGenFadeCleanupTimer();
    let ms = Math.ceil(rel * 1000) + 30;
    toneGenFadeCleanupTimer = setTimeout(() => {
        toneGenFadeCleanupTimer = null;
        toneGeneratorGraphTeardown();
    }, ms);
};

let startToneGeneratorOscillatorIfStopped = () => {
    if (toneGeneratorOsc) {
        return true;
    }
    clearToneGenFadeCleanupTimer();
    if (toneGeneratorMasterGain || toneGeneratorBiquads.length) {
        toneGeneratorGraphTeardown();
    }
    stopPinkNoisePlayback();
    pauseMusicForLiveSoundSwitch();
    if (!toneGeneratorContext) {
        if (!window.AudioContext && !window.webkitAudioContext) {
            alert("Web audio api is disabled, please enable it if you want to use tone generator.");
            return false;
        }
        toneGeneratorContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    let tA = toneGeneratorContext.currentTime;
    toneGeneratorOsc = toneGeneratorContext.createOscillator();
    toneGeneratorOsc.type = "sine";
    toneGeneratorOsc.frequency.value = parseInt(toneGeneratorText.innerText, 10) || TONE_GENERATOR_DEFAULT_HZ;
    toneGeneratorMasterGain = toneGeneratorContext.createGain();
    toneGeneratorMasterGain.gain.setValueAtTime(0, tA);
    toneGeneratorUserGain = toneGeneratorContext.createGain();
    toneGeneratorUserGain.gain.value = liveSoundToolsUserVolume;
    rebuildToneGeneratorEqChain();
    toneGeneratorAnalyser = toneGeneratorAnalyser || toneGeneratorContext.createAnalyser();
    configureLiveSpectrumAnalyser(toneGeneratorAnalyser);
    toneGeneratorMasterGain.disconnect();
    toneGeneratorMasterGain.connect(toneGeneratorUserGain);
    toneGeneratorUserGain.connect(toneGeneratorAnalyser);
    toneGeneratorAnalyser.connect(toneGeneratorContext.destination);
    toneGeneratorOsc.start(tA);
    toneGeneratorMasterGain.gain.linearRampToValueAtTime(liveToneGeneratorPlaybackGain, tA + TONE_GEN_FADE_IN_SEC);
    toneGeneratorPlayButton.classList.add("playback-active");
    lastEqPlaybackSource = "tone";
    activeLiveSoundPlayer = "tone";
    if (toneGeneratorContext.state !== "running") {
        void toneGeneratorContext.resume();
    }
    musicSpectrumViz.syncSpectrumViz();
    updateEqTraceOpacity();
    return true;
};

let startToneGeneratorSweep = () => {
    let fromHz = Math.min(Math.max(parseInt(toneGeneratorFromInput.value) || 0, 20), 20000);
    let toHz = Math.min(Math.max(parseInt(toneGeneratorToInput.value) || 0, fromHz), 20000);
    if (fromHz > toHz) {
        let swap = fromHz;
        fromHz = toHz;
        toHz = swap;
    }
    if (!toneGeneratorOsc) {
        toneGeneratorSlider.value = "0";
        toneGeneratorText.innerText = String(fromHz);
        if (!startToneGeneratorOscillatorIfStopped()) {
            return;
        }
    }
    if (toneSweepRafId !== null) {
        cancelAnimationFrame(toneSweepRafId);
        toneSweepRafId = null;
    }
    let sweepDurationSec = 0;
    if (fromHz !== toHz && TONE_SWEEP_FULL_LOG_SPAN > 1e-9) {
        let logSpan = Math.log(toHz / fromHz);
        if (logSpan > 1e-9) {
            sweepDurationSec = Math.max(TONE_SWEEP_MIN_DURATION_SEC,
                toneSweepDurationSec * (logSpan / TONE_SWEEP_FULL_LOG_SPAN));
        } else {
            sweepDurationSec = TONE_SWEEP_MIN_DURATION_SEC;
        }
    }
    /** Looped sweeps (Space held / play-button hold) alternate low->high then high->low. Each new startToneGeneratorSweep() begins upward. */
    let sweepForward = true;
    void toneGeneratorContext.resume();
    let t0 = toneGeneratorContext.currentTime;
    toneGeneratorOsc.frequency.cancelScheduledValues(t0);
    let curF = toneGeneratorOsc.frequency.value;
    let leadInSec = 0;
    if (fromHz !== toHz) {
        let cross = TONE_GEN_FADE_IN_SEC;
        if (Math.abs(curF - fromHz) > 0.5) {
            leadInSec = cross;
            toneGeneratorOsc.frequency.setValueAtTime(Math.max(20, curF), t0);
            toneGeneratorOsc.frequency.exponentialRampToValueAtTime(fromHz, t0 + cross);
            t0 += cross;
        } else {
            toneGeneratorOsc.frequency.setValueAtTime(fromHz, t0);
        }
        toneGeneratorOsc.frequency.exponentialRampToValueAtTime(toHz, t0 + sweepDurationSec);
    } else {
        toneGeneratorOsc.frequency.setValueAtTime(fromHz, t0);
    }
    /** Wall-clock span between loops: fade out (same as tone stop) + fade in (same as tone start), silent in between. */
    const loopGapWallMs = (TONE_GEN_FADE_OUT_SEC + TONE_GEN_FADE_IN_SEC) * 1000;
    let loopNextSweepPerfAnchorMs = null;
    let scheduleLoopSilenceThenNextSweep = () => {
        if (!toneGeneratorOsc || !toneGeneratorContext || !toneGeneratorMasterGain) {
            return;
        }
        let t = toneGeneratorContext.currentTime;
        let outSec = TONE_GEN_FADE_OUT_SEC;
        let inSec = TONE_GEN_FADE_IN_SEC;
        let tSilent = t + outSec;
        let tSweepStart = tSilent + inSec;
        let g = toneGeneratorMasterGain.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(0, tSilent);
        g.setValueAtTime(0, tSilent);
        g.linearRampToValueAtTime(liveToneGeneratorPlaybackGain, tSweepStart);
        let f = toneGeneratorOsc.frequency;
        let sweepLo = fromHz;
        let sweepHi = toHz;
        let rampStart = sweepForward ? sweepLo : sweepHi;
        let rampEnd = sweepForward ? sweepHi : sweepLo;
        f.cancelScheduledValues(tSilent);
        f.setValueAtTime(rampStart, tSilent);
        f.setValueAtTime(rampStart, tSweepStart);
        f.exponentialRampToValueAtTime(rampEnd, tSweepStart + sweepDurationSec);
        /* Approximate wall time when the next frequency ramp begins (audio clock ≈ real time). */
        loopNextSweepPerfAnchorMs = performance.now() + (tSweepStart - t) * 1000;
    };
    let sweepStartMs = performance.now();
    let sweepDurationMs = (sweepDurationSec + leadInSec) * 1000;
    let sweepPhase = "sweep";
    let sweepTick = () => {
        if (sweepPhase === "gap") {
            let uGap = Math.min(1, (performance.now() - sweepStartMs) / sweepDurationMs);
            toneGeneratorSlider.value = "0";
            toneGeneratorText.innerText = String(fromHz);
            if (uGap < 1) {
                toneSweepRafId = requestAnimationFrame(sweepTick);
                return;
            }
            sweepPhase = "sweep";
            sweepStartMs = loopNextSweepPerfAnchorMs != null
                ? loopNextSweepPerfAnchorMs
                : performance.now();
            loopNextSweepPerfAnchorMs = null;
            sweepDurationMs = sweepDurationSec * 1000;
            toneSweepRafId = requestAnimationFrame(sweepTick);
            return;
        }
        let u = Math.min(1, (performance.now() - sweepStartMs) / sweepDurationMs);
        let freq = sweepForward
            ? Math.round(Math.exp(
                Math.log(fromHz) + (Math.log(toHz) - Math.log(fromHz)) * u))
            : Math.round(Math.exp(
                Math.log(toHz) + (Math.log(fromHz) - Math.log(toHz)) * u));
        toneGeneratorSlider.value = String(sweepForward ? u : (1 - u));
        toneGeneratorText.innerText = String(freq);
        if (u < 1) {
            toneSweepRafId = requestAnimationFrame(sweepTick);
        } else {
            let loopHeld = toneSweepLoopSpaceHeld || toneSweepLoopPointerHeld;
            if (loopHeld && fromHz !== toHz && toneGeneratorOsc && sweepDurationSec > 0) {
                sweepForward = !sweepForward;
                scheduleLoopSilenceThenNextSweep();
                sweepPhase = "gap";
                sweepStartMs = performance.now();
                sweepDurationMs = loopGapWallMs;
                toneGeneratorSlider.value = "0";
                toneGeneratorText.innerText = String(fromHz);
                toneSweepRafId = requestAnimationFrame(sweepTick);
                return;
            }
            toneSweepRafId = null;
            toneGeneratorSlider.value = "0";
            toneGeneratorText.innerText = String(fromHz);
            if (toneGeneratorOsc) {
                toneGeneratorPlayButton.click();
            }
        }
    };
    toneSweepRafId = requestAnimationFrame(sweepTick);
};

// ============================================================
// === src/audio/tone-ui.js ===
// ============================================================
/* Tone generator UI bindings. Classic script for ordered loading. */
function initToneControls() {
    if (!toneGeneratorAddFilterButton || !toneGeneratorFromInput || !toneGeneratorToInput
            || !toneGeneratorSlider || !toneGeneratorPlayButton || !toneGeneratorText) {
        return;
    }
    toneGeneratorAddFilterButton.addEventListener("click", () => {
        let hz = parseInt(toneGeneratorText.innerText, 10) || 0;
        addPeakingFilterFromHz(hz, EQ_GRAPH_BASE_GAIN);
    });
    toneGeneratorFromInput.addEventListener("change", clearLiveSoundIntervalsDatasetIfPresent);
    toneGeneratorToInput.addEventListener("change", clearLiveSoundIntervalsDatasetIfPresent);
    toneGeneratorFromInput.addEventListener("input", scheduleLiveEqSync);
    toneGeneratorToInput.addEventListener("input", scheduleLiveEqSync);
    toneGeneratorFromInput.addEventListener("input", syncEqSoundRangeBrushFromLiveSoundInputs);
    toneGeneratorToInput.addEventListener("input", syncEqSoundRangeBrushFromLiveSoundInputs);
    toneGeneratorFromInput.addEventListener("change", syncEqSoundRangeBrushFromLiveSoundInputs);
    toneGeneratorToInput.addEventListener("change", syncEqSoundRangeBrushFromLiveSoundInputs);
    toneGeneratorSlider.addEventListener("input", () => {
        if (toneSweepRafId !== null) {
            cancelAnimationFrame(toneSweepRafId);
            toneSweepRafId = null;
        }
        toneSweepPointerHoldUp();
        let from = Math.min(Math.max(parseInt(toneGeneratorFromInput.value) || 0, 20), 20000);
        let to = Math.min(Math.max(parseInt(toneGeneratorToInput.value) || 0, from), 20000);
        let position = parseFloat(toneGeneratorSlider.value) || 0;
        let freq = Math.round(Math.exp(
            Math.log(from) + (Math.log(to) - Math.log(from)) * position));
        toneGeneratorText.innerText = freq;
        if (toneGeneratorOsc) {
            let t = toneGeneratorContext.currentTime;
            toneGeneratorOsc.frequency.cancelScheduledValues(t);
            toneGeneratorOsc.frequency.setTargetAtTime(freq, t, 0.2);
        }
    });
    document.addEventListener("keydown", (e) => {
        if (e.code !== "Space" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) {
            return;
        }
        let t = e.target;
        if (t && t.nodeType === 1 && t.tagName === "INPUT" && t.getAttribute("type") === "number") {
            if ((t.closest && t.closest("div.extra-eq")) || (t.closest && t.closest("div.live-sound-tools"))) {
                e.preventDefault();
            }
        }
        if (e.repeat) {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !tab || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        if (suppressEqExtraGlobalShortcutsForAppleSearch()) {
            return;
        }
        toneSweepLoopSpaceHeld = true;
    }, true);
    document.addEventListener("keyup", (e) => {
        if (e.code !== "Space") {
            return;
        }
        toneSweepLoopSpaceHeld = false;
    }, true);
    toneGeneratorPlayButton.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || e.detail !== 2) {
            return;
        }
        if (performance.now() - tonePlayBtnTouchArmTs < 40) {
            return;
        }
        tonePlayBtnArmLoopHoldAfterSecondPress(null);
    });
    toneGeneratorPlayButton.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || e.pointerType !== "touch") {
            return;
        }
        let now = performance.now();
        let isQuickSecondDown = tonePlayBtnTouchPrevDownTs > 0
            && (now - tonePlayBtnTouchPrevDownTs) <= TONE_PLAY_BTN_TOUCH_DOUBLE_MS;
        tonePlayBtnTouchPrevDownTs = now;
        if (!isQuickSecondDown) {
            return;
        }
        tonePlayBtnTouchPrevDownTs = 0;
        tonePlayBtnTouchArmTs = now;
        tonePlayBtnArmLoopHoldAfterSecondPress(() => {
            if (toneSweepRafId !== null) {
                return;
            }
            startToneGeneratorSweep();
        });
    });
    toneGeneratorPlayButton.addEventListener("click", (e) => {
        if (e.detail === 2) {
            e.preventDefault();
            if (toneSweepRafId === null) {
                startToneGeneratorSweep();
            }
            return;
        }
        if (toneGeneratorOsc) {
            fadeStopToneGeneratorPlayback();
        } else {
            if (!startToneGeneratorOscillatorIfStopped()) {
                return;
            }
        }
    });
}

let syncToneGeneratorToEqFrequencyHz = (hz) => {
    /* EQ freq edits normally retune the tone preview; skip while a sweep is running so the ramp is not cancelled. */
    if (toneSweepRafId !== null) {
        return;
    }
    let [fLo, fHi] = getEqConstraintFreqLoHi();
    hz = Math.min(fHi, Math.max(fLo, Math.round(Number(hz)) || fLo));
    let from = Math.min(Math.max(parseInt(toneGeneratorFromInput.value) || 0, 20), 20000);
    let to = Math.min(Math.max(parseInt(toneGeneratorToInput.value) || 0, from), 20000);
    let logSpan = Math.log(to) - Math.log(from);
    let position = logSpan > 0
        ? (Math.log(hz) - Math.log(from)) / logSpan
        : 0;
    position = Math.min(1, Math.max(0, position));
    toneGeneratorSlider.value = String(position);
    toneGeneratorText.innerText = String(hz);
    if (toneGeneratorOsc && toneGeneratorContext) {
        let t = toneGeneratorContext.currentTime;
        toneGeneratorOsc.frequency.cancelScheduledValues(t);
        toneGeneratorOsc.frequency.setTargetAtTime(hz, t, 0.2);
    }
};
/** Shift+Space: advance active slot in the cycle, stop every live source, then play the newly active one. */
let shiftSpaceAdvanceLiveSoundAndPlay = () => {
    cycleActiveLiveSoundPlayerShiftSpace();
    pauseMusicForLiveSoundSwitch();
    stopPinkNoisePlayback();
    fadeStopToneGeneratorPlayback();
    if (activeLiveSoundPlayer === "music" && musicFileLoaded && musicAudio && musicContext && musicPlayButton) {
        startMusicPlayback().catch(() => {});
    } else if (activeLiveSoundPlayer === "tone" && toneGeneratorPlayButton) {
        void startToneGeneratorOscillatorIfStopped();
    } else if (pinkNoisePlayButton) {
        pinkNoisePlayButton.click();
    }
};

// Expose let-scoped functions onto window so graphtool.js can call them as bare names
window.shiftSpaceAdvanceLiveSoundAndPlay = shiftSpaceAdvanceLiveSoundAndPlay;
window.fadeStopToneGeneratorPlayback = fadeStopToneGeneratorPlayback;
window.startToneGeneratorOscillatorIfStopped = startToneGeneratorOscillatorIfStopped;
window.startToneGeneratorSweep = startToneGeneratorSweep;
window.pauseMusicForLiveSoundSwitch = pauseMusicForLiveSoundSwitch;
window.removeMusicTrack = removeMusicTrack;
window.initMusicAudioGraph = initMusicAudioGraph;
window.stopPinkAndToneForExclusiveMusic = stopPinkAndToneForExclusiveMusic;
window.startMusicPlayback = startMusicPlayback;
window.resumeLiveSoundAfterSyncNativeDialog = resumeLiveSoundAfterSyncNativeDialog;
window.syncToneGeneratorToEqFrequencyHz = syncToneGeneratorToEqFrequencyHz;
window.syncLiveSoundMasterVolumeTrackFill = syncLiveSoundMasterVolumeTrackFill;
window.seekMusicToClientX = seekMusicToClientX;
window.syncMusicSegmentVisuals = syncMusicSegmentVisuals;
window.getMusicDuration = getMusicDuration;
window.clampMusicSegmentBounds = clampMusicSegmentBounds;
