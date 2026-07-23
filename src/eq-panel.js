/* EQ panel: filter management, constraints, AutoEQ, EQ graph interaction.
 * Extracted from addExtra() — loaded before graphtool.js. Classic script; no modules. */
function initEqPanelExtra() {
    let extraButton = document.querySelector("div.select > div.selector-tabs > button.extra");
    // Disable functions by config
    if (!extraEnabled) {
        extraButton.remove();
        return;
    }
    if (!extraUploadEnabled) {
        document.querySelector("div.extra-panel > div.extra-upload").style["display"] = "none";
    }
    if (!extraEQEnabled) {
        document.querySelector("div.extra-panel > div.extra-eq").style["display"] = "none";
    } else {
        let eqHistWrap = document.getElementById("extra-eq-change-history");
        if (eqHistWrap) {
            eqHistWrap.hidden = false;
        }
    }
    if (!extraToneGeneratorEnabled) {
        document.querySelector("div.extra-panel div.extra-tone-generator").style["display"] = "none";
    }
    if (typeof extraPinkNoiseEnabled !== "undefined" && !extraPinkNoiseEnabled) {
        document.querySelector("div.extra-panel div.extra-pink-noise").style["display"] = "none";
    }
    if (typeof extraMusicEnabled !== "undefined" && !extraMusicEnabled) {
        document.querySelector("div.extra-panel div.extra-music").style["display"] = "none";
    }
    /* Omitted `extraMusicEnabled` = same as true (show music block). Apple search / deep links / URL
       sync must follow that; only an explicit `false` turns music off. */
    let extraMusicAllowsAppleFeatures = typeof extraMusicEnabled === "undefined" || !!extraMusicEnabled;
    window.extraMusicAllowsAppleFeatures = extraMusicAllowsAppleFeatures;
    /** Space toggles this source; Shift+Space cycles Music → Pink → Tone (skips Music if no track). */
    /* Dynamic FR/target rows are shared by upload, EQ URL restore, and apply-EQ synthesis.
       Keep the catalog mutation helper here until those feature slices have explicit state APIs. */
    let addOrUpdatePhone = (brand, phone, ch) => {
        let phoneObj = asPhoneObj(brand, phone);
        phoneObj.rawChannels = ch;
        phoneObj.isDynamic = true;
        let phoneObjs = brand.phoneObjs;
        let oldPhoneObj = phoneObjs.filter(p => p.phone == phone.name)[0]
        if (oldPhoneObj) {
            oldPhoneObj.active && removePhone(oldPhoneObj, { internalEqPhoneReplace: true });
            phoneObj.id = oldPhoneObj.id;
            phoneObjs[phoneObjs.indexOf(oldPhoneObj)] = phoneObj;
            allPhones[allPhones.indexOf(oldPhoneObj)] = phoneObj;
        } else {
            brand.phones.push(phone);
            phoneObjs.push(phoneObj);
            allPhones.push(phoneObj);
        }
        updatePhoneSelect();
        return phoneObj;
    };
    if (typeof initExtraModules === "function") {
        initExtraModules({ addOrUpdatePhone: addOrUpdatePhone, extraButton: extraButton });
    }
    if (typeof initEqState === "function") {
        initEqState({ addOrUpdatePhone: addOrUpdatePhone });
    }
    /* Skip debounced history only for freq/gain/Q inputs while an EQ graph drag is active — those
       update continuously from the pointer; type / enable changes must still notify. */
    let eqHistorySkipNotifyForLiveGraphFilterInput = (t) => {
        let stPtr = eqGraphPointerState;
        return !!(stPtr && stPtr.mode === "eq" && stPtr.dragging && t && t.matches
            && t.matches("input[name='freq'], input[name='q'], input[name='gain']"));
    };
    if (filtersContainer) {
        filtersContainer.addEventListener("input", (e) => {
            let t = e.target;
            if (t && t.closest && filtersContainer.contains(t) && t.closest("div.filter")) {
                eqFiltersUserHasEdited = true;
                /* Type / band-enable use discrete history on `change` only; debounced notify here would
                   double-commit or coalesce with freq edits after MIN_GAP deferral. */
                if (t.matches && (t.matches("select[name='type']") || t.matches("input[name='enabled']"))) {
                    return;
                }
                if (!eqHistorySkipNotifyForLiveGraphFilterInput(t)) {
                    eqHistoryNotifyChange();
                }
            }
        }, true);
        filtersContainer.addEventListener("change", (e) => {
            let t = e.target;
            if (t && t.closest && filtersContainer.contains(t) && t.closest("div.filter")) {
                eqFiltersUserHasEdited = true;
                if (t.matches && (t.matches("select[name='type']") || t.matches("input[name='enabled']"))) {
                    if (t.matches("select[name='type']")) {
                        eqHistoryDebugLog("filtersContainer change (capture) type select", {
                            value: t.value,
                            activeEl: document.activeElement && document.activeElement.getAttribute
                                ? document.activeElement.getAttribute("name")
                                : null
                        });
                    }
                    /* History for type/enable is recorded from applyEQExec (runs after applyEQ), not here. */
                    return;
                }
                if (!eqHistorySkipNotifyForLiveGraphFilterInput(t)) {
                    eqHistoryNotifyChange();
                }
            }
        }, true);
        filtersContainer.addEventListener("focusin", (e) => {
            let t = e.target;
            if (!t || !t.matches || !t.matches("input[name='freq'], input[name='q'], input[name='gain'], select[name='type']")) {
                return;
            }
            if (!t.closest || !t.closest("div.filter") || !filtersContainer.contains(t.closest("div.filter"))) {
                return;
            }
            if (eqHistoryRestoring || eqHistoryChain.length > 0 || eqHistoryPendingPreEditSnap) {
                return;
            }
            eqHistoryPendingPreEditSnap = eqHistoryTakeSnapshot();
        }, true);
    }
    let updateEqFilterRowSelectionStyles = () => {
        if (!filtersContainer) {
            return;
        }
        filtersContainer.querySelectorAll("div.filter").forEach((el, i) => {
            el.classList.remove("eq-filter-row-selected", "eq-filter-row-dimmed");
            if (eqFilterSelectedRow === null) {
                return;
            }
            if (i === eqFilterSelectedRow) {
                el.classList.add("eq-filter-row-selected");
            }
        });
    };
    /* hoverHighlightRow: drag band or mouse-near marker; null = no pointer hover. */
    let applyEqFilterMarkerFillAndSize = (hoverHighlightRow) => {
        gEqFilterMarkers.selectAll("circle.eq-filter-marker").each(function (d) {
            if (!d) {
                return;
            }
            let c = d3.select(this);
            let hoverOn = hoverHighlightRow !== null && hoverHighlightRow !== undefined
                && d.rowIndex === hoverHighlightRow;
            let selOn = eqFilterSelectedRow !== null && d.rowIndex === eqFilterSelectedRow;
            let traceCol = c.attr("stroke");
            let strokeW = selOn
                ? EQ_GRAPH_MARKER_STROKE_W * EQ_GRAPH_MARKER_STROKE_HOVER_MULT
                : (hoverOn ? EQ_GRAPH_MARKER_STROKE_W * EQ_GRAPH_MARKER_STROKE_HOVER_MULT
                    : EQ_GRAPH_MARKER_STROKE_W);
            let rUse = selOn
                ? EQ_GRAPH_MARKER_R_BASE * EQ_GRAPH_MARKER_SEL_SCALE
                    * (hoverOn ? EQ_GRAPH_MARKER_SEL_HOVER_SCALE : 1)
                : EQ_GRAPH_MARKER_R_BASE * EQ_GRAPH_MARKER_UNSEL_SCALE
                    * (hoverOn ? EQ_GRAPH_MARKER_UNSEL_HOVER_SCALE : 1);
            c.classed("eq-filter-marker-hover", hoverOn)
                .classed("eq-filter-marker-selected", selOn)
                .attr("r", rUse)
                .attr("stroke-width", strokeW);
            if (selOn) {
                c.style("fill", eqMarkerResolvePaint(EQ_GRAPH_MARKER_SEL_FILL, traceCol))
                    .style("stroke", eqMarkerResolvePaint(EQ_GRAPH_MARKER_SEL_STROKE, traceCol));
            } else {
                if (EQ_GRAPH_MARKER_UNSEL_STROKE === "trace") {
                    c.style("stroke", null);
                } else {
                    c.style("stroke", eqMarkerResolvePaint(EQ_GRAPH_MARKER_UNSEL_STROKE, traceCol));
                }
                if (EQ_GRAPH_MARKER_UNSEL_FILL === "graph") {
                    c.attr("fill", null)
                        .style("fill", null);
                } else {
                    c.attr("fill", null)
                        .style("fill", eqMarkerResolvePaint(EQ_GRAPH_MARKER_UNSEL_FILL, traceCol));
                }
            }
        });
    };
    /* Gap below panel top when snapping extra-eq into view (scroll slightly less than flush). */
    const EQ_FILTER_SCROLL_EQ_TOP_INSET_PX = 10;
    /* If the filter row already fits in the panel, don’t smooth-scroll a few px just to nudge EQ inset. */
    const EQ_FILTER_SCROLL_IGNORE_INSET_NUDGE_PX = 28;
    let scrollEqFilterRowIntoView = (row) => {
        if (row === null || !filtersContainer) {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!tab || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        let rows = filtersContainer.querySelectorAll("div.filter");
        let el = rows[row];
        if (!el) {
            return;
        }
        requestAnimationFrame(() => {
            let panel = document.querySelector("div.select > div.extra-panel");
            let eqRoot = filtersContainer.closest("div.extra-eq");
            if (panel && eqRoot) {
                let pr = panel.getBoundingClientRect();
                let deltaEq = eqRoot.getBoundingClientRect().top - pr.top
                    - EQ_FILTER_SCROLL_EQ_TOP_INSET_PX;
                let deltaRow = el.getBoundingClientRect().bottom - pr.bottom;
                let delta = Math.max(deltaEq, deltaRow);
                if (delta <= 0) {
                    return;
                }
                if (deltaRow <= 0 && delta < EQ_FILTER_SCROLL_IGNORE_INSET_NUDGE_PX) {
                    return;
                }
                let maxTop = Math.max(0, panel.scrollHeight - panel.clientHeight);
                let nextTop = Math.max(0, Math.min(maxTop, panel.scrollTop + delta));
                if (Math.abs(nextTop - panel.scrollTop) < 1) {
                    return;
                }
                panel.scrollTo({ top: nextTop, behavior: "smooth" });
            } else {
                el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        });
    };
    let setEqFilterSelectedRow = (row, scrollBandIntoView) => {
        if (row !== null && (typeof row !== "number" || row < 0 || row >= eqBands)) {
            row = null;
        }
        eqFilterSelectedRow = row;
        updateEqFilterRowSelectionStyles();
        updateEqFilterMarkers();
        if (row !== null && scrollBandIntoView) {
            scrollEqFilterRowIntoView(row);
        }
    };
    if (typeof initExtraPanel === "function") {
        initExtraPanel({
            extraButton: extraButton,
            applyParametricEqGraphTraceFocus: applyParametricEqGraphTraceFocus,
            updateEqTraceOpacity: (...a) => window.updateEqTraceOpacity(...a),
            updateEqFilterMarkers: updateEqFilterMarkers,
            eqSoundRangeUiHooks: eqSoundRangeUiHooks,
            updatePhoneTable: updatePhoneTable,
            setEqFilterSelectedRow: setEqFilterSelectedRow,
            syncEqHoverPreview: syncEqHoverPreview
        });
    }
    if (typeof initEqConstraints === "function") {
        initEqConstraints();
    }

    if (typeof initEqHistory === "function") {
        initEqHistory();
    }

    let eq2chRowsToApplySpecs = (rows) => {
        let clamped = elemToFiltersClampedRowsForEqualizerApply(eq2chPadBankToEqBands(rows), true);
        return clamped.filter((f) => !f.disabled && f.type && f.freq && f.q)
            .map((f) => ({ type: f.type, freq: f.freq, q: f.q, gain: f.gain }));
    };
    let eq2chMergedSpecsForChannelIndex = (chIdx) => {
        let bothS = eq2chRowsToApplySpecs(eq2chBankData.both);
        if (!LR || !LR.length) {
            return bothS;
        }
        let lab = LR[Math.min(chIdx, LR.length - 1)];
        let out = bothS.slice();
        if (lab === "L") {
            out.push(...eq2chRowsToApplySpecs(eq2chBankData.L));
        } else if (lab === "R") {
            out.push(...eq2chRowsToApplySpecs(eq2chBankData.R));
        }
        return out;
    };
    /** One FR curve shared for 2ch EQ preview/apply: average across LR sides, each side optionally
        averaged across multiple samples (raw layout [L1…Lk, R1…Rk, …] from loadFiles merge order). */
    let eq2chSharedMeasurementBaseRaw = (phoneObj) => {
        if (!phoneObj || !phoneObj.rawChannels || !LR || LR.length < 2) {
            return null;
        }
        let raws = phoneObj.rawChannels;
        if (!raws.length || raws.length % LR.length !== 0) {
            return null;
        }
        let nPerSide = raws.length / LR.length;
        let sideCurves = [];
        for (let li = 0; li < LR.length; li++) {
            let bucket = [];
            for (let s = 0; s < nPerSide; s++) {
                let c = raws[li * nPerSide + s];
                if (c) {
                    bucket.push(c);
                }
            }
            if (!bucket.length) {
                sideCurves.push(null);
            } else if (bucket.length === 1) {
                sideCurves.push(bucket[0]);
            } else {
                sideCurves.push(avgCurves(bucket));
            }
        }
        let present = sideCurves.filter(Boolean);
        if (!present.length) {
            return null;
        }
        return present.length === 1 ? present[0] : avgCurves(present);
    };
    let eq2chGraphPreviewChannelIndex = () => {
        if (!isEqTwoChannelSupportEnabled()) {
            return 0;
        }
        if (eq2chActiveBank === "R") {
            let ix = LR.indexOf("R");
            return ix >= 0 ? ix : 1;
        }
        if (eq2chActiveBank === "L") {
            let ixL = LR.indexOf("L");
            return ixL >= 0 ? ixL : 0;
        }
        return 0;
    };
    let eq2chSyncBankTabStyles = () => {
        if (!eq2chBankTabsEl) {
            return;
        }
        let pos = eq2chActiveBank === "L" ? "0" : eq2chActiveBank === "R" ? "2" : "1";
        let track = eq2chBankTabsEl.querySelector(".eq-2ch-bank-seg-track");
        if (track) {
            track.setAttribute("data-eq-2ch-pos", pos);
        }
        eq2chBankTabsEl.querySelectorAll(".eq-2ch-bank-seg-btn").forEach((btn) => {
            let b = btn.getAttribute("data-eq-2ch-bank");
            let on = b === eq2chActiveBank;
            btn.setAttribute("aria-selected", on ? "true" : "false");
            btn.tabIndex = on ? 0 : -1;
        });
    };
    let eq2chSwitchBank = (next) => {
        if (!isEqTwoChannelSupportEnabled() || (next !== "both" && next !== "L" && next !== "R")) {
            return;
        }
        if (next === eq2chActiveBank) {
            return;
        }
        let finishBankSwitch = () => {
            eq2chFlushDomToActiveBank();
            eq2chActiveBank = next;
            filtersToElem(eq2chPadBankToEqBands(eq2chBankData[eq2chActiveBank]));
            eq2chSyncBankTabStyles();
            cancelDeferredApplyEQ();
            applyEQExec();
            scheduleLiveEqSync();
        };
        let prefersReducedMotion = typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!filtersContainer || prefersReducedMotion) {
            finishBankSwitch();
            return;
        }
        clearEq2chBankSwapAnimation();
        let mySeq = ++eq2chBankSwapSeq;
        let animClass = "eq-2ch-bank-filters-swap-anim";
        void filtersContainer.offsetWidth;
        filtersContainer.classList.add(animClass);
        eq2chBankSwapAnimEndFn = (e) => {
            if (e.target !== filtersContainer || e.animationName !== "eq2chBankFiltersSwap") {
                return;
            }
            if (mySeq !== eq2chBankSwapSeq) {
                return;
            }
            filtersContainer.removeEventListener("animationend", eq2chBankSwapAnimEndFn);
            eq2chBankSwapAnimEndFn = null;
            filtersContainer.classList.remove(animClass);
        };
        filtersContainer.addEventListener("animationend", eq2chBankSwapAnimEndFn);
        eq2chBankSwapApplyTimer = setTimeout(() => {
            eq2chBankSwapApplyTimer = null;
            if (mySeq !== eq2chBankSwapSeq) {
                return;
            }
            finishBankSwitch();
        }, EQ_2CH_BANK_SWAP_APPLY_AT_MS);
        eq2chBankSwapCleanupTimer = setTimeout(() => {
            eq2chBankSwapCleanupTimer = null;
            if (mySeq !== eq2chBankSwapSeq) {
                return;
            }
            if (filtersContainer && eq2chBankSwapAnimEndFn) {
                filtersContainer.removeEventListener("animationend", eq2chBankSwapAnimEndFn);
                eq2chBankSwapAnimEndFn = null;
            }
            if (filtersContainer) {
                filtersContainer.classList.remove(animClass);
            }
        }, EQ_2CH_BANK_SWAP_ANIM_MS + 80);
    };
    let eq2chInitBanksFromCurrentDom = () => {
        let base = elemToFilters(true).map((f) => ({
            disabled: !!f.disabled,
            type: f.type,
            freq: f.freq,
            q: f.q,
            gain: f.gain
        }));
        if (!base.length) {
            base.push(eq2chDefaultEmptyRow());
        }
        eq2chBankData.both = base.slice();
        eq2chBankData.L = eq2chPadBankToEqBands([eq2chDefaultEmptyRow()]);
        eq2chBankData.R = eq2chPadBankToEqBands([eq2chDefaultEmptyRow()]);
        eq2chActiveBank = "both";
    };
    let eq2chSetTabsVisibility = (show) => {
        if (eq2chBankTabsEl) {
            eq2chBankTabsEl.hidden = !show;
        }
        if (show) {
            eq2chSyncBankTabStyles();
        }
    };
    let eq2chOnConstraintToggleChange = () => {
        if (isEqTwoChannelSupportEnabled()) {
            eq2chInitBanksFromCurrentDom();
            eq2chSetTabsVisibility(true);
            filtersToElem(eq2chPadBankToEqBands(eq2chBankData.both));
        } else {
            eq2chFlushDomToActiveBank();
            if (eq2chActiveBank !== "both") {
                eq2chActiveBank = "both";
            }
            eq2chBankData.L = [];
            eq2chBankData.R = [];
            filtersToElem(eq2chPadBankToEqBands(eq2chBankData.both));
            eq2chSetTabsVisibility(false);
        }
        eq2chSyncBankTabStyles();
        cancelDeferredApplyEQ();
        applyEQExec();
        scheduleLiveEqSync();
        eqHistoryCommitTransaction();
    };
    let eq2chResetAllBanksToDefaultRow = () => {
        eq2chBankData.both = [eq2chDefaultEmptyRow()];
        eq2chBankData.L = [eq2chDefaultEmptyRow()];
        eq2chBankData.R = [eq2chDefaultEmptyRow()];
        eq2chActiveBank = "both";
        eq2chSetTabsVisibility(isEqTwoChannelSupportEnabled());
        eq2chSyncBankTabStyles();
    };
    if (eq2chBankTabsEl) {
        eq2chBankTabsEl.addEventListener("click", (e) => {
            let btn = e.target && e.target.closest && e.target.closest("button.eq-2ch-bank-seg-btn");
            if (!btn || !eq2chBankTabsEl.contains(btn)) {
                return;
            }
            let bank = btn.getAttribute("data-eq-2ch-bank");
            eq2chSwitchBank(bank);
        });
    }
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }
        if (!extraEnabled || !extraEQEnabled) {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!tab || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        if (!isEqTwoChannelSupportEnabled() || !eq2chBankTabsEl || eq2chBankTabsEl.hidden) {
            return;
        }
        let code = e.code;
        if (code !== "KeyL" && code !== "KeyR" && code !== "KeyA") {
            return;
        }
        let t = e.target;
        if (t && t.nodeType === 1) {
            if (t.isContentEditable || (t.closest && t.closest("[contenteditable=\"true\"]"))) {
                return;
            }
            let tag = t.tagName;
            if (tag === "TEXTAREA" || tag === "SELECT") {
                return;
            }
            if (tag === "INPUT") {
                let typ = (t.getAttribute("type") || "").toLowerCase();
                if (typ === "text" || typ === "search" || typ === "email" || typ === "url"
                        || typ === "password" || typ === "") {
                    return;
                }
            }
        }
        if (code === "KeyL") {
            if (eq2chActiveBank === "L") {
                return;
            }
            e.preventDefault();
            eq2chSwitchBank("L");
        } else if (code === "KeyR") {
            if (eq2chActiveBank === "R") {
                return;
            }
            e.preventDefault();
            eq2chSwitchBank("R");
        } else if (code === "KeyA") {
            if (eq2chActiveBank === "both") {
                return;
            }
            e.preventDefault();
            eq2chSwitchBank("both");
        }
    });
    if (eq2chConstraintToggle) {
        eq2chConstraintToggle.addEventListener("change", eq2chOnConstraintToggleChange);
    }
    window.applyEqFilterMarkerFillAndSize = applyEqFilterMarkerFillAndSize;
    /* Graphic auto-rows: Q max "0"/blank = unlimited (config hi 10); use nominal Q 1 unless min Q forces higher. */
    let eqGraphicModeTemplateQHz = () => {
        let qMaxEl = document.querySelector("div.extra-eq input[name='eq-constraint-q-max']");
        let maxRaw = qMaxEl ? String(qMaxEl.value || "").trim() : "";
        let [qLo, qHi] = getEqConstraintQLoHi();
        if (maxRaw === "" || maxRaw === "0") {
            return Math.min(qHi, Math.max(qLo, 1));
        }
        return qHi;
    };
    let eqGraphicModeApplyAutoTemplateFromBands = (bands) => {
        if (!bands || bands.length < 2 || !filterFreqInput || !filterFreqInput.length) {
            return;
        }
        if (eqFiltersUserHasEdited) {
            return;
        }
        let cap = Math.min(bands.length, extraEQBandsMax);
        let qUse = eqGraphicModeTemplateQHz();
        let qStr = qUse <= 0.3 + 1e-9
            ? String(Math.round(qUse * 100) / 100)
            : String(Math.round(qUse * 10) / 10);
        let typ = firstAllowedEqFilterType();
        if (eqBands < cap) {
            eqBands = cap;
            updateFilterElements();
        }
        for (let i = 0; i < cap; i++) {
            filterEnabledInput[i].checked = true;
            filterTypeSelect[i].value = typ;
            filterFreqInput[i].value = String(bands[i]);
            filterQInput[i].value = qStr;
            filterGainInput[i].value = "0";
        }
        for (let i = cap; i < eqBands; i++) {
            filterEnabledInput[i].checked = true;
            filterTypeSelect[i].value = typ;
            filterFreqInput[i].value = "0";
            filterQInput[i].value = "0";
            filterGainInput[i].value = "0";
        }
    };
    let applyEqGraphicModeAuxUiAndBands = (opts) => {
        opts = opts || {};
        let skipApply = !!opts.skipApply;
        let bands = Equalizer.config.EqGraphicBandFreqHz;
        let freqRowEl = document.querySelector("div.extra-eq .eq-constraint-freq-row");
        let uiShowsGraphicBands = !!(freqRowEl
            && freqRowEl.classList.contains("eq-constraint-freq-row-graphic"));
        /* Config alone is not enough: EqGraphicBandFreqHz can stay set after switching the UI back
           to parametric min/max — then every constraint edit refills bands from the old template. */
        let graphic = uiShowsGraphicBands && Array.isArray(bands) && bands.length >= 2;
        let maxBandsEl = document.querySelector("div.extra-eq input[name='eq-constraint-max-bands']");
        let qMinEl = document.querySelector("div.extra-eq input[name='eq-constraint-q-min']");
        if (!maxBandsEl || !qMinEl) {
            return;
        }
        if (graphic) {
            let cap = Math.min(bands.length, extraEQBandsMax);
            Equalizer.config.EqMaxBands = cap;
            maxBandsEl.value = String(cap);
            maxBandsEl.setAttribute("data-eq-graphic-max-lock", "1");
            maxBandsEl.disabled = true;
            qMinEl.disabled = true;
            eqGraphicModeApplyAutoTemplateFromBands(bands);
            refreshEqFilterInactiveStateForMaxBands();
            applyEqConstraintAttributesToFilterInputs();
            if (!skipApply) {
                cancelDeferredApplyEQ();
                applyEQExec();
                scheduleLiveEqSync();
            }
        } else {
            maxBandsEl.disabled = false;
            qMinEl.disabled = false;
            let hadGraphicMaxLock = maxBandsEl.hasAttribute("data-eq-graphic-max-lock");
            if (hadGraphicMaxLock) {
                maxBandsEl.removeAttribute("data-eq-graphic-max-lock");
                Equalizer.config.EqMaxBands = 0;
                syncEqMaxBandsFieldFromConfig();
            }
            refreshEqFilterInactiveStateForMaxBands();
            if (hadGraphicMaxLock && !skipApply) {
                cancelDeferredApplyEQ();
                applyEQExec();
                scheduleLiveEqSync();
            }
        }
    };
    let refreshEqConstraintDomValidityClasses = () => {
        let vClass = "eq-constraint-input-violation";
        let freqMinEl = document.querySelector("div.extra-eq input[name='eq-constraint-freq-min']");
        let freqMaxEl = document.querySelector("div.extra-eq input[name='eq-constraint-freq-max']");
        let freqGraphicInp = document.querySelector("div.extra-eq input[name='eq-constraint-freq-graphic-list']");
        let freqRow = document.querySelector("div.extra-eq .eq-constraint-freq-row");
        let qMinEl = document.querySelector("div.extra-eq input[name='eq-constraint-q-min']");
        let qMaxEl = document.querySelector("div.extra-eq input[name='eq-constraint-q-max']");
        let gainMinEl = document.querySelector("div.extra-eq input[name='eq-constraint-gain-min']");
        let gainMaxEl = document.querySelector("div.extra-eq input[name='eq-constraint-gain-max']");
        [freqMinEl, freqMaxEl, freqGraphicInp, qMinEl, qMaxEl, gainMinEl, gainMaxEl].forEach((el) => {
            if (el) {
                el.classList.remove(vClass);
            }
        });
        if (!freqMinEl || !freqMaxEl || !qMinEl || !qMaxEl || !gainMinEl || !gainMaxEl) {
            return;
        }
        let markPair = (minEl, maxEl, loAbs, hiAbs, intMode) => {
            let minRaw = (minEl.value || "").trim();
            let maxRaw = (maxEl.value || "").trim();
            let minInc = eqConstraintNumericInputIncomplete(minEl.value);
            let maxInc = eqConstraintNumericInputIncomplete(maxEl.value);
            let minUnl = minRaw === "" || minRaw === "0";
            let maxUnl = maxRaw === "" || maxRaw === "0";
            let parseLim = (raw, asInt) => {
                if (raw === "" || raw === "0") {
                    return null;
                }
                let v = asInt ? parseInt(raw, 10) : parseFloat(raw);
                return Number.isFinite(v) ? v : null;
            };
            let nMin = minInc ? null : parseLim(minRaw, intMode);
            let nMax = maxInc ? null : parseLim(maxRaw, intMode);
            if (!minInc && !minUnl && nMin !== null && (nMin < loAbs || nMin > hiAbs)) {
                minEl.classList.add(vClass);
            }
            if (!maxInc && !maxUnl && nMax !== null && (nMax < loAbs || nMax > hiAbs)) {
                maxEl.classList.add(vClass);
            }
            if (!minInc && !maxInc && !minUnl && !maxUnl && nMin !== null && nMax !== null
                    && nMin > nMax) {
                minEl.classList.add(vClass);
                maxEl.classList.add(vClass);
            }
        };
        if (freqRow && freqRow.classList.contains("eq-constraint-freq-row-graphic") && freqGraphicInp) {
            let rawG = (freqGraphicInp.value || "").trim();
            if (rawG !== "") {
                let listG = parseEqConstraintGraphicFreqList(rawG);
                if (listG.length < 2) {
                    freqGraphicInp.classList.add(vClass);
                }
            }
        } else {
            markPair(freqMinEl, freqMaxEl, 20, 20000, true);
        }
        markPair(qMinEl, qMaxEl, 0.1, 10, false);
        markPair(gainMinEl, gainMaxEl, -40, 40, false);
    };
    let syncEqConstraintDomToEqualizerConfig = () => {
        let freqMinEl = document.querySelector("div.extra-eq input[name='eq-constraint-freq-min']");
        let freqMaxEl = document.querySelector("div.extra-eq input[name='eq-constraint-freq-max']");
        let qMinEl = document.querySelector("div.extra-eq input[name='eq-constraint-q-min']");
        let qMaxEl = document.querySelector("div.extra-eq input[name='eq-constraint-q-max']");
        let gainMinEl = document.querySelector("div.extra-eq input[name='eq-constraint-gain-min']");
        let gainMaxEl = document.querySelector("div.extra-eq input[name='eq-constraint-gain-max']");
        let pkEl = document.querySelector("div.extra-eq input.eq-constraint-type-pk");
        let lsqEl = document.querySelector("div.extra-eq input.eq-constraint-type-lsq");
        let hsqEl = document.querySelector("div.extra-eq input.eq-constraint-type-hsq");
        if (!freqMinEl || !freqMaxEl || !qMinEl || !qMaxEl || !gainMinEl || !gainMaxEl
                || !pkEl || !lsqEl || !hsqEl) {
            return;
        }
        let prevA = Equalizer.config.AutoEQRange ? Equalizer.config.AutoEQRange.slice() : [20, 20000];
        let prevQ = Equalizer.config.OptimizeQRange ? Equalizer.config.OptimizeQRange.slice() : [0.1, 10];
        let prevG = Equalizer.config.OptimizeGainRange ? Equalizer.config.OptimizeGainRange.slice() : [-40, 40];
        let freqRow = document.querySelector("div.extra-eq .eq-constraint-freq-row");
        let gListInp = document.querySelector("div.extra-eq input[name='eq-constraint-freq-graphic-list']");
        /* Parametric frequency row: drop stale graphic band list so AutoEQRange follows min/max again
           and applyEqGraphicModeAuxUiAndBands does not treat us as graphic-EQ mode. */
        if (freqRow && !freqRow.classList.contains("eq-constraint-freq-row-graphic")) {
            Equalizer.config.EqGraphicBandFreqHz = null;
        }
        if (freqRow && freqRow.classList.contains("eq-constraint-freq-row-graphic") && gListInp) {
            let rawG = (gListInp.value || "").trim();
            let listG = parseEqConstraintGraphicFreqList(rawG);
            if (rawG === "" || listG.length < 2) {
                clearEqConstraintGraphicFreqMode();
            } else {
                Equalizer.config.EqGraphicBandFreqHz = listG;
                Equalizer.config.AutoEQRange = [listG[0], listG[listG.length - 1]];
            }
        }
        if (!Equalizer.config.EqGraphicBandFreqHz || Equalizer.config.EqGraphicBandFreqHz.length < 2) {
            Equalizer.config.EqGraphicBandFreqHz = null;
            let fMinRaw = (freqMinEl.value || "").trim();
            let fMaxRaw = (freqMaxEl.value || "").trim();
            let fMinInc = eqConstraintNumericInputIncomplete(freqMinEl.value);
            let fMaxInc = eqConstraintNumericInputIncomplete(freqMaxEl.value);
            let fMin;
            let fMax;
            if (fMinInc) {
                fMin = prevA[0];
            } else if (fMinRaw === "" || fMinRaw === "0") {
                fMin = 20;
            } else {
                let p = parseInt(fMinRaw, 10);
                fMin = Number.isFinite(p) ? Math.min(20000, Math.max(20, p)) : prevA[0];
            }
            if (fMaxInc) {
                fMax = prevA[1];
            } else if (fMaxRaw === "" || fMaxRaw === "0") {
                fMax = 20000;
            } else {
                let p = parseInt(fMaxRaw, 10);
                fMax = Number.isFinite(p) ? Math.min(20000, Math.max(20, p)) : prevA[1];
            }
            if (fMin > fMax) {
                let t = fMin;
                fMin = fMax;
                fMax = t;
            }
            Equalizer.config.AutoEQRange = [fMin, fMax];
        }
        let qMinRaw = (qMinEl.value || "").trim();
        let qMaxRaw = (qMaxEl.value || "").trim();
        let qMinInc = eqConstraintNumericInputIncomplete(qMinEl.value);
        let qMaxInc = eqConstraintNumericInputIncomplete(qMaxEl.value);
        let qMin;
        let qMax;
        if (qMinInc) {
            qMin = prevQ[0];
        } else if (qMinRaw === "" || qMinRaw === "0") {
            qMin = 0.1;
        } else {
            let p = parseFloat(qMinRaw);
            qMin = Number.isFinite(p) ? Math.min(10, Math.max(0.1, p)) : prevQ[0];
        }
        if (qMaxInc) {
            qMax = prevQ[1];
        } else if (qMaxRaw === "" || qMaxRaw === "0") {
            qMax = 10;
        } else {
            let p = parseFloat(qMaxRaw);
            qMax = Number.isFinite(p) ? Math.min(10, Math.max(0.1, p)) : prevQ[1];
        }
        if (qMin > qMax) {
            let t = qMin;
            qMin = qMax;
            qMax = t;
        }
        let gMinRaw = (gainMinEl.value || "").trim();
        let gMaxRaw = (gainMaxEl.value || "").trim();
        let gMinInc = eqConstraintNumericInputIncomplete(gainMinEl.value);
        let gMaxInc = eqConstraintNumericInputIncomplete(gainMaxEl.value);
        let gMin;
        let gMax;
        if (gMinInc) {
            gMin = prevG[0];
        } else if (gMinRaw === "" || gMinRaw === "0") {
            gMin = -40;
        } else {
            let p = parseFloat(gMinRaw);
            gMin = Number.isFinite(p) ? Math.min(40, Math.max(-40, p)) : prevG[0];
        }
        if (gMaxInc) {
            gMax = prevG[1];
        } else if (gMaxRaw === "" || gMaxRaw === "0") {
            gMax = 40;
        } else {
            let p = parseFloat(gMaxRaw);
            gMax = Number.isFinite(p) ? Math.min(40, Math.max(-40, p)) : prevG[1];
        }
        if (gMin > gMax) {
            let t = gMin;
            gMin = gMax;
            gMax = t;
        }
        let allowPk = pkEl.checked;
        let allowLsq = lsqEl.checked;
        let allowHsq = hsqEl.checked;
        if (!allowPk && !allowLsq && !allowHsq) {
            allowPk = true;
            pkEl.checked = true;
        }
        Equalizer.config.OptimizeQRange = [qMin, qMax];
        Equalizer.config.OptimizeGainRange = [gMin, gMax];
        Equalizer.config.EqAllowedTypes = { PK: allowPk, LSQ: allowLsq, HSQ: allowHsq };
        applyEqGraphicModeAuxUiAndBands();
        applyEqConstraintAttributesToFilterInputs();
        refreshEqConstraintDomValidityClasses();
        refreshEqFilterConstraintViolationStyles();
        refreshEqFilterInactiveStateForMaxBands();
    };
    let commitEqMaxBandsFromInput = (opts) => {
        opts = opts || {};
        let maxBandsEl = document.querySelector("div.extra-eq input[name='eq-constraint-max-bands']");
        if (!maxBandsEl || maxBandsEl.disabled) {
            return;
        }
        let parsed = parseInt(maxBandsEl.value, 10);
        let maxB;
        if (!Number.isFinite(parsed) || parsed <= 0) {
            maxB = 0;
        } else {
            maxB = Math.min(Math.max(1, parsed), extraEQBandsMax);
        }
        Equalizer.config.EqMaxBands = maxB;
        if (opts.writeBackDom !== false) {
            maxBandsEl.value = maxB <= 0 ? "0" : String(maxB);
        }
        maxBandsEl.setAttribute("max", String(extraEQBandsMax));
        refreshEqFilterInactiveStateForMaxBands();
        cancelDeferredApplyEQ();
        applyEQExec();
        scheduleLiveEqSync();
    };
    let syncEqMaxBandsFieldFromConfig = () => {
        let maxBandsEl = document.querySelector("div.extra-eq input[name='eq-constraint-max-bands']");
        if (!maxBandsEl) {
            return;
        }
        let cfg = Math.floor(Number(Equalizer.config.EqMaxBands));
        maxBandsEl.value = (!Number.isFinite(cfg) || cfg <= 0) ? "0" : String(Math.min(cfg, extraEQBandsMax));
        maxBandsEl.setAttribute("max", String(extraEQBandsMax));
    };
    let eqInterpDbAtHz = (pts, fHz) => {
        if (!pts || pts.length < 2) {
            return null;
        }
        let f = Math.min(20000, Math.max(20, fHz));
        let i = 0;
        while (i < pts.length - 1 && pts[i + 1][0] < f) {
            i++;
        }
        if (i >= pts.length - 1) {
            return pts[pts.length - 1][1];
        }
        let f0 = pts[i][0];
        let f1 = pts[i + 1][0];
        let d0 = pts[i][1];
        let d1 = pts[i + 1][1];
        if (f <= f0) {
            return d0;
        }
        if (f1 <= f0 || f0 <= 0) {
            return d0;
        }
        let t = (Math.log(f) - Math.log(f0)) / (Math.log(f1) - Math.log(f0));
        return d0 * (1 - t) + d1 * t;
    };
    /* Same implicit FR target as applyEQExec / AutoEQ when the dropdown is still “Choose EQ model” */
    let resolveEqGraphPhoneObj = () => {
        let sel = eqPhoneSelect && String(eqPhoneSelect.value || "").trim();
        let intent = (typeof window !== "undefined" && window.__eqCoord.modelIntent)
            ? String(window.__eqCoord.modelIntent).trim()
            : "";
        let sticky = (typeof window !== "undefined" && window.__eqCoord.lastGraphModel)
            ? String(window.__eqCoord.lastGraphModel).trim()
            : "";
        let key = intent || sel || sticky;
        if (key) {
            return eqMeasurementObjForSelect(key);
        }
        return activePhones.filter(p =>
            !p.isTarget && p.fullName && !p.fullName.match(/ EQ$/))[0] || null;
    };
    /* Prefer the EQ child channel when present; otherwise derive the EQ-shaped curve from the DOM
       filters so preview/markers never snap to the raw trace during one-frame EQ lag (notably
       Safari + overlap with the unequalized curve). */
    let eqGraphResolveEqTraceForLayout = (phoneObj) => {
        if (!phoneObj) {
            return null;
        }
        let rawCh = firstPresentChannel(phoneObj.rawChannels);
        if (!rawCh) {
            return null;
        }
        let eqPhone = phoneObj.eq;
        let chIx = eq2chGraphPreviewChannelIndex();
        let eqCh = eqPhone && eqPhone.rawChannels && eqPhone.rawChannels[chIx]
            ? eqPhone.rawChannels[chIx]
            : (eqPhone && firstPresentChannel(eqPhone.rawChannels));
        if (eqCh) {
            return { tracePhone: eqPhone, traceCh: eqCh, strokePhone: eqPhone };
        }
        let chPv = chIx;
        let base2 = isEqTwoChannelSupportEnabled() ? eq2chSharedMeasurementBaseRaw(phoneObj) : null;
        let rawChUse = base2
            ? base2
            : ((phoneObj.rawChannels && phoneObj.rawChannels[chPv])
                ? phoneObj.rawChannels[chPv]
                : rawCh);
        let filters = isEqTwoChannelSupportEnabled()
            ? eq2chMergedSpecsForChannelIndex(chPv)
            : elemToFiltersClampedForEqualizerApply(false);
        if (filters.length && typeof Equalizer !== "undefined" && Equalizer.apply) {
            try {
                let fr = Equalizer.apply(rawChUse, filters);
                if (fr) {
                    return { tracePhone: phoneObj, traceCh: fr, strokePhone: phoneObj };
                }
            } catch (err) { /* noop */ }
        }
        return { tracePhone: phoneObj, traceCh: rawChUse, strokePhone: phoneObj };
    };
    let computeEqNodePreviewAtMouse = (m) => {
        if (!m || m.length < 2) {
            return null;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab
            || tab.getAttribute("data-selected") !== "extra") {
            return null;
        }
        let phoneObj = resolveEqGraphPhoneObj();
        if (!phoneObj) {
            return null;
        }
        let resolved = eqGraphResolveEqTraceForLayout(phoneObj);
        if (!resolved) {
            return null;
        }
        let { tracePhone, traceCh } = resolved;
        let fHz = Math.min(20000, Math.max(20, x.invert(m[0])));
        let pts = baseline.fn(traceCh);
        let db = eqInterpDbAtHz(pts, fHz);
        if (db === null || !Number.isFinite(db)) {
            return null;
        }
        return { fHz, phoneObj, tracePhone, db, pts };
    };
    let applyEqGraphTraceStrokeEmphasis = (tracePhone, enabled) => {
        gpath.selectAll("path").each(function (d) {
            let n = d3.select(this);
            let base = this.classList.contains("sample")
                ? EQ_GRAPH_TRACE_STROKE_SAMPLE
                : EQ_GRAPH_TRACE_STROKE_NORMAL;
            let match = Boolean(enabled && tracePhone && d && d.p
                && (d.p === tracePhone || d.p.fileName === tracePhone.fileName));
            let w;
            if (d && d.p && d.p.isTarget) {
                let tW = targetTraceStrokeWidthForPhone(d.p);
                w = match ? tW * EQ_GRAPH_TRACE_STROKE_EMPH_MULT : tW;
            } else {
                w = match ? base * EQ_GRAPH_TRACE_STROKE_EMPH_MULT : base;
            }
            /* Always set via .attr; CSS transitions stroke-width on g.curves-g path. D3 transitions
               here restarted every sync when de-emphasized and could stick thin if attr was inherited. */
            n.interrupt(EQ_GRAPH_TRACE_EM_TNAME);
            n.attr("stroke-width", w);
        });
    };
    let eqGraphPlotDistPx = (m, gx, gy) => {
        if (!m || m.length < 2) {
            return Infinity;
        }
        let plot = graphPlotHitRect && graphPlotHitRect.node();
        if (!plot) {
            return Infinity;
        }
        let svg = plot.ownerSVGElement || (plot.closest && plot.closest("svg"));
        if (!svg || !svg.viewBox || !svg.getBoundingClientRect) {
            return Infinity;
        }
        let rect = svg.getBoundingClientRect();
        let vb = svg.viewBox.baseVal;
        let pxPerSvgX = rect.width / Math.max(1e-6, vb.width);
        let pxPerSvgY = rect.height / Math.max(1e-6, vb.height);
        let dxPx = (m[0] - gx) * pxPerSvgX;
        let dyPx = (m[1] - gy) * pxPerSvgY;
        return Math.hypot(dxPx, dyPx);
    };
    /* Same enabled-band list as elemToFilters(); if shelfRowAsPk === j and row j is LSQ/HSQ, use PK
       so the summed response matches “this band as a peak” for marker anchoring. */
    let eqFiltersListForApply = (shelfRowAsPk) => {
        let out = [];
        let maxA = getEffectiveEqMaxBands();
        for (let j = 0; j < eqBands; ++j) {
            if (j >= maxA) {
                continue;
            }
            let disabled = !filterEnabledInput[j].checked;
            let t = (filterTypeSelect[j].value || "").trim();
            let f = parseInt(filterFreqInput[j].value, 10) || 0;
            let qv = parseFloat(filterQInput[j].value) || 0;
            let g = parseFloat(filterGainInput[j].value) || 0;
            if (disabled || !t || !f || !qv || !g) {
                continue;
            }
            let typ = t;
            if (shelfRowAsPk !== null && shelfRowAsPk !== undefined && j === shelfRowAsPk
                    && (t === "LSQ" || t === "HSQ")) {
                typ = "PK";
            }
            out.push({ type: typ, freq: f, q: qv, gain: g });
        }
        return out;
    };
    let buildEqGraphMarkerLayout = () => {
        let phoneObj = resolveEqGraphPhoneObj();
        if (!phoneObj) {
            return null;
        }
        let resolved = eqGraphResolveEqTraceForLayout(phoneObj);
        if (!resolved) {
            return null;
        }
        let { tracePhone, traceCh, strokePhone } = resolved;
        let pts = baseline.fn(traceCh);
        let yOff = y(getOffset(tracePhone)) - y(0);
        let strokeCol = getCurveColor(strokePhone.id, 0);
        let pvCh = eq2chGraphPreviewChannelIndex();
        let phoneRaw0 = (phoneObj.rawChannels && phoneObj.rawChannels[pvCh])
            ? phoneObj.rawChannels[pvCh]
            : firstPresentChannel(phoneObj.rawChannels);
        let rows = [];
        let maxA = getEffectiveEqMaxBands();
        for (let i = 0; i < eqBands; i++) {
            if (i >= maxA) {
                continue;
            }
            let disabled = !filterEnabledInput[i].checked;
            let type = filterTypeSelect[i].value;
            let freq = parseInt(filterFreqInput[i].value, 10) || 0;
            let q = parseFloat(filterQInput[i].value) || 0;
            let gain = parseFloat(filterGainInput[i].value) || 0;
            if (disabled || !type || !freq || !q) {
                continue;
            }
            let typeTrim = (type || "").trim();
            /* Shelves: Y = EQ trace at this freq if this band were PK (same f/q/gain), so toggling
               PK <-> shelf does not move the node; the drawn EQ curve still uses the real shelf. */
            let db;
            if ((typeTrim === "LSQ" || typeTrim === "HSQ")
                    && phoneRaw0
                    && typeof Equalizer !== "undefined" && Equalizer.apply) {
                let filtPk = eqFiltersListForApply(i);
                try {
                    let frEq = Equalizer.apply(phoneRaw0, filtPk);
                    let ptsPk = baseline.fn(frEq);
                    db = eqInterpDbAtHz(ptsPk, freq);
                } catch (err) {
                    db = null;
                }
                if (db === null || !Number.isFinite(db)) {
                    db = eqInterpDbAtHz(pts, freq);
                }
            } else {
                db = eqInterpDbAtHz(pts, freq);
            }
            if (db === null || !Number.isFinite(db)) {
                continue;
            }
            rows.push({
                rowIndex: i,
                freq,
                q,
                gain,
                type,
                cx: x(freq),
                cy: y(db) + yOff,
            });
        }
        return { tracePhone, strokeCol, rows };
    };
    window.buildEqGraphMarkerLayout = buildEqGraphMarkerLayout;
    window.eqHistorySkipNotifyForLiveGraphFilterInput = eqHistorySkipNotifyForLiveGraphFilterInput;
    window.updateEqFilterRowSelectionStyles = updateEqFilterRowSelectionStyles;
    window.setEqFilterSelectedRow = setEqFilterSelectedRow;
    window.computeEqNodePreviewAtMouse = computeEqNodePreviewAtMouse;
    window.applyEqGraphTraceStrokeEmphasis = applyEqGraphTraceStrokeEmphasis;
    window.eqGraphPlotDistPx = eqGraphPlotDistPx;
    let findEqGraphMarkerHit = (m) => {
        if (!m || m.length < 2) {
            return null;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab
                || tab.getAttribute("data-selected") !== "extra") {
            return null;
        }
        let layout = buildEqGraphMarkerLayout();
        if (!layout || !layout.rows.length) {
            return null;
        }
        let hitR = EQ_GRAPH_MARKER_HIT_PX;
        let best = null;
        let bestD = Infinity;
        for (let j = 0; j < layout.rows.length; j++) {
            let row = layout.rows[j];
            let d = eqGraphPlotDistPx(m, row.cx, row.cy);
            if (d > hitR) {
                continue;
            }
            if (d < bestD) {
                bestD = d;
                best = row;
            }
        }
        return best;
    };
    let eq2chPadPinnedBankRowsForGhost = (arr, bandCount) => {
        let filtersCopy = (arr || []).map((f) => ({
            disabled: !!f.disabled,
            type: f.type,
            freq: f.freq,
            q: f.q,
            gain: f.gain
        }));
        let bc = Math.max(1, bandCount || 1);
        while (filtersCopy.length < bc) {
            filtersCopy.push(eq2chDefaultEmptyRow());
        }
        if (filtersCopy.length > bc) {
            filtersCopy.length = bc;
        }
        return filtersCopy;
    };
    let pinnedBankRowsToApplySpecs = (bankRows, bandCount) => {
        let padded = eq2chPadPinnedBankRowsForGhost(bankRows, bandCount);
        let clamped = elemToFiltersClampedRowsForEqualizerApply(padded, true);
        return clamped.filter((f) => !f.disabled && f.type && f.freq && f.q)
            .map((f) => ({ type: f.type, freq: f.freq, q: f.q, gain: f.gain }));
    };
    let eq2chMergedPinnedSpecs = (banks, chIdx, bandCount) => {
        let bothS = pinnedBankRowsToApplySpecs(banks.both || [], bandCount);
        if (!LR || !LR.length) {
            return bothS;
        }
        let lab = LR[Math.min(chIdx, LR.length - 1)];
        let out = bothS.slice();
        if (lab === "L") {
            out.push(...pinnedBankRowsToApplySpecs(banks.L || [], bandCount));
        } else if (lab === "R") {
            out.push(...pinnedBankRowsToApplySpecs(banks.R || [], bandCount));
        }
        return out;
    };
    /* Biquad specs from the pinned history snapshot (Compare off / A path when a pin exists). */
    let elemToPinnedLivePlaybackSpecs = () => {
        if (!eqPinnedSnapshotBody || !extraEnabled || !extraEQEnabled) {
            return [];
        }
        if (!resolveEqGraphPhoneObj()) {
            return [];
        }
        let pin = eqPinnedSnapshotBody;
        let pinBc = pin.bandCount || 0;
        let rows;
        if (isEqTwoChannelSupportEnabled() && pin.twoCh && pin.banks) {
            rows = eq2chPadBankToEqBands(eq2chPadPinnedBankRowsForGhost(pin.banks.both || [], pinBc));
        } else {
            rows = eqHistoryPadSnapRows({ rows: pin.rows || [], bandCount: pinBc }, pinBc);
        }
        return elemToFiltersClampedRowsForEqualizerApply(rows, false)
            .filter((f) => !f.disabled && f.type && f.freq && f.q)
            .map((f) => ({
                type: f.type,
                freq: Math.min(20000, Math.max(20, f.freq)),
                q: Math.max(1e-4, Math.min(1000, f.q)),
                gain: Math.max(-40, Math.min(40, f.gain)),
            }));
    };
    let eqGhostRawForSide = (phoneObj, sideLi) => {
        let raws = phoneObj.rawChannels;
        if (!raws || !LR || !LR.length || raws.length % LR.length !== 0) {
            return firstPresentChannel(raws);
        }
        let nPerSide = raws.length / LR.length;
        let bucket = [];
        for (let s = 0; s < nPerSide; s++) {
            let c = raws[sideLi * nPerSide + s];
            if (c) {
                bucket.push(c);
            }
        }
        if (!bucket.length) {
            return null;
        }
        return bucket.length === 1 ? bucket[0] : avgCurves(bucket);
    };
    let cloneEqFrPoints = (fr) => (fr && fr.length ? fr.map((pt) => [pt[0], pt[1]]) : null);
    let computePinnedEqFrForModel = (modelP, pin) => {
        if (!modelP || !pin || typeof Equalizer === "undefined" || !Equalizer.apply) {
            return { ok: false };
        }
        let pinBc = pin.bandCount || 0;
        let tryPinnedRowsOnRaw = (raw) => {
            if (!raw) {
                return null;
            }
            let padRows = eqHistoryPadSnapRows({ rows: pin.rows || [], bandCount: pinBc }, pinBc);
            let specs = elemToFiltersClampedRowsForEqualizerApply(padRows.map((r) => ({
                disabled: !!r.disabled,
                type: r.type,
                freq: r.freq,
                q: r.q,
                gain: r.gain
            })), true).filter((f) => !f.disabled && f.type && f.freq && f.q)
                .map((f) => ({ type: f.type, freq: f.freq, q: f.q, gain: f.gain }));
            if (!specs.length) {
                return null;
            }
            return Equalizer.apply(raw, specs);
        };
        let frBySide = null;
        let frSingle = null;
        try {
            if (isEqTwoChannelSupportEnabled() && pin.twoCh && pin.banks && LR && LR.length >= 2
                    && modelP.rawChannels && modelP.rawChannels.length % LR.length === 0) {
                frBySide = [];
                for (let li = 0; li < LR.length; li++) {
                    let rawSide = eqGhostRawForSide(modelP, li);
                    let specs = eq2chMergedPinnedSpecs(pin.banks, li, pinBc);
                    frBySide[li] = (rawSide && specs.length) ? Equalizer.apply(rawSide, specs) : null;
                }
                let curves = frBySide.filter(Boolean);
                if (curves.length >= 2) {
                    frSingle = avgCurves(curves);
                } else if (curves.length === 1) {
                    frSingle = curves[0];
                }
            }
            if (!frSingle) {
                let raw = eq2chSharedMeasurementBaseRaw(modelP) || firstPresentChannel(modelP.rawChannels);
                frSingle = tryPinnedRowsOnRaw(raw);
            }
        } catch (err) {
            return { ok: false };
        }
        if (!frSingle) {
            return { ok: false };
        }
        let usableSides = frBySide && frBySide.some(Boolean);
        return { ok: true, frSingle, frBySide: usableSides ? frBySide : null };
    };
    let syncEqPinnedParentTrace = () => {
        let pinGloballyActive = !!(extraEnabled && extraEQEnabled && eqPinnedSnapshotBody);
        let modelP = resolveEqGraphPhoneObj();
        let didRestore = false;
        activePhones.forEach((p) => {
            if (p.isTarget || !p._eqPinParentOverride) {
                return;
            }
            let keep = pinGloballyActive && modelP && !modelP.isTarget && p === modelP;
            if (!keep) {
                p._eqPinParentOverride = false;
                setCurves(p, p.avg, undefined, p.ssamp);
                normalizePhone(p);
                didRestore = true;
            }
        });
        if (didRestore) {
            rebindGraphPathSelectionAndRedraw();
        }
        if (!pinGloballyActive || !modelP || modelP.isTarget) {
            return;
        }
        let frPack = computePinnedEqFrForModel(modelP, eqPinnedSnapshotBody);
        if (!frPack.ok) {
            return;
        }
        let ac = modelP.activeCurves;
        if (!ac || !ac.length) {
            return;
        }
        modelP._eqPinParentOverride = true;
        if (modelP.avg && ac.length === 1) {
            let c0 = cloneEqFrPoints(frPack.frSingle);
            if (c0) {
                ac[0].l = c0;
            }
        } else if (!modelP.avg && frPack.frBySide && LR && LR.length) {
            ac.forEach((curve) => {
                let sideFr = typeof curve.o === "number" ? frPack.frBySide[curve.o] : null;
                let src = sideFr || frPack.frSingle;
                let cpy = cloneEqFrPoints(src);
                if (cpy) {
                    curve.l = cpy;
                }
            });
        } else {
            ac.forEach((curve) => {
                let cpy = cloneEqFrPoints(frPack.frSingle);
                if (cpy) {
                    curve.l = cpy;
                }
            });
        }
        normalizePhone(modelP);
        if (baseline.p === modelP) {
            baseline = getBaseline(modelP);
            updateYCenter();
        }
        gpath.selectAll("path").call(redrawLine);
    };
    window.syncEqPinnedParentTrace = syncEqPinnedParentTrace;
    window.findEqGraphMarkerHit = findEqGraphMarkerHit;
    if (typeof initEqApply === "function") {
        initEqApply();
    }

    let resetParametricEqFilterValuesOnly = () => {
        if (!filterFreqInput || !filterFreqInput.length) {
            return;
        }
        let ch2 = isEqTwoChannelSupportEnabled();
        eqFiltersUserHasEdited = false;
        let bands = Equalizer.config.EqGraphicBandFreqHz;
        if (Array.isArray(bands) && bands.length >= 2) {
            /* applyEQExec flushes DOM to the active bank only; reset must sync all banks before apply. */
            applyEqGraphicModeAuxUiAndBands(ch2 ? { skipApply: true } : undefined);
        } else {
            for (let i = 0; i < eqBands; i++) {
                filterEnabledInput[i].checked = true;
                filterTypeSelect[i].value = "PK";
                filterFreqInput[i].value = "0";
                filterGainInput[i].value = "0";
                filterQInput[i].value = "0";
            }
            applyEqConstraintAttributesToFilterInputs();
            refreshEqFilterConstraintViolationStyles();
            refreshEqFilterInactiveStateForMaxBands();
            if (!ch2) {
                cancelDeferredApplyEQ();
                applyEQExec();
                scheduleLiveEqSync();
            }
        }
        let snap = elemToFilters(true).map((f) => ({
            disabled: !!f.disabled,
            type: f.type,
            freq: f.freq,
            q: f.q,
            gain: f.gain
        }));
        let bankCopy = () => snap.map((row) => ({
            disabled: !!row.disabled,
            type: row.type,
            freq: row.freq,
            q: row.q,
            gain: row.gain
        }));
        if (ch2) {
            eq2chBankData.both = bankCopy();
            eq2chBankData.L = bankCopy();
            eq2chBankData.R = bankCopy();
            cancelDeferredApplyEQ();
            applyEQExec();
            scheduleLiveEqSync();
        } else if (snap.length) {
            eq2chBankData.both = snap;
        }
        eqFiltersUserHasEdited = true;
        setEqFilterSelectedRow(null);
        applyParametricEqGraphTraceFocus();
        updateEqTraceOpacity();
        updateEqFilterMarkers();
        eqHistoryCommitTransaction(undefined, { historyEntry: { kind: "reset" } });
    };
    document.querySelector("div.extra-eq button.extra-eq-reset-btn").addEventListener("click", () => {
        /* iOS suspends media during sync `confirm()`; capture intent first, defer dialog one frame, then
           resume WebAudio / HTMLMediaElement after dismiss so UI and playback stay aligned. */
        let wasMusicPlaying = !!(musicFileLoaded && musicAudio && !musicAudio.paused);
        let wasPinkActive = !!pinkNoisePlaying;
        let wasToneActive = !!toneGeneratorOsc;
        requestAnimationFrame(() => {
            if (!window.confirm("Reset all EQ band values (frequency, Q, and gain) to flat? Constraint presets and limits stay as they are.")) {
                resumeLiveSoundAfterSyncNativeDialog(wasMusicPlaying, wasPinkActive, wasToneActive);
                return;
            }
            resetParametricEqFilterValuesOnly();
            resumeLiveSoundAfterSyncNativeDialog(wasMusicPlaying, wasPinkActive, wasToneActive);
        });
    });
    // Add new filter
    document.querySelector("div.extra-eq button.add-filter").addEventListener("click", () => {
        if (eqBands >= extraEQBandsMax) {
            return;
        }
        eqFiltersUserHasEdited = true;
        eqBands = Math.min(eqBands + 1, extraEQBandsMax);
        updateFilterElements();
        scheduleLiveEqSync();
        eqHistoryCommitTransaction();
    });
    // Remove last substantive filter band (same core path as ⌘+Backspace / deleteSelectedEqFilterRow).
    /* After Auto EQ, maybeAutoGrowEqBandsForTrailingBlank often appends an empty row; the old handler
       only decremented eqBands and removed the last DOM node — first click dropped that blank row
       with no EQ change, so − looked broken while row-targeted shortcuts still worked. */
    document.querySelector("div.extra-eq button.remove-filter").addEventListener("click", () => {
        eqFiltersUserHasEdited = true;
        let all = elemToFilters(true);
        let snapIsBlank = (f) => f && (!(f.freq | 0) && !(f.q | 0) && !(f.gain | 0));
        while (all.length > 1 && snapIsBlank(all[all.length - 1])) {
            all.pop();
        }
        if (all.length <= 1) {
            eqBands = 1;
            updateFilterElements();
            filtersToElem([{ disabled: false, type: "PK", freq: 0, q: 0, gain: 0 }]);
            setEqFilterSelectedRow(0);
            cancelDeferredApplyEQ();
            applyEQExec();
            scheduleLiveEqSync();
            eqHistoryCommitTransaction(undefined, { historyEntry: { kind: "removeBand", removeFreq: 0 } });
            return;
        }
        let removeHist = { historyEntry: {
            kind: "removeBand",
            removeFreq: +all[all.length - 1].freq || 0
        } };
        all.pop();
        eqBands = all.length;
        updateFilterElements();
        filtersToElem(all);
        setEqFilterSelectedRow(null);
        cancelDeferredApplyEQ();
        applyEQExec();
        scheduleLiveEqSync();
        eqHistoryCommitTransaction(undefined, removeHist);
    });
    let resolveEqFilterRowIndexForShortcut = () => {
        /* Prefer graph / row-highlight selection. Focus can stay in another band's input after
           clicking a marker, which used to make ⌘/Alt+Backspace delete the wrong row. */
        if (eqFilterSelectedRow !== null && eqFilterSelectedRow >= 0
                && eqFilterSelectedRow < eqBands) {
            return eqFilterSelectedRow;
        }
        let el = document.activeElement;
        if (el && filtersContainer && filtersContainer.contains(el)) {
            let rowEl = el.closest("div.filter");
            if (rowEl && filtersContainer.contains(rowEl)) {
                let rows = filtersContainer.querySelectorAll("div.filter");
                let ix = Array.prototype.indexOf.call(rows, rowEl);
                if (ix >= 0) {
                    return ix;
                }
            }
        }
        return null;
    };
    let deleteSelectedEqFilterRow = (rowIx) => {
        let ix = rowIx !== undefined && rowIx !== null ? rowIx : eqFilterSelectedRow;
        if (ix === null || ix < 0 || ix >= eqBands) {
            return;
        }
        let all = elemToFilters(true);
        let removeHist = null;
        if (eqBands > 1) {
            removeHist = { historyEntry: {
                kind: "removeBand",
                removeFreq: +all[ix].freq || 0
            } };
            all.splice(ix, 1);
            eqBands = all.length;
            updateFilterElements();
            filtersToElem(all);
            setEqFilterSelectedRow(Math.min(ix, eqBands - 1));
        } else {
            filtersToElem([{ disabled: false, type: "PK", freq: 0, q: 0, gain: 0 }]);
            setEqFilterSelectedRow(0);
        }
        cancelDeferredApplyEQ();
        applyEQExec();
        scheduleLiveEqSync();
        eqHistoryCommitTransaction(undefined, removeHist);
    };
    window.resolveEqFilterRowIndexForShortcut = resolveEqFilterRowIndexForShortcut;
    window.deleteSelectedEqFilterRow = deleteSelectedEqFilterRow;
    // Sort filters by frequency
    document.querySelector("div.extra-eq button.sort-filters").addEventListener("click", () => {
        filtersToElem(elemToFilters(true).sort((a, b) =>
            (a.freq || Infinity) - (b.freq || Infinity)));
        scheduleLiveEqSync();
        eqHistoryCommitTransaction();
    });
    // Import filters
    document.querySelector("div.extra-eq button.import-filters").addEventListener("click", () => {
        fileFiltersImport.click();
    });
    fileFiltersImport.addEventListener("change", (e) => {
        // Import filters callback
        let file = e.target.files[0];
        if (!file) {
            return;
        }
        let reader = new FileReader();
        reader.onerror = () => {
            fileFiltersImport.value = "";
        };
        reader.onload = (re) => {
            try {
            let settings = String(re.target.result || "");
            let parseFilterLineObjects = (blob) => {
                let filters = blob.split("\n").map(l => {
                    let r = String(l == null ? "" : l).match(/Filter\s*\d+:\s*(\S+)\s*(\S+)\s*Fc\s*(\S+)\s*Hz\s*Gain\s*(\S+)\s*dB(\s*Q\s*(\S+))?/);
                    if (!r) { return undefined; }
                    let disabled = (r[1] !== "ON");
                    let type = r[2];
                    let freq = parseInt(r[3]) || 0;
                    let gain = parseFloat(r[4]) || 0;
                    let q = parseFloat(r[6]) || 0;
                    if (type === "LS" || type === "HS") {
                        type += "Q";
                        q = q || 0.707;
                    } else if (type === "LSC" || type === "HSC") {
                        type = type.substr(0, 2) + "Q";
                    }
                    return { disabled, type, freq, q, gain };
                }).filter(f => f);
                while (filters.length > 0) {
                    let lastFilter = filters[filters.length - 1];
                    if (!lastFilter.freq && !lastFilter.q && !lastFilter.gain) {
                        filters.pop();
                    } else {
                        break;
                    }
                }
                return filters;
            };
            if (isEqTwoChannelSupportEnabled() && /^\s*Channel:\s*[LR]/im.test(settings)) {
                let curKey = null;
                let buf = [];
                let flush = (key) => {
                    if (!key) {
                        return;
                    }
                    let filters = parseFilterLineObjects(buf.join("\n"));
                    if (key === "L") {
                        eq2chBankData.L = filters.length ? filters : [eq2chDefaultEmptyRow()];
                    } else if (key === "R") {
                        eq2chBankData.R = filters.length ? filters : [eq2chDefaultEmptyRow()];
                    }
                    buf = [];
                };
                settings.split(/\r?\n/).forEach((line) => {
                    let chm = line.match(/^\s*Channel:\s*([LR])\s*$/i);
                    if (chm) {
                        flush(curKey);
                        curKey = chm[1].toUpperCase();
                        return;
                    }
                    buf.push(line);
                });
                flush(curKey);
                eq2chBankData.both = [eq2chDefaultEmptyRow()];
                if (!eq2chBankData.L || !eq2chBankData.L.length) {
                    eq2chBankData.L = [eq2chDefaultEmptyRow()];
                }
                if (!eq2chBankData.R || !eq2chBankData.R.length) {
                    eq2chBankData.R = [eq2chDefaultEmptyRow()];
                }
                eq2chBankData.L = eq2chPadBankToEqBands(eq2chBankData.L);
                eq2chBankData.R = eq2chPadBankToEqBands(eq2chBankData.R);
                eq2chActiveBank = "both";
                filtersToElem(eq2chPadBankToEqBands(eq2chBankData.both));
                applyEQ();
                scheduleLiveEqSync();
                eqHistoryCommitTransaction();
                return;
            }
            let filters = parseFilterLineObjects(settings);
            if (filters.length > 0) {
                filtersToElem(filters);
                applyEQ();
                scheduleLiveEqSync();
                eqHistoryCommitTransaction();
            } else {
                alert("Parse filters file failed: no filter found.");
            }
            } finally {
                /* Same path twice does not fire "change" unless value is cleared first. */
                fileFiltersImport.value = "";
            }
        };
        reader.readAsText(file);
    });
    // Export filters
    document.querySelector("div.extra-eq button.export-filters").addEventListener("click", () => {
        let phoneSelected = eqPhoneSelect.value;
        let phoneObj = phoneSelected && eqMeasurementObjForSelect(phoneSelected);
        if (!phoneObj) {
            alert("Please select model and add atleast one filter before export.");
            return;
        }
        eq2chFlushDomToActiveBank();
        let formatEqExportDecimal = (val, maxPlaces) => {
            if (!Number.isFinite(val)) {
                return "0";
            }
            let s = val.toFixed(maxPlaces);
            if (s.indexOf(".") !== -1) {
                s = s.replace(/\.?0+$/, "");
            }
            return s || "0";
        };
        let appendExportFilterLines = (settings, filtersArr) => {
            let fi = 0;
            filtersArr.forEach((f) => {
                let filterValid = f.freq != 0 && f.q != 0 && f.gain != 0;
                if (!filterValid) {
                    return;
                }
                fi++;
                let on = (!f.disabled && f.type && f.freq && f.gain && f.q) ? "ON" : "OFF";
                let type = f.type;
                if (type === "LSQ" || type === "HSQ") {
                    type = type.substr(0, 2) + "C";
                }
                settings += ("Filter " + fi + ": " + on + " " + type + " Fc " +
                    f.freq.toFixed(0) + " Hz Gain " + formatEqExportDecimal(f.gain, 4) + " dB Q " +
                    formatEqExportDecimal(f.q, 6) + "\r\n");
            });
            return settings;
        };
        let settings;
        if (isEqTwoChannelSupportEnabled()) {
            let has2 = eq2chRowsToApplySpecs(eq2chBankData.both).length > 0
                || eq2chRowsToApplySpecs(eq2chBankData.L).length > 0
                || eq2chRowsToApplySpecs(eq2chBankData.R).length > 0;
            if (!has2) {
                alert("Please add atleast one filter before export.");
                return;
            }
            settings = "";
            let base2 = eq2chSharedMeasurementBaseRaw(phoneObj);
            let useSharedBase = Boolean(base2);
            for (let ci = 0; ci < LR.length && ci < phoneObj.rawChannels.length; ci++) {
                let raw = useSharedBase ? base2 : phoneObj.rawChannels[ci];
                if (!raw) {
                    continue;
                }
                let lab = LR[ci] || ("Ch" + (ci + 1));
                let specs = eq2chMergedSpecsForChannelIndex(ci);
                let eqCh = Equalizer.apply(raw, specs);
                let preamp = Equalizer.calc_preamp(raw, eqCh);
                let rowsForFile = elemToFiltersBoundedRowsForExport(
                    specs.map((s) => ({
                        disabled: false,
                        type: s.type,
                        freq: s.freq,
                        q: s.q,
                        gain: s.gain
                    })), true);
                settings += "Channel: " + lab + "\r\n";
                settings += "Preamp: " + formatEqExportDecimal(preamp, 4) + " dB\r\n";
                settings = appendExportFilterLines(settings, rowsForFile);
                settings += "\r\n";
            }
            if (!String(settings).trim()) {
                alert("Please select model with at least one measured channel before export.");
                return;
            }
        } else {
            let filters = elemToFiltersBoundedForExport(true);
            if (!phoneObj.eq || !filters.length) {
                alert("Please select model and add atleast one filter before export.");
                return;
            }
            let preamp = Equalizer.calc_preamp(
                phoneObj.rawChannels.filter(c => c)[0],
                phoneObj.eq.rawChannels.filter(c => c)[0]);
            settings = "Preamp: " + formatEqExportDecimal(preamp, 4) + " dB\r\n";
            settings = appendExportFilterLines(settings, filters);
        }
        let exportElem = document.querySelector("#file-filters-export");
        exportElem.href && URL.revokeObjectURL(exportElem.href);
        exportElem.href = URL.createObjectURL(new Blob([settings]));
        exportElem.download = phoneObj.fullName.replace(/^Uploaded /, "") + " Filters.txt";
        exportElem.click();
    });
    // Export filters as graphic eq (for wavelet)
    document.querySelector("div.extra-eq button.export-graphic-filters").addEventListener("click", () => {
        let phoneSelected = eqPhoneSelect.value;
        let phoneObj = (() => {
            let m = phoneSelected && eqMeasurementObjForSelect(phoneSelected);
            if (m && m.eq) {
                return m;
            }
            let hit = phoneSelected && activePhones.filter(
                (p) => p.fullName == phoneSelected && p.eq)[0];
            return hit || { fullName: "Unnamed" };
        })();
        eq2chFlushDomToActiveBank();
        let filters;
        if (isEqTwoChannelSupportEnabled()) {
            filters = eq2chMergedSpecsForChannelIndex(0);
        } else {
            filters = elemToFiltersBoundedForExport();
        }
        if (!filters.length) {
            alert("Please add atleast one filter before export.");
            return;
        }
        let graphicEQ = Equalizer.as_graphic_eq(filters);
        let settings = "GraphicEQ: " + graphicEQ.map(([f, gain]) =>
            f.toFixed(0) + " " + gain.toFixed(1)).join("; ");
        let exportElem = document.querySelector("#file-filters-export");
        exportElem.href && URL.revokeObjectURL(exportElem.href);
        exportElem.href = URL.createObjectURL(new Blob([settings]));
        exportElem.download = phoneObj.fullName.replace(/^Uploaded /, "") + " Graphic Filters.txt";
        exportElem.click();
    });
    // AutoEQ (uses EQ constraints panel for range, Q/gain limits, max bands, and PK/LSQ/HSQ flags)
    let eqConstraintPresetsList = [];
    let eqConstraintDefaultPresetForUi = null;
    let eqConstraintDefaultOptionValueForUi = null;
    let eqConstraintEphemeralCustomSection = false;
    let normalizePresetGraphicBandsFromPreset = (arr) => {
        if (!Array.isArray(arr)) {
            return null;
        }
        let seen = new Set();
        let out = [];
        for (let x of arr) {
            let v = Math.round(Number(x));
            if (!Number.isFinite(v) || v < 20 || v > 20000) {
                continue;
            }
            if (!seen.has(v)) {
                seen.add(v);
                out.push(v);
            }
        }
        out.sort((a, b) => a - b);
        return out.length >= 2 ? out : null;
    };
    let EQ_CONSTRAINT_PRESET_VALUE_CUSTOM = "__custom__";
    /** Built-in preset id for Auto EQ tool constraints (under System; not restored from localStorage on revisit). */
    let EQ_CONSTRAINT_PRESET_AUTO_EQ_ID = "auto-eq";
    let EQ_CONSTRAINT_PRESET_STORAGE_KEY = "eq-constraint-preset-last";
    let EQ_CONSTRAINT_PRESET_LAST_NON_CUSTOM_STORAGE_KEY = "eq-constraint-preset-last-non-custom";
    let EQ_USER_PRESETS_STORAGE_KEY = "eq-constraint-user-presets-v1";
    let EQ_USER_PRESET_PREFIX = "__user:";
    let EQ_ACTION_SAVE_VALUE = "__action_save__";
    let EQ_ACTION_DELETE_VALUE = "__action_delete__";
    let EQ_CONSTRAINT_PRESET_DIVIDER_PREFIX = "__divider__";
    let isEqConstraintPresetDividerValue = (v) => {
        return v != null && String(v).indexOf(EQ_CONSTRAINT_PRESET_DIVIDER_PREFIX) === 0;
    };
    let isEqConstraintUserPresetValue = (v) => {
        return v != null && String(v).indexOf(EQ_USER_PRESET_PREFIX) === 0;
    };
    let isEqConstraintPresetActionValue = (v) => {
        return v === EQ_ACTION_SAVE_VALUE || v === EQ_ACTION_DELETE_VALUE;
    };
    let isEqConstraintPresetJsonEntry = (p) => {
        if (!p || typeof p !== "object") {
            return false;
        }
        let k = String(p.kind || "").toLowerCase();
        if (k === "heading" || k === "section" || k === "divider") {
            return false;
        }
        return true;
    };
    let findEqConstraintPresetByOptionValue = (v) => {
        if (v === "" || v == null || v === EQ_CONSTRAINT_PRESET_VALUE_CUSTOM
                || isEqConstraintPresetDividerValue(v) || isEqConstraintUserPresetValue(v)
                || isEqConstraintPresetActionValue(v)) {
            return null;
        }
        let s = String(v);
        let byId = eqConstraintPresetsList.filter((p) => p && p.id != null && String(p.id) === s)[0];
        if (byId) {
            return byId;
        }
        let ix = parseInt(s, 10);
        if (Number.isFinite(ix) && ix >= 0 && ix < eqConstraintPresetsList.length) {
            return eqConstraintPresetsList[ix];
        }
        return null;
    };
    let applyEqConstraintPreset = (preset) => {
        if (!preset || typeof preset !== "object") {
            return;
        }
        /* Constraint presets only change limits / allowed types (and graphic grid when graphic).
           EQ band frequency, Q, and gain stay as-is; illegality highlighting updates via sync. */
        let cRoot = document.querySelector("div.extra-eq .extra-eq-constraints-inner");
        if (!cRoot) {
            return;
        }
        let pkEl = cRoot.querySelector("input.eq-constraint-type-pk");
        let lsqEl = cRoot.querySelector("input.eq-constraint-type-lsq");
        let hsqEl = cRoot.querySelector("input.eq-constraint-type-hsq");
        let mb = cRoot.querySelector("input[name='eq-constraint-max-bands']");
        let fMin = cRoot.querySelector("input[name='eq-constraint-freq-min']");
        let fMax = cRoot.querySelector("input[name='eq-constraint-freq-max']");
        let gList = cRoot.querySelector("input[name='eq-constraint-freq-graphic-list']");
        let gMin = cRoot.querySelector("input[name='eq-constraint-gain-min']");
        let gMax = cRoot.querySelector("input[name='eq-constraint-gain-max']");
        let qMinEl = cRoot.querySelector("input[name='eq-constraint-q-min']");
        let qMaxEl = cRoot.querySelector("input[name='eq-constraint-q-max']");
        if (!pkEl || !lsqEl || !hsqEl || !mb || !fMin || !fMax || !gMin || !gMax || !qMinEl || !qMaxEl) {
            return;
        }
        let prevTwoCh = isEqTwoChannelSupportEnabled();
        let strOrNum = (val, def) => {
            if (val === undefined || val === null) {
                return def;
            }
            return String(val);
        };
        pkEl.checked = preset.allowPk !== false;
        lsqEl.checked = preset.allowLsq !== false;
        hsqEl.checked = preset.allowHsq !== false;
        if (!pkEl.checked && !lsqEl.checked && !hsqEl.checked) {
            pkEl.checked = true;
        }
        let bands = normalizePresetGraphicBandsFromPreset(preset.graphicBandHz);
        if ((!bands || bands.length < 2) && typeof preset.freqGraphicList === "string" && preset.freqGraphicList.trim()) {
            let parsed = parseEqConstraintGraphicFreqList(preset.freqGraphicList);
            bands = parsed.length >= 2 ? parsed : null;
        }
        if (bands && bands.length >= 2) {
            Equalizer.config.EqGraphicBandFreqHz = bands.slice();
            Equalizer.config.AutoEQRange = [bands[0], bands[bands.length - 1]];
            fMin.value = "0";
            fMax.value = "0";
            if (gList) {
                gList.value = bands.join(", ");
            }
            applyEqConstraintFreqRowUiMode();
            mb.value = String(Math.min(bands.length, extraEQBandsMax));
        } else {
            clearEqConstraintGraphicFreqMode();
            fMin.value = strOrNum(preset.freqMin, "0");
            fMax.value = strOrNum(preset.freqMax, "0");
            let maxB = Math.floor(Number(preset.maxBands));
            if (!Number.isFinite(maxB) || maxB < 0) {
                maxB = 0;
            }
            mb.value = maxB <= 0 ? "0" : String(Math.min(maxB, extraEQBandsMax));
        }
        gMin.value = strOrNum(preset.gainMin, "0");
        gMax.value = strOrNum(preset.gainMax, "0");
        qMinEl.value = strOrNum(preset.qMin, "0");
        qMaxEl.value = strOrNum(preset.qMax, "0");
        if (eq2chConstraintToggle) {
            eq2chConstraintToggle.checked = preset.twoChannelSupport === true;
        }
        syncEqConstraintDomToEqualizerConfig();
        let mbDoc = document.querySelector("div.extra-eq input[name='eq-constraint-max-bands']");
        if (mbDoc && !mbDoc.disabled) {
            commitEqMaxBandsFromInput({ writeBackDom: true });
        }
        if (isEqTwoChannelSupportEnabled()) {
            if (!eq2chBankData.both.length) {
                eq2chInitBanksFromCurrentDom();
            }
            eq2chSetTabsVisibility(true);
        } else {
            if (prevTwoCh) {
                eq2chFlushDomToActiveBankCore();
            }
            eq2chActiveBank = "both";
            eq2chBankData.L = [];
            eq2chBankData.R = [];
            eq2chSetTabsVisibility(false);
            /* Bank "both" was often still [] on first load; padding would overwrite graphic EQ rows
               filled moments earlier by applyEqGraphicModeAuxUiAndBands. Mirror DOM into both first. */
            let fromDom = elemToFilters(true).map((f) => ({
                disabled: !!f.disabled,
                type: f.type,
                freq: f.freq,
                q: f.q,
                gain: f.gain
            }));
            if (fromDom.length) {
                eq2chBankData.both = fromDom;
            }
            filtersToElem(eq2chPadBankToEqBands(eq2chBankData.both));
        }
        eq2chSyncBankTabStyles();
    };
    let readUserEqConstraintPresetsFromStorage = () => {
        try {
            let raw = localStorage.getItem(EQ_USER_PRESETS_STORAGE_KEY);
            if (!raw) {
                return [];
            }
            let o = JSON.parse(raw);
            if (o && Array.isArray(o.presets)) {
                return o.presets.filter((p) => p && typeof p === "object" && p.id && p.label);
            }
            if (Array.isArray(o)) {
                return o.filter((p) => p && p.id);
            }
        } catch (e) {
        }
        return [];
    };
    let writeUserEqConstraintPresetsToStorage = (arr) => {
        try {
            localStorage.setItem(EQ_USER_PRESETS_STORAGE_KEY, JSON.stringify({ version: 1, presets: arr }));
        } catch (e) {
        }
    };
    let findUserEqConstraintPresetById = (id) => {
        return readUserEqConstraintPresetsFromStorage().filter((p) => String(p.id) === String(id))[0] || null;
    };
    let generateUserEqConstraintPresetId = () => {
        return EQ_USER_PRESET_PREFIX + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
    };
    let findUserEqConstraintPresetByNormalizedLabel = (label) => {
        let t = String(label || "").trim().toLowerCase();
        if (!t) {
            return null;
        }
        return readUserEqConstraintPresetsFromStorage().find((p) => {
            return String(p.label || "").trim().toLowerCase() === t;
        }) || null;
    };
    let eqConstraintSaveLabelCollidesWithBuiltin = (label) => {
        let t = String(label || "").trim().toLowerCase();
        if (!t) {
            return true;
        }
        let reserved = new Set([
            "none", "default", "custom",
            "save current preset", "save current preset…",
            "+ save current preset", "- delete current preset",
            "delete current preset", "system", "devices"
        ]);
        if (reserved.has(t)) {
            return true;
        }
        if (String(eqConstraintPresetNoneLabel || "").trim().toLowerCase() === t) {
            return true;
        }
        for (let i = 0; i < eqConstraintPresetsList.length; i++) {
            let p = eqConstraintPresetsList[i];
            if (p && p.label && String(p.label).trim().toLowerCase() === t) {
                return true;
            }
        }
        return false;
    };
    let serializeEqConstraintPresetFromDom = () => {
        let cRoot = document.querySelector("div.extra-eq .extra-eq-constraints-inner");
        if (!cRoot) {
            return null;
        }
        let pkEl = cRoot.querySelector("input.eq-constraint-type-pk");
        let lsqEl = cRoot.querySelector("input.eq-constraint-type-lsq");
        let hsqEl = cRoot.querySelector("input.eq-constraint-type-hsq");
        let mb = cRoot.querySelector("input[name='eq-constraint-max-bands']");
        let fMin = cRoot.querySelector("input[name='eq-constraint-freq-min']");
        let fMax = cRoot.querySelector("input[name='eq-constraint-freq-max']");
        let gList = cRoot.querySelector("input[name='eq-constraint-freq-graphic-list']");
        let gMin = cRoot.querySelector("input[name='eq-constraint-gain-min']");
        let gMax = cRoot.querySelector("input[name='eq-constraint-gain-max']");
        let qMinEl = cRoot.querySelector("input[name='eq-constraint-q-min']");
        let qMaxEl = cRoot.querySelector("input[name='eq-constraint-q-max']");
        if (!pkEl || !lsqEl || !hsqEl || !mb || !fMin || !fMax || !gMin || !gMax || !qMinEl || !qMaxEl) {
            return null;
        }
        let row = document.querySelector("div.extra-eq .eq-constraint-freq-row");
        let graphic = row && row.classList.contains("eq-constraint-freq-row-graphic") && gList;
        let o = {
            allowPk: !!pkEl.checked,
            allowLsq: !!lsqEl.checked,
            allowHsq: !!hsqEl.checked,
            maxBands: parseInt(mb.value, 10) || 0,
            freqMin: String(fMin.value != null ? fMin.value : "0"),
            freqMax: String(fMax.value != null ? fMax.value : "0"),
            gainMin: String(gMin.value != null ? gMin.value : "0"),
            gainMax: String(gMax.value != null ? gMax.value : "0"),
            qMin: String(qMinEl.value != null ? qMinEl.value : "0"),
            qMax: String(qMaxEl.value != null ? qMaxEl.value : "0")
        };
        if (graphic && gList && String(gList.value || "").trim()) {
            o.freqGraphicList = String(gList.value || "").trim();
        }
        let ch2 = cRoot.querySelector("input.eq-constraint-2ch-toggle");
        o.twoChannelSupport = !!(ch2 && ch2.checked);
        return o;
    };
    let eqConstraintPresetDisplayPrefix = "Constraints: ";
    let eqConstraintPresetNoneLabel = "None";
    let eqConstraintPresetCustomLabel = "Custom";
    let eqConstraintPresetDomAddPair = (hitParent, dispParent, value, shortLabel, useDispPrefix) => {
        useDispPrefix = useDispPrefix !== false;
        let oHit = document.createElement("option");
        oHit.value = value;
        oHit.textContent = shortLabel;
        hitParent.appendChild(oHit);
        let oDisp = document.createElement("option");
        oDisp.value = value;
        oDisp.textContent = useDispPrefix ? eqConstraintPresetDisplayPrefix + shortLabel : shortLabel;
        dispParent.appendChild(oDisp);
    };
    let eqConstraintPresetDomAddDividerPair = (hitParent, dispParent, value, lineText, ariaLab) => {
        let oHit = document.createElement("option");
        oHit.value = value;
        oHit.disabled = true;
        oHit.setAttribute("aria-disabled", "true");
        oHit.textContent = lineText;
        if (ariaLab) {
            oHit.setAttribute("aria-label", ariaLab);
        }
        hitParent.appendChild(oHit);
        let oDisp = document.createElement("option");
        oDisp.value = value;
        oDisp.disabled = true;
        oDisp.setAttribute("aria-disabled", "true");
        oDisp.textContent = lineText;
        if (ariaLab) {
            oDisp.setAttribute("aria-label", ariaLab);
        }
        dispParent.appendChild(oDisp);
    };
    let eqConstraintPresetProgrammaticSyncDepth = 0;
    let runEqConstraintPresetProgrammatic = (fn, opts) => {
        opts = opts || {};
        eqConstraintPresetProgrammaticSyncDepth++;
        try {
            fn();
            if (opts.recordHistoryAfter) {
                eqHistoryCommitTransaction();
            }
        } finally {
            eqConstraintPresetProgrammaticSyncDepth--;
        }
    };
    let EQ_CONSTRAINT_PRESET_GROUP_SYSTEM = "System";
    let EQ_CONSTRAINT_PRESET_GROUP_CUSTOM = "Custom";
    let EQ_CONSTRAINT_PRESET_GROUP_DEVICES = "Devices";
    let updateEqConstraintConstraintsGearPresetIndicator = () => {
        let gear = document.querySelector("div.extra-eq button.extra-eq-constraints-gear");
        let badge = gear && gear.querySelector(".extra-eq-constraints-gear-preset-badge");
        let row = document.getElementById("eq-constraint-preset-row");
        let hit = document.getElementById("eq-constraint-preset-input");
        if (!gear || !badge) {
            return;
        }
        if (!row || row.hidden || !hit || eqConstraintDefaultOptionValueForUi == null) {
            badge.hidden = true;
            return;
        }
        let stable = String(hit.dataset.eqPresetLastStable || "");
        let defVal = String(eqConstraintDefaultOptionValueForUi);
        badge.hidden = stable === defVal;
    };
    let updateCustomActionDeleteDisabled = (hit, display) => {
        if (!hit || !display) {
            updateEqConstraintConstraintsGearPresetIndicator();
            return;
        }
        let stable = hit.dataset.eqPresetLastStable || "";
        let allow = isEqConstraintUserPresetValue(stable) || stable === EQ_CONSTRAINT_PRESET_VALUE_CUSTOM;
        let dh = hit.querySelector(`option[value='${EQ_ACTION_DELETE_VALUE}']`);
        let dd = display.querySelector(`option[value='${EQ_ACTION_DELETE_VALUE}']`);
        if (dh) {
            dh.disabled = !allow;
        }
        if (dd) {
            dd.disabled = !allow;
        }
        updateEqConstraintConstraintsGearPresetIndicator();
    };
    let shouldShowEqConstraintCustomOptgroup = () => {
        return readUserEqConstraintPresetsFromStorage().length > 0 || eqConstraintEphemeralCustomSection;
    };
    let removeEqConstraintCustomPresetOptgroup = () => {
        let hit = document.getElementById("eq-constraint-preset-input");
        let display = document.getElementById("eq-constraint-preset-display");
        if (!hit || !display) {
            return;
        }
        let ch = hit.querySelector("optgroup[data-eq-preset-custom='1']");
        let cd = display.querySelector("optgroup[data-eq-preset-custom='1']");
        if (ch) {
            ch.remove();
        }
        if (cd) {
            cd.remove();
        }
    };
    let rebuildCustomPresetOptgroupOptions = () => {
        let hit = document.getElementById("eq-constraint-preset-input");
        let display = document.getElementById("eq-constraint-preset-display");
        let row = document.getElementById("eq-constraint-preset-row");
        if (!hit || !display || row.hidden) {
            updateEqConstraintConstraintsGearPresetIndicator();
            return;
        }
        let custHit = hit.querySelector("optgroup[data-eq-preset-custom='1']");
        let custDisp = display.querySelector("optgroup[data-eq-preset-custom='1']");
        if (!custHit || !custDisp) {
            updateEqConstraintConstraintsGearPresetIndicator();
            return;
        }
        let prevVal = hit.value;
        while (custHit.firstChild) {
            custHit.removeChild(custHit.firstChild);
        }
        while (custDisp.firstChild) {
            custDisp.removeChild(custDisp.firstChild);
        }
        let stable = hit.dataset.eqPresetLastStable || "";
        let omitCustomRow = isEqConstraintUserPresetValue(stable) && !eqConstraintEphemeralCustomSection;
        if (!omitCustomRow) {
            eqConstraintPresetDomAddPair(custHit, custDisp, EQ_CONSTRAINT_PRESET_VALUE_CUSTOM, eqConstraintPresetCustomLabel, true);
        }
        readUserEqConstraintPresetsFromStorage().forEach((up) => {
            let lab = String(up.label || "").trim() || "Untitled";
            eqConstraintPresetDomAddPair(custHit, custDisp, String(up.id), lab, true);
        });
        let saveLabel = "+ Save current preset";
        let delLabel = "- Delete current preset";
        eqConstraintPresetDomAddPair(custHit, custDisp, EQ_ACTION_SAVE_VALUE, saveLabel, false);
        eqConstraintPresetDomAddPair(custHit, custDisp, EQ_ACTION_DELETE_VALUE, delLabel, false);
        custHit.querySelectorAll(`option[value='${EQ_ACTION_SAVE_VALUE}'],option[value='${EQ_ACTION_DELETE_VALUE}']`)
            .forEach((o) => {
                o.classList.add("eq-constraint-preset-action-option");
            });
        custDisp.querySelectorAll(`option[value='${EQ_ACTION_SAVE_VALUE}'],option[value='${EQ_ACTION_DELETE_VALUE}']`)
            .forEach((o) => {
                o.classList.add("eq-constraint-preset-action-option");
            });
        let still = Array.from(hit.querySelectorAll("option")).some((o) => !o.disabled && o.value === prevVal);
        if (still) {
            hit.value = prevVal;
        }
        display.selectedIndex = hit.selectedIndex;
        updateCustomActionDeleteDisabled(hit, display);
    };
    let syncEqConstraintCustomPresetOptgroup = () => {
        let hit = document.getElementById("eq-constraint-preset-input");
        let display = document.getElementById("eq-constraint-preset-display");
        let row = document.getElementById("eq-constraint-preset-row");
        if (!hit || !display || row.hidden) {
            updateEqConstraintConstraintsGearPresetIndicator();
            return;
        }
        if (!shouldShowEqConstraintCustomOptgroup()) {
            removeEqConstraintCustomPresetOptgroup();
            updateEqConstraintConstraintsGearPresetIndicator();
            return;
        }
        if (hit.querySelector("optgroup[data-eq-preset-custom='1']")) {
            rebuildCustomPresetOptgroupOptions();
            return;
        }
        let sysHit = hit.querySelector("optgroup[data-eq-preset-system='1']");
        let sysDisp = display.querySelector("optgroup[data-eq-preset-system='1']");
        if (!sysHit || !sysDisp) {
            updateEqConstraintConstraintsGearPresetIndicator();
            return;
        }
        let custHit = document.createElement("optgroup");
        custHit.label = EQ_CONSTRAINT_PRESET_GROUP_CUSTOM;
        custHit.setAttribute("data-eq-preset-custom", "1");
        let custDisp = document.createElement("optgroup");
        custDisp.label = EQ_CONSTRAINT_PRESET_GROUP_CUSTOM;
        custDisp.setAttribute("data-eq-preset-custom", "1");
        hit.insertBefore(custHit, sysHit);
        display.insertBefore(custDisp, sysDisp);
        rebuildCustomPresetOptgroupOptions();
    };
    let notifyEqConstraintUserEditedPresetDropdown = () => {
        if (eqConstraintPresetProgrammaticSyncDepth > 0) {
            return;
        }
        let hit = document.getElementById("eq-constraint-preset-input");
        let display = document.getElementById("eq-constraint-preset-display");
        let row = document.getElementById("eq-constraint-preset-row");
        if (!hit || !display || row.hidden) {
            return;
        }
        let prevStable = hit.dataset.eqPresetLastStable || "";
        if (prevStable !== EQ_CONSTRAINT_PRESET_VALUE_CUSTOM
            && !isEqConstraintPresetActionValue(prevStable)
            && !isEqConstraintPresetDividerValue(prevStable)) {
            try {
                localStorage.setItem(EQ_CONSTRAINT_PRESET_LAST_NON_CUSTOM_STORAGE_KEY, prevStable);
            } catch (err) {
                /* Quota, private mode, or disabled storage */
            }
        }
        eqConstraintEphemeralCustomSection = true;
        syncEqConstraintCustomPresetOptgroup();
        let opt = hit.querySelector(`option[value='${EQ_CONSTRAINT_PRESET_VALUE_CUSTOM}']`);
        if (!opt) {
            updateEqConstraintConstraintsGearPresetIndicator();
            return;
        }
        hit.value = EQ_CONSTRAINT_PRESET_VALUE_CUSTOM;
        display.selectedIndex = hit.selectedIndex;
        hit.dataset.eqPresetLastStable = EQ_CONSTRAINT_PRESET_VALUE_CUSTOM;
        updateCustomActionDeleteDisabled(hit, display);
        persistEqConstraintPresetSelectionToStorage();
    };
    let clearEqConstraintPresetSelection = () => {
        eqFiltersUserHasEdited = false;
        let cRoot = document.querySelector("div.extra-eq .extra-eq-constraints-inner");
        if (!cRoot) {
            return;
        }
        let pkEl = cRoot.querySelector("input.eq-constraint-type-pk");
        let lsqEl = cRoot.querySelector("input.eq-constraint-type-lsq");
        let hsqEl = cRoot.querySelector("input.eq-constraint-type-hsq");
        let mb = cRoot.querySelector("input[name='eq-constraint-max-bands']");
        let fMin = cRoot.querySelector("input[name='eq-constraint-freq-min']");
        let fMax = cRoot.querySelector("input[name='eq-constraint-freq-max']");
        let gMin = cRoot.querySelector("input[name='eq-constraint-gain-min']");
        let gMax = cRoot.querySelector("input[name='eq-constraint-gain-max']");
        let qMinEl = cRoot.querySelector("input[name='eq-constraint-q-min']");
        let qMaxEl = cRoot.querySelector("input[name='eq-constraint-q-max']");
        if (!pkEl || !lsqEl || !hsqEl || !mb || !fMin || !fMax || !gMin || !gMax || !qMinEl || !qMaxEl) {
            return;
        }
        pkEl.checked = true;
        lsqEl.checked = true;
        hsqEl.checked = true;
        clearEqConstraintGraphicFreqMode();
        fMin.value = "0";
        fMax.value = "0";
        mb.value = "0";
        gMin.value = "0";
        gMax.value = "0";
        qMinEl.value = "0";
        qMaxEl.value = "0";
        syncEqConstraintDomToEqualizerConfig();
        let mbDoc = document.querySelector("div.extra-eq input[name='eq-constraint-max-bands']");
        if (mbDoc && !mbDoc.disabled) {
            commitEqMaxBandsFromInput({ writeBackDom: true });
        }
    };
    let syncEqConstraintPresetSelectPair = () => {
        let hit = document.getElementById("eq-constraint-preset-input");
        let display = document.getElementById("eq-constraint-preset-display");
        if (!hit || !display) {
            return;
        }
        display.selectedIndex = hit.selectedIndex;
    };
    let persistEqConstraintPresetSelectionToStorage = () => {
        if (eqConstraintPresetProgrammaticSyncDepth > 0) {
            return;
        }
        let hit = document.getElementById("eq-constraint-preset-input");
        let row = document.getElementById("eq-constraint-preset-row");
        if (!hit || row.hidden) {
            return;
        }
        if (isEqConstraintPresetActionValue(hit.value)) {
            return;
        }
        try {
            localStorage.setItem(EQ_CONSTRAINT_PRESET_STORAGE_KEY, hit.value);
            if (hit.value !== EQ_CONSTRAINT_PRESET_VALUE_CUSTOM) {
                localStorage.setItem(EQ_CONSTRAINT_PRESET_LAST_NON_CUSTOM_STORAGE_KEY, hit.value);
            }
        } catch (err) {
            /* Quota, private mode, or disabled storage */
        }
    };
    let tryRestoreEqConstraintPresetFromStorage = (hit, display) => {
        let saved = null;
        try {
            saved = localStorage.getItem(EQ_CONSTRAINT_PRESET_STORAGE_KEY);
        } catch (err) {
            return false;
        }
        if (saved == null) {
            return false;
        }
        if (isEqConstraintPresetDividerValue(saved) || isEqConstraintPresetActionValue(saved)) {
            return false;
        }
        if (saved === EQ_CONSTRAINT_PRESET_VALUE_CUSTOM) {
            let fb = null;
            try {
                fb = localStorage.getItem(EQ_CONSTRAINT_PRESET_LAST_NON_CUSTOM_STORAGE_KEY);
            } catch (err) {
                return false;
            }
            if (fb == null || fb === EQ_CONSTRAINT_PRESET_VALUE_CUSTOM
                || isEqConstraintPresetDividerValue(fb) || isEqConstraintPresetActionValue(fb)) {
                return false;
            }
            saved = fb;
        }
        /* Auto EQ preset is applied when running the tool from Default; do not re-apply on reload. */
        if (String(saved).toLowerCase() === EQ_CONSTRAINT_PRESET_AUTO_EQ_ID) {
            try {
                localStorage.removeItem(EQ_CONSTRAINT_PRESET_STORAGE_KEY);
                let fbNc = localStorage.getItem(EQ_CONSTRAINT_PRESET_LAST_NON_CUSTOM_STORAGE_KEY);
                if (fbNc != null && String(fbNc).toLowerCase() === EQ_CONSTRAINT_PRESET_AUTO_EQ_ID) {
                    let fallback = eqConstraintDefaultOptionValueForUi != null
                        ? String(eqConstraintDefaultOptionValueForUi)
                        : "default";
                    localStorage.setItem(EQ_CONSTRAINT_PRESET_LAST_NON_CUSTOM_STORAGE_KEY, fallback);
                }
            } catch (err) {
            }
            return false;
        }
        if (isEqConstraintUserPresetValue(saved)) {
            let u = findUserEqConstraintPresetById(saved);
            if (!u) {
                return false;
            }
            let matchedUser = Array.from(hit.querySelectorAll("option")).some((o) => !o.disabled && o.value === saved);
            if (!matchedUser) {
                return false;
            }
            runEqConstraintPresetProgrammatic(() => {
                applyEqConstraintPreset(u);
                hit.value = saved;
                display.selectedIndex = hit.selectedIndex;
                hit.dataset.eqPresetLastStable = saved;
            });
            return true;
        }
        let matched = Array.from(hit.querySelectorAll("option")).some((o) => !o.disabled && o.value === saved);
        if (!matched) {
            return false;
        }
        if (saved === "") {
            runEqConstraintPresetProgrammatic(() => {
                clearEqConstraintPresetSelection();
                hit.value = "";
                display.selectedIndex = hit.selectedIndex;
                hit.dataset.eqPresetLastStable = "";
            });
            return true;
        }
        let p = findEqConstraintPresetByOptionValue(saved);
        if (!p) {
            return false;
        }
        runEqConstraintPresetProgrammatic(() => {
            applyEqConstraintPreset(p);
            hit.value = saved;
            display.selectedIndex = hit.selectedIndex;
            hit.dataset.eqPresetLastStable = saved;
        });
        return true;
    };
    let wireEqConstraintPresetSelectStack = () => {
        let hit = document.getElementById("eq-constraint-preset-input");
        let display = document.getElementById("eq-constraint-preset-display");
        if (!hit || !display || hit.dataset.eqPresetStackWired) {
            return;
        }
        hit.dataset.eqPresetStackWired = "1";
        hit.addEventListener("change", () => {
            syncEqConstraintPresetSelectPair();
            let v = hit.value;
            let prevStable = hit.dataset.eqPresetLastStable || "";
            if (v === EQ_ACTION_SAVE_VALUE) {
                let label = window.prompt("Name for this preset:", "");
                if (label === null) {
                    hit.value = prevStable;
                    display.selectedIndex = hit.selectedIndex;
                    persistEqConstraintPresetSelectionToStorage();
                    updateCustomActionDeleteDisabled(hit, display);
                    return;
                }
                label = String(label).trim();
                if (!label) {
                    hit.value = prevStable;
                    display.selectedIndex = hit.selectedIndex;
                    persistEqConstraintPresetSelectionToStorage();
                    updateCustomActionDeleteDisabled(hit, display);
                    return;
                }
                let blob = serializeEqConstraintPresetFromDom();
                if (!blob) {
                    hit.value = prevStable;
                    display.selectedIndex = hit.selectedIndex;
                    persistEqConstraintPresetSelectionToStorage();
                    updateCustomActionDeleteDisabled(hit, display);
                    return;
                }
                let existingUser = findUserEqConstraintPresetByNormalizedLabel(label);
                if (existingUser) {
                    blob.id = existingUser.id;
                    blob.label = label;
                } else if (eqConstraintSaveLabelCollidesWithBuiltin(label)) {
                    window.alert("That name is reserved or matches a built-in preset. Choose another name.");
                    hit.value = prevStable;
                    display.selectedIndex = hit.selectedIndex;
                    persistEqConstraintPresetSelectionToStorage();
                    updateCustomActionDeleteDisabled(hit, display);
                    return;
                } else {
                    blob.id = generateUserEqConstraintPresetId();
                    blob.label = label;
                }
                let arr = readUserEqConstraintPresetsFromStorage().slice();
                let at = arr.findIndex((p) => String(p.id) === String(blob.id));
                if (at >= 0) {
                    arr[at] = blob;
                } else {
                    arr.push(blob);
                }
                writeUserEqConstraintPresetsToStorage(arr);
                eqConstraintEphemeralCustomSection = false;
                hit.dataset.eqPresetLastStable = blob.id;
                syncEqConstraintCustomPresetOptgroup();
                runEqConstraintPresetProgrammatic(() => {
                    applyEqConstraintPreset(blob);
                    hit.value = blob.id;
                    display.selectedIndex = hit.selectedIndex;
                    hit.dataset.eqPresetLastStable = blob.id;
                }, { recordHistoryAfter: true });
                updateCustomActionDeleteDisabled(hit, display);
                persistEqConstraintPresetSelectionToStorage();
                return;
            }
            if (v === EQ_ACTION_DELETE_VALUE) {
                let delId = prevStable;
                if (delId === EQ_CONSTRAINT_PRESET_VALUE_CUSTOM) {
                    eqConstraintEphemeralCustomSection = false;
                    runEqConstraintPresetProgrammatic(() => {
                        if (eqConstraintDefaultPresetForUi) {
                            applyEqConstraintPreset(eqConstraintDefaultPresetForUi);
                            if (eqConstraintDefaultOptionValueForUi != null) {
                                hit.value = eqConstraintDefaultOptionValueForUi;
                            }
                        } else {
                            clearEqConstraintPresetSelection();
                            hit.value = eqConstraintDefaultOptionValueForUi != null ? eqConstraintDefaultOptionValueForUi : "";
                        }
                        display.selectedIndex = hit.selectedIndex;
                        hit.dataset.eqPresetLastStable = hit.value;
                    }, { recordHistoryAfter: true });
                    syncEqConstraintCustomPresetOptgroup();
                    updateCustomActionDeleteDisabled(hit, display);
                    persistEqConstraintPresetSelectionToStorage();
                    return;
                }
                if (!isEqConstraintUserPresetValue(delId)) {
                    window.alert("Select a saved custom preset or Custom to reset with Delete.");
                    hit.value = prevStable;
                    display.selectedIndex = hit.selectedIndex;
                    persistEqConstraintPresetSelectionToStorage();
                    updateCustomActionDeleteDisabled(hit, display);
                    return;
                }
                let arr = readUserEqConstraintPresetsFromStorage().filter((p) => String(p.id) !== String(delId));
                writeUserEqConstraintPresetsToStorage(arr);
                eqConstraintEphemeralCustomSection = false;
                runEqConstraintPresetProgrammatic(() => {
                    if (eqConstraintDefaultPresetForUi) {
                        applyEqConstraintPreset(eqConstraintDefaultPresetForUi);
                        if (eqConstraintDefaultOptionValueForUi != null) {
                            hit.value = eqConstraintDefaultOptionValueForUi;
                        }
                    } else {
                        clearEqConstraintPresetSelection();
                        hit.value = eqConstraintDefaultOptionValueForUi != null ? eqConstraintDefaultOptionValueForUi : "";
                    }
                    display.selectedIndex = hit.selectedIndex;
                    hit.dataset.eqPresetLastStable = hit.value;
                }, { recordHistoryAfter: true });
                syncEqConstraintCustomPresetOptgroup();
                updateCustomActionDeleteDisabled(hit, display);
                persistEqConstraintPresetSelectionToStorage();
                return;
            }
            if (v === "") {
                eqConstraintEphemeralCustomSection = false;
                runEqConstraintPresetProgrammatic(() => {
                    clearEqConstraintPresetSelection();
                }, { recordHistoryAfter: true });
            } else if (v === EQ_CONSTRAINT_PRESET_VALUE_CUSTOM) {
                eqConstraintEphemeralCustomSection = true;
                /* selection only; constraints unchanged */
            } else if (isEqConstraintPresetDividerValue(v)) {
                /* disabled; should not fire */
            } else if (isEqConstraintUserPresetValue(v)) {
                eqConstraintEphemeralCustomSection = false;
                let u = findUserEqConstraintPresetById(v);
                if (u) {
                    runEqConstraintPresetProgrammatic(() => {
                        applyEqConstraintPreset(u);
                    }, { recordHistoryAfter: true });
                }
            } else {
                eqConstraintEphemeralCustomSection = false;
                let p = findEqConstraintPresetByOptionValue(v);
                if (p) {
                    runEqConstraintPresetProgrammatic(() => {
                        applyEqConstraintPreset(p);
                    }, { recordHistoryAfter: true });
                }
            }
            hit.dataset.eqPresetLastStable = v;
            syncEqConstraintCustomPresetOptgroup();
            updateCustomActionDeleteDisabled(hit, display);
            persistEqConstraintPresetSelectionToStorage();
        });
    };
    let loadEqConstraintPresets = () => {
        let row = document.getElementById("eq-constraint-preset-row");
        let hit = document.getElementById("eq-constraint-preset-input");
        let display = document.getElementById("eq-constraint-preset-display");
        if (!row || !hit || !display) {
            return;
        }
        let url = new URL("equalizer-constraints.json", window.location.href).href;
        fetch(url, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!data || !Array.isArray(data.presets) || data.presets.length === 0) {
                    return;
                }
                let defaultPresetObj = null;
                let systemPresetObjs = [];
                let devicesOrderedItems = [];
                let devicePresetOrdinal = 0;
                let dividerOrdinal = 0;
                data.presets.forEach((entry) => {
                    if (!entry || typeof entry !== "object") {
                        return;
                    }
                    let kind = String(entry.kind || "").toLowerCase();
                    if (kind === "heading" || kind === "section") {
                        return;
                    }
                    if (kind === "divider") {
                        let line = entry.text != null && String(entry.text) !== ""
                            ? String(entry.text)
                            : "────────";
                        let ariaLab = entry.label != null && String(entry.label).trim() !== ""
                            ? String(entry.label).trim()
                            : null;
                        devicesOrderedItems.push({
                            itemKind: "divider",
                            line,
                            ariaLab,
                            ordinal: dividerOrdinal++
                        });
                        return;
                    }
                    if (!isEqConstraintPresetJsonEntry(entry)) {
                        return;
                    }
                    let idLc = entry.id != null ? String(entry.id).trim().toLowerCase() : "";
                    if (idLc === "default" || entry.label === "Default") {
                        if (!defaultPresetObj) {
                            defaultPresetObj = entry;
                        }
                        return;
                    }
                    if (idLc === EQ_CONSTRAINT_PRESET_AUTO_EQ_ID || kind === "system") {
                        systemPresetObjs.push(entry);
                        return;
                    }
                    devicesOrderedItems.push({ itemKind: "preset", entry });
                });
                let devicePresetObjs = devicesOrderedItems
                    .filter((x) => x.itemKind === "preset")
                    .map((x) => x.entry);
                eqConstraintPresetsList = defaultPresetObj
                    ? [defaultPresetObj].concat(systemPresetObjs).concat(devicePresetObjs)
                    : systemPresetObjs.concat(devicePresetObjs);
                hit.innerHTML = "";
                display.innerHTML = "";
                let sysHit = document.createElement("optgroup");
                sysHit.label = EQ_CONSTRAINT_PRESET_GROUP_SYSTEM;
                sysHit.setAttribute("data-eq-preset-system", "1");
                let sysDisp = document.createElement("optgroup");
                sysDisp.label = EQ_CONSTRAINT_PRESET_GROUP_SYSTEM;
                sysDisp.setAttribute("data-eq-preset-system", "1");
                hit.appendChild(sysHit);
                display.appendChild(sysDisp);
                eqConstraintPresetDomAddPair(sysHit, sysDisp, "", eqConstraintPresetNoneLabel, true);
                let defaultOptionValue = null;
                if (defaultPresetObj) {
                    defaultOptionValue = defaultPresetObj.id != null && String(defaultPresetObj.id) !== ""
                        ? String(defaultPresetObj.id)
                        : "default";
                    let defLab = defaultPresetObj.label || "Default";
                    eqConstraintPresetDomAddPair(sysHit, sysDisp, defaultOptionValue, defLab, true);
                }
                systemPresetObjs.forEach((entry) => {
                    let val = entry.id != null && String(entry.id).trim() !== ""
                        ? String(entry.id).trim()
                        : "";
                    if (!val) {
                        return;
                    }
                    let lab = entry.label || val;
                    eqConstraintPresetDomAddPair(sysHit, sysDisp, val, lab, true);
                });
                eqConstraintDefaultPresetForUi = defaultPresetObj;
                eqConstraintDefaultOptionValueForUi = defaultOptionValue;
                let devHit = document.createElement("optgroup");
                devHit.label = EQ_CONSTRAINT_PRESET_GROUP_DEVICES;
                devHit.setAttribute("data-eq-preset-devices", "1");
                let devDisp = document.createElement("optgroup");
                devDisp.label = EQ_CONSTRAINT_PRESET_GROUP_DEVICES;
                devDisp.setAttribute("data-eq-preset-devices", "1");
                hit.appendChild(devHit);
                display.appendChild(devDisp);
                devicesOrderedItems.forEach((item) => {
                    if (item.itemKind === "divider") {
                        let v = EQ_CONSTRAINT_PRESET_DIVIDER_PREFIX + item.ordinal;
                        eqConstraintPresetDomAddDividerPair(devHit, devDisp, v, item.line, item.ariaLab);
                        return;
                    }
                    if (item.itemKind !== "preset" || !item.entry) {
                        return;
                    }
                    let entry = item.entry;
                    let val = entry.id != null && String(entry.id) !== ""
                        ? String(entry.id)
                        : String(devicePresetOrdinal);
                    let lab = entry.label || ("Preset " + (devicePresetOrdinal + 1));
                    eqConstraintPresetDomAddPair(devHit, devDisp, val, lab, true);
                    devicePresetOrdinal++;
                });
                row.hidden = false;
                if (readUserEqConstraintPresetsFromStorage().length > 0) {
                    syncEqConstraintCustomPresetOptgroup();
                }
                wireEqConstraintPresetSelectStack();
                let defPreset = defaultPresetObj;
                let restored = tryRestoreEqConstraintPresetFromStorage(hit, display);
                if (!restored) {
                    if (defPreset) {
                        runEqConstraintPresetProgrammatic(() => {
                            applyEqConstraintPreset(defPreset);
                            if (defaultOptionValue != null) {
                                hit.value = defaultOptionValue;
                                display.selectedIndex = hit.selectedIndex;
                            }
                        });
                    } else {
                        runEqConstraintPresetProgrammatic(() => {
                            hit.selectedIndex = 0;
                            display.selectedIndex = 0;
                        });
                    }
                }
                hit.dataset.eqPresetLastStable = hit.value;
                syncEqConstraintCustomPresetOptgroup();
                updateCustomActionDeleteDisabled(hit, display);
                persistEqConstraintPresetSelectionToStorage();
                eqHistoryInitBaselineSnap = eqHistoryTakeSnapshot();
            })
            .catch(() => {
                /* Missing file or fetch error: keep row hidden */
            });
    };
    let eqConstraintsRoot = document.querySelector("div.extra-eq .extra-eq-constraints-inner");
    let eqMaxBandsCommitTimer = null;
    let wireEqConstraintsPanel = () => {
        if (!eqConstraintsRoot) {
            return;
        }
        let onConstraintChange = () => {
            notifyEqConstraintUserEditedPresetDropdown();
            syncEqConstraintDomToEqualizerConfig();
            cancelDeferredApplyEQ();
            applyEQExec();
            scheduleLiveEqSync();
        };
        eqConstraintsRoot.querySelectorAll("input").forEach((inp) => {
            if (inp.name === "eq-constraint-max-bands") {
                inp.addEventListener("input", () => {
                    notifyEqConstraintUserEditedPresetDropdown();
                    if (eqMaxBandsCommitTimer !== null) {
                        clearTimeout(eqMaxBandsCommitTimer);
                    }
                    eqMaxBandsCommitTimer = setTimeout(() => {
                        eqMaxBandsCommitTimer = null;
                        commitEqMaxBandsFromInput({ writeBackDom: true });
                    }, 450);
                });
                inp.addEventListener("change", () => {
                    notifyEqConstraintUserEditedPresetDropdown();
                    if (eqMaxBandsCommitTimer !== null) {
                        clearTimeout(eqMaxBandsCommitTimer);
                        eqMaxBandsCommitTimer = null;
                    }
                    commitEqMaxBandsFromInput({ writeBackDom: true });
                });
                inp.addEventListener("blur", () => {
                    notifyEqConstraintUserEditedPresetDropdown();
                    if (eqMaxBandsCommitTimer !== null) {
                        clearTimeout(eqMaxBandsCommitTimer);
                        eqMaxBandsCommitTimer = null;
                    }
                    commitEqMaxBandsFromInput({ writeBackDom: true });
                });
            } else if (inp.name === "eq-constraint-freq-min" || inp.name === "eq-constraint-freq-max") {
                let onFreqConstraintInput = () => {
                    tryEnterEqConstraintGraphicFreqModeFromTyping();
                    onConstraintChange();
                };
                inp.addEventListener("input", onFreqConstraintInput);
                inp.addEventListener("change", onFreqConstraintInput);
            } else {
                inp.addEventListener("input", onConstraintChange);
                inp.addEventListener("change", onConstraintChange);
            }
        });
    };
    wireEqConstraintsPanel();
    loadEqConstraintPresets();
    applyEqConstraintFreqRowUiMode();
    (() => {
        let eqConstraintsCard = document.querySelector("div.extra-eq .extra-eq-constraints");
        let eqConstraintsGear = document.querySelector("div.extra-eq button.extra-eq-constraints-gear");
        let eqConstraintsBody = document.getElementById("extra-eq-constraints-body");
        if (eqConstraintsGear && eqConstraintsCard && eqConstraintsBody) {
            eqConstraintsGear.addEventListener("click", () => {
                let exp = eqConstraintsCard.classList.toggle("extra-eq-constraints-expanded");
                eqConstraintsGear.setAttribute("aria-expanded", exp ? "true" : "false");
                eqConstraintsBody.setAttribute("aria-hidden", exp ? "false" : "true");
            });
        }
    })();
    syncEqConstraintDomToEqualizerConfig();
    syncEqMaxBandsFieldFromConfig();
    document.querySelector("div.extra-eq button.autoeq").addEventListener("click", () => {
        // Generate filters automatically
        if (isEqConstraintGraphicModeActive()) {
            alert("Auto EQ is not yet available for graphic EQ.");
            return;
        }
        let presetHit = document.getElementById("eq-constraint-preset-input");
        let presetDisplay = document.getElementById("eq-constraint-preset-display");
        let presetRow = document.getElementById("eq-constraint-preset-row");
        if (presetHit && presetDisplay && presetRow && !presetRow.hidden
                && eqConstraintDefaultOptionValueForUi != null) {
            let defV = String(eqConstraintDefaultOptionValueForUi);
            let stable = String(presetHit.dataset.eqPresetLastStable || "");
            let v = String(presetHit.value || "");
            let onDefault = (v === defV || stable === defV);
            if (onDefault) {
                let autoP = findEqConstraintPresetByOptionValue(EQ_CONSTRAINT_PRESET_AUTO_EQ_ID);
                if (autoP) {
                    runEqConstraintPresetProgrammatic(() => {
                        applyEqConstraintPreset(autoP);
                        presetHit.value = EQ_CONSTRAINT_PRESET_AUTO_EQ_ID;
                        presetDisplay.selectedIndex = presetHit.selectedIndex;
                        presetHit.dataset.eqPresetLastStable = EQ_CONSTRAINT_PRESET_AUTO_EQ_ID;
                    }, { recordHistoryAfter: true });
                    syncEqConstraintCustomPresetOptgroup();
                    updateCustomActionDeleteDisabled(presetHit, presetDisplay);
                    persistEqConstraintPresetSelectionToStorage();
                }
            }
        }
        commitEqMaxBandsFromInput({ writeBackDom: true });
        syncEqConstraintDomToEqualizerConfig();
        if (!Equalizer.config.EqAllowedTypes.PK) {
            alert("AutoEQ uses peaking (PK) bands. Enable Peak under Constraints.");
            return;
        }
        let phoneSelected = eqPhoneSelect && String(eqPhoneSelect.value || "").trim();
        if (!phoneSelected) {
            alert("Choose an EQ model from the Models dropdown (it must be shown on the graph).");
            return;
        }
        let targetSel = (eqPhoneTargetSelect && String(eqPhoneTargetSelect.value || "").trim());
        if (!targetSel) {
            alert("Choose an EQ target from the Target dropdown (it must be shown on the graph).");
            return;
        }
        let phoneObj = phoneSelected && eqMeasurementObjForSelect(phoneSelected);
        let eqChild = phoneObj && phoneObj.eq;
        let targetObj = resolveEqTargetPhone(phoneObj, targetSel);
        if (!phoneObj || !targetObj) {
            alert("Please select an EQ model and a target trace (or add a target / second model on the graph).");
            return;
        }
        if (phoneObj === targetObj || (phoneObj.fullName && targetObj.fullName && phoneObj.fullName === targetObj.fullName)
                || (eqChild && targetObj === eqChild)) {
            alert("AutoEQ target must be a different trace than the EQ model.");
            return;
        }
        let phoneRaws = phoneObj.rawChannels;
        let targetRaws = targetObj.rawChannels;
        if (!phoneRaws || !Array.isArray(phoneRaws) || !phoneRaws.some(c => c)) {
            alert("The EQ model has no frequency response loaded yet. Wait for the curve to finish loading, or choose another model.");
            return;
        }
        if (!targetRaws || !Array.isArray(targetRaws) || !targetRaws.some(c => c)) {
            alert("The target trace has no frequency response loaded yet. Wait for the curve to finish loading, or pick another target.");
            return;
        }
        let autoEQOverlay = document.querySelector(".extra-eq-overlay");
        autoEQOverlay.style.display = "block";
        setTimeout(() => {
            try {
                commitEqMaxBandsFromInput({ writeBackDom: true });
                syncEqConstraintDomToEqualizerConfig();
                let pr = phoneObj.rawChannels;
                let tr = targetObj.rawChannels;
                if (!pr || !Array.isArray(pr) || !tr || !Array.isArray(tr)) {
                    alert("Curve data became unavailable. Try Auto EQ again after the graph finishes loading.");
                    return;
                }
                let phoneCHs = pr.filter(c => c).map(ch => ch.map(([f, v]) => [f, v + phoneObj.norm]));
                if (!phoneCHs.length || !phoneCHs[0]) {
                    alert("The EQ model has no usable channel data for Auto EQ.");
                    return;
                }
                let phoneCH = (phoneCHs.length > 1) ? avgCurves(phoneCHs) : phoneCHs[0];
                let targetCH0 = tr.filter(c => c)[0];
                if (!targetCH0) {
                    alert("The target has no usable channel data for Auto EQ.");
                    return;
                }
                let targetCH = targetCH0.map(([f, v]) => [f, v + targetObj.norm]);
                /* Band count for the solver comes only from Constraints (Eq Max Bands / getEffectiveEqMaxBands),
                   not from how many rows the UI is currently showing (extraEQBands / eqBands). */
                let maxBandsForAuto = getEffectiveEqMaxBands();
                let filters = Equalizer.autoeq(phoneCH, targetCH, maxBandsForAuto);
                filtersToElem(filters);
                applyEQ();
                scheduleLiveEqSync();
                eqHistoryCommitTransaction(undefined, { historyEntry: { kind: "autoeq" } });
            } catch (e) {
                console.error(e);
                alert("Auto EQ failed unexpectedly. If this keeps happening, reload the page and try again.");
            } finally {
                autoEQOverlay.style.display = "none";
            }
        }, 100);
    });

    // Bridge let-scope functions needed by initLiveSoundExtra
    window.setEqFilterSelectedRow = setEqFilterSelectedRow;
    window.findEqGraphMarkerHit = findEqGraphMarkerHit;
    window.elemToPinnedLivePlaybackSpecs = elemToPinnedLivePlaybackSpecs;
    window.eqGraphPlotDistPx = eqGraphPlotDistPx;
    window.eq2chSharedMeasurementBaseRaw = eq2chSharedMeasurementBaseRaw;
    window.eq2chMergedSpecsForChannelIndex = eq2chMergedSpecsForChannelIndex;
    window.computeEqNodePreviewAtMouse = computeEqNodePreviewAtMouse;
    window.resolveEqGraphPhoneObj = resolveEqGraphPhoneObj;
    window.computePinnedEqFrForModel = computePinnedEqFrForModel;
    window.applyEqGraphTraceStrokeEmphasis = applyEqGraphTraceStrokeEmphasis;
}
