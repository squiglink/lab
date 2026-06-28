(function () {
    // Feature guard — exit silently if not configured
    if (typeof tiltableTargets === "undefined" || !tiltableTargets || !tiltableTargets.length) return;
    if (typeof GraphToolPlugin === "undefined") return;

    let boost  = typeof default_bass_shelf !== "undefined" ? default_bass_shelf : 0;
    let tilt   = typeof default_tilt       !== "undefined" ? default_tilt       : 0;
    let ear    = typeof default_ear        !== "undefined" ? default_ear        : 0;
    let treble = typeof default_treble     !== "undefined" ? default_treble     : 0;

    let df = null, dfBase = null;
    let targetsHiddenByBounds = [];
    let prefBoundsObj = null;

    // ── Preference Bounds ────────────────────────────────────────────────────────

    function loadPrefBounds(boundsName, ctx, callback) {
        let dir = typeof preference_bounds_dir !== "undefined" ? preference_bounds_dir : "data/pref_bounds/";
        let lpf = pf => d3.text(dir + pf + ".txt").catch(() => null);
        let f = ctx.LR.map(s => lpf(boundsName + " " + s));
        Promise.all(f).then(function (frs) {
            if (!frs.some(f => f !== null)) {
                return;
            }
            let ch = frs.map(f => f && ctx.Equalizer.interp(ctx.f_values, ctx.tsvParse(f)));
            ch = ch.filter(c => c !== null);
            callback(ch);
        });
    }

    function setPrefBounds(ch, ctx) {
        prefBoundsObj = {
            isPrefBounds: true, phone: "Preference Bounds",
            fullName: "Preference Bounds", dispName: "Preference Bounds",
            fileName: "Preference Bounds", rawChannels: ch, preComp: ch, id: -70
        };
        ctx.smoothPhone(prefBoundsObj);
        ctx.normalizePhone(prefBoundsObj);
        prefBoundsObj.offset = prefBoundsObj.offset || 0;

        if (typeof preference_bounds_startup !== "undefined" && preference_bounds_startup) {
            let existing = ctx.activePhones().find(p => p.phone === "Preference Bounds");
            if (existing) ctx.removePhone(existing);
            let boundsBtn = ctx.doc.select("#cusdf-bounds");
            boundsBtn.classed("selected", true);
            ctx.activePhones().push(prefBoundsObj);
            prefBoundsObj.active = true;
            ctx.setCurves(prefBoundsObj, undefined, prefBoundsObj.lr);
            ctx.updatePaths();
        }
    }

    function prepPrefBounds(ctx) {
        if (!prefBoundsObj || !df || !df.rawChannels) return;
        let ch = [...prefBoundsObj.preComp];
        let base = df.rawChannels[0].map(d => d[1]);
        for (let i = 0; i < ch.length; i++) {
            ch[i] = ch[i].map((d, j) => [d[0], d[1] + base[Math.min(j, base.length - 1)]]);
        }
        prefBoundsObj.rawChannels = prefBoundsObj.channels = prefBoundsObj.lr = ch;
        ctx.normalizePhone(prefBoundsObj);
        prefBoundsObj.smooth = null;
        ctx.smoothPhone(prefBoundsObj);
    }

    // ── Tilt calculation ─────────────────────────────────────────────────────────

    function updateDF(newBoost, newTilt, newEar, newTreble, change, ctx) {
        let activeTarget = ctx.activePhones().find(p => p.isTarget);
        if (activeTarget && !tiltableTargets.includes(activeTarget.dispName) && activeTarget.phone !== "Custom Tilt") {
            alert("This target is not supported for Custom Tilt");
            return;
        }

        let filters = [
            { disabled: false, type: "LSQ", freq: 105,  q: 0.707, gain: newBoost },
            { disabled: false, type: "PK",  freq: 2750, q: 1,     gain: newEar   },
            { disabled: false, type: "HSQ", freq: 2500, q: 0.42,  gain: newTreble }
        ];
        if (!df || !df.rawChannels) { return; }
        let bass = df.rawChannels.map(c => c ? ctx.Equalizer.apply(c, filters) : null);

        let tiltOct = new Array(bass.length).fill(null);
        for (let i = 0; i < bass[0].length; i++) {
            let gainAdjustment = newTilt * Math.log2(bass[0][i][0]);
            tiltOct[i] = [bass[0][i][0], bass[0][i][1] + gainAdjustment];
        }

        let parts = [];
        if (newTilt   !== 0) parts.push("Tilt: "  + newTilt   + "dB/Oct");
        if (newBoost  !== 0) parts.push("B: "     + newBoost  + "dB");
        if (newTreble !== 0) parts.push("T: "     + newTreble + "dB");
        if (newEar    !== 0) parts.push("3kHz: "  + newEar    + "dB");
        let preferenceAdjustments = parts.length ? " (" + parts.join(", ") + ")" : " ";

        let customTiltLabel = typeof customTiltName !== "undefined" && customTiltName ? customTiltName : tiltableTargets[0];

        if (typeof harmanFilters !== "undefined" && harmanFilters) {
            let match = harmanFilters.find(f =>
                newTilt === f.tilt && newBoost === f.bass_shelf &&
                newTreble === f.treble && newEar === f.ear);
            if (match) preferenceAdjustments += " (" + match.name + " Filters)";
        }

        let brand = window.brandTarget;
        let phoneObjs = brand.phoneObjs;
        let phoneObj = {
            isTarget: true, brand: brand, phone: "Custom Tilt",
            fullName: customTiltLabel + preferenceAdjustments,
            dispName: customTiltLabel + preferenceAdjustments,
            fileName: customTiltLabel + " Target",
            basedOn: df
        };
        phoneObj.rawChannels = [tiltOct];
        phoneObj.id = -69;

        let oldPhoneObj = phoneObjs.find(p => p.phone === "Custom Tilt");
        if (oldPhoneObj) {
            phoneObj.id = oldPhoneObj.id;
            phoneObjs[phoneObjs.indexOf(oldPhoneObj)] = phoneObj;
            oldPhoneObj.active = false;
            // Filter out inactive phones
            let ap = ctx.activePhones();
            for (let i = ap.length - 1; i >= 0; i--) {
                if (!ap[i].active) ap.splice(i, 1);
            }
            // updatePhoneTable if available
            if (typeof updatePhoneTable === "function") updatePhoneTable();
        } else {
            phoneObjs.push(phoneObj);
        }
        ctx.showPhone(phoneObj, true);

        if (typeof dfBaseline !== "undefined" && dfBaseline && dfBase) {
            ctx.setBaseline(dfBase);
            ctx.drawLabels();
        }

        // Re-focus the changed input
        if (change === "bass")   ctx.doc.select("#cusdf-bass").node().focus();
        else if (change === "tilt")   ctx.doc.select("#cusdf-tilt").node().focus();
        else if (change === "ear")    ctx.doc.select("#cusdf-ear").node().focus();
        else if (change === "treble") ctx.doc.select("#cusdf-treb").node().focus();
    }

    // ── UI init ──────────────────────────────────────────────────────────────────

    function initTiltPlugin(ctx) {
        // Find df — the first tiltable target
        let brand = window.brandTarget;
        if (!brand || !brand.phoneObjs) { return; }
        for (let t of brand.phoneObjs) {
            if (tiltableTargets.includes(t.dispName)) { df = t; break; }
        }
        if (!df) {
            let customName = typeof customTiltName !== "undefined" ? customTiltName : null;
            if (customName) df = brand.phoneObjs.find(p => p.dispName === customName);
        }
        if (!df) { return; }

        // Insert customDF panel into the DOM before the manageTable
        let manageEl = document.querySelector("div.manage");
        if (!manageEl) return;
        let panel = document.createElement("div");
        panel.className = "customDF";
        panel.innerHTML = `
            <span>Preference Adjustments:</span>
            <div>
              <input type="number" inputmode="decimal" id="cusdf-tilt" value="${tilt}" step="0.1">
              <span>Tilt (dB/Oct)</span>
            </div>
            <div>
              <input type="number" inputmode="decimal" id="cusdf-bass" value="${boost}" step="1">
              <span>Bass (dB)</span>
            </div>
            <div>
              <input type="number" inputmode="decimal" id="cusdf-treb" value="${treble}" step="0.1">
              <span>Treble (dB)</span>
            </div>
            <div>
              <input type="number" inputmode="decimal" id="cusdf-ear" value="${ear}" step="0.1">
              <span>Ear Gain (dB)</span>
            </div>
            <button id="cusdf-UnTiltTHIS" style="margin-right: 10px">Remove Adjustments</button>
            ${(typeof harmanFilters !== "undefined" && harmanFilters) ? '<button id="cusdf-harmanfilters" style="margin-right: 10px">Harman Filters</button>' : ''}
            ${preference_bounds_name ? '<button id="cusdf-bounds">Preference Bounds</button>' : ''}
        `;
        let manageTable = manageEl.querySelector(".manageTable");
        if (manageTable) {
            manageEl.insertBefore(panel, manageTable);
        } else {
            manageEl.prepend(panel);
        }

        // Load df raw channels (needed for tilt calculation)
        ctx.loadFiles(df, function (ch) {
            df.rawChannels = ch;
            ctx.smoothPhone(df);
            ctx.normalizePhone(df);
            df.offset = df.offset || 0;
            dfBase = ctx.getBaseline(df);

            // Show the initial tilt curve so the panel is immediately useful
            updateDF(boost, tilt, ear, treble, undefined, ctx);

            // Load preference bounds if configured
            if (typeof preference_bounds_name !== "undefined" && preference_bounds_name) {
                loadPrefBounds(preference_bounds_name, ctx, function (ch) { setPrefBounds(ch, ctx); });
            }
        });

        // ── Wire up UI event handlers ────────────────────────────────────────────

        function updateDispVals() {
            let b = document.getElementById("cusdf-bass");
            let ti = document.getElementById("cusdf-tilt");
            let tr = document.getElementById("cusdf-treb");
            let e = document.getElementById("cusdf-ear");
            if (b) b.value = boost;
            if (ti) ti.value = tilt;
            if (tr) tr.value = treble;
            if (e) e.value = ear;
        }

        document.getElementById("cusdf-UnTiltTHIS").addEventListener("click", function () {
            boost = 0; tilt = 0; ear = 0; treble = 0;
            updateDF(boost, tilt, ear, treble, undefined, ctx);
            updateDispVals();
        });

        const NUMERIC_INPUT = /^-?\d*(\.\d+)?$/;
        function bindInput(id, kind, setter) {
            let el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("change", handler);
            el.addEventListener("input", handler);
            function handler() {
                if (!NUMERIC_INPUT.test(this.value)) return;
                setter(+this.value);
                updateDF(boost, tilt, ear, treble, kind, ctx);
            }
        }
        bindInput("cusdf-bass", "bass",   function (v) { boost  = v; });
        bindInput("cusdf-tilt", "tilt",   function (v) { tilt   = v; });
        bindInput("cusdf-ear",  "ear",    function (v) { ear    = v; });
        bindInput("cusdf-treb", "treble", function (v) { treble = v; });

        // Harman filter cycle
        if (typeof harmanFilters !== "undefined" && harmanFilters) {
            let btn = document.getElementById("cusdf-harmanfilters");
            if (btn) {
                btn.classList.add(harmanFilters[0].name.split(" ").join(""));
                btn.addEventListener("click", function () {
                    let currentClass = this.classList[0];
                    let currentIndex = harmanFilters.findIndex(f => f.name.split(" ").join("") === currentClass);
                    let nextIndex = (currentIndex + 1) % harmanFilters.length;
                    let nextFilter = harmanFilters[nextIndex];
                    this.classList.remove(currentClass);
                    this.classList.add(nextFilter.name.split(" ").join(""));
                    tilt = nextFilter.tilt; boost = nextFilter.bass_shelf;
                    treble = nextFilter.treble; ear = nextFilter.ear;
                    updateDF(boost, tilt, ear, treble, undefined, ctx);
                    updateDispVals();
                });
            }
        }

        // Preference Bounds toggle
        if (preference_bounds_name) {
            let boundsBtn = document.getElementById("cusdf-bounds");
            if (boundsBtn) {
                boundsBtn.addEventListener("click", function () {
                    if (!prefBoundsObj) { return; }
                    let sel = boundsBtn.classList.contains("selected");
                    if (sel) {
                        boundsBtn.classList.remove("selected");
                        ctx.removePhone(prefBoundsObj);
                        targetsHiddenByBounds.forEach(p => { if (p.hide) ctx.toggleHide(p); });
                        targetsHiddenByBounds = [];
                    } else {
                        boundsBtn.classList.add("selected");
                        prepPrefBounds(ctx);
                        ctx.setBaseline(dfBase);
                        ctx.activePhones().push(prefBoundsObj);
                        prefBoundsObj.active = true;
                        ctx.setCurves(prefBoundsObj, undefined, prefBoundsObj.lr);
                        ctx.updatePaths();
                        targetsHiddenByBounds = ctx.activePhones().filter(p => p.isTarget && !p.hide);
                        targetsHiddenByBounds.forEach(p => ctx.toggleHide(p));
                    }
                });
            }
        }
    }

    GraphToolPlugin.on('tiltReady', initTiltPlugin);
}());
