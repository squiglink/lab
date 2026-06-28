// EQ cross-module coordination state — single object replaces 12 separate window.* properties
window.__eqCoord = {
    modelIntent: "",
    lastGraphModel: "",
    targetIntent: "",
    lastGraphTarget: "",
    pendingModel: "",
    pendingTarget: "",
    modelStickyBypass: "",
    modelActivatedByDropdown: false,
    targetActivatedByDropdown: false,
    suppressTargetSelect: false,
    batchSuppressDepth: 0,
    batchPathsPending: false,
};

// ============================================================
// === equalizer.js ===
// ============================================================
/*
Biquad algorithms are taken from:
https://github.com/jaakkopasanen/AutoEq/blob/master/biquad.py
https://github.com/mohayonao/biquad-coeffs/tree/master/packages/biquad-coeffs-cookbook
*/

Equalizer = (function() {
    let config = {
        // Change sample rate will affect the curve of filters close to nyquist frequency
        // Here I choosed a common used value, but not all DSP software use this sample rate for EQ
        DefaultSampleRate: 48000,
        // AutoEQ will avoid filters above this frequency at first batch
        TrebleStartFrom: 7000,
        // Avoid filters close to nyquist frequency by default, because the behavior is implementation dependent
        // https://github.com/jaakkopasanen/AutoEq/issues/240
        // https://github.com/jaakkopasanen/AutoEq/issues/411
        AutoEQRange: [20, 20000],
        // null = use AutoEQRange min/max; else sorted Hz list for fixed-band (graphic) headphone EQ UI
        EqGraphicBandFreqHz: null,
        // 0 = no cap (graphtool); >0 caps active bands / AutoEQ
        EqMaxBands: 0,
        // Which filter types are allowed in UI / strip (AutoEQ currently emits PK only)
        EqAllowedTypes: { PK: true, LSQ: true, HSQ: true },
        // Minimum and maximum Q for AutoEQ feature
        OptimizeQRange: [0.1, 10],
        // Minimum and maximum Gain for AutoEQ feature (graphtool may widen via constraints)
        OptimizeGainRange: [-40, 40],
        // Delta and step of Freq, Q and Gain used for AutoEQ optimizing
        OptimizeDeltas: [
            [10, 10, 10, 5, 0.1, 0.5],
            [10, 10, 10, 2, 0.1, 0.2],
            [10, 10, 10, 1, 0.1, 0.1],
        ],
        // Use to get response diff by EQ before smoothing
        GraphicEQRawFrequences: ( // ~= 1/96 octave
            new Array(Math.ceil(Math.log(20000 / 20) / Math.log(1.0072))).fill(null)
            .map((_, i) => 20 * Math.pow(1.0072, i))),
        // Smoothed 127 bands frequencies for graphic eq (wavelet)
        GraphicEQFrequences: Array.from(new Set(
            new Array(Math.ceil(Math.log(20000 / 20) / Math.log(1.0563))).fill(null)
            .map((_, i) => Math.floor(20 * Math.pow(1.0563, i))))).sort((a, b) => a - b)
    };

    let interp = function (fv, fr) {
        let i = 0;
        return fv.map(f => {
            for (; i < fr.length-1; ++i) {
                let [f0, v0] = fr[i];
                let [f1, v1] = fr[i+1];
                if (i == 0 && f < f0) {
                    return [f, v0];
                } else if (f >= f0 && f < f1) {
                    let v = v0 + (v1 - v0) * (f - f0) / (f1 - f0);
                    return [f, v];
                }
            }
            return [f, fr[fr.length-1][1]];
        });
    };

    let lowshelf = function (freq, q, gain, sampleRate) {
        freq = freq / (sampleRate || config.DefaultSampleRate);
        freq = Math.max(1e-6, Math.min(freq, 1));
        q    = Math.max(1e-4, Math.min(q, 1000));
        gain = Math.max(-40, Math.min(gain, 40));

        let w0 = 2 * Math.PI * freq;
        let sin = Math.sin(w0);
        let cos = Math.cos(w0);
        let a = Math.pow(10, (gain / 40));
        let alpha = sin / (2 * q);
        let alphamod = (2 * Math.sqrt(a) * alpha) || 0;

        let a0 =          ((a+1) + (a-1) * cos + alphamod);
        let a1 = -2 *     ((a-1) + (a+1) * cos           );
        let a2 =          ((a+1) + (a-1) * cos - alphamod);
        let b0 =      a * ((a+1) - (a-1) * cos + alphamod);
        let b1 =  2 * a * ((a-1) - (a+1) * cos           );
        let b2 =      a * ((a+1) - (a-1) * cos - alphamod);

        return [ 1.0, a1/a0, a2/a0, b0/a0, b1/a0, b2/a0 ];
    };

    let highshelf = function (freq, q, gain, sampleRate) {
        freq = freq / (sampleRate || config.DefaultSampleRate);
        freq = Math.max(1e-6, Math.min(freq, 1));
        q    = Math.max(1e-4, Math.min(q, 1000));
        gain = Math.max(-40, Math.min(gain, 40));

        let w0 = 2 * Math.PI * freq;
        let sin = Math.sin(w0);
        let cos = Math.cos(w0);
        let a = Math.pow(10, (gain / 40));
        let alpha = sin / (2 * q);
        let alphamod = (2 * Math.sqrt(a) * alpha) || 0;

        let a0 =          ((a+1) - (a-1) * cos + alphamod);
        let a1 =  2 *     ((a-1) - (a+1) * cos           );
        let a2 =          ((a+1) - (a-1) * cos - alphamod);
        let b0 =      a * ((a+1) + (a-1) * cos + alphamod);
        let b1 = -2 * a * ((a-1) + (a+1) * cos           );
        let b2 =      a * ((a+1) + (a-1) * cos - alphamod);

        return [ 1.0, a1/a0, a2/a0, b0/a0, b1/a0, b2/a0 ];
    };

    let peaking = function (freq, q, gain, sampleRate) {
        freq = freq / (sampleRate || config.DefaultSampleRate);
        freq = Math.max(1e-6, Math.min(freq, 1));
        q    = Math.max(1e-4, Math.min(q, 1000));
        gain = Math.max(-40, Math.min(gain, 40));

        let w0 = 2 * Math.PI * freq;
        let sin = Math.sin(w0);
        let cos = Math.cos(w0);
        let a = Math.pow(10, (gain / 40));
        let alpha = sin / (2 * q);

        let a0 =  1 + alpha / a;
        let a1 = -2 * cos;
        let a2 =  1 - alpha / a;
        let b0 =  1 + alpha * a;
        let b1 = -2 * cos;
        let b2 =  1 - alpha * a;

        return [ 1.0, a1/a0, a2/a0, b0/a0, b1/a0, b2/a0 ];
    };

    let calc_gains = function (freqs, coeffs, sampleRate) {
        sampleRate = sampleRate || config.DefaultSampleRate;
        let gains = new Array(freqs.length).fill(0);

        for (let i = 0; i < coeffs.length; ++i) {
            let [ a0, a1, a2, b0, b1, b2] = coeffs[i];
            for (let j = 0; j < freqs.length; ++j) {
                let w = 2 * Math.PI * freqs[j] / sampleRate;
                let phi = 4 * Math.pow(Math.sin(w / 2), 2);
                let c = (
                    10 * Math.log10(Math.pow(b0 + b1 + b2, 2) +
                        (b0 * b2 * phi - (b1 * (b0 + b2) + 4 * b0 * b2)) * phi) -
                    10 * Math.log10(Math.pow(a0 + a1 + a2, 2) +
                        (a0 * a2 * phi - (a1 * (a0 + a2) + 4 * a0 * a2)) * phi));
                gains[j] += c;
            }
        }
        return gains;
    };

    let calc_preamp = function (fr1, fr2) {
        let maxGain = -Infinity;
        for (let i = 0; i < fr1.length; ++i) {
            maxGain = Math.max(maxGain, fr2[i][1] - fr1[i][1]);
        }
        return -maxGain;
    };

    let calc_distance = function (fr1, fr2) {
        let distance = 0;
        for (let i = 0; i < fr1.length; ++i) {
            let d = Math.abs(fr1[i][1] - fr2[i][1]);
            distance += (d >= 0.1 ? d : 0);
        }
        return distance / fr1.length;
    };

    let filters_to_coeffs = function (filters, sampleRate) {
        return filters.map(f => {
            if (!f.freq || !f.gain || !f.q) {
                return null;
            } else if (f.type === "LSQ") {
                return lowshelf(f.freq, f.q, f.gain, sampleRate);
            } else if (f.type === "HSQ") {
                return highshelf(f.freq, f.q, f.gain, sampleRate);
            } else if (f.type === "PK") {
                return peaking(f.freq, f.q, f.gain, sampleRate);
            }
            return null;
        }).filter(f => f);
    };

    let apply = function (fr, filters, sampleRate) {
        let freqs = new Array(fr.length).fill(null);
        for (let i = 0; i < fr.length; ++i) {
            freqs[i] = fr[i][0];
        }
        let coeffs = filters_to_coeffs(filters, sampleRate);
        let gains = calc_gains(freqs, coeffs, sampleRate);
        let fr_eq = new Array(fr.length).fill(null);
        for (let i = 0; i < fr.length; ++i) {
            fr_eq[i] = [fr[i][0], fr[i][1] + gains[i]];
        }
        return fr_eq;
    };

    let as_graphic_eq = function (filters, sampleRate) {
        let rawFS = config.GraphicEQRawFrequences, fs = config.GraphicEQFrequences;
        let coeffs = filters_to_coeffs(filters, sampleRate);
        let gains = calc_gains(rawFS, coeffs, sampleRate);
        let rawFR = rawFS.map((f, i) => [f, gains[i]]);
        // Interpolate and smoothing with moving average
        let i = 0;
        let resultFR = fs.map((f, j) => {
            let freqTo = (j < fs.length-1) ? Math.sqrt(f * fs[j+1]) : 20000;
            let points = [];
            for (; i < rawFS.length; ++i) {
                if (rawFS[i] < freqTo) {
                    points.push(rawFR[i][1]);
                } else {
                    break
                }
            }
            let avg = points.reduce((a, b) => a + b, 0) / points.length;
            return [f, avg];
        });
        // Normalize (apply preamp)
        let maxGain = resultFR.reduce((a, b) => a > b[1] ? a : b[1], -Infinity);
        resultFR = resultFR.map(([f, v]) => [f, v-maxGain]);
        return resultFR;
    };

    let search_candidates = function (fr, frTarget, threshold) {
        let state = 0; // 1: peak, 0: matched, -1: dip
        let startIndex = -1;
        let candidates = [];
        let [minFreq, maxFreq] = config.AutoEQRange;
        for (let i = 0; i < fr.length; ++i) {
            let [f, v0] = fr[i];
            let v1 = frTarget[i][1];
            let delta = v0 - v1;
            let deltaAbs = Math.abs(delta);
            let nextState = (deltaAbs < threshold) ? 0 : (delta / deltaAbs);
            if (nextState === state) {
                continue;
            }
            if (startIndex >= 0) {
                if (state != 0) {
                    let start = fr[startIndex][0];
                    let end = f;
                    let center = Math.sqrt(start * end);
                    let gain = (
                        interp([center], frTarget.slice(startIndex, i))[0][1] -
                        interp([center], fr.slice(startIndex, i))[0][1]);
                    let q = center / (end - start);
                    if (center >= minFreq && center <= maxFreq) {
                        candidates.push({ type: "PK", freq: center, q, gain });
                    }
                }
                startIndex = -1;
            } else {
                startIndex = i;
            }
            state = nextState;
        }
        return candidates;
    };

    let freq_unit = function (freq) {
        if (freq < 100) {
            return 1;
        } else if (freq < 1000) {
            return 10;
        } else if (freq < 10000) {
            return 100;
        }
        return 1000;
    };

    let strip = function (filters) {
        // Make freq, q and gain look better and more compatible to some DSP device
        let [minQ, maxQ] = config.OptimizeQRange;
        let [minGain, maxGain] = config.OptimizeGainRange;
        let [minFreq, maxFreq] = config.AutoEQRange;
        if (minFreq > maxFreq) {
            let t = minFreq;
            minFreq = maxFreq;
            maxFreq = t;
        }
        let allowed = config.EqAllowedTypes || { PK: true, LSQ: true, HSQ: true };
        let fallbackType = () => (allowed.PK ? "PK" : (allowed.LSQ ? "LSQ" : "HSQ"));
        return filters.map(f => {
            let t = f.type;
            if (t !== "PK" && t !== "LSQ" && t !== "HSQ") {
                t = "PK";
            }
            if (!allowed[t]) {
                t = fallbackType();
            }
            let fq = f.freq;
            let snapped;
            if (!Number.isFinite(fq) || fq <= 0) {
                snapped = minFreq;
            } else {
                snapped = Math.floor(fq - fq % freq_unit(fq));
            }
            let freq = Math.min(Math.max(snapped, minFreq), maxFreq);
            return {
                type: t,
                freq,
                q: Math.min(Math.max(Math.floor(f.q * 10) / 10, minQ), maxQ),
                gain: Math.min(Math.max(Math.floor(f.gain * 10) / 10, minGain), maxGain)
            };
        });
    };

    let optimize = function (fr, frTarget, filters, iteration, dir) {
        filters = strip(filters);
        let combinations = [];
        let [minFreq, maxFreq] = config.AutoEQRange;
        let [minQ, maxQ] = config.OptimizeQRange;
        let [minGain, maxGain] = config.OptimizeGainRange;
        let [maxDF, maxDQ, maxDG, stepDF, stepDQ, stepDG] = (
            config.OptimizeDeltas[iteration]);
        let [begin, end, step] = (dir ?
            [filters.length-1, -1, -1] : [0, filters.length, 1]);
        // Optimize freq, q, gain
        for (let i = begin; i != end; i += step) {
            let f = filters[i];
            let fr1 = apply(fr, filters.filter((f, fi) => fi !== i));
            let fr2 = apply(fr1, [f]);
            let fr3 = apply(fr, filters);
            let bestFilter = f;
            let bestDistance = calc_distance(fr2, frTarget);
            let testNewFilter = (df, dq, dg) => {
                let freq = f.freq + df * freq_unit(f.freq) * stepDF;
                let q = f.q + dq * stepDQ;
                let gain = f.gain + dg * stepDG;
                if (freq < minFreq || freq > maxFreq || q < minQ ||
                    q > maxQ || gain < minGain || gain > maxGain) {
                    return false;
                }
                let newFilter = { type: f.type, freq, q, gain };
                let newFR = apply(fr1, [newFilter]);
                let newDistance = calc_distance(newFR, frTarget);
                if (newDistance < bestDistance) {
                    bestFilter = newFilter;
                    bestDistance = newDistance;
                    return true;
                }
                return false;
            }
            for (let df = -maxDF; df < maxDF; ++df) {
                // Use smaller Q as possible
                for (let dq = maxDQ-1; dq >= -maxDQ; --dq) {
                    for (let dg = 1; dg < maxDG; ++dg) {
                        if (!testNewFilter(df, dq, dg)) {
                            break;
                        }
                    }
                    for (let dg = -1; dg >= -maxDG; --dg) {
                        if (!testNewFilter(df, dq, dg)) {
                            break;
                        }
                    }
                }
            }
            filters[i] = bestFilter;
        }
        if (!dir) {
            return optimize(fr, frTarget, filters, iteration, 1);
        } else {
            filters = filters.sort((a, b) => a.freq - b.freq);
            // Merge closed filters
            for (let i = 0; i < filters.length-1;) {
                let f1 = filters[i];
                let f2 = filters[i+1];
                if (Math.abs(f1.freq - f2.freq) <= freq_unit(f1.freq) &&
                    Math.abs(f1.q - f2.q) <= 0.1) {
                    f1.gain += f2.gain;
                    filters.splice(i+1, 1);
                } else {
                    ++i;
                }
            }
            // Remove unnecessary filters
            let bestDistance = calc_distance(apply(fr, filters), frTarget);
            for (let i = 0; i < filters.length;) {
                if (Math.abs(filters[i].gain) <= 0.1) {
                    filters.splice(i, 1);
                    continue;
                }
                let newDistance = calc_distance(apply(fr,
                    filters.filter((f, fi) => fi !== i)), frTarget);
                if (newDistance < bestDistance) {
                    filters.splice(i, 1);
                    bestDistance = newDistance;
                } else {
                    ++i;
                }
            }
            return filters;
        }
    };

    let autoeq = function (fr, frTarget, maxFilters) {
        // 2 steps manual optimized algorithm
        // fr, frTarget should has same resolution and normalized
        maxFilters = Math.floor(Number(maxFilters)) || 1;
        if (config.EqMaxBands > 0) {
            maxFilters = Math.max(1, Math.min(maxFilters, config.EqMaxBands));
        }
        let firstBatchSize = Math.max(Math.floor(maxFilters / 2) - 1, 1);
        let firstCandidates = search_candidates(fr, frTarget, 1);
        let firstFilters = (firstCandidates
            // Dont adjust treble in the first batch
            .filter(c => c.freq <= config.TrebleStartFrom)
            // Wider bandwidth (smaller Q) come first
            .sort((a, b) => a.q - b.q)
            .slice(0, firstBatchSize)
            .sort((a, b) => a.freq - b.freq));
        for (let i = 0; i < config.OptimizeDeltas.length; ++i) {
            firstFilters = optimize(fr, frTarget, firstFilters, i);
        }
        let secondFR = apply(fr, firstFilters);
        let secondBatchSize = maxFilters - firstFilters.length;
        let secondCandidates = search_candidates(secondFR, frTarget, 0.5);
        let secondFilters = (secondCandidates
            .sort((a, b) => a.q - b.q)
            .slice(0, secondBatchSize)
            .sort((a, b) => a.freq - b.freq));
        for (let i = 0; i < config.OptimizeDeltas.length; ++i) {
            secondFilters = optimize(secondFR, frTarget, secondFilters, i);
        }
        let allFilters = firstFilters.concat(secondFilters);
        for (let i = 0; i < config.OptimizeDeltas.length; ++i) {
            allFilters = optimize(fr, frTarget, allFilters, i);
        }
        return strip(allFilters);
    };

    return {
        config,
        interp,
        lowshelf,
        highshelf,
        peaking,
        calc_gains,
        calc_preamp,
        apply,
        as_graphic_eq,
        autoeq
    }
})();


// ============================================================
// === src/extra/eq/state.js ===
// ============================================================
/* Shared EQ state, selection, and target synthesis helpers.
 * This remains a classic script so graphtool.js can keep ordered script loading. */
let eqPhoneSelect = null;
let eqPhoneTargetSelect = null;

function eqCloneRawChannelsForUserTarget(rc) {
    if (!rc || !Array.isArray(rc)) {
        return null;
    }
    return rc.map((ch) => (!ch ? ch : ch.map((pt) => (pt && pt.slice) ? pt.slice() : [...pt])));
}

function eqFrArrayForUserMeasurementTarget(meas) {
    if (!meas) {
        return null;
    }
    let rc = meas.rawChannels;
    if (rc && Array.isArray(rc) && rc.some((c) => c)) {
        return rc;
    }
    let ch = meas.channels;
    if (ch && Array.isArray(ch) && ch.some((c) => c && c.length)) {
        return ch;
    }
    let ac = meas.activeCurves;
    if (ac && ac.length) {
        let hit = ac.filter((c) => c && c.l && c.l.length >= 2)[0];
        if (hit && hit.l) {
            return [hit.l.map((pt) => (pt && pt.slice) ? pt.slice() : [...pt])];
        }
    }
    return null;
}

function userTargetStemKey(meas) {
    return `${String(meas.fileName || "")}\t${String(meas.fullName || "").trim()}`;
}

function userTargetHashStem(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    return (h >>> 0).toString(36);
}

function allocNextUserBrandTargetNegId() {
    let bt = typeof window !== "undefined" ? window.brandTarget : null;
    if (!bt || !Array.isArray(bt.phoneObjs)) {
        return -1;
    }
    let m = 0;
    bt.phoneObjs.forEach((q) => {
        if (q && typeof q.id === "number" && q.id < m) {
            m = q.id;
        }
    });
    return m - 1;
}

function eqDispNameTargetFromMeasurement(meas) {
    let brand = String(meas.dispBrand || "").trim(),
        tail = String(meas.dispName || meas.phone || "").trim(),
        body = `${brand}${brand && tail ? " " : ""}${tail}`.trim()
            || String(meas.fullName || "").replace(/\sEQ$/i, "").trim()
            || "target";
    /* Manage row + CSS append " Target"; dropdown Active optgroup uses this as the label. */
    return body.replace(/^Target:\s*/i, "").trim();
}

function eqAllPhonesPool() {
    return ((typeof window !== "undefined" && window.allPhones)
        ? window.allPhones
        : activePhones);
}

function eqBrandTargetPhoneObjs() {
    return ((typeof window !== "undefined" && window.brandTarget && window.brandTarget.phoneObjs)
        ? window.brandTarget.phoneObjs
        : []);
}

function eqBuiltinCatalogTargetsForEqUi() {
    return eqBrandTargetPhoneObjs().filter((p) => p && p.isTarget && p.fullName
        && !p.fullName.match(/ EQ$/) && !isCompensationTargetNameMatch(p) && !p.userTargetFromMeasurement);
}

function eqUserCatalogTargetsForEqUi() {
    return eqBrandTargetPhoneObjs().filter((p) => p && p.fullName && p.userTargetFromMeasurement);
}

function eqCatalogTargetsForEqUi() {
    return eqUserCatalogTargetsForEqUi().concat(eqBuiltinCatalogTargetsForEqUi());
}

function eqFindByFullNameAny(fullName) {
    if (!fullName) {
        return null;
    }
    let hit = eqAllPhonesPool().filter((p) => p.fullName === fullName)[0];
    if (hit) {
        return hit;
    }
    hit = eqBrandTargetPhoneObjs().filter((p) => p.fullName === fullName)[0];
    if (hit) {
        return hit;
    }
    return activePhones.filter((p) => p.fullName === fullName)[0] || null;
}

function eqLegacyShareUrlSegment(fullName) {
    return encodeURIComponent(String(fullName || "").trim()).replace(/%20/g, "_");
}

function eqResolveShareFullNameFromParam(raw) {
    if (!raw) {
        return "";
    }
    let s = String(raw).trim();
    let hit = eqFindByFullNameAny(s);
    if (hit) {
        return hit.fullName;
    }
    let relaxed = s.replace(/_/g, " ");
    hit = eqFindByFullNameAny(relaxed);
    if (hit) {
        return hit.fullName;
    }
    let pool = eqAllPhonesPool().concat(eqBrandTargetPhoneObjs());
    for (let i = 0; i < pool.length; i++) {
        let p = pool[i];
        if (p && p.fullName && eqLegacyShareUrlSegment(p.fullName) === s) {
            return p.fullName;
        }
    }
    return relaxed;
}

function eqMeasurementObjForSelect(fullName) {
    if (!fullName) {
        return null;
    }
    let pool = eqAllPhonesPool();
    let hit = pool.filter((p) => p.fullName === fullName && !p.isTarget
        && p.fullName && !p.fullName.match(/ EQ$/))[0];
    if (hit) {
        return hit;
    }
    return activePhones.filter((p) => p.fullName === fullName && !p.isTarget
        && p.fullName && !p.fullName.match(/ EQ$/))[0] || null;
}

function eqPhoneWantsInlineFrInShareUrl(p) {
    return !!(p && p.isDynamic && phoneCurveDataReadyForEq(p)
        && (p.isTarget || (p.brand && p.brand.name === "Uploaded")));
}

function eqInjectFrFromUrlDataIntoModel(modelFullNameStr, dataB64) {
    let tenths = eqShareFrDataDeserializeToTenths(dataB64);
    if (!tenths) {
        return false;
    }
    let ch = eqShareExpandTenthsToFValuesChannel(tenths);
    if (!ch) {
        return false;
    }
    /* eqShareFullNameToUrlParam replaces %20 with "_" so the query value may read
     * "Uploaded_Moondrop_…" — same underscore→space trick as eqResolveShareFullNameFromParam. */
    let fn = String(modelFullNameStr || "").trim().replace(/_/g, " ");
    if (!fn || !/^Uploaded\s+/i.test(fn)) {
        return false;
    }
    let stem = fn.replace(/^Uploaded\s+/i, "").trim() || "Upload";
    let addPhone = (typeof window !== "undefined" && typeof window.eqAddOrUpdatePhone === "function")
        ? window.eqAddOrUpdatePhone
        : null;
    if (!addPhone) {
        return false;
    }
    let phoneObj = addPhone(brandMap.Uploaded, { name: stem }, [ch]);
    showPhone(phoneObj, false);
    return true;
}

function eqInjectFrFromUrlDataIntoTarget(targetFullNameStr, dataB64) {
    let tenths = eqShareFrDataDeserializeToTenths(dataB64);
    if (!tenths) {
        return false;
    }
    let ch = eqShareExpandTenthsToFValuesChannel(tenths);
    if (!ch) {
        return false;
    }
    let fullName = String(targetFullNameStr || "").trim().replace(/_/g, " ");
    if (!fullName) {
        return false;
    }
    let bt = typeof window !== "undefined" ? window.brandTarget : null;
    if (!bt || !Array.isArray(bt.phoneObjs)) {
        return false;
    }
    let base = fullName.replace(/\s+Target$/i, "").trim() || "Target";
    let existing = bt.phoneObjs.filter((q) => q && q.fullName === fullName)[0];
    if (existing) {
        if (!existing.isDynamic && !existing.userTargetFromMeasurement) {
            console.warn("eqTargetData skipped: \"" + fullName + "\" is a built-in catalog target.");
            return false;
        }
        existing.rawChannels = [ch];
        existing.isDynamic = true;
        showPhone(existing, true);
    } else {
        let row = {
            isTarget: true,
            brand: bt,
            dispName: base,
            phone: base,
            fullName: fullName,
            fileName: fullName,
            rawChannels: [ch],
            isDynamic: true,
            id: -bt.phoneObjs.length
        };
        bt.phoneObjs.push(row);
        showPhone(row, true);
    }
    return true;
}

function eqEnsureUserMeasurementBrandTarget(meas) {
    if (!meas || meas.isTarget || (meas.fullName && String(meas.fullName).match(/ EQ$/))) {
        return null;
    }
    let srcFr = eqFrArrayForUserMeasurementTarget(meas);
    if (!srcFr) {
        return null;
    }
    let b = typeof window !== "undefined" ? window.brandTarget : null;
    if (!b || !Array.isArray(b.phoneObjs)) {
        return null;
    }
    let stemKey = userTargetStemKey(meas);
    let exists = b.phoneObjs.filter((u) => u && u.userTargetStemKey === stemKey)[0];
    if (exists) {
        let cl = eqCloneRawChannelsForUserTarget(srcFr);
        if (cl && cl.some((c) => c)) {
            exists.rawChannels = cl;
        }
        exists.norm = meas.norm != null ? meas.norm : exists.norm;
        exists.offset = meas.offset || exists.offset || 0;
        exists.dispName = eqDispNameTargetFromMeasurement(meas);
        exists.dispBrand = String(meas.dispBrand || "").trim();
        let synthTail = String(meas.dispName || meas.phone || "").trim();
        exists.phone = String(synthTail || exists.phone).slice(0, 120);
        if (exists.activeCurves && exists.activeCurves[0]) {
            exists.activeCurves[0].id = graphCurveLabelForPhone(exists);
        }
        return exists;
    }
    let fn = "USRMT_" + userTargetHashStem(stemKey),
        synthBrand = String(meas.dispBrand || "").trim(),
        synthTail = String(meas.dispName || meas.phone || "").trim(),
        synthPhone = synthTail
            || String(meas.fullName || meas.fileName || "UserTarget").trim().replace(/\sEQ$/i, ""),
        row = {
            isTarget: true,
            isDynamic: true,
            userTargetFromMeasurement: true,
            userTargetStemKey: stemKey,
            brand: b,
            dispBrand: synthBrand,
            dispName: eqDispNameTargetFromMeasurement(meas),
            phone: String(synthPhone).slice(0, 120),
            fullName: fn,
            fileName: fn,
            rawChannels: null,
            norm: meas.norm,
            offset: meas.offset || 0,
            id: allocNextUserBrandTargetNegId()
        };
    let clonedFr = eqCloneRawChannelsForUserTarget(srcFr);
    if (!clonedFr || !clonedFr.some((c) => c)) {
        return null;
    }
    row.rawChannels = clonedFr;
    b.phoneObjs.push(row);
    return row;
}

function resolveEqModelPhone() {
    let sel = eqPhoneSelect && String(eqPhoneSelect.value || "").trim();
    let intent = (typeof window !== "undefined" && window.__eqCoord.modelIntent)
        ? String(window.__eqCoord.modelIntent).trim()
        : "";
    let sticky = (typeof window !== "undefined" && window.__eqCoord.lastGraphModel)
        ? String(window.__eqCoord.lastGraphModel).trim()
        : "";
    /* Intent before sel: during <select> option rebuild the DOM value can be empty for a beat;
       intent/sticky are set synchronously on input and must win. */
    let key = intent || sel || sticky;
    if (key) {
        let hit = eqMeasurementObjForSelect(key);
        if (hit) {
            return hit;
        }
        /* Do not fall back to activePhones[0]. With compare + EQ-only models on graph, a miss
           (or empty sel) used to resolve to the first graphed IEM (e.g. original 634ears) and
           applyParametricEqGraphTraceFocus briefly treated it as the EQ model — "flash twice". */
        return null;
    }
    let ord = getManageTableBasePhoneOrder();
    for (let i = 0; i < ord.length; i++) {
        let p = ord[i];
        if (p && !p.isTarget && p.fullName && !p.fullName.match(/ EQ$/)) {
            return p;
        }
    }
    return null;
}

function resolveEqTargetPhone(modelP, tsel) {
    if (!modelP) {
        return null;
    }
    let tselTrim = tsel ? String(tsel).trim() : "";
    let fromSel = tselTrim ? eqFindByFullNameAny(tselTrim) : null;
    if (fromSel && !isCompensationTargetNameMatch(fromSel)) {
        /* Path curves use whatever object instance is bound in activePhones — catalog pool hits
           from `window.allPhones` can be a different reference with the same fullName, so parametric focus misses. */
        let key = String(fromSel.fullName || "").trim(),
            graphCanon = activePhones.filter((q) => q && q.fullName === key)[0];
        return graphCanon || fromSel;
    }
    let catT = eqCatalogTargetsForEqUi().slice().sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
    /* Prefer a target already on the graph (manage-table order: targets first in row order). */
    let onGraphT = (() => {
        let ord = getManageTableBasePhoneOrder();
        for (let i = 0; i < ord.length; i++) {
            let p = ord[i];
            if (p && p.isTarget && !isCompensationTargetNameMatch(p)) {
                return p;
            }
        }
        return null;
    })();
    return onGraphT || catT[0] || null;
}

function getParametricEqTraceFocusContext() {
    let tab = document.querySelector("div.select");
    if (!extraEnabled || !extraEQEnabled || !tab || tab.getAttribute("data-selected") !== "extra") {
        return null;
    }
    let explicitModel = eqPhoneSelect && String(eqPhoneSelect.value || "").trim();
    let pendM = (typeof window !== "undefined" && window.__eqCoord.pendingModel)
        ? String(window.__eqCoord.pendingModel).trim()
        : "";
    if (!explicitModel && !pendM) {
        return null;
    }
    let modelP = resolveEqModelPhone();
    if (!modelP) {
        return null;
    }
    let tsel = (eqPhoneTargetSelect && String(eqPhoneTargetSelect.value || "").trim())
        || (eqPhoneTargetSelect && String(eqPhoneTargetSelect.dataset.eqLastTarget || "").trim())
        || (typeof window !== "undefined" ? String(window.__eqCoord.lastGraphTarget || "").trim() : "");
    let targetP = resolveEqTargetPhone(modelP, tsel);
    let eqP = modelP && modelP.eq;
    let showSet = new Set([modelP, eqP, targetP].filter(Boolean));
    return { showSet, targetP, eqP, modelP, tsel };
}

function eqModelDropdownCandidateRenderable(fullName, optionValues) {
    if (!fullName || !optionValues || optionValues.indexOf(fullName) < 0) {
        return false;
    }
    if (typeof window !== "undefined" && window.__eqCoord.pendingModel === fullName) {
        return true;
    }
    let hit = eqMeasurementObjForSelect(fullName);
    return !!(hit && activePhones.indexOf(hit) !== -1 && phoneCurveDataReadyForEq(hit));
}

function eqModelOnGraphInOptionList(fullName, optionValues) {
    if (!fullName || !optionValues || optionValues.indexOf(fullName) < 0) {
        return false;
    }
    if (typeof window !== "undefined" && window.__eqCoord.pendingModel === fullName) {
        return true;
    }
    let hit = eqMeasurementObjForSelect(fullName);
    return !!(hit && activePhones.indexOf(hit) !== -1);
}

function eqTargetDropdownCandidateRenderable(fullName, allOpts) {
    if (!fullName || !allOpts || !allOpts.some((row) => row.fullName === fullName)) {
        return false;
    }
    if (typeof window !== "undefined" && window.__eqCoord.pendingTarget === fullName) {
        return true;
    }
    let hit = eqFindByFullNameAny(fullName);
    return !!(hit && activePhones.indexOf(hit) !== -1 && phoneCurveDataReadyForEq(hit));
}

function eqTargetOnGraphInOptionList(fullName, allOpts) {
    if (!fullName || !allOpts || !allOpts.some((row) => row.fullName === fullName)) {
        return false;
    }
    if (typeof window !== "undefined" && window.__eqCoord.pendingTarget === fullName) {
        return true;
    }
    let hit = eqFindByFullNameAny(fullName);
    return !!(hit && activePhones.indexOf(hit) !== -1);
}

function publishEqUiState(reason) {
    let tab = document.querySelector("div.select");
    let onEqTab = !!(extraEnabled && extraEQEnabled && tab
        && tab.getAttribute("data-selected") === "extra");
    let loadedModels = [];
    let loadedTargets = [];
    activePhones.forEach((p) => {
        if (!p || !p.fullName) {
            return;
        }
        if (p.isTarget) {
            loadedTargets.push(p.fullName);
        } else if (!p.fullName.match(/ EQ$/)) {
            loadedModels.push(p.fullName);
        }
    });
    let ctx = onEqTab ? getParametricEqTraceFocusContext() : null;
    let snap = {
        reason,
        onEqTab,
        loadedModelsFullNames: loadedModels,
        loadedTargetsFullNames: loadedTargets,
        eqModelSelectValue: eqPhoneSelect ? eqPhoneSelect.value : "",
        eqTargetSelectValue: eqPhoneTargetSelect ? eqPhoneTargetSelect.value : "",
        resolvedEqModelFullName: ctx && ctx.modelP ? ctx.modelP.fullName : "",
        resolvedEqTargetFullName: ctx && ctx.targetP ? ctx.targetP.fullName : "",
        eqTraceParentFullName: ctx && ctx.eqP ? ctx.eqP.fullName : "",
        pendingModelFullName: (typeof window !== "undefined" && window.__eqCoord.pendingModel) || "",
        pendingTargetFullName: (typeof window !== "undefined" && window.__eqCoord.pendingTarget) || "",
        eqDropdownModelIntent: (typeof window !== "undefined" && window.__eqCoord.modelIntent) || "",
        stickyLastGraphModelForEq: (typeof window !== "undefined" && window.__eqCoord.lastGraphModel) || "",
        stickyLastGraphTargetForEq: (typeof window !== "undefined" && window.__eqCoord.lastGraphTarget) || ""
    };
    window.__eqUiState = snap;
}

function __eqParametricPathOpacity(curve) {
    if (!curve || !curve.p) {
        return undefined;
    }
    let ctx = getParametricEqTraceFocusContext();
    if (!ctx) {
        return undefined;
    }
    if (ctx.showSet.has(curve.p)) {
        let baseG = graphPathOpacityForCurve(curve) ?? (curve.p.hide ? 0 : null);
        if (curve.p.hide) {
            return 0;
        }
        let b = (baseG == null || !Number.isFinite(baseG)) ? 1 : baseG;
        /* Compose listening A/B dimming in the join callback so rebind never flashes full opacity. */
        return eqComposeListeningOpacityForCurve(curve, b);
    }
    return 0;
}

let prevParametricFocusActive = false;
function applyParametricEqGraphTraceFocus() {
    let tab = document.querySelector("div.select");
    let active = extraEnabled && extraEQEnabled && tab && tab.getAttribute("data-selected") === "extra";
    if (!active) {
        if (prevParametricFocusActive) {
            prevParametricFocusActive = false;
            updatePaths(false);
        }
        return;
    }
    let ctx = getParametricEqTraceFocusContext();
    if (!ctx) {
        if (prevParametricFocusActive) {
            prevParametricFocusActive = false;
            updatePaths(false);
        }
        return;
    }
    prevParametricFocusActive = true;
    let { showSet, targetP, eqP } = ctx;
    gpath.selectAll("path").each(function (c) {
        if (!c || !c.p) {
            return;
        }
        let el = d3.select(this);
        let vis = showSet.has(c.p);
        if (!vis) {
            el.attr("opacity", 0);
            el.classed("eq-graph-focus-target", false);
            if (!c.p.isTarget) {
                el.style("stroke-dasharray", null);
            }
            return;
        }
        {
            let baseRaw = graphPathOpacityForCurve(c) ?? (c.p.hide ? 0 : null);
            let b = (baseRaw == null || !Number.isFinite(baseRaw)) ? 1 : baseRaw;
            el.attr("opacity", eqComposeListeningOpacityForCurve(c, b));
        }
        /* Never paint the parametric EQ trace as the "target" line (gray); fallback targetP can equal eqP when the target dropdown is empty. */
        if (targetP && c.p === targetP && !c.p.isTarget && c.p !== eqP) {
            el.classed("eq-graph-focus-target", true);
            let spec = targetP.isTarget
                ? targetTraceDotSpecForPhone(targetP)
                : TARGET_TRACE_DOT_SPECS[0];
            let cap = spec.cap || "round";
            el.style("stroke-dasharray", spec.dash)
                .attr("stroke-linecap", cap)
                .attr("stroke-linejoin", cap === "round" ? "round" : "miter");
            el.attr("stroke-width", targetTraceStrokeWidthFromSpec(spec));
            if (typeof targetColorCustom !== "undefined" && targetColorCustom) {
                el.attr("stroke", targetColorCustom);
            } else {
                el.attr("stroke", "var(--background-color-contrast-more)");
            }
        } else {
            el.classed("eq-graph-focus-target", false);
            if (!c.p.isTarget) {
                el.style("stroke-dasharray", null);
                el.attr("stroke-linecap", null);
                el.attr("stroke-linejoin", null);
                el.attr("stroke", getColor_AC(c));
            } else {
                applyTargetCurveStrokePattern(el, c.p);
            }
        }
    });
    /* This pass assigns full (or focus) opacity on every visible curve. Must run
       updateEqTraceOpacity afterwards so parent vs EQ trace dimming is not reset until the next
       time something remembered to call it (e.g. EQ filter edits only hit applyParametric here). */
    updateEqTraceOpacity();
}

function initEqState(options) {
    options = options || {};
    let addOrUpdatePhone = options.addOrUpdatePhone;
    eqPhoneSelect = document.querySelector("div.extra-eq div.select-eq-phone-model-target select[name='phone']")
        || document.querySelector("div.extra-eq select[name='phone']");
    eqPhoneTargetSelect = document.querySelector("div.extra-eq div.select-eq-phone-model-target select[name='eq-target']")
        || document.querySelector("div.extra-eq select[name='eq-target']");
    window.eqEnsureUserMeasurementBrandTarget = eqEnsureUserMeasurementBrandTarget;
    window.eqEnsureUserSynthTargetFromMeasurement = eqEnsureUserMeasurementBrandTarget;
    window.publishEqUiState = publishEqUiState;
    window.__getEqParametricFocusContext = getParametricEqTraceFocusContext;
    window.__eqParametricPathOpacity = __eqParametricPathOpacity;
    window.applyParametricEqGraphTraceFocus = applyParametricEqGraphTraceFocus;
    window.eqInjectFrFromUrlDataIntoModel = eqInjectFrFromUrlDataIntoModel;
    window.eqInjectFrFromUrlDataIntoTarget = eqInjectFrFromUrlDataIntoTarget;
    if (typeof addOrUpdatePhone === "function") {
        window.eqAddOrUpdatePhone = addOrUpdatePhone;
    }
}

// ============================================================
// === src/extra/eq/constraints.js ===
// ============================================================
/* EQ constraint, filter-row, and 2ch-bank helpers.
 * Classic script so the page can stay on simple ordered script tags. */
let filtersContainer = null;
let fileFiltersImport = null;
let filterEnabledInput = null;
let filterTypeSelect = null;
let filterFreqInput = null;
let filterQInput = null;
let filterGainInput = null;
let eqBands = typeof extraEQBands !== "undefined" ? extraEQBands : 0;
let eqFiltersUserHasEdited = false;
let eqFilterSelectedRow = null;
let eq2chConstraintToggle = null;
let eq2chBankTabsEl = null;
let eq2chBankData = { both: [], L: [], R: [] };
let eq2chActiveBank = "both";
const EQ_2CH_BANK_SWAP_ANIM_MS = 300;
const EQ_2CH_BANK_SWAP_APPLY_AT_MS = 95;
let eq2chBankSwapSeq = 0;
let eq2chBankSwapApplyTimer = null;
let eq2chBankSwapCleanupTimer = null;
let eq2chBankSwapAnimEndFn = null;
let eqApplyListener = () => {
    if (typeof applyEQ === "function") {
        applyEQ();
    }
};
let eqChangeListener = () => {
    if (typeof applyEQ === "function") {
        applyEQ();
    }
};

function parseEqConstraintGraphicFreqList(raw) {
    if (raw == null || typeof raw !== "string") {
        return [];
    }
    let s = raw.trim();
    if (s === "") {
        return [];
    }
    while (/(?:,|，)\s*$/.test(s)) {
        s = s.replace(/(?:,|，)\s*$/, "").trim();
    }
    if (s === "") {
        return [];
    }
    let parts = s.split(/(?:,|，)\s+/);
    let out = [];
    let seen = new Set();
    for (let p of parts) {
        let t = p.trim();
        if (t === "") {
            continue;
        }
        if (/[,，]/.test(t)) {
            continue;
        }
        let v = Math.round(parseFloat(t));
        if (!Number.isFinite(v) || v < 20 || v > 20000) {
            continue;
        }
        if (!seen.has(v)) {
            seen.add(v);
            out.push(v);
        }
    }
    out.sort((a, b) => a - b);
    return out;
}

function isEqConstraintGraphicModeActive() {
    let row = document.querySelector("div.extra-eq .eq-constraint-freq-row");
    let uiGraphic = !!(row && row.classList.contains("eq-constraint-freq-row-graphic"));
    let bands = Equalizer.config.EqGraphicBandFreqHz;
    return uiGraphic && Array.isArray(bands) && bands.length >= 2;
}

function applyEqGraphicModeAuxUiAndBands() {}

function applyEqConstraintFreqRowUiMode() {
    let row = document.querySelector("div.extra-eq .eq-constraint-freq-row");
    let par = document.querySelector("div.extra-eq .eq-constraint-freq-parametric-cells");
    let gf = document.querySelector("div.extra-eq .eq-constraint-freq-graphic-full");
    let gIn = document.querySelector("div.extra-eq input[name='eq-constraint-freq-graphic-list']");
    if (!row || !par || !gf || !gIn) {
        return;
    }
    let bands = Equalizer.config.EqGraphicBandFreqHz;
    let graphic = Array.isArray(bands) && bands.length >= 2;
    row.classList.toggle("eq-constraint-freq-row-graphic", graphic);
    par.hidden = graphic;
    gf.hidden = !graphic;
    if (graphic) {
        gIn.value = bands.join(", ");
    }
    applyEqGraphicModeAuxUiAndBands();
}

function clearEqConstraintGraphicFreqMode() {
    Equalizer.config.EqGraphicBandFreqHz = null;
    let g = document.querySelector("div.extra-eq input[name='eq-constraint-freq-graphic-list']");
    if (g) {
        g.value = "";
    }
    applyEqConstraintFreqRowUiMode();
}

function tryEnterEqConstraintGraphicFreqModeFromTyping() {
    let row = document.querySelector("div.extra-eq .eq-constraint-freq-row");
    let minEl = document.querySelector("div.extra-eq input[name='eq-constraint-freq-min']");
    let maxEl = document.querySelector("div.extra-eq input[name='eq-constraint-freq-max']");
    if (!row || !minEl || !maxEl || row.classList.contains("eq-constraint-freq-row-graphic")) {
        return false;
    }
    let uVal = (s) => {
        let t = (s || "").trim();
        return t === "" || t === "0";
    };
    let minRaw = (minEl.value || "").trim();
    let maxRaw = (maxEl.value || "").trim();
    let hasGraphicCommaSpace = (s) => /(?:,|，)\s/.test(s);
    let minHasSep = hasGraphicCommaSpace(minRaw);
    let maxHasSep = hasGraphicCommaSpace(maxRaw);
    let rawPrefer = "";
    if (minHasSep) {
        if (!uVal(maxEl.value)) {
            return false;
        }
        rawPrefer = minEl.value;
    } else if (maxHasSep) {
        if (!uVal(minEl.value)) {
            return false;
        }
        rawPrefer = maxEl.value;
    } else {
        return false;
    }
    if (!rawPrefer) {
        return false;
    }
    let list = parseEqConstraintGraphicFreqList(rawPrefer);
    if (list.length < 2) {
        return false;
    }
    Equalizer.config.EqGraphicBandFreqHz = list.slice();
    Equalizer.config.AutoEQRange = [list[0], list[list.length - 1]];
    minEl.value = "0";
    maxEl.value = "0";
    applyEqConstraintFreqRowUiMode();
    requestAnimationFrame(() => {
        let gInAfter = document.querySelector("div.extra-eq input[name='eq-constraint-freq-graphic-list']");
        if (gInAfter) {
            gInAfter.focus();
            let n = gInAfter.value.length;
            gInAfter.setSelectionRange(n, n);
        }
    });
    return true;
}

function snapEqFilterFreqToGraphicBands(hz) {
    let bands = Equalizer.config.EqGraphicBandFreqHz;
    if (!bands || bands.length < 2 || !hz || hz <= 0) {
        return hz;
    }
    let best = bands[0];
    let bestScore = Infinity;
    for (let b of bands) {
        let s = Math.abs(Math.log(hz / b));
        if (s < bestScore) {
            bestScore = s;
            best = b;
        }
    }
    return best;
}

function getEqConstraintFreqLoHi() {
    let lo = Equalizer.config.AutoEQRange[0];
    let hi = Equalizer.config.AutoEQRange[1];
    if (!Number.isFinite(lo)) {
        lo = 20;
    }
    if (!Number.isFinite(hi)) {
        hi = 20000;
    }
    lo = Math.min(20000, Math.max(20, lo));
    hi = Math.min(20000, Math.max(20, hi));
    if (lo > hi) {
        let t = lo;
        lo = hi;
        hi = t;
    }
    return [lo, hi];
}

function getEqConstraintQLoHi() {
    let lo = Equalizer.config.OptimizeQRange[0];
    let hi = Equalizer.config.OptimizeQRange[1];
    if (!Number.isFinite(lo)) {
        lo = 0.1;
    }
    if (!Number.isFinite(hi)) {
        hi = 10;
    }
    lo = Math.min(10, Math.max(0.1, lo));
    hi = Math.min(10, Math.max(0.1, hi));
    if (lo > hi) {
        let t = lo;
        lo = hi;
        hi = t;
    }
    return [lo, hi];
}

function getEqConstraintGainLoHi() {
    let lo = Equalizer.config.OptimizeGainRange[0];
    let hi = Equalizer.config.OptimizeGainRange[1];
    if (!Number.isFinite(lo)) {
        lo = -40;
    }
    if (!Number.isFinite(hi)) {
        hi = 40;
    }
    lo = Math.min(40, Math.max(-40, lo));
    hi = Math.min(40, Math.max(-40, hi));
    if (lo > hi) {
        let t = lo;
        lo = hi;
        hi = t;
    }
    return [lo, hi];
}

function eqConstraintNumericInputIncomplete(raw) {
    if (raw == null) {
        return false;
    }
    let s = String(raw);
    if (/[eE]$/.test(s) || /\.$/.test(s)) {
        return true;
    }
    let t = s.trim();
    return t === "-" || t === "+" || t === "-." || t === ".";
}

function getEffectiveEqMaxBands() {
    let n = Math.floor(Number(Equalizer.config.EqMaxBands));
    if (!Number.isFinite(n) || n <= 0) {
        return extraEQBandsMax;
    }
    return Math.min(Math.max(1, n), extraEQBandsMax);
}

function firstAllowedEqFilterType() {
    let a = Equalizer.config.EqAllowedTypes || {};
    if (a.PK) return "PK";
    if (a.LSQ) return "LSQ";
    if (a.HSQ) return "HSQ";
    return "PK";
}

function refreshEqFilterInactiveStateForMaxBands() {
    if (!filtersContainer) {
        return;
    }
    let maxA = getEffectiveEqMaxBands();
    filtersContainer.querySelectorAll("div.filter").forEach((row, i) => {
        let inactive = i >= maxA;
        row.classList.toggle("eq-filter-row-inactive", inactive);
        row.querySelectorAll("input, select").forEach((el) => {
            el.disabled = inactive;
        });
    });
}

function applyEqConstraintAttributesToFilterInputs() {
    if (!filterFreqInput || !filterFreqInput.length) {
        return;
    }
    let [fLo, fHi] = getEqConstraintFreqLoHi();
    let [qLo, qHi] = getEqConstraintQLoHi();
    let [gLo, gHi] = getEqConstraintGainLoHi();
    let allowed = Equalizer.config.EqAllowedTypes || { PK: true, LSQ: true, HSQ: true };
    for (let i = 0; i < eqBands; i++) {
        let fi = filterFreqInput[i];
        let qi = filterQInput[i];
        let gi = filterGainInput[i];
        let si = filterTypeSelect[i];
        if (fi) {
            fi.setAttribute("min", String(fLo));
            fi.setAttribute("max", String(fHi));
        }
        if (qi) {
            qi.setAttribute("min", String(qLo));
            qi.setAttribute("max", String(qHi));
        }
        if (gi) {
            gi.setAttribute("min", String(gLo));
            gi.setAttribute("max", String(gHi));
        }
        if (si) {
            si.querySelectorAll("option").forEach((opt) => {
                let v = opt.value;
                let ok = (v === "PK" && allowed.PK) || (v === "LSQ" && allowed.LSQ)
                    || (v === "HSQ" && allowed.HSQ);
                opt.disabled = !ok;
            });
        }
    }
}

const EQ_CONSTRAINT_Q_FINE_MAX = 0.3;

function refreshEqFilterConstraintViolationStyles() {
    if (!filterFreqInput || !filterFreqInput.length) {
        return;
    }
    let [fLo, fHi] = getEqConstraintFreqLoHi();
    let [qLo, qHi] = getEqConstraintQLoHi();
    let [gLo, gHi] = getEqConstraintGainLoHi();
    let allowed = Equalizer.config.EqAllowedTypes || { PK: true, LSQ: true, HSQ: true };
    let maxA = getEffectiveEqMaxBands();
    let vClass = "eq-filter-value-constraint-violation";
    for (let i = 0; i < eqBands; i++) {
        let fi = filterFreqInput[i];
        let qi = filterQInput[i];
        let gi = filterGainInput[i];
        let si = filterTypeSelect[i];
        [fi, qi, gi, si].forEach((el) => {
            if (el) {
                el.classList.remove(vClass);
            }
        });
        if (i >= maxA) {
            continue;
        }
        let f = parseInt(fi.value, 10) || 0;
        let q = parseFloat(qi.value) || 0;
        let g = parseFloat(gi.value) || 0;
        let emptyish = f === 0 && q === 0 && g === 0;
        if (!emptyish) {
            let bands = Equalizer.config.EqGraphicBandFreqHz;
            let graphicFreq = Array.isArray(bands) && bands.length >= 2;
            if (f !== 0) {
                if (graphicFreq) {
                    let onBand = bands.some((b) => Math.abs(b - f) < 0.51);
                    if (!onBand) {
                        fi.classList.add(vClass);
                    }
                } else if (f < fLo || f > fHi) {
                    fi.classList.add(vClass);
                }
            }
            let qStrictRange = graphicFreq && eqFiltersUserHasEdited;
            let qBad = qStrictRange ? (q < qLo || q > qHi) : (q !== 0 && (q < qLo || q > qHi));
            if (qBad) {
                qi.classList.add(vClass);
            }
            if ((g !== 0 || f !== 0 || q !== 0) && (g < gLo || g > gHi)) {
                gi.classList.add(vClass);
            }
        }
        let sel = si.value;
        if (!allowed[sel]) {
            si.classList.add(vClass);
        }
    }
}

function updateFilterElements() {
    if (!filtersContainer) {
        return;
    }
    let node = filtersContainer.querySelector("div.filter");
    while (filtersContainer.childElementCount < eqBands) {
        let clone = node.cloneNode(true);
        clone.querySelector("input[name='enabled']").value = "true";
        clone.querySelector("select[name='type']").value = "PK";
        clone.querySelector("input[name='freq']").value = "0";
        clone.querySelector("input[name='q']").value = "0";
        clone.querySelector("input[name='gain']").value = "0";
        filtersContainer.appendChild(clone);
    }
    while (filtersContainer.childElementCount > eqBands) {
        filtersContainer.children[filtersContainer.childElementCount - 1].remove();
    }
    filterEnabledInput = filtersContainer.querySelectorAll("input[name='enabled']");
    filterTypeSelect = filtersContainer.querySelectorAll("select[name='type']");
    filterFreqInput = filtersContainer.querySelectorAll("input[name='freq']");
    filterQInput = filtersContainer.querySelectorAll("input[name='q']");
    filterGainInput = filtersContainer.querySelectorAll("input[name='gain']");
    filtersContainer.querySelectorAll("input,select").forEach((el) => {
        el.removeEventListener("input", eqApplyListener);
        el.removeEventListener("change", eqChangeListener);
        el.addEventListener("input", eqApplyListener);
        el.addEventListener("change", eqChangeListener);
    });
    if (eqFilterSelectedRow !== null
            && eqFilterSelectedRow >= filtersContainer.querySelectorAll("div.filter").length) {
        eqFilterSelectedRow = null;
    }
    if (typeof updateEqFilterRowSelectionStyles === "function") {
        updateEqFilterRowSelectionStyles();
    }
    applyEqConstraintAttributesToFilterInputs();
    refreshEqFilterConstraintViolationStyles();
    refreshEqFilterInactiveStateForMaxBands();
}

function elemToFilters(includeAll) {
    let filters = [];
    let maxA = getEffectiveEqMaxBands();
    for (let i = 0; i < eqBands; ++i) {
        if (!includeAll && i >= maxA) {
            continue;
        }
        let disabled = !filterEnabledInput[i].checked;
        let type = filterTypeSelect[i].value;
        let freq = parseInt(filterFreqInput[i].value) || 0;
        let q = parseFloat(filterQInput[i].value) || 0;
        let gain = parseFloat(filterGainInput[i].value) || 0;
        if (!includeAll && (disabled || !type || !freq || !q)) {
            continue;
        }
        filters.push({ disabled, type, freq, q, gain });
    }
    return filters;
}

function elemToFiltersClampedRowsForEqualizerApply(raw, includeAll) {
    let [fLo, fHi] = getEqConstraintFreqLoHi();
    let [qLo, qHi] = getEqConstraintQLoHi();
    let [gLo, gHi] = getEqConstraintGainLoHi();
    let allowed = Equalizer.config.EqAllowedTypes || { PK: true, LSQ: true, HSQ: true };
    return raw.map((f) => {
        let type = allowed[f.type] ? f.type : firstAllowedEqFilterType();
        let freq = f.freq ? Math.min(fHi, Math.max(fLo, f.freq)) : 0;
        if (freq) {
            freq = snapEqFilterFreqToGraphicBands(freq);
        }
        let q = f.q ? (() => {
            let qc = Math.min(qHi, Math.max(qLo, f.q));
            return qc <= EQ_CONSTRAINT_Q_FINE_MAX + 1e-9
                ? Math.round(qc * 100) / 100
                : Math.round(qc * 10) / 10;
        })() : 0;
        let gain = (f.gain !== 0 || f.freq || f.q)
            ? Math.round(Math.min(gHi, Math.max(gLo, f.gain)) * 10) / 10
            : 0;
        return { ...f, type, freq, q, gain };
    });
}

function elemToFiltersClampedForEqualizerApply(includeAll) {
    return elemToFiltersClampedRowsForEqualizerApply(elemToFilters(includeAll), includeAll);
}

function elemToFiltersBoundedRowsForExport(raw, includeAll) {
    let [fLo, fHi] = getEqConstraintFreqLoHi();
    let [qLo, qHi] = getEqConstraintQLoHi();
    let [gLo, gHi] = getEqConstraintGainLoHi();
    let allowed = Equalizer.config.EqAllowedTypes || { PK: true, LSQ: true, HSQ: true };
    return raw.map((f) => {
        let type = allowed[f.type] ? f.type : firstAllowedEqFilterType();
        let freq = f.freq ? Math.min(fHi, Math.max(fLo, f.freq)) : 0;
        if (freq) {
            freq = snapEqFilterFreqToGraphicBands(freq);
        }
        let q = f.q ? Math.min(qHi, Math.max(qLo, f.q)) : 0;
        let gain = (f.gain !== 0 || f.freq || f.q)
            ? Math.min(gHi, Math.max(gLo, f.gain))
            : 0;
        return { ...f, type, freq, q, gain };
    });
}

function elemToFiltersBoundedForExport(includeAll) {
    return elemToFiltersBoundedRowsForExport(elemToFilters(includeAll), includeAll);
}

function filtersToElem(filters) {
    let filtersCopy = filters.map(f => f);
    while (filtersCopy.length < eqBands) {
        filtersCopy.push({ type: "PK", freq: 0, q: 0, gain: 0 });
    }
    if (filtersCopy.length > eqBands) {
        eqBands = Math.min(filtersCopy.length, extraEQBandsMax);
        filtersCopy = filtersCopy.slice(0, eqBands);
        updateFilterElements();
    }
    filtersCopy.forEach((f, i) => {
        filterEnabledInput[i].checked = !f.disabled;
        filterTypeSelect[i].value = f.type;
        filterFreqInput[i].value = f.freq;
        filterQInput[i].value = f.q;
        filterGainInput[i].value = f.gain;
    });
    eqFiltersUserHasEdited = true;
    applyEqConstraintAttributesToFilterInputs();
    refreshEqFilterConstraintViolationStyles();
    refreshEqFilterInactiveStateForMaxBands();
    if (isEqTwoChannelSupportEnabled()) {
        eq2chBankData[eq2chActiveBank] = filtersCopy.map((f) => ({
            disabled: !!f.disabled,
            type: f.type,
            freq: f.freq,
            q: f.q,
            gain: f.gain
        }));
    }
}

function isEqTwoChannelSupportEnabled() {
    return !!(eq2chConstraintToggle && eq2chConstraintToggle.checked);
}

function eq2chDefaultEmptyRow() {
    return { disabled: false, type: "PK", freq: 0, q: 0, gain: 0 };
}

function eq2chPadBankToEqBands(arr) {
    let filtersCopy = (arr || []).map((f) => ({ ...f }));
    while (filtersCopy.length < eqBands) {
        filtersCopy.push(eq2chDefaultEmptyRow());
    }
    if (filtersCopy.length > eqBands) {
        filtersCopy.length = eqBands;
    }
    return filtersCopy;
}

function eq2chFlushDomToActiveBankCore() {
    eq2chBankData[eq2chActiveBank] = elemToFilters(true).map((f) => ({
        disabled: !!f.disabled,
        type: f.type,
        freq: f.freq,
        q: f.q,
        gain: f.gain
    }));
}

function eq2chFlushDomToActiveBank() {
    if (!isEqTwoChannelSupportEnabled()) {
        return;
    }
    eq2chFlushDomToActiveBankCore();
}

function eq2chRowsToApplySpecs(rows) {
    let clamped = elemToFiltersClampedRowsForEqualizerApply(eq2chPadBankToEqBands(rows), true);
    return clamped.filter((f) => !f.disabled && f.type && f.freq && f.q)
        .map((f) => ({ type: f.type, freq: f.freq, q: f.q, gain: f.gain }));
}

function eq2chMergedSpecsForChannelIndex(chIdx) {
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
}

function eq2chSharedMeasurementBaseRaw(phoneObj) {
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
}

function eq2chGraphPreviewChannelIndex() {
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
}

function eq2chSyncBankTabStyles() {
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
}

function clearEq2chBankSwapAnimation() {
    if (eq2chBankSwapApplyTimer !== null) {
        clearTimeout(eq2chBankSwapApplyTimer);
        eq2chBankSwapApplyTimer = null;
    }
    if (eq2chBankSwapCleanupTimer !== null) {
        clearTimeout(eq2chBankSwapCleanupTimer);
        eq2chBankSwapCleanupTimer = null;
    }
    if (filtersContainer && eq2chBankSwapAnimEndFn) {
        filtersContainer.removeEventListener("animationend", eq2chBankSwapAnimEndFn);
        eq2chBankSwapAnimEndFn = null;
    }
    if (filtersContainer) {
        filtersContainer.classList.remove("eq-2ch-bank-filters-swap-anim");
    }
}

function eq2chSwitchBank(next) {
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
        finishBankSwitch();
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
        filtersContainer.classList.remove(animClass);
    }, EQ_2CH_BANK_SWAP_ANIM_MS + 50);
}

function eq2chInitBanksFromCurrentDom() {
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
}

function eq2chSetTabsVisibility(show) {
    if (eq2chBankTabsEl) {
        eq2chBankTabsEl.hidden = !show;
        if (show) {
            eq2chSyncBankTabStyles();
        }
    }
}

function eq2chOnConstraintToggleChange() {
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
    applyEqConstraintAttributesToFilterInputs();
    refreshEqFilterConstraintViolationStyles();
    refreshEqFilterInactiveStateForMaxBands();
}

function eq2chResetAllBanksToDefaultRow() {
    eq2chBankData.both = [eq2chDefaultEmptyRow()];
    eq2chBankData.L = [eq2chDefaultEmptyRow()];
    eq2chBankData.R = [eq2chDefaultEmptyRow()];
    eq2chActiveBank = "both";
    eq2chSetTabsVisibility(isEqTwoChannelSupportEnabled());
    eq2chSyncBankTabStyles();
}

function initEqConstraints() {
    filtersContainer = document.querySelector("div.extra-eq > div.filters");
    fileFiltersImport = document.querySelector("#file-filters-import");
    eq2chConstraintToggle = document.querySelector("input.eq-constraint-2ch-toggle");
    eq2chBankTabsEl = document.getElementById("eq-2ch-bank-tabs");
    if (filtersContainer) {
        filtersContainer.addEventListener("input", (e) => {
            let t = e.target;
            if (t && t.closest && filtersContainer.contains(t) && t.closest("div.filter")) {
                eqFiltersUserHasEdited = true;
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
    if (eq2chConstraintToggle) {
        eq2chConstraintToggle.addEventListener("change", eq2chOnConstraintToggleChange);
    }
    document.addEventListener("keydown", (e) => {
        if (!(e.metaKey || e.ctrlKey)) {
            return;
        }
        if (e.code !== "KeyZ" && e.code !== "KeyY") {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        if (!eqHistoryShortcutTargetOk(e.target)) {
            return;
        }
        if (e.code === "KeyY") {
            e.preventDefault();
            e.stopPropagation();
            eqHistoryRedo();
            return;
        }
        if (e.code === "KeyZ" && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            eqHistoryRedo();
            return;
        }
        if (e.code === "KeyZ" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            eqHistoryUndo();
        }
    }, true);
    updateFilterElements();
    applyEqConstraintFreqRowUiMode();
    if (isEqConstraintGraphicModeActive()) {
        eq2chSetTabsVisibility(true);
    }
}

// ============================================================
// === src/extra/eq/history.js ===
// ============================================================
/* EQ undo/redo history and change log helpers.
 * Classic script so the page keeps ordered loading and no module machinery. */
let eqHistoryChain = [];
let eqHistoryHead = -1;
let eqHistoryRestoring = false;
let eqHistoryDebounceTimer = null;
let eqHistoryGapWaitTimer = null;
let eqHistoryLastCommitAt = 0;
let eqHistoryTimeTicker = null;
let eqHistoryListClickBound = false;
let eqPinnedSnapshotBody = null;
let eqHistoryPendingPreEditSnap = null;
let eqHistoryInitBaselineSnap = null;
const EQ_HISTORY_CAP = 100;
const EQ_HISTORY_DEBOUNCE_MS = 500;
const EQ_HISTORY_MIN_GAP_MS = 1000;
let eqHistoryLastApplyTypeEnableSig = null;

function eqHistoryDebugLog(...a) {
    if (typeof window !== "undefined" && window.__EQ_HISTORY_DEBUG) {
        console.log("[EQ hist]", ...a);
    }
}

function eqHistoryCaptureTypeEnableSigFromDom() {
    if (!filterTypeSelect || !filterTypeSelect.length || !filterEnabledInput || !filterEnabledInput.length) {
        return null;
    }
    let parts = [];
    for (let i = 0; i < eqBands; i++) {
        let cb = filterEnabledInput[i];
        let sel = filterTypeSelect[i];
        if (!cb || !sel) {
            parts.push("?:?");
            continue;
        }
        parts.push((cb.checked ? 1 : 0) + ":" + String(sel.value || ""));
    }
    return parts.join("|");
}

function eqHistoryEmptyRow() {
    return { disabled: false, type: "PK", freq: 0, q: 0, gain: 0 };
}

function eqHistoryCloneRow(r) {
    return {
        disabled: !!r.disabled,
        type: r.type,
        freq: +r.freq || 0,
        q: +r.q || 0,
        gain: +r.gain || 0
    };
}

function eqHistoryCloneBank(arr) {
    return (arr || []).map(eqHistoryCloneRow);
}

function eqHistoryTakeSnapshot(meta) {
    eq2chFlushDomToActiveBank();
    let rows = elemToFilters(true).map(eqHistoryCloneRow);
    let banks = isEqTwoChannelSupportEnabled() ? {
        both: eqHistoryCloneBank(eq2chBankData.both),
        L: eqHistoryCloneBank(eq2chBankData.L),
        R: eqHistoryCloneBank(eq2chBankData.R)
    } : null;
    let out = {
        bandCount: eqBands,
        twoCh: isEqTwoChannelSupportEnabled(),
        activeBank: eq2chActiveBank,
        banks,
        rows,
        savedAt: Date.now()
    };
    if (meta && meta.historyEntry && meta.historyEntry.kind) {
        out.historyEntry = { kind: String(meta.historyEntry.kind) };
        if (meta.historyEntry.removeFreq != null && Number.isFinite(+meta.historyEntry.removeFreq)) {
            out.historyEntry.removeFreq = +meta.historyEntry.removeFreq;
        }
    }
    return out;
}

function eqHistoryRowEqual(a, b) {
    return !!a && !!b
        && !!a.disabled === !!b.disabled
        && a.type === b.type
        && (+a.freq || 0) === (+b.freq || 0)
        && Math.abs((+a.q || 0) - (+b.q || 0)) < 1e-6
        && Math.abs((+a.gain || 0) - (+b.gain || 0)) < 1e-6;
}

function eqHistoryRowsEqualArr(ra, rb) {
    let n = Math.max(ra.length, rb.length);
    for (let i = 0; i < n; i++) {
        let a = ra[i] || eqHistoryEmptyRow();
        let b = rb[i] || eqHistoryEmptyRow();
        if (!eqHistoryRowEqual(a, b)) {
            return false;
        }
    }
    return true;
}

function eqHistoryEntryKey(s) {
    if (!s || !s.historyEntry || !s.historyEntry.kind) {
        return "";
    }
    return String(s.historyEntry.kind);
}

function eqHistorySnapDataEqual(a, b) {
    if (!a || !b) {
        return false;
    }
    if (eqHistoryEntryKey(a) !== eqHistoryEntryKey(b)) {
        return false;
    }
    if (a.bandCount !== b.bandCount || !!a.twoCh !== !!b.twoCh) {
        return false;
    }
    if (a.activeBank !== b.activeBank) {
        return false;
    }
    if (a.twoCh && b.twoCh && a.banks && b.banks) {
        return ["both", "L", "R"].every((k) =>
            eqHistoryRowsEqualArr(a.banks[k] || [], b.banks[k] || []));
    }
    return eqHistoryRowsEqualArr(a.rows || [], b.rows || []);
}

function eqHistorySnapshotBodyEqual(a, b) {
    if (!a || !b) {
        return false;
    }
    if (a.bandCount !== b.bandCount || !!a.twoCh !== !!b.twoCh) {
        return false;
    }
    if (a.activeBank !== b.activeBank) {
        return false;
    }
    if (a.twoCh && b.twoCh && a.banks && b.banks) {
        return ["both", "L", "R"].every((k) =>
            eqHistoryRowsEqualArr(a.banks[k] || [], b.banks[k] || []));
    }
    return eqHistoryRowsEqualArr(a.rows || [], b.rows || []);
}

function eqHistoryCloneSnapshotBody(snap) {
    if (!snap) {
        return null;
    }
    return {
        bandCount: snap.bandCount,
        twoCh: !!snap.twoCh,
        activeBank: snap.activeBank,
        rows: eqHistoryCloneBank(snap.rows || []),
        banks: snap.banks ? {
            both: eqHistoryCloneBank(snap.banks.both || []),
            L: eqHistoryCloneBank(snap.banks.L || []),
            R: eqHistoryCloneBank(snap.banks.R || [])
        } : null
    };
}

function eqHistoryRowEmpty(r) {
    let x = r || eqHistoryEmptyRow();
    return !(+x.freq || 0) && !(+x.q || 0) && !(+x.gain || 0);
}

function eqHistoryPadSnapRows(snap, minLen) {
    let rows = (snap.rows || []).map(eqHistoryCloneRow);
    let n = Math.max(minLen || 0, snap.bandCount || 0, rows.length);
    let out = [];
    for (let i = 0; i < n; i++) {
        out.push(rows[i] ? eqHistoryCloneRow(rows[i]) : eqHistoryEmptyRow());
    }
    return out;
}

function eqHistoryFormatHz(hz) {
    let n = Math.round(+hz || 0);
    if (!n) {
        return "—";
    }
    return `${n}Hz`;
}

function eqHistoryFormatGain(g) {
    let v = Math.round((+g || 0) * 10) / 10;
    return `${v}dB`;
}

function eqHistoryFormatQ(q) {
    let v = Math.round((+q || 0) * 100) / 100;
    return `${v} Q`;
}

function eqHistoryDescribeTransition(prev, next) {
    if (!next) {
        return { iconKind: "plus", startFreq: "—", middle: "" };
    }
    if (next.historyEntry && next.historyEntry.kind === "reset") {
        return { iconKind: "reset", startFreq: "Reset", middle: "" };
    }
    if (next.historyEntry && next.historyEntry.kind === "autoeq") {
        return { iconKind: "autoeq", startFreq: "Auto", middle: "" };
    }
    if (next.historyEntry && next.historyEntry.kind === "removeBand") {
        let rf = next.historyEntry.removeFreq;
        return { iconKind: "delete", startFreq: eqHistoryFormatHz(rf), middle: "" };
    }
    if (!prev) {
        let rows = eqHistoryPadSnapRows(next, next.bandCount || 0);
        let firstHz = 0;
        for (let i = 0; i < rows.length; i++) {
            if (+rows[i].freq > 0) {
                firstHz = +rows[i].freq;
                break;
            }
        }
        return { iconKind: "plus", startFreq: eqHistoryFormatHz(firstHz), middle: "" };
    }
    let n = Math.max(prev.bandCount || 0, next.bandCount || 0, (prev.rows || []).length, (next.rows || []).length);
    let pr = eqHistoryPadSnapRows(prev, n);
    let nx = eqHistoryPadSnapRows(next, n);
    let pick = null;
    for (let i = 0; i < n; i++) {
        let a = pr[i];
        let b = nx[i];
        let aE = eqHistoryRowEmpty(a);
        let bE = eqHistoryRowEmpty(b);
        if (aE && bE) {
            if (eqHistoryRowEqual(a, b)) {
                continue;
            }
            pick = { kind: "change", i, a, b };
            break;
        }
        if (aE && !bE) {
            pick = { kind: "create", i, a, b };
            break;
        }
        if (!aE && bE) {
            pick = { kind: "delete", i, a, b };
            break;
        }
        if (!eqHistoryRowEqual(a, b)) {
            pick = { kind: "change", i, a, b };
            break;
        }
    }
    if (!pick) {
        return { iconKind: "change", startFreq: "—", middle: "" };
    }
    if (pick.kind === "create") {
        return { iconKind: "plus", startFreq: eqHistoryFormatHz(pick.b.freq), middle: "" };
    }
    if (pick.kind === "delete") {
        return { iconKind: "delete", startFreq: eqHistoryFormatHz(pick.a.freq), middle: "" };
    }
    let a = pick.a;
    let b = pick.b;
    let middle = "";
    if (a.type !== b.type) {
        middle = String(b.type || "");
    } else if ((+a.freq || 0) !== (+b.freq || 0)) {
        middle = eqHistoryFormatHz(b.freq);
    } else if (Math.abs((+a.gain || 0) - (+b.gain || 0)) > 1e-6) {
        middle = eqHistoryFormatGain(b.gain);
    } else if (Math.abs((+a.q || 0) - (+b.q || 0)) > 1e-6) {
        middle = eqHistoryFormatQ(b.q);
    } else if (!!a.disabled !== !!b.disabled) {
        middle = b.disabled ? "Off" : "On";
    }
    return { iconKind: "change", startFreq: eqHistoryFormatHz(a.freq), middle };
}

function eqHistorySvgChange() {
    return (
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"extra-eq-change-history-svg extra-eq-change-history-svg-stroke\" aria-hidden=\"true\">"
        + "<path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\" />"
        + "<path d=\"M5 12h.5m3 0h1.5m3 0h6\" />"
        + "<path d=\"M15 16l4 -4\" />"
        + "<path d=\"M15 8l4 4\" />"
        + "</svg>"
    );
}

function eqHistorySvgReset() {
    return (
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"extra-eq-change-history-svg extra-eq-change-history-svg-stroke\" aria-hidden=\"true\">"
        + "<path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\" />"
        + "<path d=\"M9 14l-4 -4l4 -4\" />"
        + "<path d=\"M5 10h11a4 4 0 1 1 0 8h-1\" />"
        + "</svg>"
    );
}

function eqHistorySvgAutoEq() {
    return (
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"currentColor\" class=\"extra-eq-change-history-svg\" aria-hidden=\"true\">"
        + "<path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\" />"
        + "<path d=\"M16 19a1 1 0 0 1 0 -2a1 1 0 0 0 1 -1c0 -1.333 2 -1.333 2 0a1 1 0 0 0 1 1c1.333 0 1.333 2 0 2a1 1 0 0 0 -1 1c0 1.333 -2 1.333 -2 0a1 1 0 0 0 -1 -1\" />"
        + "<path d=\"M3 11a5 5 0 0 0 5 -5c0 -1.333 2 -1.333 2 0a5 5 0 0 0 5 5c1.333 0 1.333 2 0 2a5 5 0 0 0 -5 5a1 1 0 0 1 -2 0a5 5 0 0 0 -5 -5c-1.333 0 -1.333 -2 0 -2\" />"
        + "<path d=\"M16 7a1 1 0 0 1 0 -2a1 1 0 0 0 1 -1c0 -1.333 2 -1.333 2 0a1 1 0 0 0 1 1c1.333 0 1.333 2 0 2a1 1 0 0 0 -1 1c0 1.333 -2 1.333 -2 0a1 1 0 0 0 -1 -1\" />"
        + "</svg>"
    );
}

function eqHistoryRowIconHtml(iconKind) {
    if (iconKind === "plus") {
        return "<span class=\"extra-eq-change-history-icon-plus-mask\" aria-hidden=\"true\"></span>";
    }
    if (iconKind === "delete") {
        return "<span class=\"extra-eq-change-history-icon-plus-mask extra-eq-change-history-icon-plus-mask--rot45\" aria-hidden=\"true\"></span>";
    }
    if (iconKind === "reset") {
        return eqHistorySvgReset();
    }
    if (iconKind === "autoeq") {
        return eqHistorySvgAutoEq();
    }
    return eqHistorySvgChange();
}

function eqHistoryClearTimers() {
    if (eqHistoryDebounceTimer !== null) {
        clearTimeout(eqHistoryDebounceTimer);
        eqHistoryDebounceTimer = null;
    }
    if (eqHistoryGapWaitTimer !== null) {
        clearTimeout(eqHistoryGapWaitTimer);
        eqHistoryGapWaitTimer = null;
    }
}

function eqHistoryTrimToCap() {
    while (eqHistoryChain.length > EQ_HISTORY_CAP) {
        eqHistoryChain.shift();
        eqHistoryHead = Math.max(0, eqHistoryHead - 1);
    }
}

function eqHistoryFormatCompactAge(ts) {
    let sec = (Date.now() - ts) / 1000;
    if (!Number.isFinite(sec) || sec < 0) {
        return "—";
    }
    if (sec < 60) {
        return `${Math.max(0, Math.round(sec))}s`;
    }
    let min = sec / 60;
    if (min < 60) {
        return `${Math.round(min)}m`;
    }
    let hr = sec / 3600;
    if (hr < 24) {
        return `${Math.round(hr)}h`;
    }
    return `${Math.round(sec / 86400)}d`;
}

function eqHistoryRefreshTimeLabels() {
    let list = document.getElementById("extra-eq-change-history-list");
    if (!list) {
        return;
    }
    list.querySelectorAll("[data-eq-history-at]").forEach((el) => {
        let ts = Number(el.getAttribute("data-eq-history-at"));
        el.textContent = eqHistoryFormatCompactAge(ts);
    });
}

function eqHistoryMaybeStartTicker() {
    if (!extraEQEnabled || eqHistoryTimeTicker !== null) {
        return;
    }
    eqHistoryTimeTicker = setInterval(() => {
        if (!extraEQEnabled) {
            clearInterval(eqHistoryTimeTicker);
            eqHistoryTimeTicker = null;
            return;
        }
        eqHistoryRefreshTimeLabels();
    }, 1000);
}

function eqHistoryBindListOnce() {
    let list = document.getElementById("extra-eq-change-history-list");
    if (!list || eqHistoryListClickBound) {
        return;
    }
    eqHistoryListClickBound = true;
    list.addEventListener("click", (e) => {
        let row = e.target && e.target.closest && e.target.closest("[data-eq-history-idx]");
        if (!row || !list.contains(row)) {
            return;
        }
        let ix = parseInt(row.getAttribute("data-eq-history-idx"), 10);
        if (!Number.isFinite(ix) || ix < 0 || ix >= eqHistoryChain.length) {
            return;
        }
        if (e.target.closest(".extra-eq-change-history-col-pin")) {
            let body = eqHistoryCloneSnapshotBody(eqHistoryChain[ix]);
            if (eqPinnedSnapshotBody && eqHistorySnapshotBodyEqual(eqPinnedSnapshotBody, body)) {
                eqPinnedSnapshotBody = null;
            } else {
                eqPinnedSnapshotBody = body;
            }
            eqHistoryRenderLog();
            updateEqFilterMarkers();
            scheduleLiveEqSync();
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        eqHistoryHead = ix;
        eqHistoryRestore(eqHistoryChain[ix]);
    }, true);
}

function eqHistoryRenderLog() {
    let list = document.getElementById("extra-eq-change-history-list");
    if (!list || !extraEQEnabled) {
        return;
    }
    eqHistoryBindListOnce();
    eqHistoryMaybeStartTicker();
    list.replaceChildren();
    if (!eqHistoryChain.length) {
        let empty = document.createElement("div");
        empty.className = "extra-eq-change-history-empty";
        empty.textContent = "Edits will appear here after you change the EQ.";
        list.appendChild(empty);
        return;
    }
    for (let i = eqHistoryChain.length - 1; i >= 0; i--) {
        let snap = eqHistoryChain[i];
        let prevSnap = i > 0 ? eqHistoryChain[i - 1] : null;
        let desc = i === 0 ? eqHistoryDescribeTransition(null, snap) : eqHistoryDescribeTransition(prevSnap, snap);
        let row = document.createElement("button");
        row.type = "button";
        let stateClass = i === eqHistoryHead ? "extra-eq-change-history-row--current"
            : (i < eqHistoryHead ? "extra-eq-change-history-row--past"
                : "extra-eq-change-history-row--future");
        row.className = "extra-eq-change-history-row " + stateClass;
        let pinBody = eqHistoryCloneSnapshotBody(snap);
        let isCurrent = i === eqHistoryHead;
        let rowPinned = !!(eqPinnedSnapshotBody && eqHistorySnapshotBodyEqual(eqPinnedSnapshotBody, pinBody));
        if (rowPinned) {
            row.className += " extra-eq-change-history-row--pinned";
        }
        let showPinSlot = isCurrent || rowPinned;
        row.setAttribute("data-eq-history-idx", String(i));
        row.setAttribute("role", "listitem");
        let pinCol = document.createElement("span");
        pinCol.className = "extra-eq-change-history-col";
        if (showPinSlot) {
            pinCol.className += " extra-eq-change-history-col-pin";
            if (rowPinned) {
                pinCol.innerHTML = "<span class=\"extra-eq-change-history-pin-ab extra-eq-change-history-pin-ab--filled\" aria-hidden=\"true\"><span class=\"extra-eq-change-history-pin-ab-letter\">A</span></span>";
                pinCol.title = "Unpin";
            } else {
                pinCol.innerHTML = "<span class=\"extra-eq-change-history-pin-ab extra-eq-change-history-pin-ab--outline\" aria-hidden=\"true\"><span class=\"extra-eq-change-history-pin-ab-letter\">A</span></span>";
                pinCol.title = "Pin this state (unequalized trace shows this EQ)";
            }
        } else {
            pinCol.className += " extra-eq-change-history-col-pin-reserved";
            pinCol.setAttribute("aria-hidden", "true");
        }
        let freqEl = document.createElement("span");
        freqEl.className = "extra-eq-change-history-col extra-eq-change-history-col-freq";
        freqEl.textContent = desc.startFreq;
        let iconWrap = document.createElement("span");
        iconWrap.className = "extra-eq-change-history-col extra-eq-change-history-col-icon";
        iconWrap.innerHTML = eqHistoryRowIconHtml(desc.iconKind);
        let midEl = document.createElement("span");
        midEl.className = "extra-eq-change-history-col extra-eq-change-history-col-delta";
        midEl.textContent = desc.middle || "";
        let timeEl = document.createElement("span");
        timeEl.className = "extra-eq-change-history-col extra-eq-change-history-col-time";
        if (Number.isFinite(snap.savedAt)) {
            timeEl.setAttribute("data-eq-history-at", String(snap.savedAt));
            timeEl.textContent = eqHistoryFormatCompactAge(snap.savedAt);
        } else {
            timeEl.textContent = "—";
        }
        row.appendChild(pinCol);
        row.appendChild(freqEl);
        row.appendChild(iconWrap);
        row.appendChild(midEl);
        row.appendChild(timeEl);
        list.appendChild(row);
    }
}

function eqHistoryRestore(snap) {
    if (!snap || !filtersContainer) {
        return;
    }
    eqHistoryRestoring = true;
    try {
        if (snap.bandCount !== eqBands) {
            eqBands = snap.bandCount;
            updateFilterElements();
        }
        if (isEqTwoChannelSupportEnabled() && snap.banks) {
            eq2chBankData.both = eqHistoryCloneBank(snap.banks.both);
            eq2chBankData.L = eqHistoryCloneBank(snap.banks.L);
            eq2chBankData.R = eqHistoryCloneBank(snap.banks.R);
            let ab = snap.activeBank;
            eq2chActiveBank = (ab === "L" || ab === "R" || ab === "both") ? ab : "both";
            eq2chSyncBankTabStyles();
            filtersToElem(eq2chPadBankToEqBands(eq2chBankData[eq2chActiveBank]));
        } else {
            filtersToElem(eq2chPadBankToEqBands(snap.rows));
        }
        cancelDeferredApplyEQ();
        applyEQExec();
        scheduleLiveEqSync();
        applyParametricEqGraphTraceFocus();
        updateEqTraceOpacity();
        updateEqFilterMarkers();
        refreshEqFilterConstraintViolationStyles();
        refreshEqFilterInactiveStateForMaxBands();
    } finally {
        eqHistoryRestoring = false;
    }
    eqHistoryRenderLog();
}

function eqHistoryPushSnapshot(snap, opts) {
    opts = opts || {};
    eqHistoryDebugLog("pushSnapshot enter", {
        extraEQEnabled,
        eqHistoryRestoring,
        chainLen: eqHistoryChain.length,
        head: eqHistoryHead,
        opts: { fromDebounced: !!opts.fromDebounced, bypassSnapEqual: !!opts.bypassSnapEqual }
    });
    if (!extraEQEnabled || eqHistoryRestoring) {
        eqHistoryDebugLog("pushSnapshot skip: !extraEQEnabled || eqHistoryRestoring");
        return;
    }
    if (eqHistoryPendingPreEditSnap) {
        eqHistoryChain.push(eqHistoryPendingPreEditSnap);
        eqHistoryHead = 0;
        eqHistoryPendingPreEditSnap = null;
        eqHistoryLastCommitAt = 0;
    }
    if (!eqHistoryChain.length) {
        if (opts.fromDebounced && eqHistoryInitBaselineSnap != null) {
            if (eqHistorySnapDataEqual(snap, eqHistoryInitBaselineSnap)) {
                eqHistoryDebugLog("pushSnapshot skip: empty chain, snap equals init baseline");
                return;
            }
            eqHistoryPendingPreEditSnap = eqHistoryInitBaselineSnap;
            eqHistoryPushSnapshot(snap, { fromDebounced: false });
            return;
        }
        eqHistoryChain.push(snap);
        eqHistoryHead = 0;
        eqHistoryLastCommitAt = Date.now();
        eqHistoryTrimToCap();
        eqHistoryRenderLog();
        eqHistoryDebugLog("pushSnapshot: first entry on empty chain");
        return;
    }
    if (!opts.bypassSnapEqual && eqHistorySnapDataEqual(snap, eqHistoryChain[eqHistoryHead])) {
        eqHistoryDebugLog("pushSnapshot skip: snap equals head (equality)", {
            headRowsSample: (eqHistoryChain[eqHistoryHead].rows || []).slice(0, 3),
            snapRowsSample: (snap.rows || []).slice(0, 3)
        });
        return;
    }
    eqHistoryChain.splice(eqHistoryHead + 1);
    eqHistoryChain.push(snap);
    eqHistoryHead = eqHistoryChain.length - 1;
    eqHistoryTrimToCap();
    eqHistoryLastCommitAt = Date.now();
    eqHistoryRenderLog();
    eqHistoryDebugLog("pushSnapshot: appended", { newHead: eqHistoryHead, chainLen: eqHistoryChain.length });
}

function eqHistoryCommitTransaction(optBeforeSnap, meta) {
    if (!extraEQEnabled || eqHistoryRestoring) {
        return;
    }
    eqHistoryClearTimers();
    if (optBeforeSnap && !eqHistoryChain.length) {
        eqHistoryChain.push(optBeforeSnap);
        eqHistoryHead = 0;
        eqHistoryLastCommitAt = 0;
    }
    eqHistoryPushSnapshot(eqHistoryTakeSnapshot(meta));
    eqHistoryLastApplyTypeEnableSig = eqHistoryCaptureTypeEnableSigFromDom();
}

function eqHistoryDebouncedFlush() {
    eqHistoryDebounceTimer = null;
    if (!extraEQEnabled || eqHistoryRestoring) {
        return;
    }
    let now = Date.now();
    let since = now - eqHistoryLastCommitAt;
    if (eqHistoryLastCommitAt > 0 && since < EQ_HISTORY_MIN_GAP_MS) {
        if (eqHistoryGapWaitTimer !== null) {
            clearTimeout(eqHistoryGapWaitTimer);
            eqHistoryGapWaitTimer = null;
        }
        eqHistoryGapWaitTimer = setTimeout(() => {
            eqHistoryGapWaitTimer = null;
            eqHistoryDebouncedFlush();
        }, EQ_HISTORY_MIN_GAP_MS - since);
        return;
    }
    let snap = eqHistoryTakeSnapshot();
    eqHistoryPushSnapshot(snap, { fromDebounced: true });
}

function eqHistoryNotifyChange() {
    if (!extraEQEnabled || eqHistoryRestoring || !filtersContainer) {
        return;
    }
    if (eqHistoryGapWaitTimer !== null) {
        clearTimeout(eqHistoryGapWaitTimer);
        eqHistoryGapWaitTimer = null;
    }
    if (eqHistoryDebounceTimer !== null) {
        clearTimeout(eqHistoryDebounceTimer);
    }
    eqHistoryDebounceTimer = setTimeout(eqHistoryDebouncedFlush, EQ_HISTORY_DEBOUNCE_MS);
}

function eqHistoryUndo() {
    if (eqHistoryHead <= 0) {
        return;
    }
    eqHistoryClearTimers();
    eqHistoryHead--;
    eqHistoryRestore(eqHistoryChain[eqHistoryHead]);
}

function eqHistoryRedo() {
    if (eqHistoryHead < 0 || eqHistoryHead >= eqHistoryChain.length - 1) {
        return;
    }
    eqHistoryClearTimers();
    eqHistoryHead++;
    eqHistoryRestore(eqHistoryChain[eqHistoryHead]);
}

function eqHistoryShortcutTargetOk(t) {
    if (!t || t.nodeType !== 1) {
        return true;
    }
    if (t.isContentEditable || (t.closest && t.closest("[contenteditable=\"true\"]"))) {
        return false;
    }
    let tag = t.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") {
        return false;
    }
    if (tag === "INPUT") {
        let typ = (t.getAttribute("type") || "").toLowerCase();
        if (typ === "text" || typ === "search" || typ === "email" || typ === "url"
                || typ === "password" || typ === "") {
            return false;
        }
    }
    if (t.matches && t.matches("input[name='eq-constraint-freq-min'], input[name='eq-constraint-freq-max'], input[name='eq-constraint-freq-graphic-list']")) {
        return false;
    }
    return true;
}

function initEqHistory() {
    document.addEventListener("keydown", (e) => {
        if (!(e.metaKey || e.ctrlKey)) {
            return;
        }
        if (e.code !== "KeyZ" && e.code !== "KeyY") {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        if (!eqHistoryShortcutTargetOk(e.target)) {
            return;
        }
        if (e.code === "KeyY") {
            e.preventDefault();
            e.stopPropagation();
            eqHistoryRedo();
            return;
        }
        if (e.code === "KeyZ" && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            eqHistoryRedo();
            return;
        }
        if (e.code === "KeyZ" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            eqHistoryUndo();
        }
    }, true);
}

// ============================================================
// === src/extra/eq/apply.js ===
// ============================================================
/* EQ apply / selection orchestration. Classic script for ordered loading. */
    function updateEqFilterMarkers() {
        syncEqPinnedParentTrace();
        let layout = buildEqGraphMarkerLayout();
        if (!layout || !layout.rows.length) {
            gEqFilterMarkers.selectAll("circle.eq-filter-marker").remove();
            gEqFilterMarkers.raise();
            gEqHoverPreview.raise();
            if (graphPlotHitRect) graphPlotHitRect.raise();
            if (!eqGraphPointerState && lastGraphPlotPointerClient) {
                let lp = lastGraphPlotPointerClient;
                let mResync = clientToGraphPlotXY(lp.x, lp.y);
                if (mResync) {
                    syncEqHoverPreview(mResync);
                }
            }
        } else {
            let mk = gEqFilterMarkers.selectAll("circle.eq-filter-marker")
                .data(layout.rows, d => d.rowIndex);
            mk.exit().remove();
            mk = mk.enter().append("circle")
                .attr("class", "eq-filter-marker")
                .attr("r", EQ_GRAPH_MARKER_R_BASE)
                .merge(mk)
                .attr("cx", d => d.cx)
                .attr("cy", d => d.cy)
                .attr("stroke", layout.strokeCol)
                .attr("stroke-width", EQ_GRAPH_MARKER_STROKE_W);
            let dragIx = eqGraphPointerState != null && eqGraphPointerState.filterIndex !== null
                ? eqGraphPointerState.filterIndex
                : null;
            applyEqFilterMarkerFillAndSize(dragIx);
            gEqSoundRangeBrush.raise();
            gEqFilterMarkers.raise();
            gEqHoverPreview.raise();
            if (graphPlotHitRect) graphPlotHitRect.raise();
            if (!eqGraphPointerState && lastGraphPlotPointerClient) {
                let lp = lastGraphPlotPointerClient;
                let mResync = clientToGraphPlotXY(lp.x, lp.y);
                if (mResync) {
                    syncEqHoverPreview(mResync);
                }
            }
        }
        /* Last step in applyEQExec (after showPhone/updatePaths); syncEqPinnedParentTrace may rebind
           or redrawLine paths — without this, parent/EQ opacity sometimes stayed at join defaults until
           the next event (e.g. A/B toggle). */
        if (extraEnabled && extraEQEnabled) {
            applyParametricEqGraphTraceFocus();
            updateEqTraceOpacity();
        }
    };
    function syncEqHoverPreview(m) {
        if (!m) {
            lastGraphPlotPointerClient = null;
            gEqHoverPreview.selectAll("*").remove();
            if (graphPlotHitRect && graphPlotHitRect.node()) {
                graphPlotHitRect.node().style.cursor = "";
            }
            applyEqFilterMarkerFillAndSize(null);
            applyEqGraphTraceStrokeEmphasis(null, false);
            return;
        }
        let mUse = m;
        let draggingGraph = !!eqGraphPointerState;
        if (draggingGraph && eqGraphPointerState.mode !== "soundRange") {
            let hz = typeof eqGraphPointerState.liveFHz === "number"
                ? eqGraphPointerState.liveFHz
                : eqGraphPointerState.fHz;
            if (typeof hz === "number") {
                mUse = [x(hz), m[1]];
            }
        }
        let stCurve = computeEqNodePreviewAtMouse(mUse);
        let near = findEqGraphMarkerHit(mUse);
        let nearRow = near ? near.rowIndex : null;
        let dragBandIx = draggingGraph && eqGraphPointerState.filterIndex !== null
            ? eqGraphPointerState.filterIndex
            : null;
        let markerHighlightRow = dragBandIx !== null ? dragBandIx : nearRow;
        if (markerHighlightRow !== null) {
            gEqHoverPreview.selectAll("*").remove();
        }
        applyEqFilterMarkerFillAndSize(markerHighlightRow);
        let emphasizeTrace = false;
        let tracePhoneEm = null;
        if (!draggingGraph && !near && stCurve) {
            let yOffT = y(getOffset(stCurve.tracePhone)) - y(0);
            let tcx = x(stCurve.fHz);
            let tcy = y(stCurve.db) + yOffT;
            emphasizeTrace = eqGraphPlotDistPx(mUse, tcx, tcy) <= EQ_GRAPH_MARKER_HIT_PX;
            if (emphasizeTrace) {
                tracePhoneEm = stCurve.tracePhone;
            }
        }
        applyEqGraphTraceStrokeEmphasis(tracePhoneEm, emphasizeTrace);
        let tabEq = document.querySelector("div.select");
        let onExtraEqTab = extraEnabled && extraEQEnabled && tabEq
                && tabEq.getAttribute("data-selected") === "extra";
        let soundRangeAffordance = onExtraEqTab && !draggingGraph && !near && !emphasizeTrace;
        if (graphPlotHitRect && graphPlotHitRect.node()) {
            graphPlotHitRect.node().style.cursor =
                draggingGraph && eqGraphPointerState.mode === "soundRange"
                    ? (eqGraphPointerState.soundRangeActive ? "ew-resize" : "pointer")
                : draggingGraph ? "grabbing"
                : near ? "grab"
                : emphasizeTrace ? "cell"
                : soundRangeAffordance ? "pointer" : "";
        }
        if (near) {
            return;
        }
        if (!stCurve) {
            gEqHoverPreview.selectAll("*").remove();
            return;
        }
        gEqHoverPreview.selectAll("*").remove();
    };
    let applyEQRafId = null;
    function cancelDeferredApplyEQ() {
        if (applyEQRafId !== null) {
            cancelAnimationFrame(applyEQRafId);
            applyEQRafId = null;
        }
    };
    let filterRowIsAllZeros = (i) => {
        let f = parseInt(filterFreqInput[i].value, 10) || 0;
        let q = parseFloat(filterQInput[i].value) || 0;
        let g = parseFloat(filterGainInput[i].value) || 0;
        return f === 0 && q === 0 && g === 0;
    };
    /** When every visible row has freq/q/gain set, append one blank row (capped like graph add-filter). */
    let maybeAutoGrowEqBandsForTrailingBlank = (execOpt) => {
        if (!filtersContainer || !filterFreqInput || !filterFreqInput.length
                || !extraEQEnabled || eqHistoryRestoring) {
            return;
        }
        if (execOpt && execOpt.liveGraphEqDrag) {
            return;
        }
        let maxCap = getEffectiveEqMaxBands();
        if (eqBands >= maxCap) {
            return;
        }
        for (let i = 0; i < eqBands; i++) {
            if (filterRowIsAllZeros(i)) {
                return;
            }
        }
        eqFiltersUserHasEdited = true;
        eqBands = Math.min(eqBands + 1, maxCap);
        updateFilterElements();
        if (isEqTwoChannelSupportEnabled()) {
            eq2chFlushDomToActiveBank();
        }
        scheduleLiveEqSync();
        eqHistoryNotifyChange();
    };
    function applyEQExec(execOpt) {
        execOpt = execOpt || {};
        eq2chFlushDomToActiveBank();
        maybeAutoGrowEqBandsForTrailingBlank(execOpt);
        refreshEqFilterConstraintViolationStyles();
        let typeEnableSigNow = eqHistoryCaptureTypeEnableSigFromDom();
        if (typeEnableSigNow != null && eqHistoryLastApplyTypeEnableSig !== null
                && typeEnableSigNow !== eqHistoryLastApplyTypeEnableSig) {
            eqHistoryDebugLog("applyEQExec type/enable sig changed", {
                prev: eqHistoryLastApplyTypeEnableSig,
                now: typeEnableSigNow,
                eqHistoryRestoring,
                extraEQEnabled,
                hasFiltersContainer: !!filtersContainer
            });
        }
        /* Do not log type/enable-only here when band count changed vs head — e.g. delete band shifts
           rows and changes the sig, but the real step is eqHistoryCommitTransaction(removeBand). */
        let headSnapForBandCount = (eqHistoryChain.length > 0 && eqHistoryHead >= 0
                && eqHistoryHead < eqHistoryChain.length)
            ? eqHistoryChain[eqHistoryHead]
            : null;
        let bandCountMatchesHead = !headSnapForBandCount
            || (headSnapForBandCount.bandCount === eqBands);
        if (typeEnableSigNow != null && eqHistoryLastApplyTypeEnableSig !== null
                && typeEnableSigNow !== eqHistoryLastApplyTypeEnableSig
                && !eqHistoryRestoring && extraEQEnabled && filtersContainer
                && bandCountMatchesHead) {
            eqHistoryClearTimers();
            eqHistoryPushSnapshot(eqHistoryTakeSnapshot(), { fromDebounced: true, bypassSnapEqual: true });
        } else if (typeEnableSigNow != null && eqHistoryLastApplyTypeEnableSig !== null
                && typeEnableSigNow !== eqHistoryLastApplyTypeEnableSig) {
            eqHistoryDebugLog("applyEQExec type/enable changed but NOT pushing (gates)", {
                eqHistoryRestoring,
                extraEQEnabled,
                hasFiltersContainer: !!filtersContainer
            });
        }
        try {
        // Create and show phone with eq applied
        let activeElem = document.activeElement;
        let phoneSelected = eqPhoneSelect && String(eqPhoneSelect.value || "").trim();
        if (!phoneSelected && typeof window !== "undefined" && window.__eqCoord.modelIntent) {
            phoneSelected = String(window.__eqCoord.modelIntent).trim();
        }
        if (!phoneSelected && typeof window !== "undefined" && window.__eqCoord.lastGraphModel) {
            phoneSelected = String(window.__eqCoord.lastGraphModel).trim();
        }
        let filters = elemToFiltersClampedForEqualizerApply();
        let hasEqSpecs = filters.length > 0;
        if (isEqTwoChannelSupportEnabled()) {
            hasEqSpecs = eq2chRowsToApplySpecs(eq2chBankData.both).length > 0
                || eq2chRowsToApplySpecs(eq2chBankData.L).length > 0
                || eq2chRowsToApplySpecs(eq2chBankData.R).length > 0;
        }
        if (hasEqSpecs && !phoneSelected) {
            let firstPhone = eqPhoneSelect.querySelectorAll("option")[1];
            if (firstPhone) {
                phoneSelected = eqPhoneSelect.value = firstPhone.value;
                eqPhoneSelect.dataset.eqLastModel = phoneSelected || "";
            }
        }
        let phoneObj = phoneSelected && eqMeasurementObjForSelect(phoneSelected);
        if (!phoneObj || (!hasEqSpecs && !phoneObj.eq)) {
            updateEqFilterMarkers();
            return;
        }
        let nextEqChannels;
        if (isEqTwoChannelSupportEnabled()) {
            let raws = phoneObj.rawChannels || [];
            let base2 = eq2chSharedMeasurementBaseRaw(phoneObj);
            if (base2) {
                nextEqChannels = LR.map((_, chIdx) =>
                    Equalizer.apply(base2, eq2chMergedSpecsForChannelIndex(chIdx)));
            } else {
                let nPerSide = LR.length && raws.length % LR.length === 0
                    ? raws.length / LR.length
                    : 0;
                nextEqChannels = raws.map((c, chIdx) => {
                    if (!c) {
                        return null;
                    }
                    let lrIdx = nPerSide >= 1
                        ? Math.min(LR.length - 1, Math.floor(chIdx / nPerSide))
                        : Math.min(LR.length - 1, chIdx);
                    let merged = eq2chMergedSpecsForChannelIndex(lrIdx);
                    return Equalizer.apply(c, merged);
                });
            }
        } else {
            nextEqChannels = phoneObj.rawChannels.map(
                (c) => (c ? Equalizer.apply(c, filters) : null));
        }
        let liveGraphEqDrag = Boolean(execOpt.liveGraphEqDrag && eqGraphPointerState
            && eqGraphPointerState.mode === "eq");
        if (liveGraphEqDrag && phoneObj.eq && activePhones.indexOf(phoneObj.eq) !== -1) {
            let eqP = phoneObj.eq;
            eqP.rawChannels = nextEqChannels;
            eqP.smooth = undefined;
            smoothPhone(eqP);
            normalizePhone(phoneObj);
            setCurves(eqP);
            if (isEqTwoChannelSupportEnabled() && eqP.rawChannels
                    && LR && LR.length > 1
                    && eqP.rawChannels.length === LR.length
                    && eqP.rawChannels.some(Boolean)) {
                eqP.avg = false;
                eqP.smooth = undefined;
                smoothPhone(eqP);
                setCurves(eqP, false);
                normalizePhone(eqP);
            }
            reorderActivePhonesByInitOrder();
            clusterTargetsFirstInActivePhones();
            refreshTargetStyleSlots();
            rebindGraphPathSelectionAndRedraw();
            applyParametricEqGraphTraceFocus();
            updateEqTraceOpacity();
            updateEqFilterMarkers();
            if (!execOpt.skipRestoreFocus) {
                activeElem.focus();
            }
            return;
        }
        let phoneEQ = { name: phoneObj.phone + " EQ" };
        let phoneObjEQ = window.eqAddOrUpdatePhone(phoneObj.brand, phoneEQ, nextEqChannels);
        phoneObj.eq = phoneObjEQ;
        phoneObjEQ.eqParent = phoneObj;
        showPhone(phoneObjEQ, false, !!execOpt.skipRestoreFocus);
        if (isEqTwoChannelSupportEnabled() && phoneObjEQ.rawChannels
                && LR && LR.length > 1
                && phoneObjEQ.rawChannels.length === LR.length
                && phoneObjEQ.rawChannels.some(Boolean)) {
            phoneObjEQ.avg = false;
            phoneObjEQ.smooth = undefined;
            smoothPhone(phoneObjEQ);
            setCurves(phoneObjEQ, false);
            normalizePhone(phoneObjEQ);
            updatePaths(false);
        }
        if (!execOpt.skipRestoreFocus) {
            activeElem.focus();
        }
        updateEqFilterMarkers();
        } finally {
            if (typeEnableSigNow != null) {
                eqHistoryLastApplyTypeEnableSig = typeEnableSigNow;
            }
        }
    };
    /* Coalesce to one apply per animation frame so the trace follows typing without
       the old 100ms debounce pause, while bounding work during rapid input. */
    function applyEQ() {
        /* Coalesce to one apply per frame, but never drop a call: a second applyEQ (e.g. after Auto EQ
           then remove-band) must not return early or the last DOM change is never applied. */
        cancelDeferredApplyEQ();
        applyEQRafId = requestAnimationFrame(() => {
            applyEQRafId = null;
            applyEQExec();
        });
    };
    /* Match EQ_GRAPH_WHEEL_Q_* (wheel on graph); duplicated here so filter keydown runs before
       those consts are initialized in this function. */
    const EQ_FILTER_KEYBOARD_Q_STEP = 0.1;
    const EQ_FILTER_KEYBOARD_Q_STEP_FINE = 0.01;
    const EQ_FILTER_KEYBOARD_Q_FINE_MAX = 0.3;
    let eqFreqKeyboardGridStep = (hz) => {
        let [fLo, fHi] = getEqConstraintFreqLoHi();
        let f = Math.round(Math.min(fHi, Math.max(fLo, hz)));
        if (f < 100) {
            return 1;
        }
        if (f < 1000) {
            return 10;
        }
        if (f < 10000) {
            return 100;
        }
        return 100;
    };
    let eqFreqKeyboardArrowDelta = (hz, shift) => {
        let base = eqFreqKeyboardGridStep(hz);
        return shift ? base * 10 : base;
    };
    if (filtersContainer) {
        filtersContainer.addEventListener("keydown", (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }
            let t = e.target;
            if (!t || t.tagName !== "INPUT" || !filtersContainer.contains(t)) {
                return;
            }
            let nm = t.getAttribute("name");
            if (nm !== "freq" && nm !== "q" && nm !== "gain") {
                return;
            }
            let rowIx = -1;
            let rowEl = t.closest && t.closest("div.filter");
            if (rowEl && filtersContainer.contains(rowEl)) {
                let rows = filtersContainer.querySelectorAll("div.filter");
                rowIx = Array.prototype.indexOf.call(rows, rowEl);
            }
            if (e.code !== "ArrowUp" && e.code !== "ArrowDown") {
                return;
            }
            if (nm === "freq") {
                e.preventDefault();
                let [fLo, fHi] = getEqConstraintFreqLoHi();
                let v = parseFloat(t.value);
                if (!Number.isFinite(v)) {
                    v = fLo;
                }
                v = Math.min(fHi, Math.max(fLo, v));
                let dir = e.code === "ArrowUp" ? 1 : -1;
                let delta = eqFreqKeyboardArrowDelta(v, e.shiftKey);
                t.value = String(Math.round(Math.min(fHi, Math.max(fLo, v + dir * delta))));
                applyEQ();
                scheduleLiveEqSync();
                eqHistoryNotifyChange();
                return;
            }
            if (nm === "q") {
                e.preventDefault();
                let [qLo, qHi] = getEqConstraintQLoHi();
                let v = parseFloat(t.value);
                if (!Number.isFinite(v)) {
                    v = 1;
                }
                v = Math.min(qHi, Math.max(qLo, v));
                let dir = e.code === "ArrowUp" ? 1 : -1;
                let step = e.shiftKey ? 1
                    : (v <= EQ_FILTER_KEYBOARD_Q_FINE_MAX
                        ? EQ_FILTER_KEYBOARD_Q_STEP_FINE
                        : EQ_FILTER_KEYBOARD_Q_STEP);
                let next = v + dir * step;
                next = Math.min(qHi, Math.max(qLo, next));
                if (!e.shiftKey && v <= EQ_FILTER_KEYBOARD_Q_FINE_MAX
                        && step === EQ_FILTER_KEYBOARD_Q_STEP_FINE
                        && next > EQ_FILTER_KEYBOARD_Q_FINE_MAX + 1e-9) {
                    next = EQ_FILTER_KEYBOARD_Q_FINE_MAX + EQ_FILTER_KEYBOARD_Q_STEP;
                }
                if (!e.shiftKey && next <= EQ_FILTER_KEYBOARD_Q_FINE_MAX + 1e-9) {
                    next = Math.round(next * 100) / 100;
                    t.value = next.toFixed(2);
                } else {
                    next = Math.round(next * 10) / 10;
                    t.value = String(next);
                }
                if (rowIx >= 0) {
                    eqGraphWheelQFloat[rowIx] = parseFloat(t.value);
                }
                applyEQ();
                scheduleLiveEqSync();
                eqHistoryNotifyChange();
                return;
            }
            if (nm === "gain") {
                e.preventDefault();
                let [gLo, gHi] = getEqConstraintGainLoHi();
                let v = parseFloat(t.value);
                if (!Number.isFinite(v)) {
                    v = 0;
                }
                v = Math.min(gHi, Math.max(gLo, v));
                let dir = e.code === "ArrowUp" ? 1 : -1;
                let step = e.shiftKey ? 1 : 0.1;
                let next = Math.round((v + dir * step) * 10) / 10;
                t.value = String(Math.min(gHi, Math.max(gLo, next)));
                applyEQ();
                scheduleLiveEqSync();
                eqHistoryNotifyChange();
            }
        }, true);
    }
    function updateEQPhoneTargetSelect() {
        if (!eqPhoneTargetSelect || !eqPhoneSelect) {
            return;
        }
        let phoneSelected = eqPhoneSelect.value;
        /* Dropdown omits measurements whose fullName equals the EQ model so the same IEM is not
           listed twice — but when that measurement is the chosen EQ *target*, optValOk(intent) failed,
           targetPick reverted, and a second click appeared to "fix" it. */
        let intentSticky = (typeof window !== "undefined" && window.__eqCoord.targetIntent)
            ? String(window.__eqCoord.targetIntent).trim()
            : "";
        let pendingSticky = (typeof window !== "undefined" && window.__eqCoord.pendingTarget)
            ? String(window.__eqCoord.pendingTarget).trim()
            : "";
        let keepMeasDespiteSameModel = (fullName) => {
            if (!fullName || !phoneSelected || fullName !== phoneSelected) {
                return false;
            }
            return fullName === intentSticky || fullName === pendingSticky;
        };
        let pool = eqAllPhonesPool();
        let userT = eqUserCatalogTargetsForEqUi().slice();
        let builtins = eqBuiltinCatalogTargetsForEqUi().slice();
        let meas = pool.filter((p) => !p.isTarget && p.fullName && !p.fullName.match(/ EQ$/)
            && (!phoneSelected || p.fullName !== phoneSelected || keepMeasDespiteSameModel(p.fullName))
            && !isCompensationTargetNameMatch(p));
        let byName = (a, b) => String(a.fullName).localeCompare(String(b.fullName));
        userT.sort(byName);
        builtins.sort(byName);
        meas.sort(byName);
        let seenU = new Set();
        userT = userT.filter((p) => {
            if (seenU.has(p.fullName)) {
                return false;
            }
            seenU.add(p.fullName);
            return true;
        });
        let seenB = new Set();
        builtins = builtins.filter((p) => {
            if (seenB.has(p.fullName)) {
                return false;
            }
            seenB.add(p.fullName);
            return true;
        });
        let seenM = new Set();
        meas = meas.filter((p) => {
            if (seenM.has(p.fullName)) {
                return false;
            }
            seenM.add(p.fullName);
            return true;
        });
        /* Active graph measurements (same eligibility as target dropdown) listed under Active for quick target picks. */
        let activeMeasQuick = activePhones.filter((p) =>
            p && !p.isTarget && p.fullName && !p.fullName.match(/ EQ$/)
            && (!phoneSelected || p.fullName !== phoneSelected || keepMeasDespiteSameModel(p.fullName))
            && !isCompensationTargetNameMatch(p));
        activeMeasQuick.sort(byName);
        let activeMeasQuickNames = new Set(activeMeasQuick.map((p) => p.fullName));
        meas = meas.filter((p) => !activeMeasQuickNames.has(p.fullName));
        /* On-graph targets (catalog + uploaded), same idea as Active models — pin here; omit from Targets optgroup. */
        let activeTargetsQuick = [],
            seenATq = new Set();
        getManageTableBasePhoneOrder().forEach((p) => {
            if (!p || !p.isTarget || !p.fullName || isCompensationTargetNameMatch(p)) {
                return;
            }
            if (activePhones.indexOf(p) === -1) {
                return;
            }
            if (seenATq.has(p.fullName)) {
                return;
            }
            seenATq.add(p.fullName);
            activeTargetsQuick.push(p);
        });
        let activeTargetsQuickNames = new Set(activeTargetsQuick.map((p) => p.fullName));
        builtins = builtins.filter((p) => !activeTargetsQuickNames.has(p.fullName));
        /* Active order: same idea as the model dropdown — user / measurement quick rows first, on-graph
           targets (including uploads) last so new uploads sit at the bottom of Active. */
        let seenUserSec = new Set();
        let userSectionList = [];
        userT.forEach((p) => {
            if (!seenUserSec.has(p.fullName)) {
                seenUserSec.add(p.fullName);
                userSectionList.push(p);
            }
        });
        activeMeasQuick.forEach((p) => {
            if (!seenUserSec.has(p.fullName)) {
                seenUserSec.add(p.fullName);
                userSectionList.push(p);
            }
        });
        activeTargetsQuick.forEach((p) => {
            if (!seenUserSec.has(p.fullName)) {
                seenUserSec.add(p.fullName);
                userSectionList.push(p);
            }
        });
        [intentSticky, pendingSticky].forEach((sticky) => {
            if (!sticky) {
                return;
            }
            let pooled = userSectionList.concat(builtins).concat(meas);
            if (pooled.some((row) => row.fullName === sticky)) {
                return;
            }
            let p = eqFindByFullNameAny(sticky);
            if (!p || isCompensationTargetNameMatch(p)) {
                return;
            }
            if (!p.isTarget && p.fullName && !String(p.fullName).match(/ EQ$/)) {
                meas.push(p);
                meas.sort(byName);
            }
        });
        let allOpts = userSectionList.concat(builtins).concat(meas);
        let oldVal = eqPhoneTargetSelect.value;
        Array.from(eqPhoneTargetSelect.children).slice(1).forEach((c) => eqPhoneTargetSelect.removeChild(c));
        let appendTargetOptgroup = (label, arr, textFor) => {
            if (!arr.length) {
                return;
            }
            let og = document.createElement("optgroup");
            og.label = label;
            arr.forEach((p) => {
                let o = document.createElement("option");
                o.value = p.fullName;
                o.textContent = textFor(p);
                og.appendChild(o);
            });
            eqPhoneTargetSelect.appendChild(og);
        };
        appendTargetOptgroup("Active", userSectionList, (p) => {
            if (p.isTarget) {
                let lab = (p.dispName != null && String(p.dispName).trim() !== "")
                    ? String(p.dispName)
                    : p.fullName;
                return "Target: " + lab;
            }
            /* Match model dropdown: short model name (`phone`) rather than brand + phone (`fullName`). */
            let d = (p.dispName != null && String(p.dispName).trim() !== "") ? String(p.dispName).trim() : "";
            if (d) {
                return d;
            }
            let ph = (p.phone != null && String(p.phone).trim() !== "") ? String(p.phone).trim() : "";
            if (ph) {
                return ph;
            }
            return String(p.fullName || "");
        });
        appendTargetOptgroup("Targets", builtins, (p) => {
            let lab = (p.dispName != null && String(p.dispName).trim() !== "")
                ? String(p.dispName)
                : p.fullName;
            return "Target: " + lab;
        });
        appendTargetOptgroup("Measurements", meas, (p) => p.fullName);
        let optValOk = (fn) => allOpts.some((row) => row.fullName === fn);
        let targetPick = (fn) => (fn && optValOk(fn) && eqTargetDropdownCandidateRenderable(fn, allOpts))
            ? fn
            : "";
        let lastGraphT = (typeof window !== "undefined" && window.__eqCoord.lastGraphTarget)
            ? String(window.__eqCoord.lastGraphTarget).trim()
            : "";
        let manageTopTargetFn = (() => {
            let ord = getManageTableBasePhoneOrder();
            for (let i = 0; i < ord.length; i++) {
                let p = ord[i];
                if (!p || !p.isTarget || !p.fullName || isCompensationTargetNameMatch(p)) {
                    continue;
                }
                if (eqTargetOnGraphInOptionList(p.fullName, allOpts)) {
                    return p.fullName;
                }
            }
            return "";
        })();
        /* eqDropdownTargetIntent: user picked from the target dropdown (like eqDropdownModelIntent).
           Without it, async loads can set oldVal to whichever target finished first and block share/init order. */
        let targetIntent = (typeof window !== "undefined" && window.__eqCoord.targetIntent)
            ? String(window.__eqCoord.targetIntent).trim()
            : "";
        let nextTV = (targetIntent && targetPick(targetIntent))
            || manageTopTargetFn
            || targetPick(oldVal)
            || targetPick(lastGraphT);
        if (typeof window !== "undefined") {
            window.__eqCoord.suppressTargetSelect = true;
        }
        try {
            eqPhoneTargetSelect.value = nextTV;
            if (!eqPhoneTargetSelect.value && allOpts.length > 0) {
                let modelM = resolveEqModelPhone();
                let implicitT = resolveEqTargetPhone(modelM, "");
                if (implicitT) {
                    let imp = targetPick(implicitT.fullName);
                    if (imp) {
                        eqPhoneTargetSelect.value = imp;
                    }
                }
            }
        } finally {
            if (typeof window !== "undefined") {
                queueMicrotask(() => {
                    window.__eqCoord.suppressTargetSelect = false;
                });
            }
        }
        let tgPlaceholder = eqPhoneTargetSelect.querySelector("option[value='']");
        if (tgPlaceholder) {
            tgPlaceholder.textContent = allOpts.length === 0
                ? "Target: Add a target to the graph"
                : "Choose EQ target";
            let hasTarget = !!eqPhoneTargetSelect.value;
            tgPlaceholder.hidden = hasTarget;
            tgPlaceholder.disabled = hasTarget;
        }
        eqPhoneTargetSelect.dataset.eqLastTarget = eqPhoneTargetSelect.value || "";
        if (typeof window !== "undefined") {
            window.__eqCoord.lastGraphTarget = eqPhoneTargetSelect.value
                || (window.__eqCoord.pendingTarget || "");
        }
        /* If the resolved <select> value is still a catalog measurement, synthesize `USRMT_*` even when
           the user never fires change/input (same-option pick or implicit nextTV from share URL). */
        (function materializeUserMeasurementEqTargetIfNeeded() {
            if (!eqPhoneTargetSelect) {
                return;
            }
            let v = String(eqPhoneTargetSelect.value || "").trim();
            if (!v || typeof window.eqEnsureUserMeasurementBrandTarget !== "function") {
                return;
            }
            let p = eqFindByFullNameAny(v);
            if (!p || p.isTarget || (p.fullName && String(p.fullName).match(/ EQ$/))) {
                return;
            }
            let tgt = window.eqEnsureUserMeasurementBrandTarget(p);
            if (!tgt) {
                return;
            }
            /* Measurement FR may load async; this block runs once data exists. Before superseding the
               source measurement, commit sticky intent to `USRMT_*`. Leaving intent on the raw
               measurement name caused targetPick() to fail after removePhone(meas) — dropdown reverted;
               a second pick worked because synthesis had already run. */
            if (typeof window !== "undefined") {
                window.__eqCoord.targetIntent = tgt.fullName;
                window.__eqCoord.lastGraphTarget = tgt.fullName;
                window.__eqCoord.pendingTarget = (activePhones.indexOf(tgt) === -1
                    || !phoneCurveDataReadyForEq(tgt))
                    ? tgt.fullName
                    : "";
            }
            eqPhoneTargetSelect.dataset.eqLastTarget = tgt.fullName;
            if (activePhones.indexOf(tgt) === -1) {
                showPhone(tgt, 0, true, false);
            }
            if (typeof window !== "undefined" && activePhones.indexOf(tgt) !== -1
                    && phoneCurveDataReadyForEq(tgt)) {
                window.__eqCoord.pendingTarget = "";
            }
            removeMeasurementIfSupersededByUserTarget(p);
            let domVal = String(eqPhoneTargetSelect.value || "").trim();
            if (domVal !== String(tgt.fullName).trim() && typeof window.updateEQPhoneSelect === "function") {
                window.updateEQPhoneSelect();
            }
        })();
    };
    function updateEQPhoneSelect() {
        if (!eqPhoneSelect) return;
        let oldValue = eqPhoneSelect.value;
        let list = eqAllPhonesPool().filter((p) =>
            !p.isTarget && p.fullName && !p.fullName.match(/ EQ$/));
        list.sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
        /* Active IEMs on the graph under "Active" (same idea as the target dropdown); full catalog below. */
        let activeModelsQuick = [],
            seenActive = new Set();
        getManageTableBasePhoneOrder().forEach((p) => {
            if (!p || p.isTarget || !p.fullName || String(p.fullName).match(/ EQ$/)) {
                return;
            }
            if (activePhones.indexOf(p) === -1) {
                return;
            }
            if (seenActive.has(p.fullName)) {
                return;
            }
            seenActive.add(p.fullName);
            activeModelsQuick.push(p);
        });
        let listRest = list.filter((p) => !seenActive.has(p.fullName));
        let optionValues = activeModelsQuick.concat(listRest).map((p) => p.fullName);
        Array.from(eqPhoneSelect.children).slice(1).forEach(c => eqPhoneSelect.removeChild(c));
        let appendModelOptgroup = (label, arr) => {
            if (!arr.length) {
                return;
            }
            let og = document.createElement("optgroup");
            og.label = label;
            arr.forEach((p) => {
                let optionElem = document.createElement("option");
                optionElem.setAttribute("value", p.fullName);
                optionElem.innerText = p.fullName;
                og.appendChild(optionElem);
            });
            eqPhoneSelect.appendChild(og);
        };
        appendModelOptgroup("Active", activeModelsQuick);
        appendModelOptgroup("All models", listRest);
        let intent = (typeof window !== "undefined" && window.__eqCoord.modelIntent)
            ? String(window.__eqCoord.modelIntent).trim()
            : "";
        let lastGraph = (typeof window !== "undefined" && window.__eqCoord.lastGraphModel)
            ? String(window.__eqCoord.lastGraphModel).trim()
            : "";
        let manageTopModel = (() => {
            let ord = getManageTableBasePhoneOrder();
            for (let i = 0; i < ord.length; i++) {
                let p = ord[i];
                if (!p || p.isTarget || !p.fullName || String(p.fullName).match(/ EQ$/)) {
                    continue;
                }
                if (eqModelOnGraphInOptionList(p.fullName, optionValues)) {
                    return p.fullName;
                }
            }
            return "";
        })();
        let nextSel = "";
        /* Match dropdown to graph reality: only names that are on-graph (or loading from pick).
           Prefer manage-table row order (same object order as manageTableRows) over async sticky so
           parallel loads do not reshuffle the default; keep graph sticky last for clicks after load. */
        if (intent && eqModelDropdownCandidateRenderable(intent, optionValues)) {
            nextSel = intent;
        } else if (oldValue && eqModelDropdownCandidateRenderable(oldValue, optionValues)) {
            nextSel = oldValue;
        } else if (manageTopModel && eqModelDropdownCandidateRenderable(manageTopModel, optionValues)) {
            nextSel = manageTopModel;
        } else if (lastGraph && eqModelDropdownCandidateRenderable(lastGraph, optionValues)) {
            nextSel = lastGraph;
        }
        eqPhoneSelect.value = nextSel;
        if (!nextSel && intent && !eqModelDropdownCandidateRenderable(intent, optionValues)) {
            window.__eqCoord.modelIntent = "";
        }
        let autoFilledModel = Boolean(nextSel && (
            !oldValue || optionValues.indexOf(oldValue) < 0 || nextSel !== oldValue
        ));
        updateEQPhoneTargetSelect();
        updateEqFilterMarkers();
        if (autoFilledModel) {
            applyEQ();
            scheduleLiveEqSync();
        }
        let phPlaceholder = eqPhoneSelect.querySelector("option[value='']");
        if (phPlaceholder) {
            phPlaceholder.textContent = optionValues.length === 0
                ? "Add a model to the graph"
                : "Choose EQ model";
            phPlaceholder.hidden = !!eqPhoneSelect.value;
        }
        eqPhoneSelect.dataset.eqLastModel = eqPhoneSelect.value || "";
        if (typeof window !== "undefined") {
            window.__eqCoord.lastGraphModel = eqPhoneSelect.value
                || (window.__eqCoord.pendingModel || "");
            if (!eqPhoneSelect.value && !window.__eqCoord.pendingModel) {
                window.__eqCoord.modelIntent = "";
            }
        }
        if (typeof window.publishEqUiState === "function") {
            window.publishEqUiState("updateEQPhoneSelect");
        }
    };
    function eqResetParametricAfterBaseModelRemoved() {
        window.__eqCoord.modelActivatedByDropdown = null;
        window.__eqCoord.targetActivatedByDropdown = null;
        window.__eqCoord.pendingModel = "";
        window.__eqCoord.pendingTarget = "";
        window.__eqCoord.modelStickyBypass = "";
        window.__eqCoord.modelIntent = "";
        window.__eqCoord.targetIntent = "";
        eqFiltersUserHasEdited = false;
        eq2chResetAllBanksToDefaultRow();
        filtersToElem([{ disabled: false, type: "PK", freq: 0, q: 0, gain: 0 }]);
        eqFiltersUserHasEdited = false;
        eqPinnedSnapshotBody = null;
        if (eqPhoneSelect) {
            eqPhoneSelect.dataset.eqLastModel = eqPhoneSelect.value || "";
        }
        setEqFilterSelectedRow(null);
        updateEQPhoneTargetSelect();
        applyEQ();
        scheduleLiveEqSync();
        applyParametricEqGraphTraceFocus();
        updateEqTraceOpacity();
        updateEqFilterMarkers();
        updatePhoneTable();
        eqHistoryRenderLog();
    };
function initEqApply() {
    updateFilterElements();
    updateEqFilterMarkers();
    if (eqPhoneSelect) {
    /* Coalesce input+change in one tick (both can fire on the same user pick in Chromium). */
    let eqPhoneSelectCoalesce = false;
    function runEqPhoneSelectHandler() {
        let prev = eqPhoneSelect.dataset.eqLastModel || "";
        let next = eqPhoneSelect.value;
        /* showPhone → updateEQPhoneSelect rebuilds <option>s and reassigns the same value; that fires
           a second change/input. Re-running applyEQExec/updatePaths caused an extra graph frame
           (compare IEM “flashing”). */
        if (prev === next) {
            return;
        }
        window.__eqCoord.batchSuppressDepth = (window.__eqCoord.batchSuppressDepth | 0) + 1;
        try {
        /* Commit selection before showPhone → updateEQPhoneSelect rebuilds <option>s. Otherwise the
           browser fires another change while dataset.eqLastModel is still `prev`, so this handler
           runs twice for the same A→B transition (double applyEQExec / double flash). */
        eqPhoneSelect.dataset.eqLastModel = next;
        /* Dropdown intent wins over stale showPhone() / lastGraph during async loads and mid-rebuild. */
        window.__eqCoord.modelIntent = next ? next : "";
        window.__eqCoord.lastGraphModel = next ? next : "";
        if (prev && next && prev !== next) {
            let dropModel = window.__eqCoord.modelActivatedByDropdown && window.__eqCoord.modelActivatedByDropdown === prev;
            let prevP = eqMeasurementObjForSelect(prev);
            if (dropModel && prevP && activePhones.indexOf(prevP) !== -1) {
                removePhone(prevP);
                window.__eqCoord.modelActivatedByDropdown = null;
            } else {
                let prevPhone = activePhones.filter((p) => p.fullName === prev)[0];
                if (prevPhone && prevPhone.eq) {
                    let eqP = prevPhone.eq;
                    prevPhone.eq = null;
                    eqP.eqParent = null;
                    removePhone(eqP);
                }
            }
            eqFiltersUserHasEdited = false;
            eq2chResetAllBanksToDefaultRow();
            filtersToElem([{ disabled: false, type: "PK", freq: 0, q: 0, gain: 0 }]);
            eqFiltersUserHasEdited = false;
            eqPinnedSnapshotBody = null;
            eqHistoryRenderLog();
        }
        let nextP = next ? eqAllPhonesPool().filter((x) => x.fullName === next)[0] : null;
        if (nextP) {
            if (!nextP.rawChannels) {
                nextP._eqNudgeApplyFromSelect = true;
            }
            if (activePhones.indexOf(nextP) === -1) {
                showPhone(nextP, 0, true, false);
                window.__eqCoord.modelActivatedByDropdown = next;
            } else {
                window.__eqCoord.modelActivatedByDropdown = null;
            }
            window.__eqCoord.pendingModel = (next && !nextP.rawChannels) ? next : "";
        } else {
            window.__eqCoord.modelActivatedByDropdown = null;
            window.__eqCoord.pendingModel = "";
        }
        setEqFilterSelectedRow(null);
        updateEQPhoneTargetSelect();
        /* Sync apply: deferred applyEQ() runs next frame, so the browser can paint once or twice
           with the new base trace but no EQ child yet — reads as the raw "OG" curve flashing.
           Target changes never call applyEQ() from the target handler, which is why only models
           showed the issue. */
        if (!nextP || nextP.rawChannels) {
            cancelDeferredApplyEQ();
            applyEQExec();
            scheduleLiveEqSync();
        }
        updatePhoneTable();
        if (typeof window.publishEqUiState === "function") {
            window.publishEqUiState("eqModelSelectChange");
        }
        } finally {
            window.__eqCoord.batchSuppressDepth = Math.max(0, (window.__eqCoord.batchSuppressDepth | 0) - 1);
            if ((window.__eqCoord.batchSuppressDepth | 0) === 0 && window.__eqCoord.batchPathsPending) {
                window.__eqCoord.batchPathsPending = false;
                updatePaths(false);
            }
        }
    }
    function queueEqPhoneSelectHandler() {
        if (eqPhoneSelectCoalesce) {
            return;
        }
        eqPhoneSelectCoalesce = true;
        queueMicrotask(() => {
            eqPhoneSelectCoalesce = false;
            runEqPhoneSelectHandler();
        });
    }
    eqPhoneSelect.addEventListener("input", queueEqPhoneSelectHandler);
    eqPhoneSelect.addEventListener("change", queueEqPhoneSelectHandler);
    eqPhoneSelect.dataset.eqLastModel = eqPhoneSelect.value || "";
    }
    if (eqPhoneTargetSelect) {
    let eqTargetSelectCoalesce = false;
    function runEqTargetSelectHandler() {
            if (typeof window !== "undefined" && window.__eqCoord.suppressTargetSelect) {
                return;
            }
            let prevCanon = eqPhoneTargetSelect.dataset.eqLastTarget || "";
            let v = eqPhoneTargetSelect.value;
            if (prevCanon && v !== prevCanon) {
                let dropT = window.__eqCoord.targetActivatedByDropdown;
                if (dropT && dropT === prevCanon) {
                    let pPrev = eqFindByFullNameAny(prevCanon);
                    if (pPrev && activePhones.indexOf(pPrev) !== -1) {
                        removePhone(pPrev);
                    }
                    window.__eqCoord.targetActivatedByDropdown = null;
                }
            }
            let canonTarget = "";
            if (v) {
                let p = eqFindByFullNameAny(v),
                    toShow = p,
                    stickyBypass = "",
                    synthSrc = null;
                if (p && !p.isTarget && p.fullName && !String(p.fullName).match(/ EQ$/)) {
                    let tgt = (typeof window.eqEnsureUserMeasurementBrandTarget === "function")
                        ? window.eqEnsureUserMeasurementBrandTarget(p)
                        : null;
                    if (tgt) {
                        synthSrc = p;
                        toShow = tgt;
                        stickyBypass = "";
                    } else if (p) {
                        stickyBypass = p.fullName;
                    }
                }
                canonTarget = (toShow && toShow.fullName) || "";
                if (typeof window !== "undefined") {
                    window.__eqCoord.lastGraphTarget = canonTarget || "";
                }
                /* Pending must cover any target about to join the graph, not only `!rawChannels`.
                   USRMT and other in-memory rows skipped `_eqPending` before showPhone() finished, so
                   intermediate rebuilds saw no intent match in optgroups and no pending — dropdown reverted. */
                window.__eqCoord.pendingTarget = "";
                if (toShow && activePhones.indexOf(toShow) === -1) {
                    window.__eqCoord.pendingTarget = (toShow.fullName || v) || "";
                }
                /* Before showPhone(): it calls updateEQPhoneSelect → updateEQPhoneTargetSelect, which
                   prefers eqDropdownTargetIntent. Setting intent after showPhone left stale intent and
                   the dropdown rebuilt to the previous target (second click “worked”). */
                eqPhoneTargetSelect.dataset.eqLastTarget = canonTarget;
                if (typeof window !== "undefined") {
                    window.__eqCoord.targetIntent = canonTarget || "";
                }
                if (toShow && activePhones.indexOf(toShow) === -1) {
                    if (!toShow.rawChannels) {
                        toShow._eqNudgeApplyFromSelect = true;
                    }
                    /* See showPhone(): skip overwriting eqLastGraphModelForEq for measurement target adds. */
                    window.__eqCoord.modelStickyBypass = stickyBypass;
                    showPhone(toShow, 0, true, false);
                    window.__eqCoord.targetActivatedByDropdown = toShow.fullName || "";
                    if (activePhones.indexOf(toShow) !== -1 && phoneCurveDataReadyForEq(toShow)) {
                        window.__eqCoord.pendingTarget = "";
                    }
                } else {
                    window.__eqCoord.targetActivatedByDropdown = null;
                    window.__eqCoord.modelStickyBypass = "";
                }
                if (synthSrc && toShow && toShow.userTargetFromMeasurement) {
                    removeMeasurementIfSupersededByUserTarget(synthSrc);
                }
            } else {
                window.__eqCoord.targetActivatedByDropdown = null;
                window.__eqCoord.pendingTarget = "";
                if (typeof window !== "undefined") {
                    window.__eqCoord.lastGraphTarget = "";
                    window.__eqCoord.targetIntent = "";
                }
                eqPhoneTargetSelect.dataset.eqLastTarget = "";
            }
            /* Measurement option value stays on the dropdown until rebuild; reconcile to User `USRMT_*` sticky. */
            if (extraEnabled && extraEQEnabled && v && canonTarget && String(v).trim() !== String(canonTarget).trim()) {
                if (typeof window.updateEQPhoneSelect === "function") {
                    window.updateEQPhoneSelect();
                }
            }
            applyParametricEqGraphTraceFocus();
            updateEqTraceOpacity();
            updatePhoneTable();
            if (typeof window.publishEqUiState === "function") {
                window.publishEqUiState("eqTargetSelectChange");
            }
    }
    function queueEqTargetSelectHandler() {
        if (eqTargetSelectCoalesce) {
            return;
        }
        eqTargetSelectCoalesce = true;
        queueMicrotask(() => {
            eqTargetSelectCoalesce = false;
            runEqTargetSelectHandler();
        });
    }
    eqPhoneTargetSelect.addEventListener("input", queueEqTargetSelectHandler);
    eqPhoneTargetSelect.addEventListener("change", queueEqTargetSelectHandler);
    }
}

// ============================================================
// === src/extra/bootstrap.js ===
// ============================================================
/* Extra bootstrap and URL/share orchestration.
 * Keep this as a classic script so graphtool.js can stay non-module. */
function initExtraBootstrap() {
    if (initExtraBootstrap.__done) {
        return;
    }
    initExtraBootstrap.__done = true;

    let resumeAudioContextsFromUserGesture = () => {
        if (pinkNoiseContext && pinkNoiseContext.state !== "running") {
            void pinkNoiseContext.resume();
        }
        if (toneGeneratorContext && toneGeneratorContext.state !== "running") {
            void toneGeneratorContext.resume();
        }
        if (musicContext && musicContext.state !== "running") {
            void musicContext.resume();
        }
    };

    document.addEventListener("keydown", (e) => {
        if (e.repeat) {
            return;
        }
        /* ⌘/Ctrl+Backspace or Alt+Backspace: remove/clear selected EQ band (see deleteSelectedEqFilterRow). */
        if (e.code !== "Backspace") {
            return;
        }
        if (!e.metaKey && !e.altKey && !e.ctrlKey) {
            return;
        }
        if (suppressEqExtraGlobalShortcutsForAppleSearch()) {
            return;
        }
        let tab = document.querySelector("div.select");
        if (!extraEnabled || !extraEQEnabled || !tab
                || tab.getAttribute("data-selected") !== "extra") {
            return;
        }
        let rowIx = resolveEqFilterRowIndexForShortcut();
        if (rowIx === null) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        deleteSelectedEqFilterRow(rowIx);
    }, true);

    document.addEventListener("keydown", (e) => {
        if (e.code !== "Space" && e.key !== " ") {
            return;
        }
        let t = e.target;
        if (t && t.nodeType === 1 && t.tagName === "INPUT" && t.getAttribute("type") === "number") {
            if ((t.closest && t.closest("div.extra-eq")) || (t.closest && t.closest("div.live-sound-tools"))) {
                e.preventDefault();
            }
        }
        let selectEl = document.querySelector("div.select");
        if (!selectEl || selectEl.getAttribute("data-selected") !== "extra") {
            return;
        }
        if (suppressEqExtraGlobalShortcutsForAppleSearch()) {
            return;
        }
        if (t && t.nodeType === 1 && typeof t.matches === "function"
                && t.matches("input[name='eq-constraint-freq-min'], input[name='eq-constraint-freq-max'], input[name='eq-constraint-freq-graphic-list']")) {
            return;
        }
        if (t && t.nodeType === 1 && typeof t.closest === "function") {
            let panelBtn = t.closest("div.extra-panel button:not(.play)");
            if (panelBtn) {
                let spaceControlsPlayback =
                    panelBtn.matches(
                        ".extra-eq-constraints-gear,"
                        + ".live-sound-tools-settings-gear,"
                        + ".extra-eq-reset-btn,"
                        + ".live-sound-range-reset-btn,"
                        + "button.autoeq,"
                        + ".upload-fr,"
                        + ".upload-target,"
                        + ".import-filters,"
                        + ".export-filters,"
                        + ".export-graphic-filters")
                    || (panelBtn.matches("button.music-add-remove") && musicFileLoaded);
                if (panelBtn.matches("button.music-add-remove") && musicFileLoaded) {
                    e.preventDefault();
                }
                if (!spaceControlsPlayback) {
                    return;
                }
            }
        }
        /* Must run for key repeat too, or a held Space re-triggers native button activation / scroll. */
        e.preventDefault();
        if (e.repeat) {
            return;
        }
        resumeAudioContextsFromUserGesture();
        if (e.shiftKey) {
            lastToneSpaceKeydownTime = 0;
            shiftSpaceAdvanceLiveSoundAndPlay();
            return;
        }
        ensureActiveLiveSoundPlayerValid();
        if (activeLiveSoundPlayer === "tone") {
            let now = performance.now();
            if (lastToneSpaceKeydownTime > 0 && now - lastToneSpaceKeydownTime < toneSpaceDoubleMs) {
                lastToneSpaceKeydownTime = 0;
                startToneGeneratorSweep();
                return;
            }
            lastToneSpaceKeydownTime = now;
        } else {
            lastToneSpaceKeydownTime = 0;
        }
        if (activeLiveSoundPlayer === "music" && musicFileLoaded && musicPlayButton && musicAudio) {
            musicPlayButton.click();
        } else if (activeLiveSoundPlayer === "tone" && toneGeneratorPlayButton) {
            toneGeneratorPlayButton.click();
        } else if (pinkNoisePlayButton) {
            pinkNoisePlayButton.click();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "\\") return;
        if (suppressEqExtraGlobalShortcutsForAppleSearch()) return;
        if (!livePlaybackEqToggle) return;
        e.preventDefault();
        if (e.repeat) return;
        livePlaybackEqToggle.checked = false;
        livePlaybackEqToggle.dispatchEvent(new Event("change"));
    });
    document.addEventListener("keyup", (e) => {
        if (e.key !== "\\") return;
        if (suppressEqExtraGlobalShortcutsForAppleSearch()) return;
        if (!livePlaybackEqToggle) return;
        livePlaybackEqToggle.checked = true;
        livePlaybackEqToggle.dispatchEvent(new Event("change"));
    });

    let calcEqDevPreamp = (filters) => {
        const phoneSelected = eqPhoneSelect.value;
        const phoneObj = phoneSelected &&
            context.activePhones.find(
                (p) => p.fullName === phoneSelected && p.eq
            );

        return context.Equalizer.calc_preamp(
            phoneObj.rawChannels.filter(Boolean)[0],
            phoneObj.eq.rawChannels.filter(Boolean)[0]
        );
    };

    async function loadPlugins(pluginsToLoad, context) {
        for (const pluginPath of pluginsToLoad) {
            try {
                let initializePlugin;

                if (typeof module !== "undefined" && module.exports) {
                    initializePlugin = require(pluginPath);
                } else {
                    const module = await import(pluginPath);
                    initializePlugin = module.default;
                }

                await initializePlugin(context);
            } catch (error) {
                console.error(`Error loading plugin ${pluginPath}:`, error.message);
            }
        }
    }

    let config = { showNetwork: false };

    if (typeof extraEQplugins !== "undefined") {
        loadPlugins(extraEQplugins, {
            filtersToElem,
            elemToFilters,
            calcEqDevPreamp,
            applyEQ,
            config
        });
    }

    window._appendMusicShareParamsToUrlSearch = (u) => {
        if (typeof extraMusicEnabled !== "undefined" && !extraMusicEnabled) {
            u.searchParams.delete(MUSIC_URL_PARAM_APPLE_SONG);
            u.searchParams.delete("appleMusicSong");
            u.searchParams.delete(MUSIC_URL_PARAM_IN);
            u.searchParams.delete(MUSIC_URL_PARAM_OUT);
            u.searchParams.delete("amSegStart");
            u.searchParams.delete("amSegEnd");
            return;
        }
        let tab = document.querySelector("div.select");
        let onExtraTab = tab && tab.getAttribute("data-selected") === "extra";
        if (!onExtraTab) {
            u.searchParams.delete(MUSIC_URL_PARAM_APPLE_SONG);
            u.searchParams.delete("appleMusicSong");
            u.searchParams.delete(MUSIC_URL_PARAM_IN);
            u.searchParams.delete(MUSIC_URL_PARAM_OUT);
            u.searchParams.delete("amSegStart");
            u.searchParams.delete("amSegEnd");
            return;
        }
        let fmtSegU = (x) => String(Math.round(x * 1e6) / 1e6);
        let segIsCustom = musicSegStartU > 1e-5 || musicSegEndU < 1 - 1e-5;
        if (musicAppleShareSongId) {
            u.searchParams.set(MUSIC_URL_PARAM_APPLE_SONG, musicAppleShareSongId);
            if (segIsCustom) {
                u.searchParams.set(MUSIC_URL_PARAM_IN, fmtSegU(musicSegStartU));
                u.searchParams.set(MUSIC_URL_PARAM_OUT, fmtSegU(musicSegEndU));
            } else {
                u.searchParams.delete(MUSIC_URL_PARAM_IN);
                u.searchParams.delete(MUSIC_URL_PARAM_OUT);
            }
        } else {
            u.searchParams.delete(MUSIC_URL_PARAM_APPLE_SONG);
            u.searchParams.delete("appleMusicSong");
            u.searchParams.delete(MUSIC_URL_PARAM_IN);
            u.searchParams.delete(MUSIC_URL_PARAM_OUT);
            u.searchParams.delete("amSegStart");
            u.searchParams.delete("amSegEnd");
        }
    };
    window._appendEqShareParamsToUrlSearch = (u) => {
        if (!extraEQEnabled) {
            return;
        }
        let tab = document.querySelector("div.select");
        let onEq = tab && tab.getAttribute("data-selected") === "extra";
        if (!onEq) {
            if (window.__pendingEqUrlShareParsed) {
                return;
            }
            u.searchParams.delete("eq");
            u.searchParams.delete(EQ_URL_PARAM_MODEL);
            u.searchParams.delete(EQ_URL_PARAM_TARGET);
            u.searchParams.delete(EQ_URL_PARAM_FILTERS);
            u.searchParams.delete(EQ_URL_PARAM_MODEL_DATA);
            u.searchParams.delete(EQ_URL_PARAM_TARGET_DATA);
            u.searchParams.delete("eq_model");
            u.searchParams.delete("eq_target");
            u.searchParams.delete("eq_filters");
            u.searchParams.delete("eq_model_data");
            u.searchParams.delete("eq_target_data");
            return;
        }
        u.searchParams.delete("eq_model");
        u.searchParams.delete("eq_target");
        u.searchParams.delete("eq_filters");
        if (eqPhoneSelect && eqPhoneSelect.value) {
            u.searchParams.set(EQ_URL_PARAM_MODEL, eqShareFullNameToUrlParam(eqPhoneSelect.value));
        } else {
            u.searchParams.delete(EQ_URL_PARAM_MODEL);
        }
        if (eqPhoneTargetSelect && eqPhoneTargetSelect.value) {
            u.searchParams.set(EQ_URL_PARAM_TARGET, eqShareFullNameToUrlParam(eqPhoneTargetSelect.value));
        } else {
            u.searchParams.delete(EQ_URL_PARAM_TARGET);
        }
        let modelPForShare = eqPhoneSelect && eqPhoneSelect.value
            ? eqMeasurementObjForSelect(String(eqPhoneSelect.value).trim())
            : null;
        if (modelPForShare && eqPhoneWantsInlineFrInShareUrl(modelPForShare) && !modelPForShare.isTarget) {
            let s = eqShareFrDataSerializeFromPhone(modelPForShare);
            if (s) {
                u.searchParams.set(EQ_URL_PARAM_MODEL_DATA, s);
            } else {
                u.searchParams.delete(EQ_URL_PARAM_MODEL_DATA);
            }
        } else {
            u.searchParams.delete(EQ_URL_PARAM_MODEL_DATA);
        }
        let targetPForShare = eqPhoneTargetSelect && eqPhoneTargetSelect.value
            ? eqFindByFullNameAny(String(eqPhoneTargetSelect.value).trim())
            : null;
        if (targetPForShare && eqPhoneWantsInlineFrInShareUrl(targetPForShare) && targetPForShare.isTarget) {
            let s = eqShareFrDataSerializeFromPhone(targetPForShare);
            if (s) {
                u.searchParams.set(EQ_URL_PARAM_TARGET_DATA, s);
            } else {
                u.searchParams.delete(EQ_URL_PARAM_TARGET_DATA);
            }
        } else {
            u.searchParams.delete(EQ_URL_PARAM_TARGET_DATA);
        }
        if (isEqTwoChannelSupportEnabled()) {
            u.searchParams.delete(EQ_URL_PARAM_FILTERS);
            return;
        }
        let filters = elemToFilters(true);
        let nonTrivial = filters.some((f) => (f.freq | 0) || (f.q | 0) || (f.gain | 0));
        if (nonTrivial) {
            u.searchParams.set(EQ_URL_PARAM_FILTERS, eqShareFiltersSerialize(filters));
        } else {
            u.searchParams.delete(EQ_URL_PARAM_FILTERS);
        }
    };
    window.applyPendingEqUrlShare = (attempt) => {
        let pending = window.__pendingEqUrlShareParsed;
        if (!pending || window.__eqUrlShareApplied) {
            return;
        }
        if (!extraEQEnabled) {
            window.__pendingEqUrlShareParsed = null;
            return;
        }
        if (isEqConstraintGraphicModeActive() && pending.filters && pending.filters.length) {
            console.warn("eqFilters in URL were skipped because graphic EQ band mode is active; model/target still apply.");
            pending = {
                openEqTab: pending.openEqTab,
                model: pending.model,
                target: pending.target,
                modelData: pending.modelData,
                targetData: pending.targetData,
                filters: null
            };
            window.__pendingEqUrlShareParsed = pending;
        }
        let pModelData = pending.modelData || "";
        let pTargetData = pending.targetData || "";
        if (pModelData && pending.model) {
            eqInjectFrFromUrlDataIntoModel(pending.model, pModelData);
        }
        if (pTargetData && pending.target) {
            eqInjectFrFromUrlDataIntoTarget(pending.target, pTargetData);
        }
        attempt = attempt | 0;
        let maxAttempts = 50;
        let modelCanon = eqResolveShareFullNameFromParam(pending.model);
        let targetCanon = eqResolveShareFullNameFromParam(pending.target);
        let ensurePhoneOnGraphForEqShare = (fullName) => {
            if (!fullName) {
                return true;
            }
            let p = eqFindByFullNameAny(fullName);
            if (!p) {
                return false;
            }
            if (activePhones.indexOf(p) === -1) {
                showPhone(p, false, true, false);
            }
            return true;
        };
        if (pending.model && !ensurePhoneOnGraphForEqShare(modelCanon) && attempt < maxAttempts) {
            setTimeout(() => window.applyPendingEqUrlShare(attempt + 1), 100);
            return;
        }
        if (pending.target && !ensurePhoneOnGraphForEqShare(targetCanon) && attempt < maxAttempts) {
            setTimeout(() => window.applyPendingEqUrlShare(attempt + 1), 100);
            return;
        }
        let modelP = modelCanon ? eqMeasurementObjForSelect(modelCanon) : null;
        let modelReady = !pending.model || !!(modelP && phoneCurveDataReadyForEq(modelP));
        let targetP = targetCanon ? eqFindByFullNameAny(targetCanon) : null;
        let targetReady = !pending.target || !!(targetP && phoneCurveDataReadyForEq(targetP));
        if ((!modelReady || !targetReady) && attempt < maxAttempts) {
            setTimeout(() => window.applyPendingEqUrlShare(attempt + 1), 100);
            return;
        }
        if (!modelReady || !targetReady) {
            window.__pendingEqUrlShareParsed = null;
            return;
        }
        window.__pendingEqUrlShareParsed = null;
        window.__eqUrlShareApplied = true;
        window.__eqCoord.modelIntent = modelCanon ? String(modelCanon) : "";
        window.__eqCoord.targetIntent = targetCanon ? String(targetCanon) : "";
        if (pending.openEqTab && typeof showExtraPanel === "function") {
            showExtraPanel();
        } else if (typeof window.updateEQPhoneSelect === "function") {
            window.updateEQPhoneSelect();
        }
        if (pending.filters && pending.filters.length) {
            eqFiltersUserHasEdited = true;
            eqHistoryRestoring = true;
            try {
                filtersToElem(pending.filters);
                cancelDeferredApplyEQ();
                applyEQExec();
                scheduleLiveEqSync();
            } finally {
                eqHistoryRestoring = false;
            }
        } else {
            applyEQ();
            scheduleLiveEqSync();
        }
        applyParametricEqGraphTraceFocus();
        updateEqTraceOpacity();
        updateEqFilterMarkers();
        if (ifURL && typeof addPhonesToUrl === "function") {
            addPhonesToUrl();
        }
    };

    window.__pendingEqUrlShareParsed = parseEqUrlShareParams(targetWindow.location.href);
    window.__pendingAppleMusicCatalogSongId = parseAppleMusicSongIdFromHref(targetWindow.location.href);
    window.__pendingAppleMusicSegment = parseAppleMusicSegmentFromHref(targetWindow.location.href);
}

// ============================================================
// === src/extra/upload.js ===
// ============================================================
/* Upload feature initializer for the Extra panel.
 * This file intentionally stays as a classic script so graph pages can keep simple script tags. */
function initExtraUpload(options) {
    options = options || {};
    var addOrUpdatePhone = options.addOrUpdatePhone;
    var uploadType = null;
    var fileFR = document.querySelector("#file-fr");
    var uploadFrButton = document.querySelector("div.extra-upload button.upload-fr");
    var uploadTargetButton = document.querySelector("div.extra-upload button.upload-target");

    if (!fileFR || !uploadFrButton || !uploadTargetButton || typeof addOrUpdatePhone !== "function") {
        return;
    }

    uploadFrButton.addEventListener("click", function() {
        uploadType = "fr";
        fileFR.click();
    });

    uploadTargetButton.addEventListener("click", function() {
        uploadType = "target";
        fileFR.click();
    });

    fileFR.addEventListener("change", function(e) {
        var file = e.target.files[0];
        if (!file) {
            return;
        }

        var reader = new FileReader();
        reader.onload = function(ev) {
            try {
                var name = file.name.replace(/\.[^\.]+$/, "");
                var phone = { name: name };
                var ch = [tsvParse(ev.target.result)];
                if (ch[0].length < 128) {
                    alert("Parse frequence response file failed: invalid format.");
                    return;
                }
                ch[0] = Equalizer.interp(f_values, ch[0]);

                var selTabUpload = document.querySelector("div.select");
                var eqTabActive = extraEnabled && extraEQEnabled && selTabUpload
                    && selTabUpload.getAttribute("data-selected") === "extra";

                if (uploadType === "fr") {
                    name.match(/ R$/) && ch.splice(0, 0, null);
                    var phoneObj = addOrUpdatePhone(brandMap.Uploaded, phone, ch);
                    if (eqTabActive && typeof window !== "undefined") {
                        window.__eqCoord.modelIntent = phoneObj.fullName;
                    }
                    showPhone(phoneObj, false);
                } else if (uploadType === "target") {
                    var bt = typeof window !== "undefined" ? window.brandTarget : null;
                    if (!bt || !Array.isArray(bt.phoneObjs)) {
                        alert("Target catalog is not available.");
                        return;
                    }
                    var fullName = name + (name.match(/ Target$/i) ? "" : " Target");
                    var existsTargets = (typeof targets !== "undefined" && targets)
                        ? targets.reduce(function(a, b) { return a.concat(b.files); }, []).map(function(f) { return f += " Target"; })
                        : [];
                    if (existsTargets.indexOf(fullName) >= 0
                            || bt.phoneObjs.some(function(p) { return p && p.fullName === fullName; })) {
                        alert("This target already exists on this tool, please select it instead of upload.");
                        return;
                    }
                    var targetObj = {
                        isTarget: true,
                        brand: bt,
                        dispName: name,
                        phone: name,
                        fullName: fullName,
                        fileName: fullName,
                        rawChannels: ch,
                        isDynamic: true,
                        id: -bt.phoneObjs.length
                    };
                    bt.phoneObjs.push(targetObj);
                    if (eqTabActive && typeof window !== "undefined") {
                        window.__eqCoord.targetIntent = targetObj.fullName;
                    }
                    showPhone(targetObj, true);
                }

                if (eqTabActive) {
                    /* Rebuild EQ selects before URL sync so uploaded rows are available to share params. */
                    requestAnimationFrame(function() {
                        if (typeof window.updateEQPhoneSelect === "function") {
                            window.updateEQPhoneSelect();
                        }
                        if (typeof ifURL !== "undefined" && ifURL && typeof addPhonesToUrl === "function") {
                            addPhonesToUrl();
                        }
                    });
                }
            } finally {
                /* Same path selected twice does not fire `change` unless the input is cleared. */
                fileFR.value = "";
            }
        };
        reader.onerror = function() {
            fileFR.value = "";
        };
        reader.readAsText(file);
    });
}

// ============================================================
// === src/extra/eq/live.js ===
// ============================================================
/* EQ live-sync and trace-opacity helpers. Classic script for ordered loading. */
function initEqLive() {
    scheduleLiveEqSync = () => {
        if (!pinkNoisePlaying && !toneGeneratorOsc && !musicMediaSourceNode) {
            return;
        }
        if (liveEqSyncRafId !== null) {
            return;
        }
        liveEqSyncRafId = requestAnimationFrame(() => {
            liveEqSyncRafId = null;
            rebuildPinkNoiseEqChain();
            rebuildToneGeneratorEqChain();
            rebuildMusicEqChain();
        });
    };
    eqAfterMultiSampleRawRefined = (p) => {
        if (!extraEQEnabled || !p || p.isTarget) {
            return;
        }
        if (p.fullName && String(p.fullName).match(/ EQ$/)) {
            return;
        }
        if (!eqPhoneSelect) {
            return;
        }
        let sel = String(eqPhoneSelect.value || "").trim()
            || (typeof window !== "undefined" ? String(window.__eqCoord.modelIntent || "").trim() : "")
            || (typeof window !== "undefined" ? String(window.__eqCoord.lastGraphModel || "").trim() : "");
        if (!sel || sel !== p.fullName) {
            return;
        }
        cancelDeferredApplyEQ();
        applyEQExec();
        scheduleLiveEqSync();
    };
    window.eqOnPhoneDataReadyForEqUi = (p) => {
        if (!extraEQEnabled || !p || !p.fullName) {
            return;
        }
        let model = (eqPhoneSelect && String(eqPhoneSelect.value || "").trim())
            || (typeof window !== "undefined" ? String(window.__eqCoord.modelIntent || "").trim() : "")
            || (typeof window !== "undefined" ? String(window.__eqCoord.lastGraphModel || "").trim() : "");
        let targ = (eqPhoneTargetSelect && String(eqPhoneTargetSelect.value || "").trim())
            || (typeof window !== "undefined" ? String(window.__eqCoord.lastGraphTarget || "").trim() : "");
        let intentT = (typeof window !== "undefined" && window.__eqCoord.targetIntent)
            ? String(window.__eqCoord.targetIntent).trim()
            : "";
        let targetRowReady = (targ && p.fullName === targ) || (intentT && p.fullName === intentT);
        if ((model && p.fullName === model) || targetRowReady) {
            if (model && p.fullName === model) {
                window.__eqCoord.modelIntent = "";
                window.__eqCoord.pendingModel = "";
            }
            if (targetRowReady) {
                window.__eqCoord.pendingTarget = "";
                if (intentT && p.fullName === intentT) {
                    window.__eqCoord.targetIntent = "";
                }
            }
            cancelDeferredApplyEQ();
            applyEQExec();
            scheduleLiveEqSync();
        }
        if (typeof window.publishEqUiState === "function") {
            window.publishEqUiState("eqOnPhoneDataReadyForEqUi");
        }
    };
    filtersContainer.addEventListener("input", scheduleLiveEqSync);
    filtersContainer.addEventListener("change", scheduleLiveEqSync);
    if (livePlaybackEqToggle) {
        livePlaybackEqToggle.addEventListener("change", scheduleLiveEqSync);
        livePlaybackEqToggle.addEventListener("change", () => updateEqTraceOpacity());
    }
    let eqTraceOpacityPulseTimer = null;
    let eqTraceLastState = null;
    updateEqTraceOpacity = () => {
        let audioPlaying = pinkNoisePlaying || !!toneGeneratorOsc
            || (musicAudio && !musicAudio.paused);
        let eqOn = isLivePlaybackEqEnabled();
        let stateKey = (audioPlaying ? "p" : "s") + (eqOn ? "1" : "0");
        let stateChanged = eqTraceLastState !== null && eqTraceLastState !== stateKey;
        eqTraceLastState = stateKey;
        let emphTargets = [];
        gpath.selectAll("path").each(function (c) {
            if (!c || !c.p || c.p.hide) return;
            let el = d3.select(this);
            let isEqTrace = !!c.p.eqParent;
            let isParentTrace = !!c.p.eq;
            if (isEqTrace) {
                let base = graphPathOpacityForCurve(c);
                let b = (base == null || !Number.isFinite(base)) ? 1 : base;
                el.attr("opacity", eqComposeListeningOpacityForCurve(c, b));
                if (stateChanged && audioPlaying && eqOn) emphTargets.push(this);
            } else if (isParentTrace) {
                let base = graphPathOpacityForCurve(c);
                let b = (base == null || !Number.isFinite(base)) ? 1 : base;
                el.attr("opacity", eqComposeListeningOpacityForCurve(c, b));
                if (stateChanged && audioPlaying && !eqOn) emphTargets.push(this);
            }
        });
        if (emphTargets.length) {
            let emph = EQ_GRAPH_TRACE_STROKE_NORMAL * EQ_GRAPH_TRACE_STROKE_EMPH_MULT;
            emphTargets.forEach(n => {
                let d = d3.select(n).datum();
                let w = (d && d.p && d.p.isTarget)
                    ? targetTraceStrokeWidthForPhone(d.p) * EQ_GRAPH_TRACE_STROKE_EMPH_MULT
                    : emph;
                d3.select(n).attr("stroke-width", w);
            });
            if (eqTraceOpacityPulseTimer) clearTimeout(eqTraceOpacityPulseTimer);
            eqTraceOpacityPulseTimer = setTimeout(() => {
                eqTraceOpacityPulseTimer = null;
                emphTargets.forEach(n => {
                    let d = d3.select(n).datum();
                    if (d && d.p && d.p.isTarget) {
                        d3.select(n).attr("stroke-width", targetTraceStrokeWidthForPhone(d.p));
                    } else {
                        let base = n.classList.contains("sample")
                            ? EQ_GRAPH_TRACE_STROKE_SAMPLE
                            : EQ_GRAPH_TRACE_STROKE_NORMAL;
                        d3.select(n).attr("stroke-width", base);
                    }
                });
            }, 100);
        }
        if (!eqGraphPointerState && lastGraphPlotPointerClient) {
            let lp = lastGraphPlotPointerClient;
            let mResync = clientToGraphPlotXY(lp.x, lp.y);
            if (mResync) {
                syncEqHoverPreview(mResync);
            }
        }
    };
}
