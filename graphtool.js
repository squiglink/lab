// Config defaults moved to src/app-core.js (loads before graphtool.js)

let doc = d3.select(".graphtool");
renderGraphToolShell(doc);
if (typeof initLayoutChrome === "function") { initLayoutChrome(); }
if (typeof setupLabelUi === "function") { setupLabelUi(); }
if (typeof setupSmoothingUi === "function") { setupSmoothingUi(); }
if (typeof setupAddPhoneUi === "function") { setupAddPhoneUi(); }


let pad = { l:15, r:15, t:10, b:36 };
let W0 = 800, W = W0 - pad.l - pad.r,
    H0 = 360, H = H0 - pad.t - pad.b;

let gr = doc.select("#fr-graph"),
    defs = gr.append("defs");


gr.append("rect").attrs({x:0, y:pad.t-8, width:W0, height:H0-22, rx:4,
                         "class":"graphBackground"});
watermark(gr);


// Scales
let x = d3.scaleLog()
    .domain([20,20000])
    .range([pad.l,pad.l+W]);

let yD = [29.5,85], // Decibels
    yR = [pad.t+H,pad.t+10];
let y = d3.scaleLinear().domain(yD).range(yR);

Object.defineProperty(window, 'x',   { get: () => x,   configurable: true });
Object.defineProperty(window, 'y',   { get: () => y,   configurable: true });
Object.defineProperty(window, 'pad', { get: () => pad, configurable: true });
Object.defineProperty(window, 'W',   { get: () => W,   configurable: true });
Object.defineProperty(window, 'H',   { get: () => H,   configurable: true });


// y axis
defs.append("filter").attr("id","blur").attr("filterUnits","userSpaceOnUse")
    .attrs({x:-W-4,y:-2,width:W+8,height:4})
    .append("feGaussianBlur").attr("in","SourceGraphic")
    .attr("stdDeviation", 0.8);
let yAxis = d3.axisLeft(y).tickSize(W).tickSizeOuter(0).tickPadding(1);
function fmtY(ya) {
    let d = y.domain(),
        r = d[1] - d[0],
        t = r<40 ? 1 : 5,
        y0= Math.ceil (d[0]/t),
        y1= Math.floor(d[1]/t),
        isMinor = t===5 ? (()=>false) : ((_,i)=>(y0+i)%5!==0);
    yAxis.tickValues(d3.range(y1-y0+1).map(i=>t*(y0+i)))(ya);
    ya.select(".domain").remove();
    ya.selectAll(".tick line")
      .attr("stroke-linecap", "round")
      .attrs((_,i) => {
          let m = isMinor(_,i);
          return {
              filter: m ? null : "url(#blur)",
              "stroke-width": m ? 0.2*(1-r/45) : 0.15*(1+45/r)
          };
      });
    ya.selectAll(".tick text")
      .attr("text-anchor","start")
      .attr("x",-W+3)
      .attr("dy",-2)
      .filter(isMinor).attr("display","none");
}
let yAxisObj = gr.append("g")
    .attr("transform", "translate("+(pad.l+W)+",0)")
    .call(fmtY);
yAxisObj.insert("text")
    .attr("transform","rotate(-90)")
    .attr("fill","currentColor")
    .attr("text-anchor","end")
    .attr("y",-W-2).attr("x",-pad.t)
    .text("dB");


// x axis
let xvals = [2,3,4,5,6,8,10,15];
let xAxis = d3.axisBottom(x)
    .tickSize(H+3).tickSizeOuter(0)
    .tickValues(d3.merge([1,2,3].map(e=>xvals.map(m=>m*Math.pow(10,e)))).concat([20000]))
    .tickFormat(f => f>=1000 ? (f/1000)+"k" : f);

let tickPattern = [3,0,0,1,0,0,2,0],
    getTickType = i => i===0 || i===3*8 ? 4 : tickPattern[i%8],
    tickThickness = [2,4,4,9,15].map(t=>t/10);

function fmtX(xa) {
    xAxis(xa);
    (xa.selection ? xa.selection() : xa).select(".domain").remove();
    xa.selectAll(".tick line")
      .attr("y1", 10)
      .attr("y2", 312)
      .attr("stroke", "#333")
      .attr("stroke-width", (_,i) => tickThickness[getTickType(i)]);
    xa.selectAll(".tick text").filter((_,i) => tickPattern[i%8] === 0)
      .attr("font-size","86%")
      .attr("font-weight","lighter");
    xa.select(".tick:last-of-type text")
      .attr("dx",-5)
      .text("20kHz");
    xa.select(".tick:first-of-type text")
      .attr("dx",4)
      .text("20Hz");
}
defs.append("clipPath").attr("id","x-clip")
    .append("rect").attrs({x:0, y:0, width:W0, height:H0});
let xAxisObj = gr.append("g")
    .attr("clip-path", "url(#x-clip)")
    .attr("transform", "translate(0,"+pad.t+")")
    .call(fmtX);


// Plot line
defs.selectAll().data([0,1]).join("linearGradient")
    .attrs({x1:0,y1:0, x2:1,y2:0})
    .attr("id", i=>"grad"+i)
    .selectAll().data(i=>[i,1-i]).join("stop")
    .attr("offset",(_,i)=>i)
    .attr("stop-color",j=>["black","white"][j]);
let fW = 7,  // Fade width
    fWm= 30; // Width at an interior edge
let fade = defs.append("mask")
    .attr("id", "graphFade")
    .attr("maskUnits", "userSpaceOnUse")
    .append("g").attr("transform", "translate("+pad.l+","+pad.t+")");
fade.append("rect").attrs({ x:0, y:0, width:W, height:H, fill:"white" });
let fadeEdge = fade.selectAll().data([0,1]).join("rect")
    .attrs(i=>({ x:i?W-fW:0, width:fW, y:0,height:H, fill:"url(#grad"+i+")" }));
let spectrumClipBleed = 4;
defs.append("clipPath").attr("id", "spectrum-clip-inner")
    .append("rect").attrs({
        x: -spectrumClipBleed,
        y: -spectrumClipBleed,
        width: W + 2 * spectrumClipBleed,
        height: H + 2 * spectrumClipBleed
    });
let line = d3.line()
    .x(d=>x(d[0]))
    .y(d=>y(d[1]))
    .curve(d3.curveNatural);
window.line = line;

// Range buttons
let selectedRange = 3; // Full range
let ranges = [[20,400],[100,4000],[1000,20000], [20,20000]],
    edgeWs = [[fW,fWm],[fWm,fWm],[fWm,fW],[fW,fW]];
let rangeSel = doc.select(".zoom").selectAll("button");
rangeSel.on("click", function (_,i) {
    let r = selectedRange,
        s = selectedRange = r===i ? 3 : i;
    rangeSel.classed("selected", (_,j)=>j===s);
    x.domain(ranges[s]);
    // More time to go between bass and treble
    let dur = Math.min(r,s)===0 && Math.max(r,s)===2 ? 1100 : 700;
    clearLabels();
    gpath.selectAll("path").transition().duration(dur).attr("d", drawLine)
        .on("end", () => updateEqFilterMarkers());
    let e = edgeWs[s];
    fadeEdge.transition().duration(dur).attrs(i=>({x:i?W-e[i]:0, width:e[i]}));
    xAxisObj.transition().duration(dur).call(fmtX);
});


// y-axis scaler
let dB = {
    y: y(60),
    h: 15,
    H: y(60)-y(70),
    min: pad.t,
    max: pad.t+H,
    tr: _ => "translate("+(pad.l-9)+","+dB.y+")"
};
window.dB = dB;
dB.all = gr.append("g").attr("class","dBScaler"),
dB.trans = dB.all.append("g").attr("transform", dB.tr()),
dB.scale = dB.trans.append("g").attr("transform", "scale(1,1)");
dB.scale.selectAll().data([-1,1])
    .join("path").attr("stroke","none")
    .attr("d", function (s) {
        function getPathPart(l) {
            let v=l[0].toLowerCase()==="v";
            for (let i=2-v; i<l.length; i+=2)
                l[i] *= s;
            return l[0]+l.slice(1).join(" ");
        }
        return [ ["M", 9.9,-1   ],
                 ["V",      dB.H],
                 ["h",-1        ],
                 ["l",-1  ,-1.5 ],
                 ["l",-2.1, 2   ],
                 ["h",-5.6      ],
                 ["v",     -1.5 ],
                 ["q",7,2,8,-7  ],
                 ["V",     29   ],
                 ["c",1,-16,-10,-15,-10,-14],
                 ["V",     -1   ] ].map(getPathPart).join("");
    });
dB.scale.selectAll().data([10,7,13])
    .join("rect").attrs((d,i)=>({x:i*2.8,y:-d,width:0.8,height:2*d,fill:"#bbb"}));
function getDrag(fn) {
    return d3.drag()
        .on("drag",fn)
        .on("start",function(){dB.all.classed("active",true );})
        .on("end"  ,function(){dB.all.classed("active",false);});
}
dB.mid = dB.all.append("rect")
    .attrs({x:(pad.l-11),y:dB.y-dB.h,width:12,height:2*dB.h,opacity:0})
    .call(getDrag(function () {
        dB.y = d3.event.y;
        dB.y = Math.min(dB.y, dB.max-dB.h*(dB.H/15));
        dB.y = Math.max(dB.y, dB.min+dB.h*(dB.H/15));
        d3.select(this).attr("y",dB.y-dB.h);
        dB.trans.attr("transform", dB.tr());
        dB.updatey();
    }));
dB.circ = dB.trans.selectAll().data([-1,1]).join("circle")
    .attrs({cx:5,cy:s=>dB.H*s,r:7,opacity:0})
    .call(getDrag(function () {
        let h  = Math.max(30, Math.abs(d3.event.y));
        h = Math.min(h, Math.min(dB.max-dB.y, dB.y-dB.min));
        let sc = h/dB.H;
        dB.circ.attr("cy",s=>h*s);
        dB.scale.attr("transform", "scale(1,"+sc+")");
        dB.h = 15*sc;
        dB.mid.attrs({y:dB.y-dB.h,height:2*dB.h});
        dB.updatey();
    }));
let yCenter = 60;
dB.updatey = function (dom) {
    let d = l => l[1]-l[0];
    y.domain(yR.map(y=>yCenter+(y-dB.y)*(15/dB.h)*d(yD)/d(yR)));
    yAxisObj.call(fmtY);
    let getTr = o => o ? "translate(0,"+(y(o)-y(0))+")" : null;
    clearLabels();
    gpath.selectAll("path").call(redrawLine);
    updateEqFilterMarkers();
}


// y-scale presets (matches PublicGraphTool)
const defY = dB.y;
const scales = {
    "20db": {name:"20dB", h:152,      y:defY},
    "30db": {name:"30dB", h:101.33,   y:defY},
    "40db": {name:"40dB", h:dB.H,     y:defY},
    "50db": {name:"50dB", h:60.79,    y:defY},
    "crin": {name:"Crin", h:54.77,    y:defY},
};
function changeScaling(to) {
    let btn = document.querySelector("#yscalebtn");
    let s = scales[to.toLowerCase()];
    if (!s) return;
    let sc = s.h / dB.H;
    dB.h = 15 * sc;
    dB.y = s.y;
    dB.circ.attr("cy", sm => s.h * sm);
    dB.scale.attr("transform", "scale(1," + sc + ")");
    dB.mid.attrs({y: dB.y - dB.h, height: 2 * dB.h});
    dB.trans.attr("transform", dB.tr());
    if (btn) { btn.className = s.name.toLowerCase(); btn.innerHTML = s.name; }
    dB.updatey();
}
window.changeScaling = changeScaling;
doc.select("#yscalebtn").on("click", function() {
    let keys = Object.keys(scales);
    let i = keys.indexOf(this.className);
    changeScaling(keys[(i + 1) % keys.length]);
});

// File loading, channel management, measurement init moved to src/graph-renderer.js

let activePhones = [];
window.activePhones = activePhones;
/** Maps init / share `fileName` to ordinal so `activePhones` matches init order after async loads. */
let initPhoneOrderIndex = new Map();
function setInitPhoneOrderFromReq(req) {
    initPhoneOrderIndex.clear();
    if (!req || !Array.isArray(req)) {
        return;
    }
    req.forEach((name, i) => {
        let k = String(name || "").trim();
        if (k && !initPhoneOrderIndex.has(k)) {
            initPhoneOrderIndex.set(k, i);
        }
    });
}
function initOrderRankForPhone(p) {
    if (!p) {
        return null;
    }
    let fn = String(p.fileName || "").trim();
    if (initPhoneOrderIndex.has(fn)) {
        return initPhoneOrderIndex.get(fn);
    }
    if (p.copyOf) {
        let root = p.copyOf,
            pf = String(root.fileName || "").trim();
        if (initPhoneOrderIndex.has(pf)) {
            let base = initPhoneOrderIndex.get(pf),
                objs = root.objs || [root],
                j = objs.indexOf(p);
            if (j < 0) {
                j = objs.length;
            }
            return base + j * 1e-4;
        }
    }
    return null;
}
function reorderActivePhonesByInitOrder() {
    if (!initPhoneOrderIndex.size) {
        return;
    }
    let orig = new Map();
    activePhones.forEach((q, i) => orig.set(q, i));
    activePhones.sort((a, b) => {
        let ra = initOrderRankForPhone(a),
            rb = initOrderRankForPhone(b);
        if (ra == null) {
            ra = 1e6 + orig.get(a) * 1e-6;
        }
        if (rb == null) {
            rb = 1e6 + orig.get(b) * 1e-6;
        }
        if (ra !== rb) {
            return ra - rb;
        }
        return orig.get(a) - orig.get(b);
    });
}
/** Targets first, then non-targets; relative order preserved within each group (table + graph). */
function phonesClusteredTargetsFirst(list) {
    return list.filter((p) => p && p.isTarget).concat(list.filter((p) => p && !p.isTarget));
}
/** Curve draw order: targets first in DOM so they paint under IEM traces (SVG paint = document order). */
function curvesTargetsFirstForPaint(curves) {
    let t = [],
        o = [];
    (curves || []).forEach((c) => {
        if (c && c.p && c.p.isTarget) {
            t.push(c);
        } else {
            o.push(c);
        }
    });
    return t.concat(o);
}
/** IEMs first (for pointer hit-tests so ties pick the measurement over a target). */
function curvesPhonesFirstForPointer(curves) {
    let t = [],
        o = [];
    (curves || []).forEach((c) => {
        if (c && c.p && c.p.isTarget) {
            t.push(c);
        } else {
            o.push(c);
        }
    });
    return o.concat(t);
}
function clusterTargetsFirstInActivePhones() {
    let next = phonesClusteredTargetsFirst(activePhones);
    activePhones.length = 0;
    activePhones.push(...next);
}
let phoneManageIdentityMap = new WeakMap(),
    phoneManageIdentitySeq = 1;
function phoneManageIdentity(p) {
    if (p == null) return 0;
    let v = phoneManageIdentityMap.get(p);
    if (v == null) {
        v = phoneManageIdentitySeq++;
        phoneManageIdentityMap.set(p, v);
    }
    return v;
}
let baseline0 = { p:null, l:null, fn:l=>l },
    baseline = baseline0;
Object.defineProperty(window, 'baseline', { get: () => baseline, set: v => { baseline = v; }, configurable: true });

/* EQ graph markers + FR curve strokes. Marker UNSEL_/SEL_* fill/stroke: "trace", "graph", or CSS. */
const EQ_GRAPH_MARKER_HIT_PX = 28;
const EQ_GRAPH_MARKER_R_BASE = 2.5;
const EQ_GRAPH_MARKER_UNSEL_SCALE = 1;
const EQ_GRAPH_MARKER_UNSEL_STROKE = "trace";
const EQ_GRAPH_MARKER_UNSEL_FILL = "graph";
const EQ_GRAPH_MARKER_UNSEL_HOVER_SCALE = 1;
const EQ_GRAPH_MARKER_SEL_SCALE = 1.8;
const EQ_GRAPH_MARKER_SEL_STROKE = "graph";
const EQ_GRAPH_MARKER_SEL_FILL = "trace";
const EQ_GRAPH_MARKER_SEL_HOVER_SCALE = 1.2;
const EQ_GRAPH_MARKER_STROKE_W = 4;
const EQ_GRAPH_MARKER_STROKE_HOVER_MULT = 2;
/** Base stroke width in SVG user units (sample vs main traces). Not overridden by CSS when scoped in style.css. */
const EQ_GRAPH_TRACE_STROKE_SAMPLE = 1.9;
const EQ_GRAPH_TRACE_STROKE_NORMAL = 2.3;
const EQ_GRAPH_TRACE_STROKE_EMPH_MULT = 2;

// isCompensationTargetNameMatch, TARGET_TRACE_DOT_SPECS, target trace functions, color helpers moved to src/graph-renderer.js

let gpath = gr.insert("g",".dBScaler")
    .attr("fill","none")
    .attr("stroke-width", EQ_GRAPH_TRACE_STROKE_NORMAL)
    .attr("class", "curves-g")
    .attr("mask","url(#graphFade)");
window.gpath = gpath;
function eqMarkerResolvePaint(spec, traceCol) {
    if (spec === "trace") {
        /* d3 / browser color parsing may call .match on strings; null/empty breaks updates. */
        if (traceCol != null && traceCol !== "" && traceCol !== "none") {
            return traceCol;
        }
        return "#888888";
    }
    if (spec === "graph") {
        return "var(--background-color-graph)";
    }
    return spec;
}
/** Named d3 transition for EQ trace emphasis only (do not interrupt path "d" tweens). */
const EQ_GRAPH_TRACE_EM_TNAME = "eq-trace-em";
/** After updatePaths join, paths must carry explicit stroke-width; inherited + d3.attr tween
    from missing attribute can interpolate from 0 → hairline traces after Q/EQ updates. */
function resetGraphPathStrokesToBase() {
    gpath.selectAll("path").each(function () {
        let n = d3.select(this);
        n.interrupt(EQ_GRAPH_TRACE_EM_TNAME);
        let c = n.datum();
        let base = this.classList.contains("sample")
            ? EQ_GRAPH_TRACE_STROKE_SAMPLE
            : EQ_GRAPH_TRACE_STROKE_NORMAL;
        let sw = (c && c.p && c.p.isTarget) ? targetTraceStrokeWidthForPhone(c.p) : base;
        n.attr("stroke-width", sw);
    });
}
let gEqFilterMarkers = gr.append("g")
    .attr("class", "eq-filter-markers")
    .attr("pointer-events", "none")
    .attr("mask", "url(#graphFade)");
window.gEqFilterMarkers = gEqFilterMarkers;
let gEqHoverPreview = gr.append("g")
    .attr("class", "eq-hover-preview")
    .attr("pointer-events", "none")
    .attr("mask", "url(#graphFade)");
window.gEqHoverPreview = gEqHoverPreview;
let gEqSoundRangeBrush = gr.insert("g", ".eq-hover-preview")
    .attr("class", "eq-sound-range-brush")
    .attr("pointer-events", "none")
    .attr("mask", "url(#graphFade)");
window.gEqSoundRangeBrush = gEqSoundRangeBrush;
/** Set in addExtra: redraw Sound Tools range band on graph after zoom / input changes. */
let eqSoundRangeUiHooks = { syncBrushFromInputs: () => {} };
window.updateEqTraceOpacity = () => {};
/** Set in addExtra: after multi-sample FR refine, sync EQ trace (loadFiles late branch has no callback). */
window.eqAfterMultiSampleRawRefined = null;
window.scheduleLiveEqSync = () => {};
// Graph hit-rect (mousemove/click from graphInteract; pointerdown/wheel attached below in addExtra).
// graphInteract is defined in graph-renderer.js and exposed as window.graphInteract.
let graphPlotHitRect = gr.append("rect")
    .attr("class", "graph-plot-hit")
    .style("touch-action", "none")
    .attrs({x:pad.l,y:pad.t,width:W,height:H,opacity:0})
    .on("mousemove", graphInteract())
    .on("mouseout", () => {
        if (eqGraphPointerState) {
            return;
        }
        let plot = graphPlotHitRect && graphPlotHitRect.node();
        let ev = d3.event;
        let cx = ev && typeof ev.clientX === "number" ? ev.clientX : NaN;
        let cy = ev && typeof ev.clientY === "number" ? ev.clientY : NaN;
        requestAnimationFrame(() => {
            if (eqGraphPointerState) {
                return;
            }
            if (plot && Number.isFinite(cx) && Number.isFinite(cy)) {
                let r = plot.getBoundingClientRect();
                if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
                    lastGraphPlotPointerClient = { x: cx, y: cy };
                    let m = clientToGraphPlotXY(cx, cy);
                    if (m) {
                        syncEqHoverPreview(m);
                    }
                    return;
                }
            }
            syncEqHoverPreview(null);
            interactInspect ? stopInspect() : pathHL(false);
        });
    })
    .on("click", graphInteract(true));
window.graphPlotHitRect = graphPlotHitRect;
/** Equalizer-tab graph: pointer gesture for add + vertical gain drag */
let eqGraphPointerState = null;
Object.defineProperty(window, 'eqGraphPointerState', { get: () => eqGraphPointerState, set: v => { eqGraphPointerState = v; }, configurable: true });
/** Last viewport client position over the graph (mousemove / drag); used to re-apply EQ hover
    after updateEqFilterMarkers(), e.g. when focusin on a filter field runs in a later frame. */
let lastGraphPlotPointerClient = null;
Object.defineProperty(window, 'lastGraphPlotPointerClient', { get: () => lastGraphPlotPointerClient, set: v => { lastGraphPlotPointerClient = v; }, configurable: true });
let eqGraphSkipNextClick = false;
Object.defineProperty(window, 'eqGraphSkipNextClick', { get: () => eqGraphSkipNextClick, set: v => { eqGraphSkipNextClick = v; }, configurable: true });
/** After touch on the plot, browsers emit a synthetic click; skip click-to-add so EQ graph edits are mouse-only. */
let eqGraphSuppressClickAddFromTouch = false;
Object.defineProperty(window, 'eqGraphSuppressClickAddFromTouch', { get: () => eqGraphSuppressClickAddFromTouch, set: v => { eqGraphSuppressClickAddFromTouch = v; }, configurable: true });
let eqGraphTouchSuppressClearTimer = null;
Object.defineProperty(window, 'eqGraphTouchSuppressClearTimer', { get: () => eqGraphTouchSuppressClearTimer, set: v => { eqGraphTouchSuppressClearTimer = v; }, configurable: true });
let eqGraphSkipClickClearTimer = null;
Object.defineProperty(window, 'eqGraphSkipClickClearTimer', { get: () => eqGraphSkipClickClearTimer, set: v => { eqGraphSkipClickClearTimer = v; }, configurable: true });
let eqGraphApplyEqDragTimer = null;
/** Saved inline styles while EQ graph drag disables text/image selection (Safari + trackpad). */
let eqGraphDragSelectSaved = null;
function eqGraphDragSelectBlock(ev) {
    ev.preventDefault();
}
function eqGraphInstallDragSelectLock() {
    if (eqGraphDragSelectSaved !== null) {
        eqGraphRemoveDragSelectLock();
    }
    let de = document.documentElement;
    let b = document.body;
    eqGraphDragSelectSaved = {
        deUser: de.style.userSelect,
        deWebkit: de.style.webkitUserSelect || "",
        bUser: b.style.userSelect,
        bWebkit: b.style.webkitUserSelect || "",
    };
    de.style.userSelect = "none";
    de.style.webkitUserSelect = "none";
    b.style.userSelect = "none";
    b.style.webkitUserSelect = "none";
    document.addEventListener("selectstart", eqGraphDragSelectBlock, true);
    document.addEventListener("dragstart", eqGraphDragSelectBlock, true);
    let sel = typeof window.getSelection === "function" ? window.getSelection() : null;
    if (sel && sel.rangeCount > 0) {
        sel.removeAllRanges();
    }
}
function eqGraphRemoveDragSelectLock() {
    if (eqGraphDragSelectSaved === null) {
        return;
    }
    let s = eqGraphDragSelectSaved;
    eqGraphDragSelectSaved = null;
    let de = document.documentElement;
    let b = document.body;
    de.style.userSelect = s.deUser;
    de.style.webkitUserSelect = s.deWebkit;
    b.style.userSelect = s.bUser;
    b.style.webkitUserSelect = s.bWebkit;
    document.removeEventListener("selectstart", eqGraphDragSelectBlock, true);
    document.removeEventListener("dragstart", eqGraphDragSelectBlock, true);
}
/** @type {(m: number[]) => boolean} */
let tryEqGraphClickAddFilter = (_m) => false;
Object.defineProperty(window, 'tryEqGraphClickAddFilter', { get: () => tryEqGraphClickAddFilter, configurable: true });
/** @type {(m: number[] | null) => void} */
let gSpectrum = gr.insert("g", ".curves-g")
    .attr("class", "music-spectrum-viz")
    .attr("pointer-events", "none")
    .attr("transform", "translate(" + pad.l + "," + pad.t + ")")
    .attr("clip-path", "url(#spectrum-clip-inner)");
let musicSpectrumPathSel = gSpectrum.append("path")
    .attr("class", "music-spectrum-fill");
let musicSpectrumViz = {
    analyser: null,
    context: null,
    floatBuffer: null,
    rafId: null,
    pathSel: musicSpectrumPathSel,
    isActive: () => false,
    syncSpectrumViz: () => {},
    ensureBuffer: function () {
        if (!this.analyser) {
            return;
        }
        let n = this.analyser.frequencyBinCount;
        if (!this.floatBuffer || this.floatBuffer.length !== n) {
            this.floatBuffer = new Float32Array(n);
        }
    },
    stop: function () {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.pathSel) {
            this.pathSel.attr("d", "");
        }
    },
    tick: function () {
        let self = musicSpectrumViz;
        self.rafId = null;
        if (!self.analyser || !self.floatBuffer || !self.pathSel || !self.context || !self.isActive()) {
            if (self.pathSel) {
                self.pathSel.attr("d", "");
            }
            return;
        }
        self.analyser.getFloatFrequencyData(self.floatBuffer);
        self.pathSel.attr("d", buildMusicSpectrumPath(self.floatBuffer));
        self.rafId = requestAnimationFrame(() => self.tick());
    },
    start: function () {
        if (!this.analyser || !this.pathSel) {
            return;
        }
        this.stop();
        this.rafId = requestAnimationFrame(() => this.tick());
    }
};
if (typeof initMusicGraphLifecycle === "function") {
    initMusicGraphLifecycle();
}
window.musicSpectrumViz = musicSpectrumViz;
/* gamma < 1: fewer polyline vertices in the lowest decades so the fill does not trace FFT
   leakage point-by-point (looks too gradual on a log frequency axis). */
let spectrumPathLogSampleGamma = 0.63;
function buildMusicSpectrumPath(floatFreq) {
    let ctx = musicSpectrumViz.context;
    if (!ctx || !floatFreq || !floatFreq.length) {
        return "";
    }
    let sr = ctx.sampleRate;
    let nyquist = sr / 2;
    let binCount = floatFreq.length;
    let hzPerBin = nyquist / binCount;
    let magAtHz = (f) => {
        if (f <= 0) {
            f = 1;
        }
        let idx = f / hzPerBin;
        let i0 = Math.floor(idx);
        let i1 = Math.min(i0 + 1, binCount - 1);
        let t = idx - i0;
        return floatFreq[i0] * (1 - t) + floatFreq[i1] * t;
    };
    let x0 = x.domain()[0];
    let x1 = Math.min(x.domain()[1], nyquist * 0.995);
    if (x1 <= x0 * 1.02) {
        return "";
    }
    let nPoints = 128;
    let yBottomLocal = H;
    let d0 = y.domain()[0];
    let d1 = y.domain()[1];
    let dbs = [];
    let freqs = [];
    for (let i = 0; i <= nPoints; i++) {
        let u = i / nPoints;
        let uEff = u <= 0 ? 0 : Math.pow(u, spectrumPathLogSampleGamma);
        let f = x0 * Math.pow(x1 / x0, uEff);
        freqs.push(f);
        dbs.push(magAtHz(f));
    }
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = 0; j < dbs.length; j++) {
        let v = dbs[j];
        if (Number.isFinite(v)) {
            hi = Math.max(hi, v);
            lo = Math.min(lo, v);
        }
    }
    if (!Number.isFinite(hi) || !Number.isFinite(lo)) {
        return "";
    }
    let minSpanDb = 42;
    let spanDb = Math.max(minSpanDb, hi - lo);
    let baseDb = hi - spanDb;
    let pts = [];
    for (let i = 0; i <= nPoints; i++) {
        let n = (dbs[i] - baseDb) / spanDb;
        n = Math.max(0, Math.min(1, n));
        let spl = d0 + n * (d1 - d0) * 0.92;
        pts.push([x(freqs[i]) - pad.l, y(spl) - pad.t]);
    }
    let d = "M" + pts[0][0] + "," + yBottomLocal;
    pts.forEach((p) => {
        d += " L" + p[0] + "," + p[1];
    });
    d += " L" + pts[pts.length - 1][0] + "," + yBottomLocal + " Z";
    return d;
}
function hl(p, h, sub) {
    gpath.selectAll("path").filter(c => {
        if (c.p !== p) return false;
        if (sub === undefined || sub === null) return true;
        return c === p.activeCurves[sub];
    }).classed("highlight", h);
}
let table = doc.select(".curves");

// ld_p1, getCurveColor, color helpers moved to src/graph-renderer.js

let cantCompare;
let noTargets = typeof disallow_target !== "undefined" && disallow_target;
if (noTargets || typeof max_compare !== "undefined") {
    const currency = [
        ["$", "#348542"],
        ["¥", "#d11111"],
        ["€", "#2961d4"],
        ["฿", "#dcaf1d"]
    ];
    let currencyCounter = -1,
        lastMessage = null,
        messageWeight = 0;
    let cantTarget = p => false;
    if (noTargets) {
        if (typeof allow_targets === "undefined") {
            cantTarget = p => p.isTarget;
        } else {
            let r = f => f.replace(/ Target$/,""),
                a = allow_targets.map(r);
            cantTarget = p => p.isTarget && a.indexOf(r(p.fileName))<0;
        }
    }
    let ct = typeof restrict_target === "undefined" || restrict_target,
        ccfilter = ct ? (l => l) : (l => l.filter(p=>!p.isTarget));
    cantCompare = function(ps, add, p, noMessage) {
        let count = ccfilter(ps).length + (add||0) - (!ct&&p&&p.isTarget?1:0);
        if (count<max_compare && !(p&&cantTarget(p))) { return false; }
        if (noMessage) { return true; }
        let div = doc.append("div");
        let c = currency[currencyCounter++ % currency.length];
        let lm = lastMessage;
        lastMessage = Date.now();
        messageWeight *= Math.pow(2, (lm?lm-lastMessage:0)/3e4); // 30-second half-life
        messageWeight++;
        if (!currencyCounter || messageWeight>=2) {
            messageWeight /= 2;
            let button = div.attr("class","cashMessage")
                .html(premium_html)
                .append("button").text("Fine")
                .on("mousedown", ()=>messageWeight=0);
            button.node().focus();
            let back = doc.append("div")
                .attr("class","fadeAll");
            [button,back].forEach(e =>
                e.on("click", ()=>[div,back].forEach(e=>e.remove()))
            );
        } else {
            div.attr("class","cash")
                .style("color",c[1]).text(c[0])
                .transition().duration(120).remove();
        }
        return true;
    }
} else {
    cantCompare = function(m) { return false; }
}

let phoneNumber = 0; // I'm so sorry it just happened
// Find a phone id which doesn't have a color conflict with pins
let nextPN = 0; // Cached value; invalidated when pinned headphones change
function nextPhoneNumber() {
    if (nextPN === null) {
        nextPN = phoneNumber;
        let pin = activePhones.filter(p => p.pin).map(p=>p.id);
        if (pin.length) {
            let p3 = ld_p1*ld_p1*ld_p1,
                l = a => b => Math.abs(((a-b)/p3 + 0.5) % 1 - 0.5),
                d = id => d3.min(pin, l(id));
            for (let i=nextPN, max=d(i); max<0.12 && ++i<phoneNumber+3; ) {
                let m = d(i);
                if (m > max) { max=m; nextPN=i; }
            }
        }
    }
    return nextPN;
}
function getPhoneNumber() {
    let pn = nextPhoneNumber();
    phoneNumber = pn + 1;
    nextPN = null;
    return pn;
}

function setPhoneTr(phtr) {
    phtr.each(function (p) {
        p.highlight = p.active;
        let o = p.objs; if (!o) return;
        p.objs = o = o.filter(q=>q.active);
        if (o.length === 0) {
            delete p.objs;
        } else if (!p.active) {
            p.id = o[0].id;
            p.highlight = true;
        }
    });
    phtr.style("background",p=>p.isTarget&&!p.active?null:getDivColor(p.id,p.highlight))
        .style("border-color",p=>p.highlight?getDivColor(p.id,1):null);
    phtr.filter(p=>!p.isTarget)
        .select(".phone-item-add")
        .selectAll(".remove").data(p=>p.highlight?[p]:[])
        .join("span").attr("class","remove").text("⊗")
        .on("click", p => { d3.event.stopPropagation(); removeCopies(p); });
}

// See if iframe gets CORS error when interacting with window.top
try {
    let emb = window.location.href.includes('embed');
    
    accessWindowTop = (window.top.location.href) ? true:false;
    targetWindow = emb ? window : window.top;
} catch {
    accessWindowTop = false;
    targetWindow = window;
}

// See if iframe gets CORS error when interacting with window.top.document
try {
    accessDocumentTop = (window.top.document) ? true:false;
} catch {
    accessDocumentTop = false;
}

if (typeof toggleExpandCollapse === "function" && typeof expandable !== "undefined"
        && expandable && accessDocumentTop) {
    toggleExpandCollapse();
}

let ifURL = typeof share_url !== "undefined" && share_url;
/** First `location.search` at startup — survives `history.replaceState` before `phone_book` loads (EQ params, graph `share=`, …). */
let __eqUrlShareBootstrapSearch = "";
try {
    __eqUrlShareBootstrapSearch = targetWindow && targetWindow.location
        ? String(targetWindow.location.search || "")
        : "";
} catch (e) {
    __eqUrlShareBootstrapSearch = "";
}
/* When false, addPhonesToUrl omits graph `share=` (EQ/music/canonical still sync). Prevents
   multi-sample updateCurves → updatePaths() from injecting share= during config-only init;
   enabled after share/embed navigation or first user gesture (see phone_book callback). */
let __graphShareUrlSyncAllowed = !!(typeof __eqUrlShareBootstrapSearch === "string"
    && /[?&]share=/.test(__eqUrlShareBootstrapSearch));
let baseTitle = typeof page_title !== "undefined" ? page_title : "CrinGraph";
let baseDescription = typeof page_description !== "undefined" ? page_description : "View and compare frequency response graphs";
let baseURL;  // Set by setInitPhones
function addPhonesToUrl() {
    let names = activePhones.filter(p => !p.isDynamic).map(p => p.fileName),
        namesCombined = names.join(", ");
    let sel = document.querySelector("div.select");
    let onEqTab = typeof extraEQEnabled !== "undefined" && extraEQEnabled && sel
        && sel.getAttribute("data-selected") === "extra";
    let ref = baseURL || targetWindow.location.pathname;
    let u;
    try {
        /* Start from the live location so deep-link params (EQ, amSong, …) survive music/graph updates.
           `baseURL` omits `?…`, so `new URL(baseURL)` would drop every existing query param. */
        u = new URL(targetWindow.location.href);
    } catch (e) {
        return;
    }
    /* Drop Apple music share keys first so we can re-append after EQ/share (`amSong` then `amIn` / `amOut` at end). */
    u.searchParams.delete(MUSIC_URL_PARAM_APPLE_SONG);
    u.searchParams.delete("appleMusicSong");
    u.searchParams.delete(MUSIC_URL_PARAM_IN);
    u.searchParams.delete(MUSIC_URL_PARAM_OUT);
    u.searchParams.delete("amSegStart");
    u.searchParams.delete("amSegEnd");
    /* Never stash `share` on URLSearchParams (encodes commas as %2C). Build explicit `share=…` with literal commas instead. */
    u.searchParams.delete("share");
    let shareQueryPair = "";
    let eqModelTit = "",
        eqTargetTit = "";
    let title = baseTitle;
    if (ifURL && onEqTab) {
        /* EQ tab: omit `share=` so the URL lists only EQ model/target/filters — no unrelated graph traces. */
        let eqSel = document.querySelector("div.extra-eq div.select-eq-phone-model-target select[name='phone']")
            || document.querySelector("div.extra-eq select[name='phone']");
        let eqTgt = document.querySelector("div.extra-eq div.select-eq-phone-model-target select[name='eq-target']")
            || document.querySelector("div.extra-eq select[name='eq-target']");
        eqModelTit = eqSel ? String(eqSel.value || "").trim() : "";
        eqTargetTit = eqTgt ? String(eqTgt.value || "").trim() : "";
        if (eqModelTit && eqTargetTit) {
            title = eqModelTit + " → " + eqTargetTit + " - " + baseTitle;
        } else if (eqModelTit || eqTargetTit) {
            title = (eqModelTit || eqTargetTit) + " - " + baseTitle;
        }
    } else if (names.length) {
        if (ifURL && __graphShareUrlSyncAllowed) {
            shareQueryPair = "share=" + shareQueryValueForUrl(names);
        }
        title = namesCombined + " - " + baseTitle;
    }
    if (ifURL && typeof window._appendEqShareParamsToUrlSearch === "function") {
        window._appendEqShareParamsToUrlSearch(u);
    } else {
        ["eq", "eqModel", "eqTarget", "eqFilters", "eqModelData", "eqTargetData",
            "eq_model", "eq_target", "eq_filters", "eq_model_data", "eq_target_data"].forEach(
            (k) => u.searchParams.delete(k));
    }
    if (ifURL && typeof window._appendMusicShareParamsToUrlSearch === "function") {
        window._appendMusicShareParamsToUrlSearch(u);
    } else {
        u.searchParams.delete(MUSIC_URL_PARAM_APPLE_SONG);
        u.searchParams.delete("appleMusicSong");
        u.searchParams.delete(MUSIC_URL_PARAM_IN);
        u.searchParams.delete(MUSIC_URL_PARAM_OUT);
        u.searchParams.delete("amSegStart");
        u.searchParams.delete("amSegEnd");
    }
    let qsRest = u.searchParams.toString();
    let outUrl = u.pathname + (shareQueryPair && qsRest
        ? ("?" + shareQueryPair + "&" + qsRest)
        : (shareQueryPair ? ("?" + shareQueryPair) : (qsRest ? ("?" + qsRest) : "")));
    let canonicalHref = baseURL || ref;
    if (ifURL && onEqTab && (u.searchParams.get(EQ_URL_PARAM_MODEL) || u.searchParams.get("eq_model"))) {
        canonicalHref = outUrl;
    } else if (!onEqTab && names.length === 1) {
        canonicalHref = outUrl;
    }
    targetWindow.document.querySelector("link[rel='canonical']").setAttribute("href", canonicalHref);
    targetWindow.history.replaceState("", title, outUrl);
    targetWindow.document.title = title;
    let metaDesc = baseDescription;
    if (ifURL && onEqTab && (eqModelTit || eqTargetTit)) {
        metaDesc += " Parametric EQ: " + [eqModelTit, eqTargetTit].filter(Boolean).join(" → ") + ".";
    } else {
        metaDesc += ", including " + namesCombined + ".";
    }
    targetWindow.document.querySelector("meta[name='description']").setAttribute("content", metaDesc);
}

function setModeEmbed() {
    document.querySelector("body").setAttribute("embed-mode", "true");
}

/** Rejoin path elements to active curve data and redraw (no clearLabels / URL / sticky labels). */
function rebindGraphPathSelectionAndRedraw() {
    let c = curvesTargetsFirstForPaint(d3.merge(activePhones.map(p => p.activeCurves || []))),
        p = gpath.selectAll("path").data(c, d=>d.id);
    let joined = p.join("path").attr("opacity", (c) => {
        /* Parametric EQ tab: apply “focus set” opacity here so join never paints compare at full
           opacity before applyParametricEqGraphTraceFocus (that one-frame step read as flashing). */
        if (typeof window !== "undefined" && typeof window.__eqParametricPathOpacity === "function") {
            let po = window.__eqParametricPathOpacity(c);
            if (po !== undefined) {
                return po;
            }
        }
        let base = graphPathOpacityForCurve(c) ?? (c.p.hide ? 0 : null);
        if (c && c.p && !c.p.hide && typeof window !== "undefined"
                && typeof window.__eqComposeListeningOpacityForCurve === "function"
                && (c.p.eqParent || c.p.eq)) {
            let b = (base == null || !Number.isFinite(base)) ? 1 : base;
            return window.__eqComposeListeningOpacityForCurve(c, b);
        }
        return base;
    })
        .classed("sample", c=>c.p.samp)
        .attr("stroke", getColor_AC).call(redrawLine);
    if (typeof joined.order === "function") {
        joined.order();
    }
    let t = joined.filter(c=>c.p.isTarget)
        .attr("data-phone-name", c=>c.p.fullName)
        .attr("class", "target");
    resetGraphPathStrokesToBase();
    gpath.selectAll("path").each(function (c) {
        let n = d3.select(this);
        if (!c || !c.p) {
            return;
        }
        if (c.p.isTarget) {
            applyTargetCurveStrokePattern(n, c.p);
        } else if (c.p.isPrefBounds) {
            n.style("stroke-dasharray", "6, 3");
        } else {
            clearNonTargetCurveStrokePattern(n);
        }
    });
    if (targetColorCustom) {
        t.attr("stroke", targetColorCustom);
    }
}

function updatePaths(trigger) {
    /* EQ model dropdown: removePhone + showPhone + applyEQExec each call updatePaths; every full
       redraw briefly rebinds opacities and can paint the compare IEM twice. Batch to one draw. */
    if (typeof window !== "undefined" && (window.__eqCoord.batchSuppressDepth | 0) > 0) {
        window.__eqCoord.batchPathsPending = true;
        return;
    }
    if (typeof window !== "undefined") {
        window.__eqCoord.batchPathsPending = false;
    }
    reorderActivePhonesByInitOrder();
    clusterTargetsFirstInActivePhones();
    refreshTargetStyleSlots();
    clearLabels();
    rebindGraphPathSelectionAndRedraw();
    /* Bulk init uses a truthy trigger so updatePaths batches redraws; `!trigger` skipped addPhonesToUrl.
       Restored music can replaceState away `share=` before phones load — only share/embed deep links need
       a post-init URL sync (not `config`: that would append `share=` on every default/config load). */
    if (ifURL && (!trigger || trigger === "share" || trigger === "embed")) {
        addPhonesToUrl();
    }
    if (stickyLabels) drawLabels();
    updateEqFilterMarkers();
    applyParametricEqGraphTraceFocus();
    updateEqTraceOpacity();
    eqSoundRangeUiHooks.syncBrushFromInputs();
}
let colorBar = p=>'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 8"><path d="M0 8v-8h1c0.05 1.5,-0.3 3,-0.16 5s0.1 2,0.15 3z" fill="'+getBgColor(p)+'"/></svg>\')';

/** Raw FR usable for EQ / Auto EQ (channels present). */
function phoneCurveDataReadyForEq(p) {
    return !!(p && p.rawChannels && Array.isArray(p.rawChannels) && p.rawChannels.some(c => c));
}

/** Same phone ordering as the manage table (before Eq-tab row filter): unique phones in curve-walk order,
    then targets clustered first; with a share/config `initPhoneOrderIndex`, each segment (targets, then IEMs)
    is sorted by `initOrderRankForPhone` so order matches the URL. */

// f_values moved to src/graph-renderer.js
(function initMeasurementCalibrationFromConfig() {
    window._measurementCalibrationPromise = Promise.resolve();
    window._measurementCalibrationCurve = null;
    if (typeof measurement_calibration_file === "undefined" || !measurement_calibration_file) {
        return;
    }
    let raw = String(measurement_calibration_file).trim();
    if (!raw) {
        return;
    }
    /* Same convention as measurement loads: stem without ".txt" → DIR+stem+".txt".
       Use URL() so spaces (e.g. "IEF Cal.txt") become valid fetch URLs. */
    let url;
    if (/^https?:\/\//i.test(raw)) {
        try {
            let u = new URL(raw);
            if (!/\.txt$/i.test(u.pathname)) {
                u.pathname += u.pathname.endsWith("/") ? "calibration.txt" : ".txt";
            }
            url = u.href;
        } catch (e) {
            url = /\.txt$/i.test(raw) ? raw : raw + ".txt";
        }
    } else {
        let stem = raw.replace(/^\/+/, "");
        if (!/\.txt$/i.test(stem)) {
            stem += ".txt";
        }
        let baseDir = String(DIR || "");
        if (/^https?:\/\//i.test(baseDir) && !baseDir.endsWith("/")) {
            baseDir += "/";
        }
        try {
            url = new URL(stem, baseDir).href;
        } catch (e2) {
            url = baseDir.replace(/\/?$/, "/") + stem.replace(/^\/+/, "");
            url = url.replace(/ /g, "%20");
        }
    }
    window._measurementCalibrationPromise = d3.text(url).then(function (txt) {
        if (!txt) {
            return;
        }
        try {
            window._measurementCalibrationCurve = Equalizer.interp(f_values, tsvParse(txt));
        } catch (e) {
            window._measurementCalibrationCurve = null;
        }
    }).catch(function () {
        window._measurementCalibrationCurve = null;
    });
})();
function shouldApplyMeasurementCalibration(p) {
    if (!p || !window._measurementCalibrationCurve || !window._measurementCalibrationCurve.length) {
        return false;
    }
    if (p.isTarget) {
        return false;
    }
    if (p.brand && p.brand.name === "Uploaded") {
        return false;
    }
    if (p.isDynamic) {
        return false;
    }
    return true;
}
function applyMeasurementCalibrationToChannels(ch, p) {
    if (!ch || !shouldApplyMeasurementCalibration(p)) {
        return ch;
    }
    let cal = window._measurementCalibrationCurve;
    return ch.map(function (c) {
        if (!c) {
            return c;
        }
        return c.map(function (pt, i) {
            let calPt = cal[i];
            let dbCal = calPt && calPt.length >= 2 && Number.isFinite(calPt[1]) ? calPt[1] : 0;
            return [pt[0], pt[1] - dbCal];
        });
    });
}
// fr_to_ind, range_to_slice moved to src/graph-renderer.js

let norm_sel = ( (typeof default_normalization !== "undefined" ? default_normalization : "dB").toLowerCase() === "db" ) ? 0:1,
    norm_fr = typeof default_norm_hz !== "undefined" ? default_norm_hz : 500,
    norm_phon = typeof default_norm_db !== "undefined" ? default_norm_db : 60;

function normalizePhone(p) {
    let vc = validChannels(p);
    if (!vc.length) return;
    if (norm_sel) { // fr
        let i = fr_to_ind(norm_fr);
        let avg = l => 20*Math.log10(d3.mean(l, d=>Math.pow(10,d/20)));
        p.norm = 60 - avg(vc.map(l=>l[i][1]));
    } else { // phon
        let g = getAvg(p);
        if (!g) return;
        p.norm = find_offset(g, norm_phon);
    }
    if (p.eq) normalizePhone(p.eq);
}

let norms = doc.select(".normalize").selectAll("div");
norms.classed("selected",(_,i)=>i===norm_sel);
function setNorm(_, i, change) {
    if (change !== false) {
        if (!this.checkValidity()) return;
        let v = +this.value;
        if (i) { norm_fr=v; } else { norm_phon=v; }
    }
    norm_sel = i;
    norms.classed("selected",(_,i)=>i===norm_sel);
    activePhones.forEach(normalizePhone);
    if (baseline.p) { baseline = getBaseline(baseline.p); }
    updateYCenter();
    
    if (!userConfigApplicationActive) {
        setUserConfig();
        updatePaths();
    } else {
        updatePaths("config");
    }
}
norms.select("input")
    .on("change input",setNorm)
    .on("keypress", function(_, i) {
        if (d3.event.key==="Enter") { setNorm.bind(this)(_,i); }
    });
norms.select("span").on("click", (_,i)=>setNorm(_,i,false));

// Late-bound wrapper: phone-catalog.js populates window.__tableToggleHide in updatePhoneTable.
let toggleHide = (p) => { if (window.__tableToggleHide) window.__tableToggleHide(p); };

loadPhoneBookCatalog().then(function (brands) {
    let brandMap = window.brandMap = {},
        inits = [],
        initReq = typeof init_phones !== "undefined" ? [init_phones].flat() : false;
    loadFromShare = 0;
    /* If early URL sync stripped the bar before pending EQ was captured, re-parse from bootstrap ?… */
    if (!window.__pendingEqUrlShareParsed && __eqUrlShareBootstrapSearch
            && __eqUrlShareBootstrapSearch.length > 1) {
        try {
            let bootHref = targetWindow.location.origin + targetWindow.location.pathname
                + __eqUrlShareBootstrapSearch;
            window.__pendingEqUrlShareParsed = parseEqUrlShareParams(bootHref);
        } catch (e) { /* noop */ }
    }

    if (ifURL) {
        let url = targetWindow.location.href,
            par = "share=";
            emb = "embed";
        baseURL = url.split("?").shift();
        /* Local music restores from IndexedDB and calls addPhonesToUrl before this callback; replaceState can drop `share=` while activePhones is still empty — rehydrate graph share from the same bootstrap snapshot EQ uses. */
        if (!url.includes(par)) {
            let bootSearch = typeof __eqUrlShareBootstrapSearch === "string"
                ? __eqUrlShareBootstrapSearch
                : "";
            if (bootSearch && /[?&]share=/.test(bootSearch)) {
                try {
                    url = targetWindow.location.origin + targetWindow.location.pathname + bootSearch;
                } catch (e0) { /* noop */ }
            }
        }

        if (url.includes(par) && url.includes(emb)) {
            initReq = parseSharePhonesFromHref(url);
            if (!initReq || !initReq.length) {
                initReq = decodeURIComponent(url.replace(/_/g," ").split(par).pop()).split(",");
            }
            loadFromShare = 2;

            setModeEmbed();
        } else if (url.includes(par)) {
            initReq = parseSharePhonesFromHref(url);
            if (!initReq || !initReq.length) {
                initReq = decodeURIComponent(url.replace(/_/g," ").split(par).pop()).split(",");
            }
            loadFromShare = 1;
        } else if (url.includes(emb)) {
            setModeEmbed();
        }
        if (loadFromShare) {
            __graphShareUrlSyncAllowed = true;
        } else if (!__graphShareUrlSyncAllowed) {
            let armGraphShareUrlSync = () => {
                __graphShareUrlSyncAllowed = true;
                document.removeEventListener("pointerdown", armGraphShareUrlSync, true);
                document.removeEventListener("keydown", armGraphShareUrlSync, true);
            };
            document.addEventListener("pointerdown", armGraphShareUrlSync, true);
            document.addEventListener("keydown", armGraphShareUrlSync, true);
        }
    }
    let eqShareInitOnly = !!(ifURL && window.__pendingEqUrlShareParsed);
    if (eqShareInitOnly) {
        /* EQ share links should bootstrap from URL params only; skip config `init_phones`
           so old defaults do not pre-populate and fight pending EQ model/target apply. */
        initReq = [];
    }
    
    // Apply user config to inits
    if (!eqShareInitOnly) {
        userConfigAppendInits(initReq);
    }
    setInitPhoneOrderFromReq(Array.isArray(initReq) ? initReq : null);
    
    let isInit = initReq ? f => initReq.indexOf(f) !== -1
                         : _ => false;
    
    if (loadFromShare === 1) {
        initMode = "share";
    } else if (loadFromShare === 2) {
        initMode = "embed";
    } else {
        initMode = "config";
    }

    brands.push({ name: "Uploaded", phones: [] });
    brands.forEach(b => brandMap[b.name] = b);
    brands.forEach(function (b) {
        b.active = false;
        b.phoneObjs = b.phones.map(function (p) {
            return asPhoneObj(b, p, isInit, inits);
        });
    });

    let allPhones = window.allPhones = d3.merge(brands.map(b=>b.phoneObjs));
    if (!initReq) inits.push(allPhones[0]);

    initPhoneSelectorUi({
        brands: brands,
        allPhones: allPhones,
        targets: typeof targets !== "undefined" ? targets : null,
        isInit: isInit,
        inits: inits,
        showPhone: showPhone
    });

    if (initReq && Array.isArray(initReq) && initReq.length) {
        inits.sort((a, b) => {
            let ia = initReq.indexOf(String(a.fileName || "").trim());
            let ib = initReq.indexOf(String(b.fileName || "").trim());
            ia = ia < 0 ? 1e9 : ia;
            ib = ib < 0 ? 1e9 : ib;
            return ia - ib;
        });
    }

    if (typeof default_y_scale !== "undefined" && default_y_scale && scales[default_y_scale.toLowerCase()]) {
        changeScaling(default_y_scale);
    }

    inits.map(p => p.copyOf ? showVariant(p.copyOf, p, initMode)
                            : showPhone(p,0,1, initMode));

    doc.select("#recolor").on("click", function () {
        allPhones.forEach(p => { if (!p.isTarget) { delete p.id; } });
        phoneNumber = 0; nextPN = null;
        activePhones.forEach(p => { if (!p.isTarget) { p.id = getPhoneNumber(); } });
        colorPhones();
    });
    
    doc.select("#theme").on("click", function () {
        themeChooser("change");
    });
    
    userConfigApplyNormalization();
    setTimeout(() => {
        if (typeof window.applyPendingEqUrlShare === "function") {
            window.applyPendingEqUrlShare(0);
        }
    }, 0);

    if (typeof tiltableTargets !== "undefined" && tiltableTargets && tiltableTargets.length > 0
            && window.brandTarget) {
        GraphToolPlugin._call('tiltReady', {
            doc: doc,
            showPhone: showPhone,
            removePhone: removePhone,
            setBaseline: setBaseline,
            getBaseline: getBaseline,
            baseline0: baseline0,
            setCurves: setCurves,
            updatePaths: updatePaths,
            toggleHide: toggleHide,
            drawLabels: drawLabels,
            smoothPhone: smoothPhone,
            normalizePhone: normalizePhone,
            loadFiles: loadFiles,
            activePhones: () => activePhones,
            baseline: () => baseline,
            f_values: f_values,
            Equalizer: Equalizer,
            LR: LR,
            tsvParse: tsvParse,
        });
    }
});

doc.select("#inspector").on("click", function () {
    clearLabels();
    stopInspect();
    d3.select(this).classed("selected", interactInspect = !interactInspect);
});

doc.select("#expandTools").on("click", function () {
    let t=doc.select(".tools"), cl="collapseTools", v=!t.classed(cl);
    [t,doc.select(".targets")].forEach(s=>s.classed(cl, v));
});

d3.selectAll(".helptip").on("click", function() {
    let e = d3.select(this);
    e.classed("active", !e.classed("active"));
});

// Copy URL button functionality
function copyUrlInit() {
    let copyUrlButton = document.querySelector("button#copy-url");

    copyUrlButton.addEventListener("click", function(e) {
        let urlHost = document.createElement('input'),
            currentUrl = targetWindow.location.href;

        urlHost.setAttribute("style","position: fixed; opacity: 0.0;");
        urlHost.value = currentUrl;
        document.body.appendChild(urlHost);

        urlHost.select();
        document.execCommand('copy');
        document.body.removeChild(urlHost);

        e.stopPropagation();

        copyUrlButton.classList.add("clicked");
        setTimeout(function() {
            copyUrlButton.classList.remove("clicked");
        }, 600);
        
        // Analytics event
        if (analyticsEnabled) { pushEventTag("clicked_copyUrl", targetWindow); }
    });
}
copyUrlInit();

// Theme Chooser
function themeChooser(command) {
    let docBody = document.querySelector("body"),
        themeButton = document.querySelector("button#theme"),
        themeCurrent = themeButton.getAttribute("current-theme");
    
    // If a change event, make changes to state
    if (command === "change") {
        if (themeCurrent === "theme-dark") {
            localStorage.setItem("theme-pref", "theme-contrast");
        } else if (themeCurrent === "theme-contrast") {
            localStorage.setItem("theme-pref", "theme-default");
        } else {
            localStorage.setItem("theme-pref", "theme-dark");
        }
    }
    
    let themePref = localStorage.getItem("theme-pref");
    
    // Apply state
    if (themePref === "theme-dark") {
        docBody.classList.remove("theme-default", "theme-contrast");
        docBody.classList.add("theme-dark");
        themeButton.textContent = "contrast mode";
        
    } else if (themePref === "theme-contrast") {
        docBody.classList.remove("theme-default", "theme-dark");
        docBody.classList.add("theme-contrast");
        themeButton.textContent = "default mode";
        
    } else {
        docBody.classList.remove("theme-dark", "theme-contrast");
        docBody.classList.add("theme-default");
        themeButton.textContent = "dark mode";
    }
    
    themeButton.setAttribute("current-theme", themePref);
}
if ( typeof themingEnabled !== "undefined" && themingEnabled ) {
    let themeButton = document.createElement("button"),
        miscTools = document.querySelector("div.miscTools");
        
    themeButton.setAttribute("id", "theme");
    themeButton.textContent = "dark mode";
    themeButton.setAttribute("current-theme", "theme-default");
    miscTools.append(themeButton);
    
    themeChooser();
}

// Map faux download button
function mapDownloadFaux() {
    let downloadButton = document.querySelector("button#download"),
        downloadFaux = document.querySelector("button#download-faux");
    
    downloadFaux.addEventListener("click", function() {
        downloadButton.click();
    });
}
mapDownloadFaux();

// Set focused scroll list
function setFocusedList(selectedList) {
    let listsContainer = document.querySelector("div.select");

    listsContainer.setAttribute("data-selected", selectedList)
}

function focusedListClicks() {
    let listClickTragets = document.querySelectorAll("*[data-list=\"brands\"], *[data-list=\"models\"]");

    listClickTragets.forEach((clickedTarget) => {
        clickedTarget.addEventListener("click", () => {
            let selectedList = clickedTarget.getAttribute("data-list")
            setFocusedList(selectedList);
            window.hideExtraPanel && window.hideExtraPanel(selectedList);
        });
    });

    let brandsList = document.querySelector("div.scroll#brands");
    
    brandsList.addEventListener("click", function(e) {
        let clickedElem = e.target,
            clickedElemIsBrand = clickedElem.matches("div.scroll#brands div");
        
        if (clickedElemIsBrand) {
            setFocusedList("models");
            e.stopPropagation();
        }
    });

}
focusedListClicks();

function focusedListSwipes() {
    let horizontalSwipeTarget = document.querySelector("div.scroll-container"),
        listsContainer = document.querySelector("div.select"),
        swipableList = document.querySelector("div.scrollOuter[data-list=\"models\"]");
    touchDelta = 0;
    
    horizontalSwipeTarget.addEventListener("touchstart", function(e) {
        selectedList = listsContainer.getAttribute("data-selected");
        touchStart = e.targetTouches[0].screenX;

        horizontalSwipeTarget.addEventListener("touchmove", function(e) {
            touchNow = e.targetTouches[0].screenX;
            touchDelta = touchNow - touchStart,
            touchDeltaNegative = 0 - touchDelta;
            
            if ( selectedList === "models" && touchDelta > 0 && touchDelta < 100 ) {
                swipableList.setAttribute("style","right: "+ touchDeltaNegative +"px;")
            }
            
            if ( selectedList === "brands" && touchDelta < 0 && touchDelta > -100 ) {
                swipableList.setAttribute("style","right: "+ touchDeltaNegative +"px;")
            }
        });
    });

    horizontalSwipeTarget.addEventListener("touchend", function(e) {
        if ( touchDelta > 49 ) {
            listsContainer.setAttribute("data-selected","brands");
        }

        if ( touchDelta < -50 ) {
            listsContainer.setAttribute("data-selected","models");
        }
        
        swipableList.setAttribute("style","")
        touchStart = 0;
        touchNow = 0;
        touchDelta = 0;
        
        //horizontalSwipeTarget.removeEventListener("touchmove");
    });
}
focusedListSwipes();

// Scroll list to active phone on init
function scrollToActive() {
    try {
        let phoneList = document.querySelector('div.scroll#phones'),
            firstActivePhone = document.querySelector('div.phone-item[style*=border]'),
            offset = firstActivePhone.offsetTop - 26;

        phoneList.scrollTop = offset;
    }
    catch {}
}

// Set focused panel
function setFocusedPanel() {
    let panelsContainer = document.querySelector("main.main"),
        primaryPanel = document.querySelector(".parts-primary"),
        secondaryPanel = document.querySelector(".parts-secondary"),
        phonesList = document.querySelector("div#phones"),
        graphBox = document.querySelector("div.graph-sizer"),
        mobileHelper = document.querySelector("tr.mobile-helper");
    
    panelsContainer.setAttribute("data-focused-panel","secondary");
    
    mobileHelper.addEventListener("click", function() {
        panelsContainer.setAttribute("data-focused-panel","secondary");
    });

    secondaryPanel.addEventListener("click", function() {
        panelsContainer.setAttribute("data-focused-panel","secondary");
    });
    
    graphBox.addEventListener("click", function() {
        let previousState = panelsContainer.getAttribute("data-focused-panel");
        
        if ( previousState === "primary") {
            panelsContainer.setAttribute("data-focused-panel","secondary");
        } else if ( previousState === "secondary" ) {
            panelsContainer.setAttribute("data-focused-panel","primary");
        }
    });
    
    // Touch events
    let verticalSwipeTargets = document.querySelectorAll("div.selector-tabs, input.search");
    
    verticalSwipeTargets.forEach(function(target) {
        target.addEventListener("touchstart", function(e) {
            focusedPanel = document.querySelector("main.main").getAttribute("data-focused-panel");

            touchStart = e.targetTouches[0].screenY;

            target.addEventListener("touchmove", function(e) {
                touchNow = e.targetTouches[0].screenY;
                touchDelta = touchNow - touchStart;

                if ( focusedPanel === "secondary" && touchDelta > 0 && touchDelta < 200) {
                    secondaryPanel.setAttribute("style", "top: " + touchDelta + "px;")
                } else if ( focusedPanel === "primary" && touchDelta < 0 && touchDelta > -200) {
                    secondaryPanel.setAttribute("style", "top: " + touchDelta + "px;")
                }
            });
        });

        target.addEventListener("touchend", function(e) {
            if ( touchDelta > 49 ) {
                panelsContainer.setAttribute("data-focused-panel","primary");
            }

            if ( touchDelta < -50 ) {
                panelsContainer.setAttribute("data-focused-panel","secondary");
            }

            secondaryPanel.setAttribute("style", "")
            touchStart = 0;
            touchNow = 0;
            touchDelta = 0;
        });
    
        target.addEventListener("wheel", function(e) {
            let wheelDelta = e.deltaY;

            if (wheelDelta < -5) {
                panelsContainer.setAttribute("data-focused-panel","primary");
            }

            if (wheelDelta > 5) {
                panelsContainer.setAttribute("data-focused-panel","secondary");
            }
        });
    });
}
setFocusedPanel();

// Blur focus from inputs on submit
function blurFocus() {
    let inputFields = document.querySelectorAll("input"),
        body = document.querySelector("body");
    
    inputFields.forEach(function(field) {
        field.addEventListener("keyup", function(e) {
            if (e.keyCode === 13) {
                field.blur();
            }
        });
        
        field.addEventListener("focus", function() {
            body.setAttribute("data-input-state","focus");
        });
        
        field.addEventListener("blur", function() {
            body.setAttribute("data-input-state","blur");
        });
    });
}
blurFocus();

/* Over number inputs: cancel native wheel value stepping only; apply the same delta to the extra panel scroll. */
(() => {
    let extraPanel = document.querySelector("div.select > div.extra-panel");
    if (!extraPanel) {
        return;
    }
    extraPanel.addEventListener("wheel", (e) => {
        if (e.ctrlKey || e.metaKey) {
            return;
        }
        let t = e.target;
        if (!t || t.nodeType !== 1 || t.tagName !== "INPUT") {
            return;
        }
        if (t.getAttribute("type") !== "number") {
            return;
        }
        if (!extraPanel.contains(t)) {
            return;
        }
        let dy = e.deltaY;
        if (e.deltaMode === 1) {
            dy *= 16;
        } else if (e.deltaMode === 2) {
            dy *= extraPanel.clientHeight || 0;
        }
        if (Math.abs(e.deltaX) > Math.abs(dy)) {
            return;
        }
        if (!dy) {
            return;
        }
        e.preventDefault();
        extraPanel.scrollTop += dy;
    }, { capture: true, passive: false });
})();

// Add extra feature
function addExtra() {
    if (typeof initEqPanelExtra === "function") initEqPanelExtra();
    if (typeof initLiveSoundExtra === "function") initLiveSoundExtra();
}
addExtra();
