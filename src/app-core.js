// ============================================================
// === GraphToolPlugin registry ===
// ============================================================
/* Minimal hook bus — lets extracted plugins register for lifecycle events
 * without the main graphtool.js closure needing feature-flag branches. */
const GraphToolPlugin = (function () {
    const hooks = {};
    return {
        on:    function (event, fn) { (hooks[event] = hooks[event] || []).push(fn); },
        _call: function (event) {
            var args = Array.prototype.slice.call(arguments, 1);
            (hooks[event] || []).forEach(function (fn) { fn.apply(null, args); });
        },
    };
}());
window.GraphToolPlugin = GraphToolPlugin;

// Config defaults — runs early so all src/ modules see these before graphtool.js loads
if (typeof extraEnabled            === "undefined") window.extraEnabled            = false;
if (typeof extraEQEnabled          === "undefined") window.extraEQEnabled          = false;
if (typeof extraUploadEnabled      === "undefined") window.extraUploadEnabled      = false;
if (typeof extraMusicEnabled       === "undefined") window.extraMusicEnabled       = false;
if (typeof extraToneGeneratorEnabled=== "undefined") window.extraToneGeneratorEnabled = false;
if (typeof extraPinkNoiseEnabled   === "undefined") window.extraPinkNoiseEnabled   = false;
if (typeof extraEQBands            === "undefined") window.extraEQBands            = 10;
if (typeof extraEQBandsMax         === "undefined") window.extraEQBandsMax         = 10;
if (typeof exportableGraphs        === "undefined") window.exportableGraphs        = false;
if (typeof alt_augment             === "undefined") window.alt_augment             = false;
if (typeof alt_header              === "undefined") window.alt_header              = false;
if (typeof alt_header_new_tab      === "undefined") window.alt_header_new_tab      = false;
if (typeof alt_tutorial            === "undefined") window.alt_tutorial            = false;
if (typeof analyticsEnabled        === "undefined") window.analyticsEnabled        = false;
if (typeof applyStylesheet         === "undefined") window.applyStylesheet         = null;
if (typeof disallow_target         === "undefined") window.disallow_target         = false;
if (typeof restrict_target         === "undefined") window.restrict_target         = false;
if (typeof max_compare             === "undefined") window.max_compare             = Infinity;
if (typeof share_url               === "undefined") window.share_url               = false;
if (typeof stickyLabels            === "undefined") window.stickyLabels            = false;
if (typeof targetColorCustom       === "undefined") window.targetColorCustom       = null;
if (typeof targetDashed            === "undefined") window.targetDashed            = false;
if (typeof targetRestoreLastUsed   === "undefined") window.targetRestoreLastUsed   = false;
if (typeof themingEnabled          === "undefined") window.themingEnabled          = false;
if (typeof premium_html            === "undefined") window.premium_html            = "";
if (typeof tiltableTargets         === "undefined") window.tiltableTargets         = null;
if (typeof customTiltName          === "undefined") window.customTiltName          = typeof default_DF_name !== "undefined" ? default_DF_name : null;
if (typeof dfBaseline              === "undefined") window.dfBaseline              = false;
if (typeof default_bass_shelf      === "undefined") window.default_bass_shelf      = 0;
if (typeof default_tilt            === "undefined") window.default_tilt            = 0;
if (typeof default_ear             === "undefined") window.default_ear             = 0;
if (typeof default_treble          === "undefined") window.default_treble          = 0;
if (typeof harmanFilters           === "undefined") window.harmanFilters           = null;
if (typeof preference_bounds_name  === "undefined") window.preference_bounds_name  = null;
if (typeof preference_bounds_dir   === "undefined") window.preference_bounds_dir   = "data/pref_bounds/";
if (typeof preference_bounds_startup === "undefined") window.preference_bounds_startup = false;

// No-op stubs for EQ-visual functions defined inside addExtra() in graphtool.js.
// These are called from paths that run even when extraEnabled=false (e.g. zoom, y-axis rescale,
// updatePaths). addExtra() replaces them with real implementations when extra is enabled.
if (typeof syncEqPinnedParentTrace              === "undefined") window.syncEqPinnedParentTrace              = () => {};
if (typeof buildEqGraphMarkerLayout             === "undefined") window.buildEqGraphMarkerLayout             = () => null;
if (typeof applyEqFilterMarkerFillAndSize       === "undefined") window.applyEqFilterMarkerFillAndSize       = () => {};
if (typeof applyEqGraphTraceStrokeEmphasis      === "undefined") window.applyEqGraphTraceStrokeEmphasis      = () => {};
if (typeof applyParametricEqGraphTraceFocus     === "undefined") window.applyParametricEqGraphTraceFocus     = () => {};
if (typeof computeEqNodePreviewAtMouse          === "undefined") window.computeEqNodePreviewAtMouse          = () => null;

// ============================================================
// === src/shell/render.js ===
// ============================================================
/* Static DOM shell for the graph tool.
 * Keep this as a classic script so the graph can run without ES modules or a bundler. */
function renderGraphToolShell(doc) {
    doc.html(`
      <svg style="display: none;">
        <defs>
          <g id="baseline-icon" text-anchor="middle" font-size="100px" fill="currentColor">
            <text dominant-baseline="central" y="-57">BASE</text>
            <text dominant-baseline="central" y="57">-LINE</text>
          </g>
          <g id="hide-icon">
            <path d="M2 6Q7 0 12 6Q7 12 2 6Z" stroke-width="1" stroke="currentColor" fill="none"/>
            <circle cx="7" cy="6" r="2" stroke="none" fill="currentColor"/>
            <line stroke-width="1" x1="4.4" y1="10.3" x2="10.4" y2="2.3" class="keyBackground"/>
            <line stroke-width="1" x1="3.6" y1= "9.7" x2= "9.6" y2="1.7" stroke="currentColor"/>
          </g>
          <g id="pin-icon" text-anchor="middle" font-size="100px" fill="currentColor">
            <text dominant-baseline="central">
              PIN
            </text>
          </g>
        </defs>
      </svg>
    
      <main class="main">
        <section class="parts-primary">
        <div class="graphBox" data-sticky-graph="`+ (typeof alt_sticky_graph !== "undefined" ? alt_sticky_graph : true) +`" data-animated="`+ (typeof alt_animated !== "undefined" ? alt_animated : false) +`">
          <div class="graph-sizer">
            <svg id="fr-graph" viewBox="0 0 800 360" data-labels-position="`+ (typeof labelsPosition !== "undefined" ? labelsPosition : "bottom-left") +`"></svg>
          </div>
    
          <div class="tools collapseTools">
            <div class="copy-url">
              <button id="copy-url">Copy URL</button>
              <button id="download-faux">Screenshot</button>
            </div>
    
            <div class="zoom">
              <span>Zoom:</span>
              <button>Bass</button>
              <button>Mids</button>
              <button>Treble</button>
            </div>
    
            <div class="normalize">
              <span>Normalize:</span>
              <div>
                <input type="number" inputmode="decimal" id="norm-phon" required min="0" max="100" value="`+ (typeof default_norm_db !== "undefined" ? default_norm_db : 60) +`" step="1" onclick="this.focus();this.select()"></input>
                <span>dB</span>
              </div>
              <div>
                <input type="number" inputmode="decimal" id="norm-fr" required min="20" max="20000" value="`+ (typeof default_norm_hz !== "undefined" ? default_norm_hz : 500) +`" step="1" onclick="this.focus();this.select()"></input>
                <span>Hz</span>
              </div>
              <span class="helptip">
                ?<span>Choose a dB value to normalize to a target listening level, or a Hz value to make all curves match at that frequency.</span>
              </span>
            </div>
    
            <div class="smooth">
              <span>Smooth:</span>
              <input type="number" inputmode="decimal" id="smooth-level" required min="0" value="5" step="any" onclick="this.focus();this.select()"></input>
            </div>
    
            <div class="miscTools">
              <button id="inspector"><span>╞</span> inspect</button>
              <button id="label"><span>▭</span> label</button>
              <button id="download"><span><u>⇩</u></span> screenshot</button>
              <button id="recolor"><span>○</span> recolor</button>
              <button id="yscalebtn" class="40db">40dB</button>
            </div>
    
            <div class="expand-collapse">
                <button id="expand-collapse"></button>
            </div>
    
            <svg id="expandTools" viewBox="0 0 14 12">
              <path d="M2 2h10M2 6h10M2 10h10" stroke-width="2px" stroke="#878156"    stroke-linecap="round" transform="translate(0,0.3)"/>
              <path d="M2 2h10M2 6h10M2 10h10" stroke-width="2px" stroke="currentColor" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
    
          <div class="manage">
            <table class="manageTable">
              <colgroup>
                <col class="remove">
                <col class="phoneId">
                <col class="key">
                <col class="calibrate">
                <col class="baselineButton">
                <col class="hideButton">
                <col class="lastColumn">
              </colgroup>
              <tbody class="curves"></tbody>
              <tr class="addPhone">
                <td class="addButton">⊕</td>
                <td class="helpText" colspan="5">(or middle/ctrl-click when selecting; or pin other IEMs)</td>
                <td class="addLock">LOCK</td>
              </tr>
              <tr class="mobile-helper"></tr>
            </table>
          </div>
    
          <div class="accessories"></div>
    
          <div class="external-links"></div>
        </section>
    
        <section class="parts-secondary">
          <div class="controls">
            <div class="select" data-selected="models">
              <div class="selector-tabs">
                <button class="brands" data-list="brands">Brands</button>
                <button class="models" data-list="models">Models</button>
                <button class="extra">Equalizer</button>
              </div>
    
              <div class="selector-panel">
                <input class="search" type="text" inputmode="search" placeholder="Search" onclick="this.focus();this.select()"/>
    
                <svg class="chevron" viewBox="0 0 12 8" preserveAspectRatio="none">
                  <path d="M0 0h4c0 1.5,5 3,7 4c-2 1,-7 2.5,-7 4h-4c0 -3,4 -3,4 -4s-4 -1,-4 -4"/>
                </svg>
                <svg class="stop" viewBox="0 0 4 1">
                  <path d="M4 1H0C3 1 3.2 0.8 4 0Z"/>
                </svg>
    
                <div class="scroll-container">
                  <div class="scrollOuter" data-list="brands"><div class="scroll" id="brands"></div></div>
                  <div class="scrollOuter" data-list="models"><div class="scroll" id="phones"></div></div>
                </div>
              </div>
    
              <div class="extra-panel" style="display: none;">
                <div class="extra-eq">
                  <div class="extra-eq-head">
                    <h5 class="extra-eq-panel-title">Parametric Equalizer</h5>
                    <div class="extra-eq-head-trailing">
                      <div class="extra-eq-reset-row">
                        <button type="button" id="extra-eq-reset-btn" class="extra-eq-reset-btn" aria-label="Reset EQ band values (frequency, Q, gain) to flat; constraint presets and limits unchanged">
                          <span class="extra-eq-reset-label">Reset</span>
                          <span class="extra-eq-reset-icon" aria-hidden="true"></span>
                        </button>
                      </div>
                      <button type="button" class="extra-eq-constraints-gear" aria-expanded="false" aria-controls="extra-eq-constraints-body" aria-label="Parametric EQ settings" title="Parametric EQ settings"><span class="extra-eq-constraints-gear-char" aria-hidden="true"></span><span class="extra-eq-constraints-gear-preset-badge" aria-hidden="true" hidden>!</span></button>
                    </div>
                  </div>
                  <div class="extra-eq-constraints">
                    <div id="extra-eq-constraints-body" class="extra-eq-constraints-body" aria-hidden="true">
                    <div class="extra-eq-constraints-inner">
                      <div id="eq-constraint-preset-row" class="eq-constraint-preset-row" hidden>
                        <div class="select-eq-phone eq-constraint-preset-stack">
                          <select id="eq-constraint-preset-display" class="eq-constraint-preset-display" tabindex="-1" aria-hidden="true"></select>
                          <select id="eq-constraint-preset-input" class="eq-constraint-preset-hit" name="eq-constraint-preset" aria-label="Constraint presets" title="Apply a constraint configuration from equalizer-constraints.json"></select>
                        </div>
                      </div>
                      <div class="eq-constraint-top-stack" role="group" aria-label="Filter count and allowed types">
                        <div class="eq-constraint-top-headings">
                          <span class="eq-constraint-col-heading" id="eq-constraint-heading-pk">Peak</span>
                          <span class="eq-constraint-col-heading" id="eq-constraint-heading-lsq">LSQ</span>
                          <span class="eq-constraint-col-heading" id="eq-constraint-heading-hsq">HSQ</span>
                          <span class="eq-constraint-col-heading eq-constraint-col-heading-max-filters">Max Filters</span>
                        </div>
                        <div class="eq-constraint-top-controls">
                          <div class="eq-constraint-top-control-cell">
                            <label class="live-sound-eq-toggle-label extra-eq-constraint-type-switch-label" aria-labelledby="eq-constraint-heading-pk">
                              <span class="live-sound-eq-switch">
                                <span class="live-sound-eq-switch-track">
                                  <input type="checkbox" class="eq-constraint-type-toggle eq-constraint-type-pk" checked aria-label="Allow peaking (PK) filters">
                                  <span class="live-sound-eq-switch-thumb" aria-hidden="true"></span>
                                </span>
                              </span>
                            </label>
                          </div>
                          <div class="eq-constraint-top-control-cell">
                            <label class="live-sound-eq-toggle-label extra-eq-constraint-type-switch-label" aria-labelledby="eq-constraint-heading-lsq">
                              <span class="live-sound-eq-switch">
                                <span class="live-sound-eq-switch-track">
                                  <input type="checkbox" class="eq-constraint-type-toggle eq-constraint-type-lsq" checked aria-label="Allow low shelf (LSQ) filters">
                                  <span class="live-sound-eq-switch-thumb" aria-hidden="true"></span>
                                </span>
                              </span>
                            </label>
                          </div>
                          <div class="eq-constraint-top-control-cell">
                            <label class="live-sound-eq-toggle-label extra-eq-constraint-type-switch-label" aria-labelledby="eq-constraint-heading-hsq">
                              <span class="live-sound-eq-switch">
                                <span class="live-sound-eq-switch-track">
                                  <input type="checkbox" class="eq-constraint-type-toggle eq-constraint-type-hsq" checked aria-label="Allow high shelf (HSQ) filters">
                                  <span class="live-sound-eq-switch-thumb" aria-hidden="true"></span>
                                </span>
                              </span>
                            </label>
                          </div>
                          <div class="eq-constraint-top-control-cell eq-constraint-top-control-cell-max-filters">
                            <input name="eq-constraint-max-bands" class="eq-constraint-max-bands-input" inputmode="numeric" type="number" min="0" max="20" step="1" value="0" aria-label="Maximum active filters (0 = no cap; extra rows stay visible but inactive)" onclick="this.focus();this.select()"></input>
                          </div>
                        </div>
                      </div>
                      <div class="eq-constraint-ranges-block" role="group" aria-label="EQ frequency, gain, and Q limits">
                        <div class="eq-constraint-range-row eq-constraint-range-row-header">
                          <span class="eq-constraint-range-label-slot eq-constraint-ranges-head-cell">Ranges</span>
                          <span class="eq-constraint-range-min-slot eq-constraint-ranges-head-cell">Min</span>
                          <span class="eq-constraint-range-max-slot eq-constraint-ranges-head-cell">Max</span>
                        </div>
                        <div class="eq-constraint-range-row eq-constraint-freq-row">
                          <span class="eq-constraint-range-label-slot eq-constraint-range-name">Frequency</span>
                          <div class="eq-constraint-freq-parametric-cells">
                            <span class="eq-constraint-range-min-slot eq-constraint-range-cell"><input name="eq-constraint-freq-min" inputmode="decimal" type="text" value="0" aria-label="Minimum EQ frequency (0 = no limit); for graphic bands when max is unlimited use comma then space between Hz (e.g. 32, 64, 125)" title="0 = no limit. With max also 0, use comma + space between Hz (e.g. 32, 64, 125) for graphic EQ — not 2,000 (thousands)." onclick="this.focus();this.select()"></input></span>
                            <span class="eq-constraint-range-max-slot eq-constraint-range-cell eq-constraint-input-with-unit eq-constraint-unit-hz"><input name="eq-constraint-freq-max" inputmode="decimal" type="text" value="0" aria-label="Maximum EQ frequency (0 = no limit); for graphic bands when min is unlimited use comma then space between Hz (e.g. 32, 64, 125)" title="0 = no limit. With min also 0, use comma + space between Hz (e.g. 32, 64, 125) for graphic EQ." onclick="this.focus();this.select()"></input></span>
                          </div>
                          <div class="eq-constraint-freq-graphic-full" hidden>
                            <input name="eq-constraint-freq-graphic-list" type="text" class="eq-constraint-freq-graphic-list-input" inputmode="text" value="" autocomplete="off" spellcheck="false" aria-label="Graphic EQ band frequencies in Hz; use a comma then space between values (e.g. 32, 64, 125)" title="Hz with comma + space between bands (e.g. 32, 64, 125, 250). Clear to return to min/max limits." onclick="this.focus();this.select()"></input>
                          </div>
                        </div>
                        <div class="eq-constraint-range-row">
                          <span class="eq-constraint-range-label-slot eq-constraint-range-name">Gain</span>
                          <span class="eq-constraint-range-min-slot eq-constraint-range-cell"><input name="eq-constraint-gain-min" inputmode="decimal" type="number" min="-40" max="40" step="0.1" value="0" aria-label="Minimum gain dB (0 = no limit)" onclick="this.focus();this.select()"></input></span>
                          <span class="eq-constraint-range-max-slot eq-constraint-range-cell eq-constraint-input-with-unit eq-constraint-unit-db"><input name="eq-constraint-gain-max" inputmode="decimal" type="number" min="-40" max="40" step="0.1" value="0" aria-label="Maximum gain dB (0 = no limit)" onclick="this.focus();this.select()"></input></span>
                        </div>
                        <div class="eq-constraint-range-row">
                          <span class="eq-constraint-range-label-slot eq-constraint-range-name">Q</span>
                          <span class="eq-constraint-range-min-slot eq-constraint-range-cell"><input name="eq-constraint-q-min" inputmode="decimal" type="number" min="0" max="10" step="0.1" value="0" aria-label="Minimum Q (0 = no limit)" onclick="this.focus();this.select()"></input></span>
                          <span class="eq-constraint-range-max-slot eq-constraint-range-cell"><input name="eq-constraint-q-max" inputmode="decimal" type="number" min="0" max="10" step="0.1" value="0" aria-label="Maximum Q (0 = no limit)" onclick="this.focus();this.select()"></input></span>
                        </div>
                      </div>
                      <div class="eq-constraint-2ch-row" role="group" aria-label="Stereo EQ banks">
                        <label class="live-sound-eq-toggle-label eq-constraint-2ch-toggle-label"
                            title="Both bank applies to L and R; L and R banks add channel-specific filters on top. With Compare on (live EQ / B), live playback runs separate L/R chains (mono sources are duplicated to each side).">
                          <span class="live-sound-eq-toggle-text">2-Channel Support</span>
                          <span class="live-sound-eq-switch">
                            <span class="live-sound-eq-switch-track">
                              <input type="checkbox" name="eq-constraint-2ch" class="eq-constraint-2ch-toggle" aria-label="Enable separate left and right EQ filter banks"/>
                              <span class="live-sound-eq-switch-thumb" aria-hidden="true"></span>
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                  </div>
                  <div class="select-eq-phone select-eq-phone-model-target">
                    <select name="phone">
                        <option value="" selected>Add a model to the graph</option>
                    </select>
                    <div class="select-eq-phone-target-row">
                      <div class="select-eq-target-select-wrap">
                        <select name="eq-target" aria-label="AutoEQ target curve" title="Trace AutoEQ matches the selected model against">
                            <option value="" selected>Target: Add a target to the graph</option>
                        </select>
                      </div>
                      <button type="button" class="autoeq extra-eq-secondary-btn">Auto EQ</button>
                    </div>
                    <div id="eq-2ch-bank-tabs" class="eq-2ch-bank-tabs" role="tablist" aria-label="EQ filter bank (keyboard L, R, A = all when Extra tab is open)" title="Shortcuts: L = left bank, R = right bank, A = L + R (all channels; not while typing in text fields)" hidden>
                      <div class="eq-2ch-bank-seg-track" data-eq-2ch-pos="1">
                        <span class="eq-2ch-bank-seg-thumb" aria-hidden="true"></span>
                        <div class="eq-2ch-bank-seg-slot" data-slot="L">
                          <span class="eq-2ch-bank-seg-label">L</span>
                          <button type="button" role="tab" class="eq-2ch-bank-seg-btn" data-eq-2ch-bank="L" aria-selected="false" tabindex="-1" aria-label="Left channel filter bank"></button>
                        </div>
                        <div class="eq-2ch-bank-seg-slot" data-slot="both">
                          <span class="eq-2ch-bank-seg-label">L + R</span>
                          <button type="button" role="tab" class="eq-2ch-bank-seg-btn" data-eq-2ch-bank="both" aria-selected="true" tabindex="0" aria-label="L + R — all channels (shared) filter bank"></button>
                        </div>
                        <div class="eq-2ch-bank-seg-slot" data-slot="R">
                          <span class="eq-2ch-bank-seg-label">R</span>
                          <button type="button" role="tab" class="eq-2ch-bank-seg-btn" data-eq-2ch-bank="R" aria-selected="false" tabindex="-1" aria-label="Right channel filter bank"></button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="filters-header">
                    <span>Type</span>
                    <span>Frequency</span>
                    <span>Gain</span>
                    <span>Q</span>
                  </div>
                  <div class="filters">
                    <div class="filter">
                        <span>
                          <input name="enabled" type="checkbox" checked tabindex="-1" aria-label="Enable filter band"></input>
                          <select name="type" tabindex="-1" aria-label="Filter type (PK, LSQ, HSQ)">
                            <option value="PK" selected>PK</option>
                            <option value="LSQ">LSQ</option>
                            <option value="HSQ">HSQ</option>
                          </select>
                        </span>
                        <span><input name="freq" inputmode="decimal" type="number" min="20" max="20000" step="1" value="0" onclick="this.focus();this.select()"></input></span>
                        <span><input name="gain" inputmode="text" type="number" min="-40" max="40" step="0.1" value="0" onclick="this.focus();this.select()"></input></span>
                        <span><input name="q" inputmode="decimal" type="number" min="0" max="10" step="0.1" value="0" onclick="this.focus();this.select()"></input></span>
                    </div>
                  </div>
                  <div class="filters-button">
                    <button class="add-filter">＋</button>
                    <button class="remove-filter">－</button>
                    <button class="sort-filters">Sort</button>
                  </div>
                  <div class="filters-button extra-eq-filter-actions">
                    <button class="import-filters">Import</button>
                    <button class="export-filters">Export</button>
                  </div>
                  <div class="filters-button extra-eq-filter-actions">
                    <button class="export-graphic-filters extra-eq-secondary-btn">Export Graphic EQ (Wavelet)</button>
                  </div>
                  <a style="display: none" id="file-filters-export"></a>
                  <form style="display:none"><input type="file" id="file-filters-import" accept=".txt" /></form>
                </div>
                <div class="live-sound-tools">
                  <div class="live-sound-tools-head">
                    <h5 class="live-sound-tools-title">Sound Tools</h5>
                    <div class="live-sound-tools-head-trailing">
                      <label class="live-sound-eq-toggle-label">
                        <span class="live-sound-eq-toggle-text">Compare</span>
                        <span class="live-sound-eq-switch">
                          <span class="live-sound-eq-switch-track live-sound-eq-switch-track--compare">
                            <input type="checkbox" class="live-sound-eq-toggle" checked aria-label="Compare: when on (B), live playback uses parametric EQ; when off (A), reference path" />
                            <span class="live-sound-eq-switch-thumb live-sound-eq-switch-thumb--compare" aria-hidden="true"><span class="live-sound-eq-switch-thumb-letter live-sound-eq-switch-thumb-letter--a">A</span><span class="live-sound-eq-switch-thumb-letter live-sound-eq-switch-thumb-letter--b">B</span></span>
                            <span class="live-sound-eq-switch-ab-placeholder live-sound-eq-switch-ab-placeholder--a" aria-hidden="true"><span class="live-sound-eq-switch-ab-placeholder-ring"><span class="live-sound-eq-switch-ab-placeholder-letter">A</span></span></span>
                            <span class="live-sound-eq-switch-ab-placeholder live-sound-eq-switch-ab-placeholder--b" aria-hidden="true"><span class="live-sound-eq-switch-ab-placeholder-ring"><span class="live-sound-eq-switch-ab-placeholder-letter">B</span></span></span>
                          </span>
                        </span>
                      </label>
                      <button type="button" class="live-sound-tools-settings-gear" aria-expanded="false" aria-controls="live-sound-tools-settings-body" aria-label="Sound Tools settings" title="Sound Tools settings"><span class="live-sound-tools-settings-gear-char" aria-hidden="true"></span></button>
                    </div>
                  </div>
                  <div class="live-sound-tools-settings">
                    <div id="live-sound-tools-settings-body" class="live-sound-tools-settings-body" aria-hidden="true">
                      <div class="live-sound-tools-settings-inner">
                        <div class="live-sound-volume-row">
                          <span class="live-sound-volume-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-volume"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M15 8a5 5 0 0 1 0 8"></path><path d="M17.7 5a9 9 0 0 1 0 14"></path><path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5"></path></svg></span>
                          <div class="live-sound-slider-row live-sound-volume-slider-row">
                            <input name="live-sound-master-volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Sound Tools output volume" />
                          </div>
                          <span class="live-sound-volume-pct" aria-live="polite"><span class="live-sound-volume-pct-text">100</span>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="live-sound-sources">
                    <div class="live-sound-source extra-music">
                      <div class="live-sound-source-head">
                        <span class="live-sound-source-title">Music</span>
                      </div>
                      <div class="music-playback-panel" aria-hidden="true">
                        <div class="music-playback-panel-inner">
                          <div class="live-sound-source-actions music-play-row">
                            <div class="music-play-or-search-slot">
                              <button type="button" class="play" disabled aria-label="Toggle music playback"></button>
                              <div class="apple-music-search-inline" hidden>
                                <form class="apple-music-preview-form">
                                  <input type="text" id="apple-music-preview-search" class="apple-music-preview-search"
                                      inputmode="search" enterkeyhint="search" role="searchbox"
                                      aria-label="Search Apple Music catalog" placeholder="Search Apple Music catalog"
                                      autocomplete="off" spellcheck="false" />
                                </form>
                                <ul class="apple-music-preview-results" role="listbox" hidden aria-label="Search results"></ul>
                              </div>
                            </div>
                          </div>
                          <div class="live-sound-slider-row music-slider-row">
                            <div class="music-segment-slider music-segment-slider-disabled" role="group" aria-label="Playback and loop range">
                              <div class="music-segment-track">
                                <div class="music-segment-rail-bg" aria-hidden="true"></div>
                                <div class="music-segment-outside music-segment-outside-l" aria-hidden="true"></div>
                                <div class="music-segment-outside music-segment-outside-r" aria-hidden="true"></div>
                                <div class="music-segment-looped" aria-hidden="true"></div>
                                <div class="music-segment-progress" aria-hidden="true"></div>
                                <div class="music-segment-seek"></div>
                                <button type="button" class="music-segment-handle music-segment-handle-start" tabindex="-1" aria-label="Loop start"></button>
                                <button type="button" class="music-segment-handle music-segment-handle-end" tabindex="-1" aria-label="Loop end"></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="live-sound-music-file">
                        <div class="music-file-actions-row">
                          <button type="button" class="music-add-remove">+ Add Music</button>
                          <button type="button" class="music-search-apple" aria-label="Search Apple Music catalog previews">Search Apple</button>
                        </div>
                        <input type="file" class="music-file-input" tabindex="-1" aria-hidden="true"
                            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/x-aac,audio/aac,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/opus,audio/webm,.mp3,.m4a,.aac,.wav,.caf,.flac,.ogg,.opus,.webm,audio/*" />
                      </div>
                    </div>
                    <div class="live-sound-source extra-pink-noise">
                      <div class="live-sound-source-head">
                        <span class="live-sound-source-title">Pink Noise</span>
                      </div>
                      <div class="live-sound-source-actions">
                        <button type="button" class="play" aria-label="Toggle pink noise playback"></button>
                      </div>
                    </div>
                    <div class="live-sound-source extra-tone-generator">
                      <div class="live-sound-source-head">
                        <span class="live-sound-source-title">Tone Generator</span>
                      </div>
                      <div class="live-sound-source-actions tone-generator-play-row">
                        <button type="button" class="play" aria-label="Toggle tone playback"></button>
                      </div>
                      <div class="live-sound-slider-row tone-generator-slider-row">
                        <input name="tone-generator-freq" type="range" min="0" max="1" step="0.0001" value="0" aria-label="Tone frequency along band" />
                        <span class="live-sound-tone-freq-display"><span class="freq-text">1000</span> Hz</span>
                      </div>
                      <div class="live-sound-tone-create-filter">
                        <button type="button" class="tone-generator-add-filter">+ Add Filter</button>
                      </div>
                    </div>
                  </div>
                  <div class="live-sound-band">
                    <span class="live-sound-band-label live-sound-band-heading">Range</span>
                    <div class="live-sound-band-controls">
                      <div class="live-sound-range-reset-row">
                        <button type="button" id="live-sound-range-reset-btn" class="live-sound-range-reset-btn" aria-label="Reset Sound Tools frequency range to full band (20 Hz – 20 kHz)" title="Reset range to full band (20 Hz – 20 kHz)">
                          <span class="live-sound-range-reset-label">Reset</span>
                          <span class="live-sound-range-reset-icon" aria-hidden="true"></span>
                        </button>
                      </div>
                      <div class="live-sound-range-pair">
                        <span><input name="tone-generator-from" inputmode="decimal" type="number" min="20" max="20000" step="1" value="20" aria-label="Minimum frequency" onclick="this.focus();this.select()"></input></span>
                        <span><input name="tone-generator-to" inputmode="decimal" type="number" min="20" max="20000" step="1" value="20000" aria-label="Maximum frequency" onclick="this.focus();this.select()"></input></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="extra-upload">
                  <div class="extra-upload-head">
                    <h5 class="extra-upload-data-title">Upload Data</h5>
                    <span class="extra-upload-note">Warning: Measurements from another rig are not compatible with measurements or targets in this database.</span>
                    <div class="extra-upload-actions">
                      <button type="button" class="upload-fr">Upload FR</button>
                      <button type="button" class="upload-target">Upload Target</button>
                    </div>
                  </div>
                  <form style="display:none"><input type="file" id="file-fr" accept=".csv,.txt" /></form>
                </div>
                <div class="extra-eq-change-history" id="extra-eq-change-history" hidden>
                  <div class="extra-eq-change-history-head">
                    <h5 class="extra-eq-change-history-title">Change History</h5>
                    <p class="extra-eq-change-history-hint">Undo: Ctrl+Z / ⌘Z, Redo: Shift+Ctrl+Z / Shift+⌘Z</p>
                  </div>
                  <div class="extra-eq-change-history-list" id="extra-eq-change-history-list" role="list"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div style="display: none" class="extra-eq-overlay">AutoEQ is running, it could take 5~20 seconds or more.</div>
      </main>
    `);
}

// ============================================================
// === src/url/share.js ===
// ============================================================
/* URL serialization/parsing helpers for graph, EQ, and music share links.
 * Classic script by design: graphtool.js and extra-panel code call these globals directly. */
let eqShareTypeFromIx = (ix) => {
    let n = Math.floor(Number(ix));
    return (n === 1) ? "LSQ" : (n === 2) ? "HSQ" : "PK";
};
let eqShareIxFromType = (t) => {
    let s = String(t || "PK");
    if (s === "LSQ") {
        return 1;
    }
    if (s === "HSQ") {
        return 2;
    }
    return 0;
};
/** ASCII `v2;` rows (much smaller than JSON before base64). Legacy `[` JSON still decoded. */
function eqShareFiltersToV2Ascii(filters) {
    let rows = filters.map((f) => {
        let ti = eqShareIxFromType(f.type);
        return [f.disabled ? 1 : 0, ti, f.freq, f.q, f.gain].join(",");
    });
    return "v2;" + rows.join(";");
}
function eqShareFiltersParseV2Ascii(bin) {
    if (bin.indexOf("v2;") !== 0) {
        return null;
    }
    let body = bin.slice(3);
    if (!body) {
        return [];
    }
    return body.split(";").map((row) => {
        let p = row.split(",");
        return {
            disabled: !!Number(p[0]),
            type: eqShareTypeFromIx(p[1]),
            freq: Number(p[2]) || 0,
            q: Number(p[3]) || 0,
            gain: Number(p[4]) || 0
        };
    });
}
/** Compact base64url for parametric EQ bands in share URLs (`eqFilters`). Prefer v2 text; legacy JSON array still supported. */
function eqShareFiltersSerialize(filters) {
    let s = eqShareFiltersToV2Ascii(filters);
    let b = btoa(s);
    return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function eqShareFiltersDeserialize(s) {
    let pad = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    while (pad.length % 4) {
        pad += "=";
    }
    let bin = atob(pad);
    let v2 = eqShareFiltersParseV2Ascii(bin);
    if (v2) {
        return v2;
    }
    let arr = JSON.parse(bin);
    if (!Array.isArray(arr)) {
        return [];
    }
    return arr.map((x) => (
        x && typeof x === "object" && "t" in x
            ? {
                disabled: !!x.d,
                type: x.t || "PK",
                freq: Number(x.f) || 0,
                q: Number(x.q) || 0,
                gain: Number(x.g) || 0
            }
            : {
                disabled: !!x[0],
                type: eqShareTypeFromIx(x[1]),
                freq: Number(x[2]) || 0,
                q: Number(x[3]) || 0,
                gain: Number(x[4]) || 0
            }
    ));
}
/** Encode model/target fullName for `eqModel` / `eqTarget`: `%20` → `_` for readable URLs (same idea as `share=`).
 * Do not decode with a global `_`→space — names like `B_Media` need `applyPendingEqUrlShare` resolution
 * (`eqResolveShareFullNameFromParam` + legacy segment match). */
function eqShareFullNameToUrlParam(fullName) {
    return encodeURIComponent(String(fullName || "").trim()).replace(/%20/g, "_");
}
function eqShareUrlParamToFullName(seg) {
    if (seg == null || seg === "") {
        return "";
    }
    /* `URLSearchParams.get` already decodes `%XX`; do not map `_`→space — breaks `B_Media`-style names. */
    return String(seg).trim();
}
/** `URLSearchParams` only percent-decodes once. Pasted / redirected links often double-encode (e.g. `%2520`
 * → `%20` left inside the value); decode until no `%HH` remains or string stabilizes. */
function eqShareFullyDecodeQueryValue(val) {
    if (val == null || val === "") {
        return "";
    }
    let s = String(val).trim();
    for (let n = 0; n < 8; n++) {
        if (!/%[0-9A-Fa-f]{2}/i.test(s)) {
            return s;
        }
        try {
            let d = decodeURIComponent(s.replace(/\+/g, " "));
            if (d === s) {
                return s;
            }
            s = d;
        } catch (e) {
            return s;
        }
    }
    return s;
}
/** Share URL query keys (short camelCase). Legacy snake_case still accepted when parsing. */
let EQ_URL_PARAM_MODEL = "eqModel";
let EQ_URL_PARAM_TARGET = "eqTarget";
let EQ_URL_PARAM_FILTERS = "eqFilters";
let EQ_URL_PARAM_MODEL_DATA = "eqModelData";
let EQ_URL_PARAM_TARGET_DATA = "eqTargetData";
/** Decimated FR samples (48 points along the internal `f_values` axis) for URL-safe uploads. */
let EQ_SHARE_FR_DECIM_STEPS = 48;
let EQ_SHARE_FR_DATA_MAX_CHARS = 16384;
/* dB·10 integers; must be wide enough for absolute SPL (e.g. 60–90 dB) from REW uploads — ±40 dB was
 * clamping everything to "40.0 dB" and URLs looked flat. */
let EQ_SHARE_FR_TENTHS_MIN = -6000;
let EQ_SHARE_FR_TENTHS_MAX = 6000;
function eqShareClampFrTenths(n) {
    return Math.max(EQ_SHARE_FR_TENTHS_MIN, Math.min(EQ_SHARE_FR_TENTHS_MAX, n));
}
function eqShareFrCurveChannelForPack(p) {
    if (!p || !phoneCurveDataReadyForEq(p)) {
        return null;
    }
    let rc = p.rawChannels;
    if (!rc || !rc.length) {
        return null;
    }
    let ch = rc.filter(Boolean)[0];
    if (!ch || ch.length < 2) {
        return null;
    }
    /* Prefer full `f_values` grid; sparse uploads are re-interpolated like the upload path. */
    if (ch.length !== f_values.length) {
        try {
            ch = Equalizer.interp(f_values, ch);
        } catch (e) {
            return null;
        }
    }
    return ch;
}
function eqShareDecimateFValuesSamples(fvCurve) {
    let L = fvCurve.length;
    let N = EQ_SHARE_FR_DECIM_STEPS;
    let tenths = [];
    for (let k = 0; k < N; k++) {
        let ix = Math.round(k * (L - 1) / Math.max(1, N - 1));
        let db = fvCurve[ix][1];
        if (!Number.isFinite(db)) {
            db = 0;
        }
        tenths.push(eqShareClampFrTenths(Math.round(db * 10)));
    }
    return tenths;
}
function eqShareFrDataSerializeFromPhone(p) {
    let ch = eqShareFrCurveChannelForPack(p);
    if (!ch) {
        return "";
    }
    let tenths = eqShareDecimateFValuesSamples(ch);
    let body = "v4;" + tenths.join(",");
    try {
        return btoa(body).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) {
        return "";
    }
}
function eqShareFrDataDeserializeToTenths(b64url) {
    let pad = String(b64url || "").replace(/-/g, "+").replace(/_/g, "/");
    while (pad.length % 4) {
        pad += "=";
    }
    let bin;
    try {
        bin = atob(pad);
    } catch (e) {
        return null;
    }
    if (bin.indexOf("v4;") !== 0) {
        return null;
    }
    let parts = bin.slice(3).split(",").map((x) => x.trim()).filter(Boolean);
    if (parts.length < 8) {
        return null;
    }
    let raw = parts.map((x) => {
        let n = parseInt(x, 10);
        if (!Number.isFinite(n)) {
            return 0;
        }
        return eqShareClampFrTenths(n);
    });
    if (raw.length === EQ_SHARE_FR_DECIM_STEPS) {
        return raw;
    }
    /* Proxies / long URLs may truncate the param — resample any reasonable count back to 48. */
    if (raw.length > 96) {
        return null;
    }
    let out = [];
    for (let k = 0; k < EQ_SHARE_FR_DECIM_STEPS; k++) {
        let u = k * (raw.length - 1) / (EQ_SHARE_FR_DECIM_STEPS - 1);
        let i = Math.min(Math.floor(u), raw.length - 2);
        let t = u - i;
        let a = raw[i];
        let b = raw[Math.min(i + 1, raw.length - 1)];
        out.push(eqShareClampFrTenths(Math.round(a + (b - a) * t)));
    }
    return out;
}
function eqShareExpandTenthsToFValuesChannel(tenths) {
    if (!tenths || tenths.length !== EQ_SHARE_FR_DECIM_STEPS) {
        return null;
    }
    let L = f_values.length;
    let N = tenths.length;
    let out = [];
    for (let j = 0; j < L; j++) {
        let u = (j / Math.max(1, L - 1)) * (N - 1);
        let k = Math.min(Math.floor(u), N - 1);
        let t = u - k;
        let k1 = Math.min(k + 1, N - 1);
        let d0 = tenths[k] / 10;
        let d1 = tenths[k1] / 10;
        let db = d0 + (d1 - d0) * t;
        out.push([f_values[j], db]);
    }
    return out;
}
/** Read Equalizer share params from a full page URL (`eqModel` / `eqTarget` / `eqFilters`; no `eq` flag). */
function parseEqUrlShareParams(href) {
    try {
        let u = new URL(href);
        let eqm = u.searchParams.get(EQ_URL_PARAM_MODEL) || u.searchParams.get("eq_model");
        let eqt = u.searchParams.get(EQ_URL_PARAM_TARGET) || u.searchParams.get("eq_target");
        let eqf = u.searchParams.get(EQ_URL_PARAM_FILTERS) || u.searchParams.get("eq_filters");
        let eqmd = u.searchParams.get(EQ_URL_PARAM_MODEL_DATA) || u.searchParams.get("eq_model_data");
        let eqtd = u.searchParams.get(EQ_URL_PARAM_TARGET_DATA) || u.searchParams.get("eq_target_data");
        if (eqm) {
            eqm = eqShareFullyDecodeQueryValue(eqm);
        }
        if (eqt) {
            eqt = eqShareFullyDecodeQueryValue(eqt);
        }
        if (eqf) {
            eqf = eqShareFullyDecodeQueryValue(eqf);
        }
        if (eqmd) {
            eqmd = eqShareFullyDecodeQueryValue(eqmd);
            if (eqmd.length > EQ_SHARE_FR_DATA_MAX_CHARS) {
                eqmd = "";
            }
        }
        if (eqtd) {
            eqtd = eqShareFullyDecodeQueryValue(eqtd);
            if (eqtd.length > EQ_SHARE_FR_DATA_MAX_CHARS) {
                eqtd = "";
            }
        }
        if (!eqm && !eqt && !eqf && !eqmd && !eqtd) {
            return null;
        }
        let filters = null;
        if (eqf) {
            try {
                filters = eqShareFiltersDeserialize(eqf);
            } catch (e) {
                console.warn("eqFilters in URL could not be parsed", e);
            }
        }
        return {
            openEqTab: true,
            model: eqm ? eqShareUrlParamToFullName(eqm) : "",
            target: eqt ? eqShareUrlParamToFullName(eqt) : "",
            modelData: eqmd || "",
            targetData: eqtd || "",
            filters: (filters && filters.length) ? filters : null
        };
    } catch (e) {
        return null;
    }
}
/** Share URL: Apple Music catalog / iTunes store song id (preview loads via catalog or lookup). */
let MUSIC_URL_PARAM_APPLE_SONG = "amSong";
function parseAppleMusicSongIdFromHref(href) {
    try {
        let u = new URL(href);
        let raw = u.searchParams.get(MUSIC_URL_PARAM_APPLE_SONG)
            || u.searchParams.get("appleMusicSong");
        if (raw === null || raw === "") {
            return null;
        }
        let id = String(raw).trim();
        if (!id || id.length > 64) {
            return null;
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
            return null;
        }
        return id;
    } catch (e) {
        return null;
    }
}
/** Normalized loop/trim range (`musicSegStartU` / `musicSegEndU`, 0–1). Omitted when full track; URL order: … `amSong`, `amIn`, `amOut`. */
let MUSIC_URL_PARAM_IN = "amIn";
let MUSIC_URL_PARAM_OUT = "amOut";
let MUSIC_URL_SEG_PARSE_MIN_SPAN_U = 1e-5;
function parseAppleMusicSegmentFromHref(href) {
    try {
        let u = new URL(href);
        let rs = u.searchParams.get(MUSIC_URL_PARAM_IN) || u.searchParams.get("amSegStart");
        let re = u.searchParams.get(MUSIC_URL_PARAM_OUT) || u.searchParams.get("amSegEnd");
        if (rs === null || rs === "" || re === null || re === "") {
            return null;
        }
        let segStartU = parseFloat(String(rs).trim());
        let segEndU = parseFloat(String(re).trim());
        if (!Number.isFinite(segStartU) || !Number.isFinite(segEndU)) {
            return null;
        }
        segStartU = Math.max(0, Math.min(1, segStartU));
        segEndU = Math.max(0, Math.min(1, segEndU));
        if (segEndU - segStartU < MUSIC_URL_SEG_PARSE_MIN_SPAN_U || segStartU >= segEndU) {
            return null;
        }
        return { segStartU, segEndU };
    } catch (e) {
        return null;
    }
}
/** `share=` payload: commas between filenames stay unescaped; each stem is encoded (spaces → "_" first). Avoids `%2C` separators from URLSearchParams. */
function shareQueryValueForUrl(namesArr) {
    return namesArr.map((fn) => encodeURIComponent(String(fn).replace(/ /g, "_"))).join(",");
}
/** Inverse of share line for initial load (`URLSearchParams` gives decoded commas). */
function parseSharePhonesFromHref(href) {
    try {
        let s = new URL(href).searchParams.get("share");
        if (s === null || s === "") {
            return null;
        }
        return String(s).split(",").map((t) =>
            decodeURIComponent(t.trim()).replace(/_/g, " "));
    } catch (e) {
        return null;
    }
}

// ============================================================
// === src/config/user-config-core.js ===
// ============================================================
/* Pure helpers for user-config persistence.
 * Keep these free of browser APIs so they can be tested with `node --test`. */
function userConfigStorageSuffixFromPath(pathname) {
    let pathClean = String(pathname || "").replace(/\W/g, "");
    return pathClean.length > 0 ? "_" + pathClean + "_a" : "_a";
}

function userConfigStorageKeyFromPath(pathname) {
    return "userConfig" + userConfigStorageSuffixFromPath(pathname);
}

function userConfigDataFromPhones(opts) {
    opts = opts || {};
    let pathname = opts.pathname || "";
    let normalMode = opts.normalMode || "dB";
    let normalValue = opts.normalValue;
    let activePhones = Array.isArray(opts.activePhones) ? opts.activePhones : [];
    let activeBaselineFileName = opts.activeBaselineFileName || 0;
    let phones = [];

    activePhones.forEach(function(phone) {
        if (!phone) {
            return;
        }
        let fullName = phone.fullName;
        let fileName = phone.fileName;
        let isTarget = !!phone.isTarget;
        let isHidden = !!phone.hide;
        let isBaseline = fileName === activeBaselineFileName;
        let isPinned = !!phone.pin;

        if (isTarget || isBaseline) {
            phones.push({
                fullName: fullName,
                fileName: fileName,
                isTarget: isTarget,
                isHidden: isHidden,
                isBaseline: isBaseline,
                isPinned: isPinned
            });
        }
    });

    return {
        key: userConfigStorageKeyFromPath(pathname),
        data: {
            phones: phones,
            normalMode: normalMode,
            normalValue: normalValue
        }
    };
}

function userConfigAppendInitReqFromData(initReq, configJson) {
    let out = Array.isArray(initReq) ? initReq : [];
    if (!configJson || !Array.isArray(configJson.phones) || !configJson.phones.length) {
        return out;
    }

    out.slice(0).forEach(function(item) {
        if (item && typeof item.endsWith === "function" && item.endsWith(" Target")) {
            out.splice(out.indexOf(item), 1);
        }
    });

    configJson.phones.forEach(function(phone) {
        if (phone && !out.includes(phone.fileName)) {
            out.push(phone.fileName);
        }
    });

    return out;
}

if (typeof window !== "undefined") {
    window.UserConfigCore = {
        userConfigStorageSuffixFromPath: userConfigStorageSuffixFromPath,
        userConfigStorageKeyFromPath: userConfigStorageKeyFromPath,
        userConfigDataFromPhones: userConfigDataFromPhones,
        userConfigAppendInitReqFromData: userConfigAppendInitReqFromData
    };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        userConfigStorageSuffixFromPath: userConfigStorageSuffixFromPath,
        userConfigStorageKeyFromPath: userConfigStorageKeyFromPath,
        userConfigDataFromPhones: userConfigDataFromPhones,
        userConfigAppendInitReqFromData: userConfigAppendInitReqFromData
    };
}

// ============================================================
// === src/config/user-config.js ===
// ============================================================
/* Browser-side user-config actions. Depends on `UserConfigCore` for the pure logic. */
function getUserConfigCore() {
    return (typeof window !== "undefined" && window.UserConfigCore) ? window.UserConfigCore : null;
}

function getUserConfigStorageKey() {
    let core = getUserConfigCore();
    if (!core) {
        return "userConfig_a";
    }
    return core.userConfigStorageKeyFromPath(new URL(document.URL).pathname);
}

// Update user config for target + baseline
function setUserConfig() {
    let core = getUserConfigCore();
    if (!core) {
        return;
    }
    let keyAndData = core.userConfigDataFromPhones({
        pathname: new URL(document.URL).pathname,
        normalMode: (norm_sel === 1) ? "Hz" : "dB",
        normalValue: (norm_sel === 1) ? norm_fr : norm_phon,
        activePhones: activePhones,
        activeBaselineFileName: baseline.p ? baseline.p.fileName : 0
    });

    localStorage.setItem(keyAndData.key, JSON.stringify(keyAndData.data));
}

// Insert user config phones to inits
function userConfigAppendInits(initReq) {
    if (typeof targetRestoreLastUsed === "undefined" || !targetRestoreLastUsed) {
        return;
    }
    let core = getUserConfigCore();
    if (!core) {
        return;
    }
    let configJson = JSON.parse(localStorage.getItem(getUserConfigStorageKey()));
    core.userConfigAppendInitReqFromData(initReq, configJson);
}

// Apply baseline and hide settings
function userConfigApplyViewSettings(phoneInTable) {
    if (typeof targetRestoreLastUsed === "undefined" || !targetRestoreLastUsed) {
        return;
    }
    userConfigApplicationActive = 1;

    let configJson = JSON.parse(localStorage.getItem(getUserConfigStorageKey()));
    if (configJson) {
        let phone = configJson.phones.find(item => item.fileName === phoneInTable);
        if (typeof phone !== "undefined") {
            let row = document.querySelector("tr[data-filename='"+ phone.fileName +"'][data-manage-main='1']"),
                hideButton = row && row.querySelector("td.hideIcon"),
                baselineButton = row && row.querySelector("td.button-baseline"),
                pinButton = row && row.querySelector("td.button-pin");

            if (phone.isHidden && hideButton
                    && !hideButton.classList.contains("selected")) {
                hideButton.click();
            }

            if (phone.isBaseline && baselineButton
                    && !baselineButton.classList.contains("selected")) {
                baselineButton.click();
            }

            if (phone.isPinned && pinButton
                    && pinButton.getAttribute("data-pinned") !== "true") {
                pinButton.click();
            }
        }
    }

    userConfigApplicationActive = 0;
}

// Apply normalization config
function userConfigApplyNormalization() {
    userConfigApplicationActive = 1;

    let configJson = JSON.parse(localStorage.getItem(getUserConfigStorageKey()));
    if ( configJson && configJson.normalMode === "Hz" ) {
        document.querySelector("input#norm-fr").value = configJson.normalValue;
        document.querySelector("input#norm-fr").dispatchEvent(new Event("change"));
    } else if ( configJson && configJson.normalMode === "dB" ) {
        document.querySelector("input#norm-phon").value = configJson.normalValue;
        document.querySelector("input#norm-phon").dispatchEvent(new Event("change"));
    }

    userConfigApplicationActive = 0;
}

// ============================================================
// === src/chrome/layout.js ===
// ============================================================
/* Page chrome and layout helpers: accessories, header, external links, tutorial, and iframe expansion. */
function addAccessories() {
    let accessoriesBar = document.querySelector("div.accessories"),
        accessoriesContainer = document.createElement("aside");

    if (!accessoriesBar) {
        return;
    }

    accessoriesContainer.innerHTML = whichAccessoriesToUse;
    accessoriesBar.append(accessoriesContainer);
}

function addHeader() {
    let graphToolContainer = document.querySelector("div.graphtool"),
        altHeaderElem = document.createElement("header"),
        headerButton = document.createElement("button"),
        headerLogoElem = document.createElement("div"),
        headerLogoLink = document.createElement("a"),
        headerLogoImg = document.createElement("img"),
        headerLogoSpan = document.createElement("span"),
        linksList = document.createElement("ul");

    if (!graphToolContainer) {
        return;
    }

    headerButton.className = "header-button";
    headerLogoElem.className = "logo";
    headerLogoLink.setAttribute("href", site_url);
    if (headerLogoText) {
        headerLogoSpan.innerText = headerLogoText;
        headerLogoLink.append(headerLogoSpan);
    } else if (headerLogoImgUrl) {
        headerLogoImg.setAttribute("src", headerLogoImgUrl);
        headerLogoLink.append(headerLogoImg);
    }

    altHeaderElem.append(headerButton);
    headerLogoElem.append(headerLogoLink);
    altHeaderElem.setAttribute("data-links", "");
    altHeaderElem.append(headerLogoElem);
    altHeaderElem.className = "header";
    graphToolContainer.prepend(altHeaderElem);

    linksList.className = "header-links";
    altHeaderElem.append(linksList);

    headerLinks.forEach(function(link) {
        let linkContainerElem = document.createElement("li"),
            linkElem = document.createElement("a");

        linkElem.setAttribute("href", link.url);
        if (alt_header_new_tab) { linkElem.setAttribute("target", "_blank"); }
        if (link.external) { linkElem.setAttribute("target", "_blank"); linkElem.classList.add("external"); }
        linkElem.textContent = link.name;
        linkContainerElem.append(linkElem);
        linksList.append(linkContainerElem);
    });

    headerButton.addEventListener("click", function() {
        let headerLinksState = altHeaderElem.getAttribute("data-links");
        if (headerLinksState === "expanded") {
            altHeaderElem.setAttribute("data-links", "collapsed");
        } else {
            altHeaderElem.setAttribute("data-links", "expanded");
        }
    });
}

function addExternalLinks() {
    const externalLinksBar = document.querySelector("div.external-links");

    if (!externalLinksBar) {
        return;
    }

    linkSets.forEach(function(set) {
        let setLabelHtml = document.createElement("span"),
            links = set.links;

        setLabelHtml.textContent = set.label;
        externalLinksBar.append(setLabelHtml);

        links.forEach(function(link) {
            let linkHtml = document.createElement("a");
            linkHtml.textContent = link.name;
            linkHtml.setAttribute("href", link.url);
            externalLinksBar.append(linkHtml);
        });
    });
}

function addTutorial() {
    let partsPrimary = document.querySelector("section.parts-primary"),
        graphContainer = document.querySelector("div.graph-sizer"),
        manageContainer = document.querySelector("div.manage"),
        overlayContainer = document.createElement("div"),
        buttonContainer = document.createElement("div"),
        descriptionContainer = document.createElement("div"),
        zoomButtons = document.querySelectorAll("div.zoom button");

    if (!partsPrimary || !graphContainer || !manageContainer) {
        return;
    }

    overlayContainer.className = "tutorial-overlay";
    graphContainer.prepend(overlayContainer);

    buttonContainer.className = "tutorial-buttons";
    descriptionContainer.className = "tutorial-description";

    manageContainer.prepend(descriptionContainer);
    manageContainer.prepend(buttonContainer);

    tutorialDefinitions.forEach(function(def) {
        let defOverlay = document.createElement("div"),
            defButton = document.createElement("button"),
            defDescription = document.createElement("article"),
            defDescriptionCopy = document.createElement("p");

        defOverlay.setAttribute("tutorial-def", def.name);
        defOverlay.setAttribute("tutorial-on", "false");
        defOverlay.className = "overlay-segment";
        defOverlay.setAttribute("style", "flex-basis: " + def.width + ";");
        overlayContainer.append(defOverlay);

        defButton.setAttribute("tutorial-def", def.name);
        defButton.setAttribute("tutorial-on", "false");
        defButton.className = "button-segment";
        defButton.textContent = def.name;
        buttonContainer.append(defButton);

        defDescription.setAttribute("tutorial-def", def.name);
        defDescription.setAttribute("tutorial-on", "false");
        defDescription.className = "description-segment";
        defDescriptionCopy.innerHTML = def.description;
        defDescription.append(defDescriptionCopy);
        descriptionContainer.append(defDescription);

        defButton.addEventListener("click", function() {
            let activeStatus = defButton.getAttribute("tutorial-on"),
                activeOverlay = document.querySelector("div.overlay-segment[tutorial-on='true']"),
                activeButton = document.querySelector("button.button-segment[tutorial-on='true']"),
                activeDescription = document.querySelector("article.description-segment[tutorial-on='true']");

            if (activeOverlay) { activeOverlay.setAttribute("tutorial-on", "false"); }
            if (activeButton) { activeButton.setAttribute("tutorial-on", "false"); }

            if (activeStatus === "false") {
                if (activeDescription) { activeDescription.setAttribute("tutorial-on", "false"); }

                defOverlay.setAttribute("tutorial-on", "true");
                defButton.setAttribute("tutorial-on", "true");
                defDescription.setAttribute("tutorial-on", "true");

                partsPrimary.setAttribute("tutorial-active", "true");
                disableZoom();

                if (analyticsEnabled) { pushEventTag("tutorial_activated", targetWindow, def.name); }
            } else {
                partsPrimary.setAttribute("tutorial-active", "false");
            }
        });

        defButton.addEventListener("mouseover", function() {
            defOverlay.setAttribute("tutorial-hover", "true");
        });

        defButton.addEventListener("mouseout", function() {
            defOverlay.setAttribute("tutorial-hover", "false");
        });

        defButton.addEventListener("touchend", function() {
            defOverlay.setAttribute("tutorial-hover", "false");
        });
    });

    function disableZoom() {
        let activeZoomButton = document.querySelector("div.zoom button.selected");
        if (activeZoomButton) { activeZoomButton.click(); }
    }

    zoomButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            let tutorialState = document.querySelector("section.parts-primary").getAttribute("tutorial-active");
            if (button.classList.contains("selected") && tutorialState === "true") {
                let activeOverlay = document.querySelector("div.overlay-segment[tutorial-on='true']"),
                    activeButton = document.querySelector("button.button-segment[tutorial-on='true']"),
                    activeDescription = document.querySelector("article.description-segment[tutorial-on='true']");

                document.querySelector("section.parts-primary").setAttribute("tutorial-active", "false");
                if (activeOverlay) { activeOverlay.setAttribute("tutorial-on", "false"); }
                if (activeButton) { activeButton.setAttribute("tutorial-on", "false"); }
                if (activeDescription) { activeDescription.setAttribute("tutorial-on", "false"); }
            }
        });
    });
}

function setActiveDatabase() {
    let url = (typeof targetWindow !== "undefined" && targetWindow && targetWindow.location)
        ? targetWindow.location.href
        : window.location.href,
        dbLinks = document.querySelectorAll("div.external-links a");

    if (!dbLinks || !dbLinks.length) {
        return;
    }

    dbLinks.forEach(function(link) {
        let linkUrl = link.getAttribute("href");
        if (url.includes(linkUrl)) {
            link.setAttribute("class", "active");
        }
    });
}

function toggleExpandCollapse() {
    const graphIsIframe = (window.top !== window.self) ? true : false,
        graphBody = document.querySelector("body"),
        parentBody = window.top.document.querySelector("body"),
        expandCollapseButton = document.querySelector("button#expand-collapse");

    if (!graphBody || !parentBody || !expandCollapseButton) {
        return;
    }

    if (graphIsIframe) { graphBody.setAttribute("data-graph-frame", "collapsed"); }

    if (graphIsIframe && expandableOnly) {
        const expandOnlyMax = (expandableOnly === true) ? 1000000 : expandableOnly,
            expandOnlyStyle = document.createElement("style"),
            expandOnlyCss = `
            @media ( max-width: ` + expandOnlyMax + `px ) {
                body[data-expandable="only"][data-graph-frame="collapsed"] {
                    overflow: hidden;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse {
                    position: fixed;
                    top: 0;
                    left: 0;

                    display: flex;
                    justify-content: center;
                    align-items: center;

                    width: 100%;
                    height: 100%;
                    padding: 0;

                    background-color: var(--background-color);
                    background-color: transparent;
                    border: none;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse:after {
                    position: absolute;

                    content: 'Tap to launch graph tool';

                    color: var(--font-color-primary);
                    font-family: var(--font-secondary);
                    font-size: 11px;
                    line-height: 1em;
                    text-transform: uppercase;

                    pointer-events: none;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse button#expand-collapse {
                    display: flex;
                    justify-content: center;
                    align-items: center;

                    width: 100%;
                    height: 100%;

                    background-color: transparent;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse button#expand-collapse:before {
                    position: relative;
                    z-index: 1;

                    transform: scale(7);
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse button#expand-collapse:after {
                    position: absolute;
                    top: 0;
                    left: 0;

                    content: '';

                    display: block;
                    width: 100%;
                    height: 100%;

                    background-color: var(--background-color);

                    opacity: 0.9;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] section.parts-primary {
                    flex: 100% 1 1;
                    overflow: hidden;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] section.parts-secondary {
                    display: none;
                }
            }
        `;

        expandOnlyStyle.textContent = expandOnlyCss;
        expandOnlyStyle.setAttribute("type", "text/css");
        document.querySelector("body").append(expandOnlyStyle);
        graphBody.setAttribute("data-expandable", "only");
    } else if (graphIsIframe && expandable) {
        graphBody.setAttribute("data-expandable", "true");
    }

    const parentStyle = window.top.document.createElement("style"),
        parentCss = `
            :root {
                --header-height: ` + headerHeight + `;
            }

            body[data-graph-frame="expanded"] {
                width: 100%;
                height: 100%;
                max-height: -webkit-fill-available;
                overflow: hidden;
            }

            body[data-graph-frame="expanded"] button.graph-frame-collapse {
                display: inherit;
            }

            body[data-graph-frame="expanded"] iframe#GraphTool {
                position: fixed;
                top: var(--header-height);
                left: 0;

                width: 100% !important;
                height: calc(100% - var(--header-height)) !important;

                animation-name: graph-tool-expand;
                animation-duration: 0.15s;
                animation-iteration-count: 1;
                animation-timing-function: ease-out;
                animation-fill-mode: forwards;
            }

            @keyframes graph-tool-expand {
                0% {
                    position: relative;
                    opacity: 1.0;
                    transform: scale(1.0);
                }
                48% {
                    position: relative;
                    opacity: 0.0;
                    transform: scale(0.9);
                }
                50% {
                    position: fixed;
                    opacity: 0.0;
                    transform: scale(0.9);
                }
                52% {
                    position: fixed;
                    opacity: 0.0;
                    transform: scale(0.9);
                }
                100% {
                    position: fixed;
                    opacity: 1.0;
                    transform: scale(1.0);
                }
            }`;

    parentStyle.textContent = parentCss;
    parentStyle.setAttribute("type", "text/css");
    parentBody.append(parentStyle);

    expandCollapseButton.addEventListener("click", function(e) {
        let frameState = document.querySelector("body").getAttribute("data-graph-frame");

        if (frameState === "expanded") {
            graphBody.setAttribute("data-graph-frame", "collapsed");
            parentBody.setAttribute("data-graph-frame", "collapsed");
        } else {
            graphBody.setAttribute("data-graph-frame", "expanded");
            parentBody.setAttribute("data-graph-frame", "expanded");
        }

        e.stopPropagation();
    });
}

// These build chrome (header, external links, tutorial, accessories) into the
// graphtool shell, so they must run AFTER renderGraphToolShell() has populated
// div.graphtool. graphtool.js invokes this right after rendering the shell.
function initLayoutChrome() {
    if (typeof accessories !== "undefined" && accessories) { addAccessories(); }
    if (typeof alt_header !== "undefined" && alt_header) { addHeader(); }
    if (typeof externalLinksBar !== "undefined" && externalLinksBar) { addExternalLinks(); }
    if (typeof alt_tutorial !== "undefined" && alt_tutorial) { addTutorial(); }
    setActiveDatabase();
}
window.initLayoutChrome = initLayoutChrome;

// ============================================================
// === src/extra/panel.js ===
// ============================================================
/* Extra panel and live-sound mode controls.
 * Kept as a classic script so graphtool.js can stay non-module. */
let activeLiveSoundPlayer = "pink";
Object.defineProperty(window, 'activeLiveSoundPlayer', { get: () => activeLiveSoundPlayer, set: v => { activeLiveSoundPlayer = v; }, configurable: true });
let extraPanelCtx = null;

function liveSoundPlayersCycleOrder() {
    let hasMusic = !!(typeof musicFileLoaded !== "undefined" && musicFileLoaded
        && typeof musicPlayButton !== "undefined" && musicPlayButton
        && typeof musicAudio !== "undefined" && musicAudio);
    return hasMusic ? ["music", "pink", "tone"] : ["pink", "tone"];
}

function ensureActiveLiveSoundPlayerValid() {
    let order = liveSoundPlayersCycleOrder();
    if (order.indexOf(activeLiveSoundPlayer) < 0) {
        activeLiveSoundPlayer = order[0];
    }
}

function cycleActiveLiveSoundPlayerShiftSpace() {
    ensureActiveLiveSoundPlayerValid();
    let order = liveSoundPlayersCycleOrder();
    let i = Math.max(0, order.indexOf(activeLiveSoundPlayer));
    activeLiveSoundPlayer = order[(i + 1) % order.length];
}

function showExtraPanel() {
    let ctx = extraPanelCtx || {};
    document.querySelector("div.select > div.selector-panel").style["display"] = "none";
    document.querySelector("div.select > div.extra-panel").style["display"] = "flex";
    document.querySelector("div.select").setAttribute("data-selected", "extra");
    if (analyticsEnabled) { pushEventTag("clicked_equalizerTab", targetWindow); }
    if (typeof window.updateEQPhoneSelect === "function") {
        window.updateEQPhoneSelect();
    }
    if (typeof ctx.applyParametricEqGraphTraceFocus === "function") { ctx.applyParametricEqGraphTraceFocus(); }
    if (typeof ctx.updateEqTraceOpacity === "function") { ctx.updateEqTraceOpacity(); }
    if (typeof ctx.updateEqFilterMarkers === "function") { ctx.updateEqFilterMarkers(); }
    if (ctx.eqSoundRangeUiHooks && typeof ctx.eqSoundRangeUiHooks.syncBrushFromInputs === "function") {
        ctx.eqSoundRangeUiHooks.syncBrushFromInputs();
    }
    if (typeof ctx.updatePhoneTable === "function") { ctx.updatePhoneTable(); }
    if (typeof window.publishEqUiState === "function") {
        window.publishEqUiState("showExtraPanel");
    }
    if (typeof ifURL !== "undefined" && ifURL && typeof addPhonesToUrl === "function") {
        addPhonesToUrl();
    }
    if (typeof musicFileLoaded !== "undefined" && musicFileLoaded
            && typeof musicPlayButton !== "undefined" && musicPlayButton
            && typeof musicAudio !== "undefined" && musicAudio) {
        activeLiveSoundPlayer = "music";
    } else {
        ensureActiveLiveSoundPlayerValid();
    }
}

function hideExtraPanel(selectedList) {
    let ctx = extraPanelCtx || {};
    document.querySelector("div.select > div.selector-panel").style["display"] = "flex";
    document.querySelector("div.select > div.extra-panel").style["display"] = "none";
    document.querySelector("div.select").setAttribute("data-selected", selectedList);
    if (typeof ctx.setEqFilterSelectedRow === "function") { ctx.setEqFilterSelectedRow(null); }
    if (typeof ctx.syncEqHoverPreview === "function") { ctx.syncEqHoverPreview(null); }
    if (typeof ctx.applyParametricEqGraphTraceFocus === "function") { ctx.applyParametricEqGraphTraceFocus(); }
    if (typeof ctx.updateEqTraceOpacity === "function") { ctx.updateEqTraceOpacity(); }
    /* Match showExtraPanel: table was filtered to EQ focus context; restore full rows when leaving. */
    if (typeof ctx.updatePhoneTable === "function") { ctx.updatePhoneTable(); }
}

function initExtraPanel(ctx) {
    extraPanelCtx = ctx || {};
    if (!extraPanelCtx.extraButton) {
        return;
    }
    if (extraPanelCtx.extraButton.__extraPanelBound) {
        return;
    }
    extraPanelCtx.extraButton.__extraPanelBound = true;
    extraPanelCtx.extraButton.addEventListener("click", showExtraPanel);
}

// ============================================================
// === src/extra/index.js ===
// ============================================================
/* Extra panel feature orchestration. Keep this as a classic script for isolated, ordered loading. */
function initExtraModules(app) {
    app = app || {};
    if (typeof initExtraPanel === "function") {
        initExtraPanel(app.extraButton);
    }
    if (typeof initExtraUpload === "function") {
        initExtraUpload(app);
    }
}
