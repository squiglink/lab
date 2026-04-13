let doc = d3.select(".graphtool");
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
    <div class="graphBox" data-sticky-graph="`+ alt_sticky_graph +`" data-animated="`+ alt_animated +`">
      <div class="graph-sizer">
        <svg id="fr-graph" viewBox="0 0 800 360" data-labels-position="`+ labelsPosition +`"></svg>
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
            <input type="number" inputmode="decimal" id="norm-phon" required min="0" max="100" value="`+ default_norm_db +`" step="1" onclick="this.focus();this.select()"></input>
            <span>dB</span>
          </div>
          <div>
            <input type="number" inputmode="decimal" id="norm-fr" required min="20" max="20000" value="`+ default_norm_hz +`" step="1" onclick="this.focus();this.select()"></input>
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
            <div class="live-sound-tools">
              <div class="live-sound-tools-head">
                <h5 class="live-sound-tools-title">Sound Tools</h5>
                <label class="live-sound-eq-toggle-label">
                  <span class="live-sound-eq-toggle-text">Apply EQ</span>
                  <span class="live-sound-eq-switch">
                    <span class="live-sound-eq-switch-track">
                      <input type="checkbox" class="live-sound-eq-toggle" checked aria-label="Apply parametric EQ to live playback" />
                      <span class="live-sound-eq-switch-thumb" aria-hidden="true"></span>
                    </span>
                  </span>
                </label>
              </div>
              <div class="live-sound-sources">
                <div class="live-sound-source extra-pink-noise">
                  <div class="live-sound-source-head">
                    <span class="live-sound-source-title">Pink Noise</span>
                  </div>
                  <div class="live-sound-source-actions">
                    <button type="button" class="play" aria-label="Toggle pink noise playback">▶</button>
                  </div>
                </div>
                <div class="live-sound-source extra-tone-generator">
                  <div class="live-sound-source-head">
                    <span class="live-sound-source-title">Tone Generator</span>
                  </div>
                  <div class="live-sound-source-actions tone-generator-play-row">
                    <button type="button" class="play" aria-label="Toggle tone playback">▶</button>
                  </div>
                  <div class="live-sound-slider-row tone-generator-slider-row">
                    <input name="tone-generator-freq" type="range" min="0" max="1" step="0.0001" value="0" aria-label="Tone frequency along band" />
                    <span class="live-sound-tone-freq-display"><span class="freq-text">1000</span> Hz</span>
                  </div>
                  <div class="live-sound-tone-create-filter">
                    <button type="button" class="tone-generator-add-filter">+ Add Filter</button>
                  </div>
                </div>
                <div class="live-sound-source extra-music">
                  <div class="live-sound-source-head">
                    <span class="live-sound-source-title">Music</span>
                  </div>
                  <div class="music-playback-panel" aria-hidden="true">
                    <div class="music-playback-panel-inner">
                      <div class="live-sound-source-actions music-play-row">
                        <button type="button" class="play" disabled aria-label="Toggle music playback">▶</button>
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
                    <button type="button" class="music-add-remove">+ Add Music</button>
                    <input type="file" class="music-file-input" accept="audio/*" tabindex="-1" aria-hidden="true" />
                  </div>
                </div>
              </div>
              <div class="live-sound-band">
                <span class="live-sound-band-label live-sound-source-title">Range (Sound Tools)</span>
                <div class="live-sound-range-pair">
                  <span><input name="tone-generator-from" inputmode="decimal" type="number" min="20" max="20000" step="1" value="20" aria-label="Minimum frequency"></input></span>
                  <span><input name="tone-generator-to" inputmode="decimal" type="number" min="20" max="20000" step="1" value="20000" aria-label="Maximum frequency"></input></span>
                </div>
              </div>
            </div>
            <div class="extra-eq">
              <div class="extra-eq-head">
                <h5 class="extra-eq-panel-title">Parametric Equalizer</h5>
                <div class="extra-eq-reset-row">
                  <label class="live-sound-eq-toggle-text" for="extra-eq-reset-btn">Reset EQ</label>
                  <button type="button" id="extra-eq-reset-btn" class="extra-eq-reset-btn" aria-label="Reset all EQ bands: frequency, gain, and Q to zero">
                    <svg class="extra-eq-reset-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0l6-6M3 9h12a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6H9"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="select-eq-phone">
                <select name="phone">
                    <option value="" selected>Choose EQ model</option>
                </select>
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
                      <input name="enabled" type="checkbox" checked></input>
                      <select name="type">
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
              <h5 class="ranges-label">Ranges (AutoEQ)</h5>
              <div class="settings-row">
                <span>Frequency</span>
                <span><input name="autoeq-freq-min" inputmode="decimal" type="number" min="20" max="20000" step="1" value="20"></input></span>
                <span><input name="autoeq-freq-max" inputmode="decimal" type="number" min="20" max="20000" step="1" value="15000"></input></span>
              </div>
              <div class="settings-row">
                <span>Gain</span>
                <span><input name="autoeq-gain-min" inputmode="decimal" type="number" min="-40" max="0" step="0.1" value="-16"></input></span>
                <span><input name="autoeq-gain-max" inputmode="decimal" type="number" min="0" max="40" step="0.1" value="16"></input></span>
              </div>
              <div class="settings-row">
                <span>Q</span>
                <span><input name="autoeq-q-min" inputmode="decimal" type="number" min="0.1" max="10" step="0.01" value="0.3"></input></span>
                <span><input name="autoeq-q-max" inputmode="decimal" type="number" min="0.1" max="10" step="0.01" value="3"></input></span>
              </div>
              <div class="filters-button">
                <button class="autoeq">AutoEQ</button>
                <button class="readme">Readme</button>
                <button class="import-filters">Import</button>
                <button class="export-filters">Export</button>
                <button class="export-graphic-filters">Export Graphic EQ (For Wavelet)</button>
              </div>
              <a style="display: none" id="file-filters-export"></a>
              <form style="display:none"><input type="file" id="file-filters-import" accept=".txt" /></form>
            </div>
            <div class="extra-upload">
              <h5>Upload Data</h2>
              <button class="upload-fr">Upload FR</button>
              <button class="upload-target">Upload Target</button>
              <br />
              <span class="extra-upload-note">Warning: Measurements from another rig are not compatible with measurements or targets in this database.</span>
              <form style="display:none"><input type="file" id="file-fr" accept=".csv,.txt" /></form>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div style="display: none;" class="extra-eq-overlay">AutoEQ is running, it could take 5~20 seconds or more.</div>
  </main>
`);


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


// Label drawing and screenshot
let getFullName = p => p.dispBrand+" "+p.dispName,
    getChannelName = p => n => getFullName(p) + " ("+n+")";

let labelButton = doc.select("#label"),
    labelsShown = false;
function setLabelButton(l) {
    labelButton.classed("selected", labelsShown = l);
}
function clearLabels() {
    gr.selectAll(".lineLabel").remove();
    setLabelButton(false);
}

function drawLabels() {
    let curves = d3.merge(
        activePhones.filter(p=>!p.hide).map(p =>
            p.isTarget||!p.samp||p.avg ? p.activeCurves
            : LR.map((l,i) => ({
                p:p, o:getO(i), id:getChannelName(p)(l), multi:true,
                l:(n=>p.channels.slice(i*n,(i+1)*n))(sampnums.length)
                    .filter(c=>c!==null)
              }))
        )
    );
    if (!curves.length) return;

    let bcurves = curves.slice(),
        bp = baseline.p;
    if (bp && bp.hide) {
        bcurves.push({
            p:bp, o:0,
            id:"Baseline: "+(bp.isTarget?bp.fullName:getFullName(bp))
        });
    }

    gr.selectAll(".lineLabel").remove();
    let g = gr.selectAll(".lineLabel").data(bcurves)
        .join("g").attr("class","lineLabel").attr("opacity", 0);
    let t = g.append("text")
        .attrs({x:0, y:0, fill:c=>getTooltipColor(c)})
        .text(c=>c.id);
    g.datum(function(){return this.getBBox();});
    g.select("text").attrs(b=>({x:3-b.x, y:3-b.y}));
    g.insert("rect", "text")
        .attrs(b=>({x:2, y:2, width:b.width+2, height:b.height+2}));
    let boxes = g.data(),
        w = boxes.map(b=>b.width +6),
        h = boxes.map(b=>b.height+6);

    // Slice to fit in range
    let r = x.domain().map(v => d3.bisectLeft(f_values, v));
    rsl = a => a.slice(Math.max(r[0],0), r[1]+1);
    let rf_values = rsl(f_values);
    let v = curves.map(c => {
        let o = getOffset(c.p);
        return (c.multi?c.l:[c.l])
            .map(l => rsl(baseline.fn(l).map(d=>d[1]+o)));
    });
    let tr;

    if (curves.length === 1) {
        let x0 = 50, y0 = 10,
            sl = range_to_slice([0,w[0]], o=>x0+o),
            e = d3.extent(d3.merge(v[0].map(sl)).map(y));
        if (y0+h[0] >= e[0]) { y0 = Math.max(y0, e[1]); }
        tr = [[x0,y0]];
    } else {
        let n = v.length;
        let invd = (sc,d) => sc.invert(d)-sc.invert(0),
            xr = x.range(),
            yd = y.domain(),
            wind = w => Math.ceil((w/(xr[1]-xr[0]))*rf_values.length),
            mw = wind(d3.min(w));
        let winReduce = (l,w,d0,fn) => {
            l = l.slice();
            for (let d=d0; d<w; ) {
                let diff = Math.min(2*d,w) - d;
                for (let i=0; i<l.length-diff; i++) {
                    l[i] = fn(l[i], l[i+diff]);
                }
                d += diff;
            }
            l.length -= w-d0;
            return l;
        }
        let rangeGetters = [Math.min, Math.max].map(f => {
            let r = c => c.reduce((a,b)=>a.map((ai,i)=>f(ai,b[i])));
            let t = v.map(c => winReduce(r(c), mw, 1, f));
            return w => t.map(c => winReduce(c, w, mw, f));
        });
        let top = 0; // Use top left if we can't find a spot
        tr = v.map((_,j) => {
            let we = wind(w[j]),
                he = -invd(y,h[j]),
                range = d3.transpose(rangeGetters.map(r => r(we))),
                ds;
            ds = range[j].map(function (r,ri) {
                let le = r.length,
                    s = [[-he,0],[0,he]][ri].map(o=>r.map(d=>d+o)),
                    d = r.map(_=>1e10);
                for (let k=0; k<n; k++) if (k!==j) {
                    let t = range[k];
                    for (let i=0; i<le; i++) {
                        d[i] = Math.min(d[i], Math.max(s[0][i]-t[1][i],
                                                       t[0][i]-s[1][i]));
                    }
                }
                return d;
            });
            let sep = 0, pos = null;
            ds.forEach(function (drow,k) {
                for (let ii=0; ii<drow.length; ) {
                    let i=ii, d=drow[i],
                        rjk=range[j][k], m=rjk[i];
                    while (ii++, ii<drow.length && rjk[ii]===m) {
                        let di = drow[ii];
                        if (di<d && di<1) break;
                        d = Math.max(d,drow[ii]);
                    }
                    let clip = x => x/Math.sqrt(1+x*x);
                    d = 4*clip(d/4) + clip((ii-i)/3);
                    i = Math.floor((i+ii)/2);
                    let dl = drow.length,
                        r = i/dl;
                    d *= Math.sqrt((0.8+r)*Math.sqrt(1-r));
                    d *= clip(0.2+Math.max(0,(i>=15?drow[i-15]:0)+(i<dl-15?drow[i+15]:0)));
                    if (d>sep) {
                        let dy = range[j][k][i]+(k?he:0),
                            yd = y.domain();
                        if (yd[0]+he<=dy && dy<=yd[1]) { sep=d; pos=[i,dy]; }
                    }
                }
            });
            return pos ? [x(rf_values[pos[0]]), y(pos[1])]
                       : [60, 20+30*top++];
        });
    }
    for (let j=curves.length; j<bcurves.length; j++) {
        tr.push([pad.l+(W-w[j])/2, pad.t+H-h[j]+2]);
    }
    g.attr("transform",(_,i)=>"translate("+tr[i].join(",")+")");
    g.attr("opacity",null);
    setLabelButton(true);
    gEqFilterMarkers.raise();
    gEqHoverPreview.raise();
}

labelButton.on("click", () => (labelsShown?clearLabels:drawLabels)());

function saveGraph(ext) {
    let fn = {png:saveSvgAsPng, svg:saveSvg}[ext];
    let showControls = s => dB.all.attr("visibility",s?null:"hidden");
    gpath.selectAll("path").classed("highlight",false);
    drawLabels();
    showControls(false);
    fn(gr.node(), "graph."+ext, {scale:3})
        .then(()=>showControls(true));

    // Analytics event
    if (analyticsEnabled) { pushEventTag("clicked_download", targetWindow); }
}
doc.select("#download")
    .on("click", () => saveGraph("png"))
    .on("contextmenu", function () {
        d3.event.returnValue=false;
        let b = d3.select(this);
        let choice = b.selectAll("div")
            .data(["png","svg"]).join("div")
            .styles({position:"absolute", left:0, top:(_,i)=>i*1.3+"em",
                     background:"inherit", padding:"0.1em 1em"})
            .text(d => "As ."+d)
            .on("click", function (d) {
                saveGraph(d);
                choice.remove();
                d3.event.stopPropagation();
            });
        b.on("blur", ()=>choice.remove());
    });


// Graph smoothing
let pair = (arr,fn) => arr.slice(1).map((v,i)=>fn(v,arr[i]));

function smooth_prep(h, d) {
    let rh = h.map(d=>1/d),
        G = [ rh.slice(0,rh.length-1),
              pair(rh, (a,b)=>-(a+b)),
              rh.slice(1) ],
        dv = d3.range(rh.length+1).map(i=>d(i)),
        dG = G.map((r,j) => r.map((e,i) => e*dv[i+j])),
        d2 = dv.map(e=>e*e),
        h6 = h.map(d=>d/6),
        M = [ pair(h6, (a,b)=>2*(a+b)),
              h6.slice(1,h6.length-1),
              h6.slice(3).map(_=>0) ];
    dG.forEach((_,k) =>
        dG.slice(k).forEach((g,i) =>
            dG[i].slice(k).forEach((a,j) => M[k][j] += a*g[j])
        )
    );

    // Diagonal LDL decomposition of M
    let md = [M[0][0]],
        ml = M.slice(1).map(m=>[m[0]/md]);
    d3.range(1,M[0].length).forEach(j => {
        let n = ml.length,
            p = md.slice(-n).reverse().map((d,i)=>d*ml[i][j-1-i]),
            a = M.map((m,k) => m[j] - d3.sum(p.slice(0,n-k),
                      (a,i) => a*ml[k+i][j-1-i]));
        md.push(a[0]);
        ml.forEach((l,j)=>l.push(a[j+1]/a[0]));
    });

    return { G:G, md:md, ml:ml, d2:d2 };
}

function smooth_eval(p, y) {
    let Gy = p.G[0].map(_=>0),
        n = Gy.length;
    p.G.forEach((r,j) => r.forEach((e,i) => Gy[i] += e*y[i+j]));
    // Forward substitution and multiply by p.md
    for (let i=0; i<n; i++) {
        let yi = Gy[i];
        p.ml.forEach((m,k) => { let j=i+k+1; if (j<n) Gy[j] -= m[i]*yi; });
        Gy[i] /= p.md[i];
    }
    // Back substitution
    for (let i=n; i--; ) {
        let yi = Gy[i];
        p.ml.forEach((m,k) => { let j=i-k-1; if (j>=0) Gy[j] -= m[j]*yi; });
    }
    let u = y.slice();
    p.G.forEach((r,j) => r.forEach((e,i) => u[i+j] -= e*p.d2[i+j]*Gy[i]));
    return u;
}

let smooth_level = 5,
    smooth_scale = 0.01*(typeof scale_smoothing !== "undefined" ? scale_smoothing : 1),
    smooth_param = undefined;
function smooth(y, c) {
    if (smooth_level === 0) { return y; }
    let get_param = fv => {
        let x = fv.map(f=>Math.log(f)),
            h = pair(x, (a,b)=>a-b),
            s = smooth_level*smooth_scale,
            d = i => s*Math.pow(1/80,Math.pow(i/x.length,2));
        return smooth_prep(h, d);
    }
    let p;
    if (y.length!==f_values.length) {
        p = get_param(c.map(d=>d[0]));
    } else {
        if (!smooth_param) { smooth_param = get_param(f_values); }
        p = smooth_param;
    }
    return smooth_eval(p, y);
}

function smoothPhone(p) {
    if (!p.rawChannels) return;
    if (p.smooth !== smooth_level) {
        p.channels = p.rawChannels.map(
            c=>c?smooth(c.map(d=>d[1]),c).map((d,i)=>[c[i][0],d]):c
        );
        p.smooth = smooth_level;
        setCurves(p);
    }
}

doc.select("#smooth-level").on("change input", function () {
    if (!this.checkValidity()) return;
    smooth_level = +this.value;
    smooth_param = undefined;
    line.curve(smooth_level ? d3.curveNatural : d3.curveCardinal.tension(0.5));
    activePhones.forEach(smoothPhone);
    updatePaths();
});


// Normalization with target loudness
const iso223_params = { // :2003
    f  : [   20,    25, 31.5,    40,    50,    63,    80,   100,   125,  160,   200,   250,   315,   400,   500,   630,   800, 1000,  1250,  1600,  2000,  2500,  3150,  4000,  5000,  6300,  8000, 10000, 12500],
    a_f: [0.532, 0.506, 0.48, 0.455, 0.432, 0.409, 0.387, 0.367, 0.349, 0.33, 0.315, 0.301, 0.288, 0.276, 0.267, 0.259, 0.253, 0.25, 0.246, 0.244, 0.243, 0.243, 0.243, 0.242, 0.242, 0.245, 0.254, 0.271, 0.301],
    L_U: [-31.6, -27.2,  -23, -19.1, -15.9,   -13, -10.3,  -8.1,  -6.2, -4.5,  -3.1,    -2,  -1.1,  -0.4,     0,   0.3,   0.5,    0,  -2.7,  -4.1,    -1,   1.7,   2.5,   1.2,  -2.1,  -7.1, -11.2, -10.7,  -3.1],
    T_f: [ 78.5,  68.7, 59.5,  51.1,    44,  37.5,  31.5,  26.5,  22.1, 17.9,  14.4,  11.4,   8.6,   6.2,   4.4,     3,   2.2,  2.4,   3.5,   1.7,  -1.3,  -4.2,    -6,  -5.4,  -1.5,     6,  12.6,  13.9,  12.3]
};
const free_field = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0725,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0896,0,0,0,0,0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0967,0,0,0,0,0,0,0,0.0886,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0656,0,0,0,0,0,0.024,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.045,0,0,0,0,0,0,0.029,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1524,0.2,0.2,0.2386,0.3395,0.4,0.437,0.5,0.5287,0.6225,0.7,0.7063,0.7962,0.8,0.8941,0.9,0.9863,1,1.0729,1.1,1.1544,1.2,1.2504,1.3,1.3,1.3,1.3,1.3163,1.4,1.4,1.4,1.4,1.4017,1.4846,1.5,1.5,1.5748,1.6,1.6,1.653,1.7,1.7,1.7487,1.8,1.8341,1.9,1.9,1.9229,2,2,2,2.1,2.1,2.1897,2.2,2.2,2.2674,2.3,2.3,2.3567,2.4,2.4,2.4446,2.5,2.5262,2.6,2.6234,2.7149,2.8,2.8038,2.9011,2.9969,3.0913,3.1845,3.2762,3.3757,3.4649,3.5617,3.657,3.751,3.8,3.8432,3.9332,4,4,4,4.0121,4.1,4.1,4.1,4.0079,4,4,4,4,3.9334,3.9,3.9,3.9,3.8541,3.8,3.8,3.768,3.7,3.6761,3.6,3.6,3.5927,3.5,3.5,3.5,3.5,3.5,3.5761,3.6,3.6,3.6604,3.7,3.7514,3.8,3.8,3.8349,3.9,3.9218,4.0199,4.1123,4.2076,4.3016,4.3985,4.6816,5.0515,5.4222,5.8036,6.1097,6.4656,6.8461,7.3316,7.9083,8.4305,8.9369,9.5105,10.0759,10.6024,11.0027,11.4847,12.0482,12.5152,12.8994,13.2776,13.7381,14.1303,14.5168,14.8858,15.273,15.6547,15.9731,16.2596,16.542,16.7857,17.0111,17.2325,17.3532,17.522,17.6,17.6,17.6,17.6,17.5044,17.41,17.3145,17.2205,17.1255,17.0318,16.9373,16.784,16.6459,16.4536,16.2578,16.1234,15.967,15.8736,15.7552,15.566,15.3879,15.2881,15.0958,14.9064,14.8099,14.6287,14.5201,14.3477,14.2307,14.0709,13.9399,13.7916,13.6514,13.5552,13.4604,13.367,13.2718,13.1766,13.0812,12.9743,12.7916,12.6975,12.602,12.5078,12.3247,12.0547,11.7686,11.4154,11.1009,10.9385,10.7344,10.3998,10.0163,9.6382,9.2957,8.9799,8.6248,8.3404,8.0424,7.674,7.3851,7.0061,6.5307,6.1484,5.7696,5.4662,5.1084,4.7302,4.3498,3.971,3.6455,3.4075,3.1343,2.7917,2.5376,2.3484,2.1585,1.9849,1.9107,2,2,2,2.0894,2.1844,2.2787,2.374,2.6057,2.8265,3.0161,3.2057,3.3954,3.5851,3.8122,4.0967,4.354,4.5651,4.8509,5.1459,5.5259,5.9041,6.1881,6.5643,6.8561,7.1418,7.4251,7.7093,8.0593,8.3192,8.4541,8.5493,8.6437,8.7,8.7336,8.8,8.8,8.8,8.8,8.7926,8.7,8.7,8.6079,8.5133,8.5,8.4237,8.1863,7.968,7.7786,7.4219,6.948,6.4299,5.8212,5.1563,4.4634,3.7042,2.8897,1.9005,1.2368,0.5651,-0.2856,-0.8593,-2.9].map(v=>v-7);

function init_normalize(fv) { // Interpolate values for find_offset
    let par = [], ff = [];
    par.free_field = ff;
    const p = iso223_params;
    let i = 0;
    fv.forEach(function (f) {
        if (f >= p.f[i]) { i++; }
        let i0 = Math.max(0,i-1),
            i1 = Math.min(i,p.f.length-1),
            g;
        if (i0===i1) {
            g = n => p[n][i0];
        } else {
            let ll= [p.f[i0],p.f[i1],f].map(x=>Math.log(x)),
                l = (ll[2]-ll[0])/(ll[1]-ll[0]);
            g = n => { let v=p[n]; return v[i0]+l*(v[i1]-v[i0]); };
        }
        let a = g("a_f"),
            m = a * (Math.log10(4)-10 + g("L_U")/10),
            k = (0.005076/Math.pow(10,m)) - Math.pow(10, a*g("T_f")/10),
            c = Math.pow(10, 9.4 + 4*m) / fv.length;
        par.push({a:a, k:k, c:c});
        ffi = Math.floor(0.5+48*Math.log2(f/19.4806));
        ff.push(free_field[Math.max(0,Math.min(479,ffi))]);
    });
    return par;
}

// Find the appropriate offset (in dB) for fr so that the total loudness
// is equal to target (in phon)
let norm_par = []; // Cached interpolated ISO parameters
function find_offset(c, target) {
    let par;
    if (c.length!==f_values.length) {
        par = init_normalize(c.map(d=>d[0]));
    } else {
        if (!norm_par.length) { norm_par = init_normalize(f_values); }
        par = norm_par;
    }
    let fr = c.map(v=>v[1]);
    let x = 0; // Initial offset
    function getStep(o) {
        const l10 = Math.log(10)/10;
        let v=0, d=0;
        par.forEach(function (p,i) {
            let a=p.a, k=p.k, c=p.c, ds,v0,v1;
            v0  = Math.exp(l10*(fr[i]+o-par.free_field[i]));
            ds  = l10 * v0;
            v1  = k + Math.pow(v0,a);
            ds *= a * Math.pow(v0,a-1);
            v  += c * Math.pow(v1,4);
            ds *= c * 4 * Math.pow(v1,3);
            d  += ds;
        });
        // value: Math.log(v)/l10
        // deriv: d / (l10*v)
        return (Math.log(v) - target*l10) * (v/d);
    }
    let dx;
    do {
        dx = getStep(x);
        x -= dx;
    } while (Math.abs(dx) > 0.01);
    return x;
}


// File loading and channel management
const LR = typeof default_channels !== "undefined" ? default_channels
                                                   : ["L","R"];
let getO = i => LR.length>1 ? -1+i*2/(LR.length-1) : 0;
const sampnums = typeof num_samples !== "undefined" ? d3.range(1,num_samples+1)
                                                    : [""];
function loadFiles(p, callback) {
    let gen = (p._lfGen = (p._lfGen||0) + 1);
    let fetchTxt = base => d3.text(DIR+base+".txt").catch(()=>null);
    let parseFr = f => {
        if (!f) return null;
        try { return Equalizer.interp(f_values, tsvParse(f)); }
        catch (e) { return null; }
    };
    let f = p.isTarget ? [fetchTxt(p.fileName)]
          : d3.merge(LR.map(s =>
                sampnums.map(n => fetchTxt(p.fileName+" "+s+n))));
    let nSamp = sampnums.length;

    if (!p.isTarget && nSamp > 1) {
        let s1 = d3.range(LR.length).map(i => i * nSamp);
        let early = false;

        Promise.all(s1.map(i => f[i])).then(function (res) {
            if (gen !== p._lfGen) return;
            if (!res.some(x => x !== null)) return;
            early = true;
            let ch = new Array(LR.length * nSamp).fill(null);
            s1.forEach((idx, j) => { ch[idx] = parseFr(res[j]); });
            callback(ch);
        });

        Promise.all(f).then(function (frs) {
            if (gen !== p._lfGen) return;
            if (!frs.some(x => x !== null)) return;
            let ch = frs.map(parseFr);
            if (!early) { callback(ch); return; }
            let hasNew = ch.some((c, i) =>
                c !== null && (!p.rawChannels || p.rawChannels[i] === null));
            if (!hasNew || !p.rawChannels) return;
            p.rawChannels = ch;
            p.smooth = undefined;
            if (p.vars) p.vars[p.fileName] = ch;
            smoothPhone(p);
            normalizePhone(p);
            updatePaths();
            updatePhoneTable();
        });
        return;
    }

    Promise.all(f).then(function (frs) {
        if (gen !== p._lfGen) return;
        if (!frs.some(f=>f!==null)) return;
        let ch = frs.map(parseFr);
        callback(ch);
    });
}
let validChannels = p => (p.channels || []).filter(c=>c!==null);
let firstPresentChannel = chs => chs && chs.find(c => c != null);
let numChannels = p => p.channels ? d3.sum(p.channels, c=>c!==null) : 0;
let notMultichannel = LR.length===1 ? p=>true : p=>p.isTarget;
let hasChannelSel = p => !notMultichannel(p) && numChannels(p)>1;
let keyExt = LR.length===1 ? 16 : 0;
let keyLeft= keyExt ? 0 : sampnums.length>1 ? 11 : 0;
if (keyLeft) d3.select(".key").style("width","17%")

function avgCurves(curves) {
    if (!curves.length) return null;
    if (curves.length === 1) return curves[0];
    return curves
        .map(c=>c.map(d=>Math.pow(10,d[1]/20)))
        .reduce((as,bs) => as.map((a,i) => a+bs[i]))
        .map((x,i) => [curves[0][i][0], 20*Math.log10(x/curves.length)]);
}
function getAvg(p) {
    if (p.avg) {
        return p.activeCurves && p.activeCurves[0] ? p.activeCurves[0].l : null;
    }
    let v = validChannels(p);
    if (!v.length) return null;
    return v.length===1 ? v[0] : avgCurves(v);
}
function hasImbalance(p) {
    if (!p.channels || !hasChannelSel(p)) return false;
    let nSide = sampnums.length;
    let as = p.channels[0], bs = LR.length > 1 ? p.channels[nSide] : p.channels[1];
    if (!as || !bs) return false;
    let s0=0, s1=0;
    return as.some((a,i) => {
        let d = a[1]-bs[i][1];
        d *= 1/(50 * Math.sqrt(1+Math.pow(a[0]/1e4,6)));
        s0 = Math.max(s0+d,0);
        s1 = Math.max(s1-d,0);
        return Math.max(s0,s1) > max_channel_imbalance;
    });
}

let activePhones = [];
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
const EQ_GRAPH_TRACE_STROKE_SAMPLE = 1.9;
const EQ_GRAPH_TRACE_STROKE_NORMAL = 2.3;
const EQ_GRAPH_TRACE_STROKE_EMPH_MULT = 2;

let gpath = gr.insert("g",".dBScaler")
    .attr("fill","none")
    .attr("stroke-width", EQ_GRAPH_TRACE_STROKE_NORMAL)
    .attr("class", "curves-g")
    .attr("mask","url(#graphFade)");
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
        let base = this.classList.contains("sample")
            ? EQ_GRAPH_TRACE_STROKE_SAMPLE
            : EQ_GRAPH_TRACE_STROKE_NORMAL;
        n.attr("stroke-width", base);
    });
}
let gEqFilterMarkers = gr.append("g")
    .attr("class", "eq-filter-markers")
    .attr("pointer-events", "none")
    .attr("mask", "url(#graphFade)");
let gEqHoverPreview = gr.append("g")
    .attr("class", "eq-hover-preview")
    .attr("pointer-events", "none")
    .attr("mask", "url(#graphFade)");
let updateEqFilterMarkers = () => {};
let updateEqTraceOpacity = () => {};
/** @type {d3.Selection|null} */
let graphPlotHitRect = null;
/** Equalizer-tab graph: pointer gesture for add + vertical gain drag */
let eqGraphPointerState = null;
/** Last viewport client position over the graph (mousemove / drag); used to re-apply EQ hover
    after updateEqFilterMarkers(), e.g. when focusin on a filter field runs in a later frame. */
let lastGraphPlotPointerClient = null;
let eqGraphSkipNextClick = false;
let eqGraphSkipClickClearTimer = null;
let eqGraphApplyEqDragTimer = null;
/** @type {(m: number[]) => boolean} */
let tryEqGraphClickAddFilter = (_m) => false;
/** @type {(m: number[] | null) => void} */
let syncEqHoverPreview = (m) => {
    if (!m && graphPlotHitRect && graphPlotHitRect.node()) {
        graphPlotHitRect.node().style.cursor = "";
    }
};
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

let ld_p1 = 1.1673039782614187;
function getCurveColor(id, o) {
    let p1 = ld_p1,
        p2 = p1*p1,
        p3 = p2*p1;
    let t = o/32;
    let i=id/p3+0.76, j=id/p2+0.79, k=id/p1+0.32;
    if (id < 0) { return d3.hcl(360*(1-(-i)%1),5,66); } // Target
    let th = 2*Math.PI*i;
    i += Math.cos(th-0.3)/24 + Math.cos(6*th)/32;
    let s = Math.sin(2*Math.PI*i);
    return d3.hcl(360*((i + t/p2)%1),
                  88+30*(j%1 + 1.3*s - t/p3),
                  36+22*(k%1 + 1.1*s + 6*t*(1-s)));
}
let getColor_AC = c => getCurveColor(c.p.id, c.o);
let getColor_ph = (p,i) => getCurveColor(p.id, p.activeCurves[i].o);
function getDivColor(id, active) {
    let c = getCurveColor(id,0);
    c.l = 100-(80-Math.min(c.l,60))/(active?1.5:3);
    c.c = (c.c-20)/(active?3:4);
    return c;
}
function color_curveToText(c) {
    return c;
}
let getTooltipColor = curve => color_curveToText(getColor_AC(curve));
let getTextColor = p => color_curveToText(getCurveColor(p.id,0));
let getBgColor = p => {
    let c=getCurveColor(p.id,0).rgb();
    ['r','g','b'].forEach(p=>c[p]=255-(255-Math.max(0,c[p]))*0.85);
    return c;
}

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

let channelbox_x = c => c?-86:-36,
    channelbox_tr = c => "translate("+channelbox_x(c)+",0)";
function setCurves(p, avg, lr, samp) {
    if (!p.channels || !p.channels.length) {
        p.activeCurves = p.activeCurves || [];
        return;
    }
    if (avg ===undefined) avg = p.avg;
    if (samp===undefined) samp = avg ? false : LR.length===1||p.ssamp||false;
    else { p.ssamp = samp; if (samp) avg = false; }
    let dx = +avg - +p.avg,
        n  = LR.length ? p.channels.length / LR.length : p.channels.length,
        selCh = (l,i) => l.slice(i*n,(i+1)*n);
    p.avg = avg;
    p.samp = samp = n>1 && samp;
    if (!p.isTarget) {
        let id = getChannelName(p),
            v  = cs => cs.filter(c=>c!==null),
            cs = p.channels,
            cv = v(cs),
            mc = cv.length>1,
            pc = (idstr, l, oi) => ({id:id(idstr), l:l, p:p,
                                     o:oi===undefined?0:getO(oi)});
        p.activeCurves
            = avg && mc ? [pc("AVG", avgCurves(cv))]
            : !samp && mc ? LR.map((l,i) => pc(l, avgCurves(v(selCh(cs,i))), i)).filter(c => c.l)
            : cs.map((l,i) => {
                let j = Math.floor(i/n);
                return pc(LR[j]+sampnums[i%n], l, j);
            }).filter(c => c.l);
    } else {
        p.activeCurves = [{id:p.fullName, l:p.channels[0], p:p, o:0}];
    }
    let y = 0;
    let k = d3.selectAll(".keyLine").filter(q=>q===p);
    let ksb = k.select(".keySelBoth").attr("display","none");
    p.lr = lr;
    if (lr!==undefined) {
        p.activeCurves = p.samp ? selCh(p.activeCurves, lr) : [p.activeCurves[lr]];
        y = [-1,1][lr];
        ksb.attr("display",null).attr("y", [0,-12][lr]);
    }
    k.select(".keyMask")
        .transition().duration(400)
        .attr("x", channelbox_x(avg))
        .attrTween("y", function () {
            let y0 = +this.getAttribute("y"),
                y1 = 12*(-1+y);
            if (!dx) { return d3.interpolateNumber(y0,y1); }
            let ym = y0 + (y1-y0)*(3-2*dx)/6;
            y0-=ym; y1-=ym;
            return t => { t-=1/2; return ym+(t<0?y0:y1)*Math.pow(2,20*(Math.abs(t)-1/2)); };
        });
    k.select(".keySel").attr("transform", channelbox_tr(avg));
    k.selectAll(".keySamp").attr("opacity",(_,i)=>i===+samp?1:0.6);
}
function updateCurves() {
    setCurves.apply(null, arguments);
    updatePaths();
}

let drawLine = d => line(baseline.fn(d.l));
function redrawLine(p) {
    let getTr = o => o ? "translate(0,"+(y(o)-y(0))+")" : null;
    p.attr("transform", c => getTr(getOffset(c.p))).attr("d", drawLine);
}
function updateYCenter() {
    let c = yCenter;
    yCenter = baseline.p ? 0 : norm_sel ? 60 : norm_phon;
    y.domain(y.domain().map(d=>d+(yCenter-c)));
    yAxisObj.call(fmtY);
}
function setBaseline(b, no_transition) {
    baseline = b;
    updateYCenter();
    if (no_transition) {
        gpath.selectAll("path").attr("d", drawLine);
        updateEqFilterMarkers();
        return;
    }
    gpath.selectAll("path")
        .transition().duration(500).ease(d3.easeQuad)
        .attr("d", drawLine)
        .on("end", () => updateEqFilterMarkers());
    table.selectAll("tr").select(".button-baseline")
        .classed("selected", d => d.p === baseline.p);

    // Analytics event
    if (analyticsEnabled && b.p) { pushPhoneTag("baseline_set", b.p); }
}
function getBaseline(p) {
    let b = getAvg(p).map(d => d[1]+getOffset(p));
    return { p:p, fn:l=>l.map((e,i)=>[e[0],e[1]-b[Math.min(i,b.length-1)]]) };
}

function setOffset(p, o) {
    p.offset = +o;
    if (baseline.p === p) { baseline = getBaseline(p); }
    updatePaths();
}
let getOffset = p => p.offset + p.norm;

function setHover(elt, h) {
    elt.on("mouseover", h(true)).on("mouseout", h(false));
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

let ifURL = typeof share_url !== "undefined" && share_url;
let baseTitle = typeof page_title !== "undefined" ? page_title : "CrinGraph";
let baseDescription = typeof page_description !== "undefined" ? page_description : "View and compare frequency response graphs";
let baseURL;  // Set by setInitPhones
function addPhonesToUrl() {
    let title = baseTitle,
        url = baseURL,
        names = activePhones.filter(p => !p.isDynamic).map(p => p.fileName),
        namesCombined = names.join(", ");

    if (names.length) {
        url += "?share=" + encodeURI(names.join().replace(/ /g,"_"));
        title = namesCombined + " - " + title;
    }
    if (names.length === 1) {
        targetWindow.document.querySelector("link[rel='canonical']").setAttribute("href",url)
    } else {
        targetWindow.document.querySelector("link[rel='canonical']").setAttribute("href",baseURL)
    }
    targetWindow.history.replaceState("", title, url);
    targetWindow.document.title = title;
    targetWindow.document.querySelector("meta[name='description']").setAttribute("content",baseDescription + ", including " + namesCombined +".");
}

function setModeEmbed() {
    document.querySelector("body").setAttribute("embed-mode", "true");
}

function updatePaths(trigger) {
    clearLabels();
    let c = d3.merge(activePhones.map(p => p.activeCurves || [])),
        p = gpath.selectAll("path").data(c, d=>d.id);
    let t = p.join("path").attr("opacity", c=>c.p.hide?0:null)
        .classed("sample", c=>c.p.samp)
        .attr("stroke", getColor_AC).call(redrawLine)
        .filter(c=>c.p.isTarget)
        .attr("data-phone-name", c=>c.p.fullName)
        .attr("class", "target");
    resetGraphPathStrokesToBase();
    if (targetDashed) t.style("stroke-dasharray", "6, 3");
    if (targetColorCustom) t.attr("stroke", targetColorCustom);
    if (ifURL && !trigger) addPhonesToUrl();
    if (stickyLabels) drawLabels();
    updateEqFilterMarkers();
    updateEqTraceOpacity();
}
let colorBar = p=>'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 8"><path d="M0 8v-8h1c0.05 1.5,-0.3 3,-0.16 5s0.1 2,0.15 3z" fill="'+getBgColor(p)+'"/></svg>\')';

function manageTableRows() {
    let curvesAll = d3.merge(activePhones.map(p => p.activeCurves || [])),
        phoneOrder = [],
        seenP = new Set();
    curvesAll.forEach(c => {
        if (!c || !c.p || seenP.has(c.p)) return;
        seenP.add(c.p);
        phoneOrder.push(c.p);
    });
    let rows = [];
    phoneOrder.forEach(p => {
        let pid = phoneManageIdentity(p),
            ac = p.activeCurves || [];
        if (p.samp && ac.length > 1) {
            ac.forEach((curve, i) => {
                rows.push({
                    p, sub: i,
                    key: pid + "\t" + String(curve.id) + "\ts" + i
                });
            });
        } else {
            let cid = ac[0] ? String(ac[0].id) : String(p.fileName || p.dispName || "");
            rows.push({
                p, sub: null,
                key: pid + "\t" + cid + "\tm"
            });
        }
    });
    return rows;
}

function updatePhoneTable(trigger) {
    let rows = manageTableRows(),
        trJoin = table.selectAll("tr").data(rows, r => r.key);
    trJoin.exit().remove();

    function isManageMainRow(r) {
        return r.sub === null || r.sub === 0;
    }
    function removeRowClicked() {
        let r = d3.select(d3.event.currentTarget.closest("tr")).datum(),
            ac = r.p.activeCurves || [];
        if (r.p.samp && ac.length > 1 && typeof r.sub === "number" && r.sub > 0) {
            removeSampleRow(r.p, r.sub);
        } else {
            removePhone(r.p);
        }
    }

    let enter = trJoin.enter().append("tr")
        .attr("data-filename", r => r.p.fileName)
        .attr("data-phone-id", r => r.p.id)
        .attr("data-manage-main", r => isManageMainRow(r) ? "1" : null);

    let nRest = 7 + (exportableGraphs ? 1 : 0),
        subOnly = enter.filter(r => !isManageMainRow(r));
    subOnly.call(setHover, h => r => hl(r.p, h, r.sub))
        .style("color", r => getDivColor(r.p.id, true));
    subOnly.append("td").attr("class", "remove").text("⊗")
        .attr("title", "Remove this sample")
        .on("click", removeRowClicked)
        .style("background-image", r => colorBar(r.p))
        .filter(r => !r.p.isTarget).append("svg").call(addColorPicker);
    subOnly.append("td").attr("class", "manage-sample-row-label").attr("colspan", nRest)
        .append("span").attr("class", "manage-sample-label")
        .text(r => (r.p.activeCurves[r.sub] && r.p.activeCurves[r.sub].id) || "");

    let f = enter.filter(isManageMainRow),
        td = () => f.append("td");
    f.call(setHover, h => r => hl(r.p, h, r.sub))
        .style("color", r => getDivColor(r.p.id, true));

    td().attr("class", "remove").text("⊗")
        .attr("title", "Remove graph")
        .on("click", removeRowClicked)
        .style("background-image", colorBar)
        .filter(r => !r.p.isTarget).append("svg").call(addColorPicker);
    td().attr("class", "item-line item-target")
        .call(s => s.filter(r => !r.p.isTarget).attr("class", "item-line item-phone")
            .append("span").attr("class", "brand").text(r => r.p.dispBrand))
        .call(addModel);
    td().attr("class", "curve-color").append("button")
        .style("background-color", r => getCurveColor(r.p.id, 0))
        .filter(r => !r.p.isTarget).call(makeColorPicker);
    td().attr("class", "channels").append("svg").datum(r => r.p).call(addKey);
    td().attr("class", "levels").append("input")
        .attrs({ type: "number", step: "any", value: 0 })
        .property("value", r => r.p.offset)
        .on("change input", function (r) { setOffset(r.p, +this.value); });
    if (exportableGraphs) {
        td().attr("class", "button button-export")
            .attr("title", "Export graph")
            .on("click", function (r) {
                let phoneName = r.p.fullName,
                    channels = r.p.rawChannels,
                    exportContainer = document.querySelector("body");

                channels.forEach(function (channel, i) {
                    if (!channel) return;
                    let channelNum = i + 1,
                        text = channel.reduce((acc, c) => {
                            return acc.concat([Object.values(c).join("\t")]);
                        }, []).join("\n"),
                        blob = new Blob([text], { type: "text/plain" }),
                        url = URL.createObjectURL(blob),
                        exportLink = document.createElement("a");

                    exportLink.download = phoneName + " [" + channelNum + "]" + ".txt";
                    exportLink.href = url;
                    exportContainer.appendChild(exportLink);
                    exportLink.click();
                    exportLink.remove();
                });
            });
    }
    td().attr("class", "button button-baseline")
        .attr("title", "Set as baseline")
        .html("<svg viewBox='-170 -120 340 240'><use xlink:href='#baseline-icon'></use></svg>")
        .on("click", r => setBaseline(r.p === baseline.p ? baseline0
            : getBaseline(r.p)));
    function toggleHide(p) {
        let h = p.hide,
            t = table.selectAll("tr").filter(q => q.p === p && (q.sub === null || q.sub === 0));
        t.select(".keyLine").on("click", h ? null : toggleHide)
            .selectAll("path,.imbalance").attr("opacity", h ? null : 0.5);
        t.select(".hideIcon").classed("selected", !h);
        gpath.selectAll("path").filter(c => c.p === p)
            .attr("opacity", h ? null : 0);
        p.hide = !h;
        if (labelsShown) {
            clearLabels();
            drawLabels();
        }
    }
    td().attr("class", "button hideIcon")
        .attr("title", "Hide graph")
        .html("<svg viewBox='-2.5 0 19 12'><use xlink:href='#hide-icon'></use></svg>")
        .on("click", r => toggleHide(r.p));
    td().attr("class", "button button-pin")
        .attr("title", "Pin graph")
        .attr("data-pinned", "false")
        .html("<svg viewBox='-135 -100 270 200'><use xlink:href='#pin-icon'></use></svg>")
        .on("click", function (r) {
            if (cantCompare(activePhones.filter(p => p.pin), 1)) return;

            if (r.p.pin) {
                r.p.pin = false;
                this.setAttribute("data-pinned", "false");
            } else {
                r.p.pin = true; nextPN = null;
                this.setAttribute("data-pinned", "true");
            }

            r.p.pin = true; nextPN = null;
            d3.select(this)
                .text(null).classed("button", false).on("click", null)
                .insert("svg").attr("class", "pinMark")
                .attr("viewBox", "0 0 280 145")
                .insert("path").attrs({
                    fill: "none",
                    "stroke-width": 30,
                    "stroke-linecap": "round",
                    d: "M265 110V25q0 -10 -10 -10H105q-24 0 -48 20l-24 20q-24 20 -2 40l18 15q24 20 42 20h100"
                });
            if (!userConfigApplicationActive) setUserConfig();
        });

    enter.merge(trJoin).select(".manage-sample-label")
        .text(r => !isManageMainRow(r) && r.p.activeCurves[r.sub]
            ? r.p.activeCurves[r.sub].id : "");
}

function addKey(s) {
    let dim={x:-19-keyLeft, y:-12, width:65+keyLeft, height:24}
    s.attr("class","keyLine").attr("viewBox",[dim.x,dim.y,dim.width,dim.height].join(" "));
    let defs = s.append("defs");
    defs.append("linearGradient").attr("id", p=>"chgrad"+p.id)
        .attrs({x1:0,y1:0, x2:0,y2:1})
        .selectAll().data(p=>[0.1,0.4,0.6,0.9].map(o =>
            [o, getCurveColor(p.id, o<0.3?-1:o<0.7?0:1)]
        )).join("stop")
        .attr("offset",i=>i[0])
        .attr("stop-color",i=>i[1]);
    defs.append("linearGradient").attr("id","blgrad")
        .selectAll().data([0,0.25,0.31,0.69,0.75,1]).join("stop")
        .attr("offset",o=>o)
        .attr("stop-color",(o,i) => i==2||i==3?"white":"#333");
    let m = defs.append("mask").attr("id",p=>"chmask"+p.id);
    m.append("rect").attrs(dim).attr("fill","#333");
    m.append("rect").attrs({"class":"keyMask", x:p=>channelbox_x(p.avg), y:-12, width:120, height:24, fill:"url(#blgrad)"});
    let t = s.append("g");
    t.append("path")
        .attr("stroke", p => notMultichannel(p) ? getCurveColor(p.id,0)
                                                : "url(#chgrad"+p.id+")");
    t.selectAll().data(p=>p.isTarget?[]:LR)
        .join("text").attr("class","keyCLabel")
        .attrs({x:17+keyExt, y:(_,i)=>12*(i-(LR.length-1)/2),
                dy:"0.32em", "text-anchor":"start", "font-size":10.5})
        .text(t=>t);
    t.filter(p=>p.isTarget).append("text")
        .attrs(keyExt?{x:7,y:6,"text-anchor":"middle"}
                     :{x:17,y:0,"text-anchor":"start"})
        .attrs({dy:"0.32em", "font-size":8, fill:p=>getCurveColor(p.id,0)})
        .text("Target");
    let uchl = f => function (p) {
        updateCurves(p, f(p)); hl(p,true);
    }
    s.append("rect").attr("class","keySelBoth")
        .attrs({x:40+channelbox_x(0), width:40, height:12,
                opacity:0, display:"none"})
        .on("click", uchl(p=>0));
    s.append("g").attr("class","keySel")
        .attr("transform",p=>channelbox_tr(p.avg))
        .on("click", uchl(p=>!p.avg))
        .selectAll().data([0,80]).join("rect")
        .attrs({x:d=>d, y:-12, width:40, height:24, opacity:0});
    let o = s.filter(p=>!notMultichannel(p))
        .selectAll().data(p=>[[p,0],[p,1]])
        .join("g").attr("class","keyOnly")
        .attr("transform",pi=>"translate(25,"+[-6,6][pi[1]]+")")
        .call(setHover, h => function (pi) {
            let p = pi[0], cs = p.activeCurves;
            if (!p.hide && cs.length===2) {
                d3.event.stopPropagation();
                hl(p, h ? (c=>c===cs[pi[1]]) : true);
                clearLabels();
                gpath.selectAll("path").filter(c=>c.p===p).attr("opacity",h ? (c=>c!==cs[pi[1]]?0.7:null) : null);
            }
        })
        .on("click", pi => updateCurves(pi[0], false, pi[1]));
    o.append("rect").attrs({x:0,y:-6,width:30,height:12,opacity:0});
    o.append("text").attrs({x:0, y:0, dy:"0.28em", "text-anchor":"start",
                            "font-size":7.5 })
        .text("only");
    s.append("text").attr("class","imbalance")
        .attrs({x:8,y:0,dy:"0.35em","font-size":10.5})
        .text("!");
    if (sampnums.length>1) {
        let a = s.filter(p=>!p.isTarget);
        let f = LR.length>1 ? (n=>"all "+n) : (n=>n+" samples");
        let t = a.selectAll()
            .data(p=>["AVG",f(Math.floor(validChannels(p).length/LR.length))]
                        .map((t,i)=>[t,i===+p.samp?1:0.6]))
            .join("text").attr("class","keySamp")
            .attrs({x:-18.5-keyLeft, y:(_,i)=>12*(i-1/2), dy:"0.33em",
                    "text-anchor":"start", "font-size":7, opacity:t=>t[1] })
            .text(t=>t[0]);
        a.append("rect")
            .attrs({x:-19-keyLeft, y:-12, width:keyLeft?16:38, height:24, opacity:0})
            .on("click", p=>updateCurves(p, undefined, p.lr, !p.samp));
    }
    updateKey(s);
}

function updateKey(s) {
    let disp = fn => e => e.attr("display",p=>fn(p)?null:"none"),
        cs = hasChannelSel;
    s.select(".imbalance").call(disp(hasImbalance));
    s.select(".keySel").call(disp(p=>cs(p)));
    s.selectAll(".keyOnly").call(disp(pi=>cs(pi[0])));
    s.selectAll(".keyCLabel").data(p => p.channels || []).call(disp(c=>c));
    s.select("g").attr("mask",p=>cs(p)?"url(#chmask"+p.id+")":null);
    let l=-17-(keyLeft?8:0);
    s.select("path").attr("d", p => {
        if (notMultichannel(p) || !p.channels) {
            return "M"+(15+keyExt)+" 0H"+l;
        }
        let segs = ["M15 -6H9C0 -6,0 0,-9 0H"+l,"M"+l+" 0H-9C0 0,0 6,9 6H15"]
            .filter((_,i) => p.channels[i ? sampnums.length : 0]);
        return segs.length ? segs.reduce((a,b) => a+b.slice(6)) : "M"+(15+keyExt)+" 0H"+l;
    });
}

function addModel(t) {
    let n = t.append("div").attr("class","phonename").text(r=>r.p.dispName);
    t.filter(r=>r.p.fileNames)
        .append("div").attr("class","variants")
        .call(function (s) {
            s.append("svg").attr("viewBox","0 -2 10 11")
                .append("path").attr("fill","currentColor")
                .attr("d","M1 2L5 6L9 2L8 1L6 3Q5 4 4 3L2 1Z");
        })
        .attr("tabindex",0) // Make focusable
        .on("focus", function (r) {
            let p = r.p;
            if (p.selectInProgress) return;
            p.selectInProgress = true;
            p._variantFocusStartFile = p.fileName;
            if (!p.vars) p.vars = {};
            p.vars[p.fileName] = p.rawChannels;
            d3.select(this)
                .on("mousedown", function () {
                    d3.event.preventDefault();
                    this.blur();
                })
                .select("path").attr("transform","translate(0,7)scale(1,-1)");
            let n = d3.select(this.parentElement).select(".phonename");
            n.text("");
            let q = p.copyOf || p,
                o = q.objs || [p],
                active_fns = o.map(v=>v.fileName),
                vars = p.fileNames.map((f,i) => {
                    let j = active_fns.indexOf(f);
                    return j!==-1 ? o[j] :
                        {fileName:f, dispName:q.dispNames[i]};
                });
            let nVariantNames = n.append("div").attr("class","variant-names");
            let nVariantPopouts = n.append("div").attr("class","variant-popouts");
            let d = nVariantNames.selectAll().data(vars).join("div")
                     .attr("class","variantName").text(v=>v.dispName),
                w = d3.max(d.nodes(), d=>d.getBoundingClientRect().width);
            d.style("width",w+"px");
            d.filter(v=>v.active)
                .style("cursor","initial")
                .style("color", getTextColor)
                .call(setHover, h => () =>
                    table.selectAll("tr").filter(row => row.p === r.p)
                        .classed("highlight", h)
                );
            let c = nVariantPopouts.selectAll().data(vars).join("span")
                .html("&nbsp;+&nbsp;").attr("class","variantPopout")
                .style("left",(w+5)+"px")
                .style("display",v=>v.active?"none":null);
            [d,c].forEach(e=>e.transition().style("top",(_,i)=>i*1.3+"em"));
            /* Do not Object.assign(p,v): v can be a full on-graph variant (copyOf, id, …) and would
               overwrite p.fileName etc., collapsing manage rows that key on fileName. */
            d.filter(v=>!v.active).on("mousedown", v => {
                p.fileName = v.fileName;
                p.dispName = v.dispName;
            });
            c.on("mousedown", function (v) {
                showVariant(q, v);
            });
        })
        .on("blur", function endSelect(r) {
            let p = r.p;
            if (document.activeElement === this) return;
            p.selectInProgress = false;
            d3.select(this)
                .on("mousedown", null)
                .select("path").attr("transform", null);
            let n = d3.select(this.parentElement).select(".phonename");
            n.selectAll("div")
                .call(setHover, h=>p=>null)
                .transition().style("top",0+"em").remove()
                .end().then(()=>n.text(()=>p.dispName));
            /* Avoid changeVariant when nothing changed: blur runs on every close (e.g. picking
               another model) and would re-smooth + full updatePhoneTable for no reason. */
            let startF = p._variantFocusStartFile;
            delete p._variantFocusStartFile;
            if (startF !== undefined && p.fileName !== startF) {
                changeVariant(p, updateVariant);
            } else {
                updateKey(table.selectAll("tr").filter(row => row.p === p && (row.sub === null || row.sub === 0)).select(".keyLine"));
            }
            table.selectAll("tr").classed("highlight", false); // Prevents some glitches
        });
    t.filter(r=>r.p.isTarget).append("span").text(" Target");
}

function updateVariant(p) {
    updateKey(table.selectAll("tr").filter(r => r.p === p && (r.sub === null || r.sub === 0)).select(".keyLine"));
    normalizePhone(p);
    updatePaths();
    updatePhoneTable();
    d3.selectAll("#phones .phone-item,.target")
        .filter(q => q.id !== undefined)
        .call(setPhoneTr);
    if (extraEnabled && extraEQEnabled && typeof window.updateEQPhoneSelect === "function") {
        window.updateEQPhoneSelect();
    }
}
function changeVariant(p, update, trigger) {
    if (!p.vars) p.vars = {};
    let fn = p.fileName,
        ch = p.vars[fn];
    function set(ch) {
        p.rawChannels = ch;
        p.smooth = undefined;
        p.vars[p.fileName] = ch;
        smoothPhone(p);
        /* setCurves already runs inside smoothPhone after rawChannels change */
        update(p, 0, 0, trigger);
    }
    if (ch) {
        set(ch);
    } else {
        loadFiles(p, set);
    }
}
function showVariant(p, c, trigger) {
    if (cantCompare(activePhones)) return;
    if (!p.objs) { p.objs = [p]; }
    if (c !== p) {
        delete c.objs;
    }
    p.objs.push(c);
    c.active=true; c.copyOf=p;
    ["brand","dispBrand","fileNames","vars","phone","fullName"].map(k=>c[k]=p[k]);
    changeVariant(c, showPhone, trigger);
}

function cpCircles(svg) {
    svg.selectAll("circle")
        .data(d => [[3,3,2],[6.6,4,1]].map(([cx,cy,r])=>({cx,cy,r,fill:getBgColor(d.p||d)})))
        .join("circle").attrs(d=>d);
}
function addColorPicker(svg) {
    svg.attr("viewBox","0 0 9 5.3");
    svg.append("rect").attrs({x:0,y:0,width:9,height:5.3,fill:"none"});
    svg.call(cpCircles);
    makeColorPicker(svg);
}
function makeColorPicker(elt) {
    elt.on("click", function (d) {
        let p = d.p || d;
        p.id = getPhoneNumber();
        colorPhones();
        d3.event.stopPropagation();
    });
}

function colorPhones() {
    updatePaths();
    let c = p=>p.active?getDivColor(p.id,true):null;
    doc.select("#phones").selectAll("div.phone-item")
        .style("background",c).style("border-color",c);
    let t = table.selectAll("tr").filter(r => !r.p.isTarget)
        .style("color", r => c(r.p));
    t.select("button").style("background-color", r => getCurveColor(r.p.id, 0));
    t = t.call(s => s.select(".remove").style("background-image", r => colorBar(r.p))
        .select("svg").call(cpCircles))
        .filter(r => r.sub === null || r.sub === 0)
        .select("td.channels");
    t.select("svg").remove();
    t.append("svg").datum(r => r.p).call(addKey);
}

let f_values = (function() {
    // Standard frequencies, all phone need to interpolate to this
    let f = [20];
    let step = Math.pow(2, 1/48); // 1/48 octave
    while (f[f.length-1] < 20000) { f.push(f[f.length-1] * step) }
    return f;
})();
let fr_to_ind = fr => d3.bisect(f_values, fr, 0, f_values.length-1);
function range_to_slice(xs, fn) {
    let r = xs.map(v => d3.bisectLeft(f_values, x.invert(fn(v))));
    return a => a.slice(Math.max(r[0],0), r[1]+1);
}

let norm_sel = ( default_normalization.toLowerCase() === "db" ) ? 0:1,
    norm_fr = default_norm_hz,
    norm_phon = default_norm_db;

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

let addPhoneSet = false, // Whether add phone button was clicked
    addPhoneLock= false;
function setAddButton(a) {
    if (a && cantCompare(activePhones)) return false;
    if (addPhoneSet !== a) {
        addPhoneSet = a;
        doc.select(".addPhone").classed("selected", a)
            .classed("locked", addPhoneLock &= a);
    }
    return true;
}
doc.select(".addPhone").selectAll("td")
    .on("click", ()=>setAddButton(!addPhoneSet));
doc.select(".addLock").on("click", function () {
    d3.event.preventDefault();
    let on = !addPhoneLock;
    if (!setAddButton(on)) return;
    if (on) {
        doc.select(".addPhone").classed("locked", addPhoneLock=true);
    }
});

function showPhone(p, exclusive, suppressVariant, trigger) {
    if (p.isTarget && activePhones.indexOf(p)!==-1) {
        removePhone(p);
        return;
    }
    if (p.isTarget) {
        exclusive = false;
    }
    if (addPhoneSet) {
        exclusive = false;
        if (!addPhoneLock || cantCompare(activePhones,1,null,true)) {
            setAddButton(false);
        }
    }
    let keep = !exclusive ? (q=>true)
             : (q => q.copyOf===p || q.pin || q.isTarget!==p.isTarget);
    if (cantCompare(activePhones.filter(keep),0, p)) return;
    if (!p.rawChannels) {
        let pid = p.id != null ? p.id : nextPhoneNumber();
        let items = doc.select("#phones").selectAll(".phone-item");
        let item = items.filter(q => q === p);
        item.style("background", getDivColor(pid, true))
            .style("border-color", getDivColor(pid, 1));
        item.select(".phone-item-add").classed("loading", true);
        if (exclusive) {
            items.filter(q => q.active && q.copyOf !== p && !q.pin
                           && q.isTarget === p.isTarget)
                .style("background", null)
                .style("border-color", null);
        }
        loadFiles(p, function (ch) {
            if (p.rawChannels) return;
            item.select(".phone-item-add").classed("loading", false);
            p.rawChannels = ch;
            showPhone(p, exclusive, suppressVariant, trigger);

            // Scroll to selected
            if (trigger) { scrollToActive(); }

            // Analytics event
            if (analyticsEnabled) { pushPhoneTag("phone_displayed", p, trigger); }
        });
        return;
    }
    smoothPhone(p);
    if (p.id == null) { p.id = getPhoneNumber(); }
    normalizePhone(p); p.offset=p.offset||0;
    if (exclusive) {
        activePhones = activePhones.filter(q => q.active = keep(q));
        if (baseline.p && !baseline.p.active) setBaseline(baseline0,1);
    }
    let blockedFromCompareList = !suppressVariant && !p.copyOf && p.objs && p.objs.length;
    if (activePhones.indexOf(p)===-1 && !blockedFromCompareList) {
        let avg = false;
        if (!p.isTarget) {
            let ap = activePhones.filter(p => !p.isTarget);
            avg = ap.length >= 1;
            if (ap.length===1 && ap[0].activeCurves.length!==1) {
                setCurves(ap[0], true);
            }
            activePhones.push(p);
        } else {
            activePhones.unshift(p);
        }
        p.active = true;
        setCurves(p, avg);
    }
    updatePaths(trigger);
    updatePhoneTable(trigger);
    d3.selectAll("#phones .phone-item,.target")
        .filter(p=>p.id!==undefined)
        .call(setPhoneTr);
    //Displays variant pop-up when phone displayed
    if (!suppressVariant && p.fileNames && !p.copyOf && window.innerWidth > 1000) {
        table.selectAll("tr").filter(r => r.p === p && (r.sub === null || r.sub === 0)).select(".variants").node().focus();
    } else {
        document.activeElement.blur();
    }
    if (extraEnabled && extraEQEnabled) {
        updateEQPhoneSelect();
    }
    if (!p.isTarget && alt_augment ) { augmentList(p); }

    // Apply user config view settings
    if (typeof trigger !== "undefined") {
        userConfigApplyViewSettings(p.fileName);
    }
}

function removeCopies(p) {
    if (p.objs) {
        p.objs.forEach(q=>q.active=false);
        delete p.objs;
    }
    removePhone(p);
}

function removePhone(p) {
    p.active = p.pin = false; nextPN = null;
    activePhones = activePhones.filter(q => q.active);
    if (!p.isTarget) {
        let ap = activePhones.filter(p => !p.isTarget);
        if (ap.length === 1) {
            setCurves(ap[0], false);
        }
    }
    updatePaths();
    if (baseline.p && !baseline.p.active) { setBaseline(baseline0); }
    updatePhoneTable();
    d3.selectAll("#phones div,.target")
        .filter(q=>q===(p.copyOf||p))
        .call(setPhoneTr);
    if (extraEnabled && extraEQEnabled) {
        updateEQPhoneSelect();
    }
}

function removeSampleRow(p, sub) {
    if (sub === null || sub === undefined) {
        removePhone(p);
        return;
    }
    let curve = p.activeCurves[sub],
        chIdx = curve ? p.channels.indexOf(curve.l) : -1;
    if (chIdx >= 0) {
        p.channels[chIdx] = null;
    }
    if (!validChannels(p).length) {
        removePhone(p);
        return;
    }
    setCurves(p, p.avg, undefined, p.ssamp);
    updatePaths();
    updatePhoneTable();
    d3.selectAll("#phones div,.target")
        .filter(q => q === (p.copyOf || p))
        .call(setPhoneTr);
    if (baseline.p && !baseline.p.active) {
        setBaseline(baseline0);
    }
    if (extraEnabled && extraEQEnabled) {
        updateEQPhoneSelect();
    }
}

function asPhoneObj(b, p, isInit, inits) {
    if (!isInit) {
        isInit = _ => false;
    }
    let r = { brand:b, dispBrand:b.name };
    if (typeof p === "string") {
        r.phone = r.fileName = p;
        if (isInit(p)) inits.push(r);
    } else {
        r.phone = p.name;
        if (p.collab) {
            r.dispBrand += " x "+p.collab;
            r.collab = brandMap[p.collab];
        }
        let f = p.file || p.name;
        if (typeof f === "string") {
            r.fileName = f;
            if (isInit(f)) inits.push(r);
        } else {
            r.fileNames = f;
            r.vars = {};
            let dns = f;
            if (p.suffix) {
                dns = p.suffix.map(
                    s => p.name + (s ? " "+s : "")
                );
            } else if (p.prefix) {
                let reg = new RegExp("^"+p.prefix+"\s*", "i");
                dns = f.map(n => {
                    n = n.replace(reg, "");
                    return p.name + (n.length ? " "+n : n);
                });
            }
            r.dispNames = dns;
            r.fileName = f[0];
            r.dispName = dns[0];
            let c = r;
            f.map((fn,i) => {
                if (!isInit(fn)) return;
                c.fileName=fn; c.dispName=dns[i];
                inits.push(c);
                c = {copyOf:r};
            });
        }
    }
    r.dispName = r.dispName || r.phone;
    r.fullName = r.dispBrand + " " + r.phone;
    if (alt_augment) {
        r.reviewScore = p.reviewScore;
        r.reviewLink = p.reviewLink;
        r.shopLink = p.shopLink;
        r.price = p.price;
    }
    return r;
}

d3.json(typeof PHONE_BOOK !== "undefined" ? PHONE_BOOK
            : DIR+"phone_book.json?"+ new Date().getTime()).then(function (brands) {
    let brandMap = window.brandMap = {},
        inits = [],
        initReq = typeof init_phones !== "undefined" ? [init_phones].flat() : false;
    loadFromShare = 0;

    if (ifURL) {
        let url = targetWindow.location.href,
            par = "share=";
            emb = "embed";
        baseURL = url.split("?").shift();

        if (url.includes(par) && url.includes(emb)) {
            initReq = decodeURIComponent(url.replace(/_/g," ").split(par).pop()).split(",");
            loadFromShare = 2;

            setModeEmbed();
        } else if (url.includes(par)) {
            initReq = decodeURIComponent(url.replace(/_/g," ").split(par).pop()).split(",");
            loadFromShare = 1;
        } else if (url.includes(emb)) {
            setModeEmbed();
        }
    }

    // Apply user config to inits
    userConfigAppendInits(initReq);

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

    let allPhones = window.allPhones = d3.merge(brands.map(b=>b.phoneObjs)),
        currentBrands = [];
    if (!initReq) inits.push(allPhones[0]);

    function setClicks(fn) { return function (elt) {
        elt .on("mousedown", () => d3.event.preventDefault())
            .on("click", p => fn(p,!d3.event.ctrlKey))
            .on("auxclick", p => d3.event.button===1 ? fn(p,0) : 0);
    }; }

    let brandSel = doc.select("#brands").selectAll()
        .data(brands).join("div")
        .text(b => b.name + (b.suffix?" "+b.suffix:""))
        .call(setClicks(setBrand));

    let bg = (h,fn) => function (p) {
        d3.select(this).style("background", fn(p));
        (p.objs||[p]).forEach(q=>hl(q,h));
    }
    window.updatePhoneSelect = () => {
        doc.select("#phones").selectAll("div.phone-item")
            .data(allPhones)
            .join((enter) => {
                let phoneDiv = enter.append("div")
                    .attr("class","phone-item")
                    .attr("name", p=>p.fullName)
                    .on("mouseover", bg(true, p => getDivColor(p.id===undefined?nextPhoneNumber():p.id, true)))
                    .on("mouseout" , bg(false,p => p.id!==undefined?getDivColor(p.id,p.active):null))
                    .call(setClicks(showPhone));
                phoneDiv.append("span").text(p=>p.fullName);
                // Adding the + selection button
                phoneDiv.append("div")
                    .attr("class", "phone-item-add")
                    .on("click", p => {
                        d3.event.stopPropagation();
                        showPhone(p, 0);
                    });
           });
    };
    updatePhoneSelect();

    if (targets) {
        let b = window.brandTarget = { name:"Targets", active:false },
            ti = -targets.length,
            ph = t => ({
                isTarget:true, brand:b,
                dispName:t, phone:t, fullName:t+" Target", fileName:t+" Target"
            });
        d3.select(".manage").insert("div",".manageTable")
            .attr("class", "targets collapseTools");
        let l = (text,c) => s => s.append("div").attr("class","targetLabel").append("span").text(text);
        let ts = b.phoneObjs = doc.select(".targets").call(l("Targets"))
            .selectAll().data(targets).join("div").call(l(t=>t.type))
            .style("flex-grow",t=>t.files.length).attr("class","targetClass")
            .selectAll().data(t=>t.files.map(ph))
            .join("div").text(t=>t.dispName).attr("class","target")
            .call(setClicks(showPhone))
            .data();
        ts.forEach((t,i) => {
            t.id = i-ts.length;
            if (isInit(t.fileName)) inits.push(t);
        });
    }

    inits.map(p => p.copyOf ? showVariant(p.copyOf, p, initMode)
                            : showPhone(p,0,1, initMode));

    function setBrand(b, exclusive) {
        let phoneSel = doc.select("#phones").selectAll("div.phone-item");
        let incl = currentBrands.indexOf(b) !== -1;
        let hasBrand = (p,b) => p.brand===b || p.collab===b;
        if (exclusive || currentBrands.length===0) {
            currentBrands.forEach(br => br.active = false);
            if (incl) {
                currentBrands = [];
                phoneSel.style("display", null);
                phoneSel.select("span").text(p=>p.fullName);
            } else {
                currentBrands = [b];
                phoneSel.style("display", p => hasBrand(p,b)?null:"none");
                phoneSel.filter(p => hasBrand(p,b)).select("span").text(p=>p.phone);
            }
        } else {
            if (incl) return;
            if (currentBrands.length === 1) {
                phoneSel.select("span").text(p=>p.fullName);
            }
            currentBrands.push(b);
            phoneSel.filter(p => hasBrand(p,b)).style("display", null);
        }
        if (!incl) b.active = true;
        brandSel.classed("active", br => br.active);
    }

    let phoneSearch = new Fuse(
        allPhones,
        {
            shouldSort: false,
            tokenize: false,
            threshold: 0.2,
            minMatchCharLength: 2,
            keys: [
                {weight:0.3, name:"dispBrand"},
                {weight:0.1, name:"brand.suffix"},
                {weight:0.6, name:"phone"}
            ]
        }
    );
    let brandSearch = new Fuse(
        brands,
        {
            shouldSort: false,
            tokenize: false,
            threshold: 0.05,
            minMatchCharLength: 3,
            keys: [
                {weight:0.9, name:"name"},
                {weight:0.1, name:"suffix"},
            ]
        }
    );
    doc.select(".search").on("input", function () {
        //d3.select(this).attr("placeholder",null);
        let fn, bl = brands;
        let c = currentBrands;
        let test = p => c.indexOf(p.brand )!==-1
                     || c.indexOf(p.collab)!==-1;
        if (this.value.length > 1) {
            let s = phoneSearch.search(this.value),
                t = c.length ? s.filter(test) : s;
            if (t.length) s = t;
            fn = p => s.indexOf(p)!==-1;
            let b = brandSearch.search(this.value);
            if (b.length) bl = b;
        } else {
            fn = c.length ? test : (p=>true);
        }
        let phoneSel = doc.select("#phones").selectAll("div.phone-item");
        phoneSel.style("display", p => fn(p)?null:"none");
        brandSel.style("display", b => bl.indexOf(b)!==-1?null:"none");
    });

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
});

let pathHoverTimeout;
function pathHL(c, m, imm) {
    gpath.selectAll("path").classed("highlight", c ? d=>d===c   : false);
    table.selectAll("tr").classed("highlight", c ? r => {
        if (r.p !== c.p) return false;
        if (r.sub === null || r.sub === undefined) return true;
        return c === r.p.activeCurves[r.sub];
    } : false);
    if (pathHoverTimeout) { clearTimeout(pathHoverTimeout); }
    if(!stickyLabels) {
        clearLabels();
        pathHoverTimeout =
            imm ? pathTooltip(c, m) :
            c   ? setTimeout(pathTooltip, 400, c, m) :
            undefined;
    }
}
function pathTooltip(c, m) {
    let g = gr.selectAll(".lineLabel").data([c.id])
        .join("g").attr("class","lineLabel");
    let t = g.append("text")
        .attrs({x:m[0], y:m[1]-6, fill:getTooltipColor(c)})
        .text(t=>t);
    let b = t.node().getBBox(),
        o = pad.l+W - b.width;
    if (o < b.x) { t.attr("x",o); b.x=o; }
    // Background
    g.insert("rect", "text")
        .attrs({x:b.x-1, y:b.y-1, width:b.width+2, height:b.height+2});
}
let interactInspect = false;
let graphInteract = imm => function () {
    let ev = d3.event;
    if (ev && typeof ev.clientX === "number" && typeof ev.clientY === "number") {
        lastGraphPlotPointerClient = { x: ev.clientX, y: ev.clientY };
    }
    let cs = d3.merge(activePhones.map(p=>p.hide?[]:(p.activeCurves||[])));
    let m = d3.mouse(this);
    if (!cs.length) {
        syncEqHoverPreview(null);
        return;
    }
    if (imm && eqGraphSkipNextClick) {
        eqGraphSkipNextClick = false;
        if (eqGraphSkipClickClearTimer) {
            clearTimeout(eqGraphSkipClickClearTimer);
            eqGraphSkipClickClearTimer = null;
        }
        return;
    }
    if (imm && !interactInspect && tryEqGraphClickAddFilter(m)) {
        syncEqHoverPreview(m);
        return;
    }
    syncEqHoverPreview(m);
    if (interactInspect) {
        let ind = fr_to_ind(x.invert(m[0])),
            x1 = x(f_values[ind]),
            x0 = ind>0 ? x(f_values[ind-1]) : x1,
            sel= m[0]-x0 < x1-m[0],
            xv = sel ? x0 : x1;
        ind -= sel;
        function init(e) {
            e.attr("class","inspector");
            e.append("line").attrs({x1:0,x2:0, y1:pad.t,y2:pad.t+H});
            e.append("text").attr("class","insp_dB").attr("x",2);
        }
        let insp = gr.selectAll(".inspector").data([xv])
            .join(enter => enter.append("g").call(init))
            .attr("transform",xv=>"translate("+xv+",0)");
        let dB = insp.select(".insp_dB").text(f_values[ind]+" Hz");
        let cy = cs.map(c => [c, baseline.fn(c.l)[ind][1]+getOffset(c.p)]);
        cy.sort((d,e) => d[1]-e[1]);
        function newTooltip(t) {
            t.attr("class","lineLabel")
                .attr("fill",d=>getTooltipColor(d));
            t.append("text").attr("x",2).text(d=>d.id);
            t.append("g").selectAll().data([0,1])
                .join("text")
                .attr("x",-16)
                .attr("text-anchor",i=>i?"start":"end");
            t.datum(function(){return this.getBBox();});
            t.insert("rect", "text")
                .attrs(b=>({x:b.x-1, y:b.y-1, width:b.width+2, height:b.height+2}));
        }
        let tt = insp.selectAll(".lineLabel").data(cy.map(d=>d[0]), d=>d.id)
            .join(enter => enter.insert("g","line").call(newTooltip));
        let start = tt.select("g").datum((_,i) => cy[i][1])
            .selectAll("text").data(d => {
                let s=d<-0.05?"-":""; d=Math.abs(d)+0.05;
                return [s+Math.floor(d)+".",Math.floor((d%1)*10)];
            })
            .text(t=>t)
            .filter((_,i)=>i===0)
            .nodes().map(n=>n.getBBox().x-2);
        tt.select("rect")
            .attrs((b,i)=>({x:b.x+start[i]-1, width:b.width-start[i]+2}));
        // Now compute heights
        let hm = d3.max(tt.data().map(b=>b.height)),
            hh = (y.invert(0)-y.invert(hm-1))/2,
            stack = [];
        cy.map(d=>d[1]).forEach(function (h,i) {
            let n = 1;
            let overlap = s => h/n - s.h/s.n <= hh*(s.n+n);
            let l = stack.length;
            while (l && overlap(stack[--l])) {
                let s = stack.pop();
                h += s.h; n += s.n;
            }
            stack.push({h:h, n:n});
        });
        let ch = d3.merge(stack.map((s,i) => {
            let h = s.h/s.n - (s.n-1)*hh;
            return d3.range(s.n).map(k => h+k*2*hh);
        }));
        tt.attr("transform",(_,i) => "translate(0,"+(y(ch[i])+5)+")");
        dB.attr("y", y(ch[ch.length-1]+2*hh)+1);
    } else {
        let d = 30 * W0 / gr.node().getBoundingClientRect().width,
            sl= range_to_slice([-1,1],s=>m[0]+d*s);
        let ind = cs
            .map(c =>
                sl(baseline.fn(c.l))
                    .map(p => Math.hypot(x(p[0])-m[0], y(p[1]+getOffset(c.p))-m[1]))
                    .reduce((a,b)=>Math.min(a,b), d)
            )
            .reduce((a,b,i) => b<a[1] ? [i,b] : a, [-1,d])[0];
        pathHL(ind===-1 ? false : cs[ind], m, imm);
    }
}
function stopInspect() { gr.selectAll(".inspector").remove(); }
graphPlotHitRect = gr.append("rect")
    .attr("class", "graph-plot-hit")
    .attrs({x:pad.l,y:pad.t,width:W,height:H,opacity:0})
    .on("mousemove", graphInteract())
    .on("mouseout", () => {
        if (eqGraphPointerState) {
            return;
        }
        /* After pointer capture release, some browsers emit mouseout even though the cursor is
           still over the plot; defer and re-hit-test so EQ hover / path highlight stay in sync. */
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
gEqFilterMarkers.raise();
gEqHoverPreview.raise();

/** SVG user-space [x,y] matching d3.mouse(plot rect); works with native event listeners (d3.mouse does not). */
function clientToGraphPlotXY(clientX, clientY) {
    let plot = graphPlotHitRect && graphPlotHitRect.node();
    if (!plot) {
        return null;
    }
    let svg = plot.ownerSVGElement || (plot.closest && plot.closest("svg"));
    if (!svg || !svg.createSVGPoint) {
        return null;
    }
    let ctm = svg.getScreenCTM();
    if (!ctm) {
        return null;
    }
    let pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    let p = pt.matrixTransform(ctm.inverse());
    return [p.x, p.y];
}

/** Inverse of clientToGraphPlotXY: graph SVG coords → viewport client pixels. */
function graphPlotXYToClient(svgX, svgY) {
    let plot = graphPlotHitRect && graphPlotHitRect.node();
    if (!plot) {
        return null;
    }
    let svg = plot.ownerSVGElement || (plot.closest && plot.closest("svg"));
    if (!svg || !svg.createSVGPoint) {
        return null;
    }
    let ctm = svg.getScreenCTM();
    if (!ctm) {
        return null;
    }
    let pt = svg.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;
    let p = pt.matrixTransform(ctm);
    return [p.x, p.y];
}

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
if ( themingEnabled ) {
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

// Add extra feature
function addExtra() {
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
    // Show and hide extra panel
    window.showExtraPanel = () => {
        document.querySelector("div.select > div.selector-panel").style["display"] = "none";
        document.querySelector("div.select > div.extra-panel").style["display"] = "flex";
        document.querySelector("div.select").setAttribute("data-selected", "extra");
        if (analyticsEnabled) { pushEventTag("clicked_equalizerTab", targetWindow); }
    };
    extraButton.addEventListener("click", showExtraPanel);
    // Upload function
    let uploadType = null;
    let fileFR = document.querySelector("#file-fr");
    document.querySelector("div.extra-upload > button.upload-fr").addEventListener("click", () => {
        uploadType = "fr";
        fileFR.click();
    });
    document.querySelector("div.extra-upload > button.upload-target").addEventListener("click", () => {
        uploadType = "target";
        fileFR.click();
    });
    let addOrUpdatePhone = (brand, phone, ch) => {
        let phoneObj = asPhoneObj(brand, phone);
        phoneObj.rawChannels = ch;
        phoneObj.isDynamic = true;
        let phoneObjs = brand.phoneObjs;
        let oldPhoneObj = phoneObjs.filter(p => p.phone == phone.name)[0]
        if (oldPhoneObj) {
            oldPhoneObj.active && removePhone(oldPhoneObj);
            phoneObj.id = oldPhoneObj.id;
            phoneObj.offset = oldPhoneObj.offset;
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
    fileFR.addEventListener("change", (e) => {
        let file = e.target.files[0];
        if (!file) {
            return;
        }
        let reader = new FileReader();
        reader.onload = (e) => {
            let name = file.name.replace(/\.[^\.]+$/, "");
            let phone = { name: name };
            let ch = [tsvParse(e.target.result)];
            if (ch[0].length < 128) {
                alert("Parse frequence response file failed: invalid format.");
                return;
            }
            ch[0] = Equalizer.interp(f_values, ch[0]);
            if (uploadType === "fr") {
                name.match(/ R$/) && ch.splice(0, 0, null);
                let phoneObj = addOrUpdatePhone(brandMap.Uploaded, phone, ch);
                showPhone(phoneObj, false);
            } else if (uploadType === "target") {
                let fullName = name + (name.match(/ Target$/i) ? "" : " Target");
                let existsTargets = targets.reduce((a, b) => a.concat(b.files), []).map(f => f += " Target");
                if (existsTargets.indexOf(fullName) >= 0) {
                    alert("This target already exists on this tool, please select it instead of upload.");
                    return;
                }
                let phoneObj = {
                    isTarget: true,
                    brand: brandTarget,
                    dispName: name,
                    phone: name,
                    fullName: fullName,
                    fileName: fullName,
                    rawChannels: ch,
                    isDynamic: true,
                    id: -brandTarget.phoneObjs.length
                };
                showPhone(phoneObj, true);
            }
        };
        reader.readAsText(file);
    });
    // EQ Function
    let eqPhoneSelect = document.querySelector("div.extra-eq select[name='phone']");
    let filtersContainer = document.querySelector("div.extra-eq > div.filters");
    let fileFiltersImport = document.querySelector("#file-filters-import");
    let filterEnabledInput, filterTypeSelect,
        filterFreqInput, filterQInput, filterGainInput;
    let eqBands = extraEQBands;
    let eqFilterSelectedRow = null;
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
            } else {
                el.classList.add("eq-filter-row-dimmed");
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
                let maxTop = Math.max(0, panel.scrollHeight - panel.clientHeight);
                let nextTop = Math.max(0, Math.min(maxTop, panel.scrollTop + delta));
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
    window.hideExtraPanel = (selectedList) => {
        document.querySelector("div.select > div.selector-panel").style["display"] = "flex";
        document.querySelector("div.select > div.extra-panel").style["display"] = "none";
        document.querySelector("div.select").setAttribute("data-selected", selectedList);
        setEqFilterSelectedRow(null);
        syncEqHoverPreview(null);
    };
    let updateFilterElements = () => {
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
            filtersContainer.children[filtersContainer.childElementCount-1].remove();
        }
        filterEnabledInput = filtersContainer.querySelectorAll("input[name='enabled']");
        filterTypeSelect = filtersContainer.querySelectorAll("select[name='type']");
        filterFreqInput = filtersContainer.querySelectorAll("input[name='freq']");
        filterQInput = filtersContainer.querySelectorAll("input[name='q']");
        filterGainInput = filtersContainer.querySelectorAll("input[name='gain']");
        filtersContainer.querySelectorAll("input,select").forEach(el => {
            el.removeEventListener("input", applyEQ);
            el.addEventListener("input", applyEQ);
        });
        if (eqFilterSelectedRow !== null
                && eqFilterSelectedRow >= filtersContainer.querySelectorAll("div.filter").length) {
            eqFilterSelectedRow = null;
        }
        updateEqFilterRowSelectionStyles();
    };
    let elemToFilters = (includeAll) => {
        // Collect filters from ui
        let filters = [];
        for (let i = 0; i < eqBands; ++i) {
            let disabled = !filterEnabledInput[i].checked;
            let type = filterTypeSelect[i].value;
            let freq = parseInt(filterFreqInput[i].value) || 0;
            let q = parseFloat(filterQInput[i].value) || 0;
            let gain = parseFloat(filterGainInput[i].value) || 0;
            if (!includeAll && (disabled || !type || !freq || !q || !gain)) {
                continue;
            }
            filters.push({ disabled, type, freq, q, gain });
        }
        return filters;
    };
    let filtersToElem = (filters) => {
        // Set filters to ui
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
        let sel = eqPhoneSelect && eqPhoneSelect.value;
        if (sel) {
            return activePhones.filter(p => p.fullName === sel)[0] || null;
        }
        return activePhones.filter(p =>
            !p.isTarget && p.fullName && !p.fullName.match(/ EQ$/))[0] || null;
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
        let eqPhone = phoneObj.eq;
        let eqTraceCh = eqPhone && firstPresentChannel(eqPhone.rawChannels);
        let hasEqTrace = !!eqTraceCh;
        let tracePhone = hasEqTrace ? eqPhone : phoneObj;
        let traceCh = firstPresentChannel(tracePhone.rawChannels);
        if (!traceCh) {
            return null;
        }
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
            let w = match ? base * EQ_GRAPH_TRACE_STROKE_EMPH_MULT : base;
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
        for (let j = 0; j < eqBands; ++j) {
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
        let eqPhone = phoneObj.eq;
        let tracePhone = firstPresentChannel(eqPhone && eqPhone.rawChannels) ? eqPhone : phoneObj;
        let traceCh = firstPresentChannel(tracePhone.rawChannels);
        if (!traceCh) {
            return null;
        }
        let pts = baseline.fn(traceCh);
        let yOff = y(getOffset(tracePhone)) - y(0);
        let strokeCol = getCurveColor(tracePhone.id, 0);
        let phoneRaw0 = firstPresentChannel(phoneObj.rawChannels);
        let rows = [];
        for (let i = 0; i < eqBands; i++) {
            let disabled = !filterEnabledInput[i].checked;
            let type = filterTypeSelect[i].value;
            let freq = parseInt(filterFreqInput[i].value, 10) || 0;
            let q = parseFloat(filterQInput[i].value) || 0;
            let gain = parseFloat(filterGainInput[i].value) || 0;
            if (disabled || !type || !freq || !q || !gain) {
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
    updateEqFilterMarkers = () => {
        let layout = buildEqGraphMarkerLayout();
        if (!layout || !layout.rows.length) {
            gEqFilterMarkers.selectAll("circle.eq-filter-marker").remove();
            gEqFilterMarkers.raise();
            gEqHoverPreview.raise();
            if (!eqGraphPointerState && lastGraphPlotPointerClient) {
                let lp = lastGraphPlotPointerClient;
                let mResync = clientToGraphPlotXY(lp.x, lp.y);
                if (mResync) {
                    syncEqHoverPreview(mResync);
                }
            }
            return;
        }
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
        gEqFilterMarkers.raise();
        gEqHoverPreview.raise();
        if (!eqGraphPointerState && lastGraphPlotPointerClient) {
            let lp = lastGraphPlotPointerClient;
            let mResync = clientToGraphPlotXY(lp.x, lp.y);
            if (mResync) {
                syncEqHoverPreview(mResync);
            }
        }
    };
    syncEqHoverPreview = (m) => {
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
        if (draggingGraph) {
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
        if (graphPlotHitRect && graphPlotHitRect.node()) {
            graphPlotHitRect.node().style.cursor =
                draggingGraph ? "grabbing"
                : near ? "grab"
                : emphasizeTrace ? "cell" : "";
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
    let cancelDeferredApplyEQ = () => {
        if (applyEQRafId !== null) {
            cancelAnimationFrame(applyEQRafId);
            applyEQRafId = null;
        }
    };
    let applyEQExec = (execOpt) => {
        execOpt = execOpt || {};
        // Create and show phone with eq applied
        let activeElem = document.activeElement;
        let phoneSelected = eqPhoneSelect.value;
        let filters = elemToFilters();
        if (filters.length && !phoneSelected) {
            let firstPhone = eqPhoneSelect.querySelectorAll("option")[1];
            if (firstPhone) {
                phoneSelected = eqPhoneSelect.value = firstPhone.value;
            }
        }
        let phoneObj = phoneSelected && activePhones.filter(
            p => p.fullName == phoneSelected)[0];
        if (!phoneObj || (!filters.length && !phoneObj.eq)) {
            updateEqFilterMarkers();
            return; // Allow empty filters if eq is applied before
        }
        let phoneEQ = { name: phoneObj.phone + " EQ" };
        let phoneObjEQ = addOrUpdatePhone(phoneObj.brand, phoneEQ,
            phoneObj.rawChannels.map(c => c ? Equalizer.apply(c, filters) : null));
        phoneObj.eq = phoneObjEQ;
        phoneObjEQ.eqParent = phoneObj;
        showPhone(phoneObjEQ, false, !!execOpt.skipRestoreFocus);
        if (!execOpt.skipRestoreFocus) {
            activeElem.focus();
        }
        updateEqFilterMarkers();
    };
    /* Coalesce to one apply per animation frame so the trace follows typing / wheel without
       the old 100ms debounce pause, while bounding work during rapid input. */
    let applyEQ = () => {
        if (applyEQRafId !== null) {
            return;
        }
        applyEQRafId = requestAnimationFrame(() => {
            applyEQRafId = null;
            applyEQExec();
        });
    };
    /* ~Equal motion on the log-frequency graph: multiply/divide by a ratio instead of +1 Hz. */
    let eqParametricFreqLogStep = (hz, dir, fine) => {
        let f = hz;
        if (!Number.isFinite(f) || f < 20) {
            f = 20;
        }
        f = Math.min(20000, Math.max(20, f));
        /* ~½ semitone / ~⅛ semitone with Shift (halved vs original for slower scroll). */
        let ratio = fine ? Math.pow(2, 1 / 96) : Math.pow(2, 1 / 24);
        let next = dir > 0 ? f * ratio : f / ratio;
        return Math.round(Math.min(20000, Math.max(20, next)));
    };
    if (filtersContainer) {
        filtersContainer.addEventListener("wheel", (e) => {
            if (e.ctrlKey || e.metaKey) {
                return;
            }
            let ae = document.activeElement;
            if (!ae || ae.tagName !== "INPUT") {
                return;
            }
            let nm = ae.getAttribute("name");
            if (nm !== "freq" && nm !== "gain" && nm !== "q") {
                return;
            }
            if (!filtersContainer.contains(ae)) {
                return;
            }
            let path = typeof e.composedPath === "function" ? e.composedPath() : [];
            if (path.indexOf(ae) === -1) {
                return;
            }
            let dy = e.deltaY;
            if (!dy) {
                return;
            }
            if (Math.abs(e.deltaX) > Math.abs(dy)) {
                return;
            }
            e.preventDefault();
            let dir = dy > 0 ? -1 : 1;
            let v = parseFloat(ae.value);
            if (!Number.isFinite(v)) {
                v = 0;
            }
            if (nm === "freq") {
                ae.value = String(eqParametricFreqLogStep(v, dir, e.shiftKey));
                applyEQ();
                return;
            }
            let min = parseFloat(ae.getAttribute("min"));
            let max = parseFloat(ae.getAttribute("max"));
            let step = parseFloat(ae.getAttribute("step"));
            if (!Number.isFinite(step) || step <= 0) {
                step = 0.1;
            }
            step *= 0.5;
            if (e.shiftKey) {
                step *= 0.1;
            }
            let next = v + dir * step;
            if (Number.isFinite(min)) {
                next = Math.max(min, next);
            }
            if (Number.isFinite(max)) {
                next = Math.min(max, next);
            }
            next = Math.round(next / step) * step;
            ae.value = String(parseFloat(next.toFixed(4)));
            applyEQ();
        }, { capture: true, passive: false });
        filtersContainer.addEventListener("keydown", (e) => {
            if (e.code !== "ArrowUp" && e.code !== "ArrowDown") {
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }
            let t = e.target;
            if (!t || t.tagName !== "INPUT" || t.getAttribute("name") !== "freq") {
                return;
            }
            if (!filtersContainer.contains(t)) {
                return;
            }
            e.preventDefault();
            let dir = e.code === "ArrowUp" ? 1 : -1;
            let v = parseFloat(t.value);
            if (!Number.isFinite(v)) {
                v = 0;
            }
            t.value = String(eqParametricFreqLogStep(v, dir, e.shiftKey));
            applyEQ();
        }, true);
    }
    window.updateEQPhoneSelect = () => {
        let oldValue = eqPhoneSelect.value;
        let optionValues = activePhones.filter(p =>
            !p.isTarget && p.fullName && !p.fullName.match(/ EQ$/)).map(p => p.fullName);
        Array.from(eqPhoneSelect.children).slice(1).forEach(c => eqPhoneSelect.removeChild(c));
        optionValues.forEach(value => {
            let optionElem = document.createElement("option");
            optionElem.setAttribute("value", value);
            optionElem.innerText = value;
            eqPhoneSelect.appendChild(optionElem);
        });
        eqPhoneSelect.value = (optionValues.indexOf(oldValue) >= 0) ? oldValue : "";
        updateEqFilterMarkers();
    };
    updateFilterElements();
    updateEqFilterMarkers();
    eqPhoneSelect.addEventListener("input", () => {
        setEqFilterSelectedRow(null);
        applyEQ();
        scheduleLiveEqSync();
    });
    let resetAllEqBandsToZero = () => {
        for (let i = 0; i < eqBands; i++) {
            filterFreqInput[i].value = "0";
            filterGainInput[i].value = "0";
            filterQInput[i].value = "0";
        }
        applyEQ();
        scheduleLiveEqSync();
    };
    document.querySelector("div.extra-eq button.extra-eq-reset-btn").addEventListener("click", () => {
        resetAllEqBandsToZero();
    });
    // Add new filter
    document.querySelector("div.extra-eq button.add-filter").addEventListener("click", () => {
        eqBands = Math.min(eqBands + 1, extraEQBandsMax);
        updateFilterElements();
        scheduleLiveEqSync();
    });
    // Remove last filter
    document.querySelector("div.extra-eq button.remove-filter").addEventListener("click", () => {
        eqBands = Math.max(eqBands - 1, 1);
        updateFilterElements();
        applyEQ(); // May removed effective filter
        scheduleLiveEqSync();
    });
    let resolveEqFilterRowIndexForShortcut = () => {
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
        if (eqFilterSelectedRow !== null && eqFilterSelectedRow >= 0
                && eqFilterSelectedRow < eqBands) {
            return eqFilterSelectedRow;
        }
        return null;
    };
    let deleteSelectedEqFilterRow = (rowIx) => {
        let ix = rowIx !== undefined && rowIx !== null ? rowIx : eqFilterSelectedRow;
        if (ix === null || ix < 0 || ix >= eqBands) {
            return;
        }
        let all = elemToFilters(true);
        if (eqBands > 1) {
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
    };
    // Sort filters by frequency
    document.querySelector("div.extra-eq button.sort-filters").addEventListener("click", () => {
        filtersToElem(elemToFilters(true).sort((a, b) =>
            (a.freq || Infinity) - (b.freq || Infinity)));
        scheduleLiveEqSync();
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
        reader.onload = (e) => {
            let settings = e.target.result;
            let filters = settings.split("\n").map(l => {
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
                    // Equalizer APO use LSC/HSC instead of LSQ/HSQ
                    type = type.substr(0, 2) + "Q";
                }
                return { disabled, type, freq, q, gain };
            }).filter(f => f);
            while (filters.length > 0) {
                // Remove empty tail filters
                let lastFilter = filters[filters.length-1];
                if (!lastFilter.freq && !lastFilter.q && !lastFilter.gain) {
                    filters.pop();
                } else {
                    break;
                }
            }
            if (filters.length > 0) {
                filtersToElem(filters);
                applyEQ();
                scheduleLiveEqSync();
            } else {
                alert("Parse filters file failed: no filter found.");
            }
        };
        reader.readAsText(file);
    });
    // Export filters
    document.querySelector("div.extra-eq button.export-filters").addEventListener("click", () => {
        let phoneSelected = eqPhoneSelect.value;
        let phoneObj = phoneSelected && activePhones.filter(
            p => p.fullName == phoneSelected && p.eq)[0];
        let filters = elemToFilters(true);
        if (!phoneObj || !filters.length) {
            alert("Please select model and add atleast one filter before export.");
            return;
        }
        let preamp = Equalizer.calc_preamp(
            phoneObj.rawChannels.filter(c => c)[0],
            phoneObj.eq.rawChannels.filter(c => c)[0]);
        let settings = "Preamp: " + preamp.toFixed(1) + " dB\r\n";
        filters.forEach((f, i) => {
            let filterValid = f.freq != 0 && f.q != 0 && f.gain != 0 ? true : false;

            if (filterValid) {
                let on = (!f.disabled && f.type && f.freq && f.gain && f.q) ? "ON" : "OFF";
                let type = f.type;
                if (type === "LSQ" || type === "HSQ") {
                    // Equalizer APO use LSC/HSC instead of LSQ/HSQ
                    type = type.substr(0, 2) + "C";
                }
                settings += ("Filter " + (i+1) + ": " + on + " " + type + " Fc " +
                    f.freq.toFixed(0) + " Hz Gain " + f.gain.toFixed(1) + " dB Q " +
                    f.q.toFixed(3) + "\r\n");
            }
        });
        let exportElem = document.querySelector("#file-filters-export");
        exportElem.href && URL.revokeObjectURL(exportElem.href);
        exportElem.href = URL.createObjectURL(new Blob([settings]));
        exportElem.download = phoneObj.fullName.replace(/^Uploaded /, "") + " Filters.txt";
        exportElem.click();
    });
    // Export filters as graphic eq (for wavelet)
    document.querySelector("div.extra-eq button.export-graphic-filters").addEventListener("click", () => {
        let phoneSelected = eqPhoneSelect.value;
        let phoneObj = phoneSelected && activePhones.filter(
            p => p.fullName == phoneSelected && p.eq)[0] || { fullName: "Unnamed" };
        let filters = elemToFilters();
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
    // Readme
    document.querySelector("div.extra-eq button.readme").addEventListener("click", () => {
        alert("1. If you want to AutoEQ model A to B, display A B and remove target\n" +
            "2. Add/Remove bands before AutoEQ may give you a better result\n" +
            "3. The behavior of filters close to 20K is implementation dependent, avoid such filter if you're not sure how your DSP software works\n" +
            "4. EQ treble require resonant peak matching and fine tune by ear, keep treble untouched if you're not sure how to do that\n" +
            "5. Tone generator is useful to find actual location of peaks and dips, notice the web version may not work on some platform\n\n" +
            "WebAssembly-based AutoEQ algorithm provided by PEQdB (https://github.com/peqdb/autoeq-c)\n");
    });
    // AutoEQ
    let autoEQFreqMinInput = document.querySelector("div.extra-eq input[name='autoeq-freq-min']");
    let autoEQFreqMaxInput = document.querySelector("div.extra-eq input[name='autoeq-freq-max']");
    let autoEQGainMinInput = document.querySelector("div.extra-eq input[name='autoeq-gain-min']");
    let autoEQGainMaxInput = document.querySelector("div.extra-eq input[name='autoeq-gain-max']");
    let autoEQQMinInput = document.querySelector("div.extra-eq input[name='autoeq-q-min']");
    let autoEQQMaxInput = document.querySelector("div.extra-eq input[name='autoeq-q-max']");
    autoEQFreqMinInput.value = Equalizer.config.AutoEQRange[0].toFixed(0);
    autoEQFreqMaxInput.value = Equalizer.config.AutoEQRange[1].toFixed(0);
    autoEQGainMinInput.value = Equalizer.config.OptimizeGainRange[0].toFixed(1);
    autoEQGainMaxInput.value = Equalizer.config.OptimizeGainRange[1].toFixed(1);
    autoEQQMinInput.value = Equalizer.config.OptimizeQRange[0].toFixed(2);
    autoEQQMaxInput.value = Equalizer.config.OptimizeQRange[1].toFixed(2);
    document.querySelector("div.extra-eq button.autoeq").addEventListener("click", () => {
        // Generate filters automatically
        let phoneSelected = eqPhoneSelect.value;
        if (!phoneSelected) {
            let firstPhone = eqPhoneSelect.querySelectorAll("option")[1];
            if (firstPhone) {
                phoneSelected = eqPhoneSelect.value = firstPhone.value;
            }
        }
        let phoneObj = phoneSelected && activePhones.filter(
            p => p.fullName == phoneSelected)[0];
        let targetObj = (activePhones.filter(p => p.isTarget)[0] ||
            activePhones.filter(p => p !== phoneObj && !p.isTarget)[0]);
        if (!phoneObj || !targetObj) {
            alert("Please select model and target, if there are no target and multiple models are displayed then the second one will be selected as target.");
            return;
        }
        let autoEQOverlay = document.querySelector(".extra-eq-overlay");
        autoEQOverlay.style.display = "block";
        setTimeout(async () => {
            let minFreq = Math.min(Math.max(parseInt(autoEQFreqMinInput.value) || 0, 20), 20000);
            let maxFreq = Math.min(Math.max(parseInt(autoEQFreqMaxInput.value) || 0, minFreq), 20000);
            let minGain = Math.min(Math.max(parseFloat(autoEQGainMinInput.value) || -16, -40), 0);
            let maxGain = Math.min(Math.max(parseFloat(autoEQGainMaxInput.value) || 16, 0), 40);
            let minQ = Math.min(Math.max(parseFloat(autoEQQMinInput.value) || 0.3, 0.1), 10);
            let maxQ = Math.min(Math.max(parseFloat(autoEQQMaxInput.value) || 3, minQ), 10);

            let phoneCHs = (phoneObj.rawChannels.filter(c => c)
                .map(ch => ch.map(([f, v]) => [f, v + phoneObj.norm])));
            let phoneCH = (phoneCHs.length > 1) ? avgCurves(phoneCHs) : phoneCHs[0];
            let targetCH = targetObj.rawChannels.filter(c => c)[0].map(([f, v]) => [f, v + targetObj.norm]);

            let [filters, offset] = await Equalizer.autoeq(
                phoneCH, targetCH, eqBands, typeof autoEqMode === 'undefined' ? 'IE' : autoEqMode,
                [minFreq, maxFreq], [minGain, maxGain], [minQ, maxQ]);

            filtersToElem(filters);
            applyEQ();

            scheduleLiveEqSync();
            autoEQOverlay.style.display = "none";
        }, 1);
    });
    // Live playback output trim after EQ (linear gain; tune per source)
    let livePinkNoisePlaybackGain = 0.5;
    let liveToneGeneratorPlaybackGain = 0.2;
    let liveMusicPlaybackGain = 1;
    let lastEqPlaybackSource = "pink";
    // Pink noise (parametric EQ in audio path)
    let pinkNoisePlayButton = document.querySelector("div.extra-pink-noise .play");
    let pinkNoisePlaying = false;
    let pinkNoiseContext = null;
    let pinkNoiseProcessor = null;
    let pinkNoiseMasterGain = null;
    let pinkNoiseAnalyser = null;
    let pinkNoiseBiquads = [];
    let pinkNoiseBandFilters = [];
    let toneGeneratorBiquads = [];
    let toneGeneratorMasterGain = null;
    let toneGeneratorAnalyser = null;
    let musicBiquads = [];
    let musicBandFilters = [];
    let musicContext = null;
    let musicAudio = null;
    let musicMediaSourceNode = null;
    let musicMasterGain = null;
    let musicAnalyser = null;
    let musicObjectUrl = null;
    let musicFileLoaded = false;
    let musicSeekDragging = false;
    let musicSegStartU = 0;
    let musicSegEndU = 1;
    let musicTrimDragging = null;
    let musicTrimIdleTimer = null;
    /* Segment endpoints in localStorage; audio bytes in IndexedDB (localStorage cannot hold files). */
    let musicRestoreCancelToken = 0;
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
    let liveEqSyncRafId = null;
    let livePlaybackEqToggle = document.querySelector("input.live-sound-eq-toggle");
    let isLivePlaybackEqEnabled = () =>
        !livePlaybackEqToggle || livePlaybackEqToggle.checked;
    let mapFilterTypeToBiquad = (t) =>
        (t === "LSQ" ? "lowshelf" : t === "HSQ" ? "highshelf" : "peaking");
    /* Same bands as live biquads; independent of the Apply EQ toggle (used for
       preamp + A/B level match when EQ is bypassed). */
    let elemToLiveEqSpecsClamped = () =>
        elemToFilters().map((f) => ({
            type: f.type,
            freq: Math.min(20000, Math.max(20, f.freq)),
            q: Math.max(1e-4, Math.min(1000, f.q)),
            gain: Math.max(-40, Math.min(40, f.gain)),
        }));
    let computeLiveEqSpecs = () => {
        if (!isLivePlaybackEqEnabled()) {
            return [];
        }
        return elemToLiveEqSpecsClamped();
    };
    let getLiveMusicEqFrAnalysis = (sampleRate) => {
        let specs = elemToLiveEqSpecsClamped();
        if (!specs.length) {
            return null;
        }
        let phoneObj = resolveEqGraphPhoneObj();
        if (!phoneObj || !phoneObj.rawChannels) {
            return null;
        }
        let raw = phoneObj.rawChannels.filter(Boolean)[0];
        if (!raw || !raw.length) {
            return null;
        }
        let frEq = Equalizer.apply(raw, specs, sampleRate);
        let preDb = Equalizer.calc_preamp(raw, frEq);
        return { raw, frEq, preDb };
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
        if (!isLivePlaybackEqEnabled()) {
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
    };
    let disconnectMusicBandFilters = () => {
        musicBandFilters.forEach((b) => {
            try { b.disconnect(); } catch (e) { /* noop */ }
        });
        musicBandFilters.length = 0;
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
        if (isLivePlaybackEqEnabled()) {
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
    let rebuildPinkNoiseEqChain = () => {
        if (!pinkNoisePlaying || !pinkNoiseContext || !pinkNoiseProcessor || !pinkNoiseMasterGain) {
            return;
        }
        let { fromHz, toHz } = readLiveSoundBandEdgeHz();
        let specs = computeLiveEqSpecs();
        if (pinkNoiseBandFilters.length === 2
                && specs.length === pinkNoiseBiquads.length
                && syncBandShelfFiltersInPlace(pinkNoiseContext, pinkNoiseBandFilters, fromHz, toHz)) {
            if (specs.length === 0 || syncEqBiquadsInPlace(pinkNoiseContext, pinkNoiseBiquads, specs)) {
                return;
            }
        }
        pinkNoiseProcessor.disconnect();
        disconnectEqBiquads(pinkNoiseBiquads);
        disconnectPinkBandFilters();
        let last = pinkNoiseProcessor;
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
    let rebuildToneGeneratorEqChain = () => {
        if (!toneGeneratorOsc || !toneGeneratorContext || !toneGeneratorMasterGain) {
            return;
        }
        rebuildLiveEqChain(toneGeneratorOsc, toneGeneratorContext, toneGeneratorMasterGain, toneGeneratorBiquads);
    };
    let rebuildMusicEqChain = () => {
        if (!musicMediaSourceNode || !musicContext || !musicMasterGain) {
            return;
        }
        let { fromHz, toHz } = readLiveSoundBandEdgeHz();
        let specs = computeLiveEqSpecs();
        if (musicBandFilters.length === 2
                && specs.length === musicBiquads.length
                && syncBandShelfFiltersInPlace(musicContext, musicBandFilters, fromHz, toHz)) {
            if (specs.length === 0 || syncEqBiquadsInPlace(musicContext, musicBiquads, specs)) {
                syncMusicOutputGain(musicContext);
                return;
            }
        }
        musicMediaSourceNode.disconnect();
        disconnectEqBiquads(musicBiquads);
        disconnectMusicBandFilters();
        let last = musicMediaSourceNode;
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
    let scheduleLiveEqSync = () => {
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
                el.attr("opacity", audioPlaying && !eqOn ? 0.5 : null);
                if (stateChanged && audioPlaying && eqOn) emphTargets.push(this);
            } else if (isParentTrace) {
                el.attr("opacity", audioPlaying && eqOn ? 0.5 : null);
                if (stateChanged && audioPlaying && !eqOn) emphTargets.push(this);
            }
        });
        if (emphTargets.length) {
            let emph = EQ_GRAPH_TRACE_STROKE_NORMAL * EQ_GRAPH_TRACE_STROKE_EMPH_MULT;
            emphTargets.forEach(n => d3.select(n).attr("stroke-width", emph));
            if (eqTraceOpacityPulseTimer) clearTimeout(eqTraceOpacityPulseTimer);
            eqTraceOpacityPulseTimer = setTimeout(() => {
                eqTraceOpacityPulseTimer = null;
                emphTargets.forEach(n => {
                    let base = n.classList.contains("sample")
                        ? EQ_GRAPH_TRACE_STROKE_SAMPLE
                        : EQ_GRAPH_TRACE_STROKE_NORMAL;
                    d3.select(n).attr("stroke-width", base);
                });
            }, 100);
        }
    };
    let configureLiveSpectrumAnalyser = (a) => {
        a.fftSize = 2048;
        a.smoothingTimeConstant = 0.82;
        /* getFloatFrequencyData() is clamped to [minDecibels, maxDecibels]; a low max
           flattens loud bass (many bins hit the ceiling → horizontal line on the graph). */
        a.minDecibels = -100;
        a.maxDecibels = 0;
    };
    let disconnectToneGeneratorAnalyser = () => {
        if (toneGeneratorAnalyser) {
            try {
                toneGeneratorAnalyser.disconnect();
            } catch (e) { /* noop */ }
            toneGeneratorAnalyser = null;
        }
    };
    let stopPinkNoisePlayback = () => {
        if (!pinkNoisePlaying) {
            return;
        }
        pinkNoisePlaying = false;
        pinkNoisePlayButton.innerText = "▶";
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
        disconnectPinkBandFilters();
        if (pinkNoiseMasterGain) {
            pinkNoiseMasterGain.disconnect();
            pinkNoiseMasterGain = null;
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
    let createPinkNoiseProcessor = (audioContext) => {
        let bufferSize = 4096;
        let processor;
        try {
            processor = audioContext.createScriptProcessor(bufferSize, 0, 1);
        } catch (err) {
            processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        }
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
    let toneGeneratorFromInput = document.querySelector("div.live-sound-tools input[name='tone-generator-from']");
    let toneGeneratorToInput = document.querySelector("div.live-sound-tools input[name='tone-generator-to']");
    let toneGeneratorSlider = document.querySelector("div.live-sound-tools input[name='tone-generator-freq']");
    let toneGeneratorPlayButton = document.querySelector("div.extra-tone-generator .play");
    let toneGeneratorText = document.querySelector("div.extra-tone-generator .freq-text");
    let toneGeneratorAddFilterButton = document.querySelector(
        "div.extra-tone-generator button.tone-generator-add-filter");
    const TONE_GENERATOR_DEFAULT_HZ = 1000;
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
    let musicPlayButton = document.querySelector("div.extra-music .play");
    let musicAddRemoveButton = document.querySelector("div.extra-music button.music-add-remove");
    let musicFileInput = document.querySelector("div.extra-music input.music-file-input");
    let musicCard = document.querySelector("div.extra-music");
    let musicPlaybackPanel = document.querySelector("div.extra-music .music-playback-panel");
    let musicSegmentSliderEl = musicCard && musicCard.querySelector(".music-segment-slider");
    let musicSegmentTrackEl = musicSegmentSliderEl && musicSegmentSliderEl.querySelector(".music-segment-track");
    let musicSegmentSeekEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-seek");
    let musicSegmentProgressEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-progress");
    let musicSegmentOutsideLeftEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-outside-l");
    let musicSegmentOutsideRightEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-outside-r");
    let musicSegmentLoopedEl = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-looped");
    let musicSegmentHandleStart = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-handle-start");
    let musicSegmentHandleEnd = musicSegmentTrackEl && musicSegmentTrackEl.querySelector(".music-segment-handle-end");
    let musicSegmentHandleInsetPx = 8;
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
            musicPlayButton.innerText = "▶";
            musicPlayButton.classList.remove("playback-active");
        }
        musicSpectrumViz.syncSpectrumViz();
        updateEqTraceOpacity();
    };
    let toneGeneratorContext = null;
    let toneGeneratorOsc = null;
    let toneGeneratorTimeoutHandle = null;
    let toneSweepRafId = null;
    let toneSweepDurationSec = 6;
    let lastToneSpaceKeydownTime = 0;
    let toneSpaceDoubleMs = 200;
    let filterRowIsAllZeros = (i) => {
        let f = parseInt(filterFreqInput[i].value, 10) || 0;
        let q = parseFloat(filterQInput[i].value) || 0;
        let g = parseFloat(filterGainInput[i].value) || 0;
        return f === 0 && q === 0 && g === 0;
    };
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
    let clampEqGraphGainToInputRange = (db) =>
        Math.min(40, Math.max(-40, db));
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
            applyEQExec();
            scheduleLiveEqSync();
        });
    };
    /** @returns {number} row index, or -1 if max bands */
    let addPeakingFilterFromHz = (hz, initialGain, options) => {
        options = options || {};
        if (initialGain === undefined) {
            initialGain = 0;
        }
        hz = Math.min(20000, Math.max(20, Math.round(hz)));
        let defaultQ = 1;
        let targetIdx = -1;
        for (let i = 0; i < eqBands; i++) {
            if (filterRowIsAllZeros(i)) {
                targetIdx = i;
                break;
            }
        }
        let focusGainIndex;
        if (targetIdx >= 0) {
            filterEnabledInput[targetIdx].checked = true;
            filterTypeSelect[targetIdx].value = "PK";
            filterFreqInput[targetIdx].value = String(hz);
            filterQInput[targetIdx].value = String(defaultQ);
            filterGainInput[targetIdx].value = String(initialGain);
            focusGainIndex = targetIdx;
        } else {
            if (eqBands >= extraEQBandsMax) {
                alert("Maximum number of EQ bands reached.");
                return -1;
            }
            eqBands = Math.min(eqBands + 1, extraEQBandsMax);
            updateFilterElements();
            let j = eqBands - 1;
            filterEnabledInput[j].checked = true;
            filterTypeSelect[j].value = "PK";
            filterFreqInput[j].value = String(hz);
            filterQInput[j].value = String(defaultQ);
            filterGainInput[j].value = String(initialGain);
            focusGainIndex = j;
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
                if (gainEl) {
                    gainEl.focus();
                    gainEl.select();
                }
            }, 150);
        }
        return focusGainIndex;
    };
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
            }
        } else if (st.filterIndex !== null && st.dragging) {
            cancelDeferredApplyEQ();
            applyEQExec();
            scheduleLiveEqSync();
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
            let freqT = Math.round(Math.min(20000, Math.max(20, x.invert(mx))));
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
            if (st.axisLock === null) {
                st.axisLock = Math.abs(adx) >= Math.abs(ady) ? "freq" : "gain";
                if (st.axisLock === "freq") {
                    /* Ignore vertical bleed before axis lock: keep gain at pointer-down anchor. */
                    st.lockGainDb = roundEqGraphGainDb(st.gainDragAnchorDb);
                } else {
                    /* Ignore horizontal bleed before lock: keep freq at drag start. */
                    st.lockFreqHz = Math.round(Math.min(20000, Math.max(20, st.fHz)));
                }
            }
            let freq = st.axisLock === "freq" ? freqT : st.lockFreqHz;
            let gain = st.axisLock === "gain" ? gainT : st.lockGainDb;
            st.dragging = true;
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
                return;
            }
            let distExisting = locked
                ? Math.hypot(st.accumMovementX,
                    st.accumMovementY - st.baseAccumMovementY)
                : Math.hypot(ev.clientX - st.startClientX,
                    ev.clientY - st.downClientY);
            if (distExisting < EQ_GRAPH_DRAG_THRESHOLD_PX) {
                continue;
            }
            if (st.axisLock === null) {
                st.axisLock = Math.abs(adx) >= Math.abs(ady) ? "freq" : "gain";
                if (st.axisLock === "freq") {
                    st.lockGainDb = roundEqGraphGainDb(st.gainDragAnchorDb);
                } else {
                    st.lockFreqHz = Math.round(Math.min(20000, Math.max(20, st.fHz)));
                }
            }
            let freq = st.axisLock === "freq" ? freqT : st.lockFreqHz;
            let gain = st.axisLock === "gain" ? gainT : st.lockGainDb;
            st.dragging = true;
            st.liveFHz = freq;
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
            stPreview = computeEqNodePreviewAtMouse(m);
            if (!stPreview) {
                return;
            }
            let yOff = y(getOffset(stPreview.tracePhone)) - y(0);
            let cx = x(stPreview.fHz);
            let cy = y(stPreview.db) + yOff;
            if (eqGraphPlotDistPx(m, cx, cy) > EQ_GRAPH_MARKER_HIT_PX) {
                return;
            }
            setEqFilterSelectedRow(null);
        }
        /* preventDefault on mouse breaks compatibility mouse events; only touch needs it (scroll). */
        if (e.pointerType === "touch") {
            e.preventDefault();
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
        cancelAnimationFrame(eqGraphApplyEqDragTimer);
        eqGraphApplyEqDragTimer = null;
        eqGraphPointerState = {
            startClientX: e.clientX,
            startClientY: startClientYVal,
            grabOffClientX: grabOffClientX,
            grabOffClientY: grabOffClientY,
            downClientY: e.clientY,
            fHz: stPreview.fHz,
            liveFHz: stPreview.fHz,
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
        };
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
        if (eqGraphPointerState || interactInspect) {
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
        let i = hit.rowIndex;
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
        /* Scroll up → lower Q, scroll down → higher Q (invert raw deltaY convention). */
        qFloat = Math.min(10, Math.max(0.1, qFloat - dq));
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
                q = EQ_GRAPH_WHEEL_Q_FINE_MAX + EQ_GRAPH_WHEEL_Q_STEP;
                eqGraphWheelQFloat[i] = q;
            }
        }
        q = Math.max(0.1, q);
        filterQInput[i].value = q <= EQ_GRAPH_WHEEL_Q_FINE_MAX
            ? q.toFixed(2)
            : String(q);
        cancelDeferredApplyEQ();
        applyEQExec();
        scheduleLiveEqSync();
        setEqFilterSelectedRow(i);
        requestAnimationFrame(() => {
            let qEl = filterQInput[i];
            if (qEl) {
                qEl.focus();
                qEl.select();
            }
        });
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
    toneGeneratorAddFilterButton.addEventListener("click", () => {
        let hz = parseInt(toneGeneratorText.innerText, 10) || 0;
        addPeakingFilterFromHz(hz);
    });
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
            if (toneSweepRafId !== null) {
                cancelAnimationFrame(toneSweepRafId);
                toneSweepRafId = null;
            }
            toneGeneratorOsc.stop();
            toneGeneratorOsc = null;
            disconnectEqBiquads(toneGeneratorBiquads);
            if (toneGeneratorMasterGain) {
                toneGeneratorMasterGain.disconnect();
                toneGeneratorMasterGain = null;
            }
            disconnectToneGeneratorAnalyser();
            toneGeneratorPlayButton.innerText = "▶";
            toneGeneratorPlayButton.classList.remove("playback-active");
        }
        pauseMusicForLiveSoundSwitch();
        pinkNoiseContext = pinkNoiseContext || new (window.AudioContext || window.webkitAudioContext)();
        pinkNoiseProcessor = createPinkNoiseProcessor(pinkNoiseContext);
        pinkNoiseMasterGain = pinkNoiseContext.createGain();
        pinkNoiseMasterGain.gain.value = livePinkNoisePlaybackGain;
        // rebuildPinkNoiseEqChain requires pinkNoisePlaying — set before first build
        pinkNoisePlaying = true;
        rebuildPinkNoiseEqChain();
        pinkNoiseAnalyser = pinkNoiseAnalyser || pinkNoiseContext.createAnalyser();
        configureLiveSpectrumAnalyser(pinkNoiseAnalyser);
        pinkNoiseMasterGain.disconnect();
        pinkNoiseMasterGain.connect(pinkNoiseAnalyser);
        pinkNoiseAnalyser.connect(pinkNoiseContext.destination);
        pinkNoisePlayButton.innerText = "⏹";
        pinkNoisePlayButton.classList.add("playback-active");
        lastEqPlaybackSource = "pink";
        if (pinkNoiseContext.state !== "running") {
            void pinkNoiseContext.resume();
        }
        musicSpectrumViz.syncSpectrumViz();
        updateEqTraceOpacity();
    });
    // Tone Generator
    toneGeneratorFromInput.addEventListener("input", scheduleLiveEqSync);
    toneGeneratorToInput.addEventListener("input", scheduleLiveEqSync);
    toneGeneratorSlider.addEventListener("input", () => {
        if (toneSweepRafId !== null) {
            cancelAnimationFrame(toneSweepRafId);
            toneSweepRafId = null;
        }
        let from = Math.min(Math.max(parseInt(toneGeneratorFromInput.value) || 0, 20), 20000);
        let to = Math.min(Math.max(parseInt(toneGeneratorToInput.value) || 0, from), 20000);
        let position = parseFloat(toneGeneratorSlider.value) || 0;
        let freq = Math.round(Math.exp( // Slider move in log scale
            Math.log(from) + (Math.log(to) - Math.log(from)) * position));
        toneGeneratorText.innerText = freq;
        if (toneGeneratorOsc) {
            let t = toneGeneratorContext.currentTime;
            toneGeneratorOsc.frequency.cancelScheduledValues(t);
            toneGeneratorOsc.frequency.setTargetAtTime(freq, t, 0.2); // Smoother transition but also delay
        }
    });
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
            toneGeneratorPlayButton.click();
            if (!toneGeneratorOsc) {
                return;
            }
        }
        if (toneSweepRafId !== null) {
            cancelAnimationFrame(toneSweepRafId);
            toneSweepRafId = null;
        }
        void toneGeneratorContext.resume();
        let t0 = toneGeneratorContext.currentTime;
        toneGeneratorOsc.frequency.cancelScheduledValues(t0);
        toneGeneratorOsc.frequency.setValueAtTime(fromHz, t0);
        if (fromHz !== toHz) {
            toneGeneratorOsc.frequency.exponentialRampToValueAtTime(toHz, t0 + toneSweepDurationSec);
        }
        let sweepStartMs = performance.now();
        let sweepDurationMs = toneSweepDurationSec * 1000;
        let sweepTick = () => {
            let u = Math.min(1, (performance.now() - sweepStartMs) / sweepDurationMs);
            let freq = Math.round(Math.exp(
                Math.log(fromHz) + (Math.log(toHz) - Math.log(fromHz)) * u));
            toneGeneratorSlider.value = String(u);
            toneGeneratorText.innerText = String(freq);
            if (u < 1) {
                toneSweepRafId = requestAnimationFrame(sweepTick);
            } else {
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
    toneGeneratorPlayButton.addEventListener("click", (e) => {
        if (e.detail === 2) {
            e.preventDefault();
            startToneGeneratorSweep();
            return;
        }
        if (toneGeneratorOsc) {
            if (toneSweepRafId !== null) {
                cancelAnimationFrame(toneSweepRafId);
                toneSweepRafId = null;
            }
            toneGeneratorOsc.stop();
            toneGeneratorOsc = null;
            disconnectEqBiquads(toneGeneratorBiquads);
            if (toneGeneratorMasterGain) {
                toneGeneratorMasterGain.disconnect();
                toneGeneratorMasterGain = null;
            }
            disconnectToneGeneratorAnalyser();
            toneGeneratorPlayButton.innerText = "▶";
            toneGeneratorPlayButton.classList.remove("playback-active");
            musicSpectrumViz.syncSpectrumViz();
            updateEqTraceOpacity();
        } else {
            stopPinkNoisePlayback();
            pauseMusicForLiveSoundSwitch();
            if (!toneGeneratorContext) {
                if (!window.AudioContext && !window.webkitAudioContext) {
                    alert("Web audio api is disabled, please enable it if you want to use tone generator.");
                    return;
                }
                toneGeneratorContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            toneGeneratorOsc = toneGeneratorContext.createOscillator();
            toneGeneratorOsc.type = "sine";
            toneGeneratorOsc.frequency.value = parseInt(toneGeneratorText.innerText);
            toneGeneratorMasterGain = toneGeneratorContext.createGain();
            toneGeneratorMasterGain.gain.value = liveToneGeneratorPlaybackGain;
            rebuildToneGeneratorEqChain();
            toneGeneratorAnalyser = toneGeneratorAnalyser || toneGeneratorContext.createAnalyser();
            configureLiveSpectrumAnalyser(toneGeneratorAnalyser);
            toneGeneratorMasterGain.disconnect();
            toneGeneratorMasterGain.connect(toneGeneratorAnalyser);
            toneGeneratorAnalyser.connect(toneGeneratorContext.destination);
            toneGeneratorOsc.start();
            toneGeneratorPlayButton.innerText = "⏹";
            toneGeneratorPlayButton.classList.add("playback-active");
            lastEqPlaybackSource = "tone";
            if (toneGeneratorContext.state !== "running") {
                void toneGeneratorContext.resume();
            }
            musicSpectrumViz.syncSpectrumViz();
            updateEqTraceOpacity();
        }
    });
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
            musicPlayButton.innerText = "▶";
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
        musicSpectrumViz.syncSpectrumViz();
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
        rebuildMusicEqChain();
        musicAnalyser = musicContext.createAnalyser();
        configureLiveSpectrumAnalyser(musicAnalyser);
        musicMasterGain.connect(musicAnalyser);
        musicAnalyser.connect(musicContext.destination);
        musicSpectrumViz.syncSpectrumViz();
        return true;
    };
    let stopPinkAndToneForExclusiveMusic = () => {
        stopPinkNoisePlayback();
        if (toneGeneratorOsc) {
            if (toneSweepRafId !== null) {
                cancelAnimationFrame(toneSweepRafId);
                toneSweepRafId = null;
            }
            toneGeneratorOsc.stop();
            toneGeneratorOsc = null;
            disconnectEqBiquads(toneGeneratorBiquads);
            if (toneGeneratorMasterGain) {
                toneGeneratorMasterGain.disconnect();
                toneGeneratorMasterGain = null;
            }
            disconnectToneGeneratorAnalyser();
            toneGeneratorPlayButton.innerText = "▶";
            toneGeneratorPlayButton.classList.remove("playback-active");
        }
    };
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
            musicPlayButton.innerText = "⏹";
            musicPlayButton.classList.add("playback-active");
            lastEqPlaybackSource = "music";
            musicSpectrumViz.syncSpectrumViz();
            updateEqTraceOpacity();
        });
    };
    let wireMusicLoadedFromBlob = (blob, segOpt, loadOpts) => {
        loadOpts = loadOpts || {};
        let autoPlayAfterLoad = loadOpts.autoPlay === true;
        if (!musicAudio || !musicPlayButton || !musicCard || !musicSegmentSliderEl || !musicAddRemoveButton) {
            return;
        }
        if (musicObjectUrl) {
            URL.revokeObjectURL(musicObjectUrl);
        }
        musicAudio.pause();
        musicSpectrumViz.stop();
        musicPlayButton.innerText = "▶";
        musicPlayButton.classList.remove("playback-active");
        musicObjectUrl = URL.createObjectURL(blob);
        if (segOpt && typeof segOpt.segStartU === "number" && typeof segOpt.segEndU === "number") {
            musicSegStartU = segOpt.segStartU;
            musicSegEndU = segOpt.segEndU;
        } else {
            musicSegStartU = 0;
            musicSegEndU = 1;
        }
        musicAudio.src = musicObjectUrl;
        musicAudio.load();
        musicFileLoaded = true;
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
    };
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
        musicPlayButton.addEventListener("click", () => {
            if (!musicFileLoaded || !musicAudio || !musicContext) {
                return;
            }
            if (musicAudio.paused) {
                startMusicPlayback().catch(() => {
                    alert("Playback could not be started.");
                });
            } else {
                musicAudio.pause();
                musicPlayButton.innerText = "▶";
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
        tryRestorePersistedMusic();
    }
    let syncToneGeneratorToEqFrequencyHz = (hz) => {
        hz = Math.min(20000, Math.max(20, Math.round(Number(hz)) || 20));
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
        if (!e.metaKey && !e.altKey) {
            return;
        }
        if (e.code !== "Backspace") {
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
        if (e.repeat) {
            return;
        }
        let selectEl = document.querySelector("div.select");
        if (!selectEl || selectEl.getAttribute("data-selected") !== "extra") {
            return;
        }
        let t = e.target;
        if (t.closest && t.closest("div.extra-panel button") && !t.closest("button.play")) {
            if (t.closest && t.closest("button.music-add-remove") && musicFileLoaded) {
                e.preventDefault();
            } else {
                return;
            }
        }
        resumeAudioContextsFromUserGesture();
        if (e.shiftKey) {
            e.preventDefault();
            lastToneSpaceKeydownTime = 0;
            let hasMusicSlot = musicFileLoaded && musicPlayButton && musicAudio;
            let playingPink = pinkNoisePlaying;
            let playingTone = !!toneGeneratorOsc;
            let playingMusic = hasMusicSlot && !musicAudio.paused;
            if (playingPink) {
                toneGeneratorPlayButton.click();
            } else if (playingTone) {
                if (hasMusicSlot) {
                    musicPlayButton.click();
                } else {
                    pinkNoisePlayButton.click();
                }
            } else if (playingMusic) {
                pinkNoisePlayButton.click();
            } else {
                let order = hasMusicSlot
                    ? ["pink", "tone", "music"]
                    : ["pink", "tone"];
                let idx = order.indexOf(lastEqPlaybackSource);
                if (idx < 0) {
                    idx = 0;
                }
                let next = order[(idx + 1) % order.length];
                if (next === "pink") {
                    pinkNoisePlayButton.click();
                } else if (next === "tone") {
                    toneGeneratorPlayButton.click();
                } else {
                    musicPlayButton.click();
                }
            }
            return;
        }
        e.preventDefault();
        if (lastEqPlaybackSource === "tone") {
            let now = performance.now();
            if (lastToneSpaceKeydownTime > 0 && now - lastToneSpaceKeydownTime < toneSpaceDoubleMs) {
                lastToneSpaceKeydownTime = 0;
                startToneGeneratorSweep();
                return;
            }
            lastToneSpaceKeydownTime = now;
            toneGeneratorPlayButton.click();
        } else if (lastEqPlaybackSource === "music" && musicFileLoaded && musicPlayButton) {
            lastToneSpaceKeydownTime = 0;
            musicPlayButton.click();
        } else {
            lastToneSpaceKeydownTime = 0;
            pinkNoisePlayButton.click();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "\\") return;
        if (!livePlaybackEqToggle) return;
        e.preventDefault();
        if (e.repeat) return;
        livePlaybackEqToggle.checked = false;
        livePlaybackEqToggle.dispatchEvent(new Event("change"));
    });
    document.addEventListener("keyup", (e) => {
        if (e.key !== "\\") return;
        if (!livePlaybackEqToggle) return;
        livePlaybackEqToggle.checked = true;
        livePlaybackEqToggle.dispatchEvent(new Event("change"));
    });

    // Wrap up preamp Calculation Function for plugin
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
    }

    /**
     * Dynamically load a plugin from a sub-folder passing it the useful context
     * @param pluginsToLoad
     * @param context
     * @returns {Promise<void>}
     */
    async function loadPlugins(pluginsToLoad, context) {
        for (const pluginPath of pluginsToLoad) {
            try {
                let initializePlugin;

                if (typeof module !== 'undefined' && module.exports) {
                    // CommonJS environment (e.g., Node.js)
                    initializePlugin = require(pluginPath);
                } else {
                    // ES Module environment (e.g., modern browsers)
                    const module = await import(pluginPath);
                    initializePlugin = module.default;
                }

                // Call the plugin function with the provided context
                await initializePlugin(context);
                console.log(`Successfully loaded plugin: ${pluginPath}`);
            } catch (error) {
                console.error(`Error loading plugin ${pluginPath}:`, error.message);
            }
        }
    }
    // Might come from the config.js
    let config = {showNetwork:false}; // Hide the extra selection of network based devices for now

    // Load the plugin with the provided functions
    if (typeof extraEQplugins !== "undefined") {
        loadPlugins(extraEQplugins, {
            filtersToElem,  // Put Filters back to Html Elements
            elemToFilters,  // Get Filters from Html Elements
            calcEqDevPreamp,// Reuse existing gain calculations
            applyEQ,         // Apply EQ
            config
        });
    }
}
addExtra();

// Add accessories to the bottom of the page, if configured
function addAccessories() {
    let accessoriesBar = document.querySelector("div.accessories"),
        accessoriesContainer = document.createElement("aside");

    accessoriesContainer.innerHTML = whichAccessoriesToUse;
    accessoriesBar.append(accessoriesContainer);
}
if (accessories) { addAccessories(); }

// Add header to alt layout
function addHeader() {
    let graphToolContainer = document.querySelector("div.graphtool"),
        altHeaderElem = document.createElement("header"),
        headerButton = document.createElement("button"),
        headerLogoElem = document.createElement("div"),
        headerLogoLink = document.createElement("a"),
        headerLogoImg = document.createElement("img"),
        headerLogoSpan = document.createElement("span"),
        linksList = document.createElement("ul");

    headerButton.className = "header-button";
    headerLogoElem.className = "logo";
    headerLogoLink.setAttribute('href', site_url);
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
        if ( alt_header_new_tab ) { linkElem.setAttribute("target", "_blank"); }
        if ( link.external ) { linkElem.setAttribute("target", "_blank"); linkElem.classList.add('external'); }
        linkElem.textContent = link.name;
        linkContainerElem.append(linkElem);
        linksList.append(linkContainerElem);
    })

    headerButton.addEventListener("click", function() {
        let headerLinksState = altHeaderElem.getAttribute("data-links");

        if (headerLinksState === "expanded") {
            altHeaderElem.setAttribute("data-links", "collapsed");
        } else {
            altHeaderElem.setAttribute("data-links", "expanded");
        }
    });
}
if (alt_header) { addHeader(); }

// Add external links to bar at bottom of page, if configured
function addExternalLinks() {
    const externalLinksBar = document.querySelector("div.external-links");

    linkSets.forEach(function(set) {
        let setLabelHtml = document.createElement("span"),
            setLabelText = set.label,
            links = set.links;

        setLabelHtml.textContent = setLabelText;
        externalLinksBar.append(setLabelHtml);

        links.forEach(function(link) {
            let linkHtml = document.createElement("a"),
                linkName = link.name,
                linkUrl = link.url;

            linkHtml.textContent = linkName;
            linkHtml.setAttribute("href", linkUrl);
            externalLinksBar.append(linkHtml);
        });
    });
}
if (externalLinksBar) { addExternalLinks(); }

// Add tutorial to alt layout
function addTutorial() {
    let partsPrimary = document.querySelector("section.parts-primary")
        graphContainer = document.querySelector("div.graph-sizer"),
        manageContainer = document.querySelector("div.manage"),
        overlayContainer = document.createElement("div"),
        buttonContainer = document.createElement("div"),
        descriptionContainer = document.createElement("div"),
        zoomButtons = document.querySelectorAll("div.zoom button");

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
        defOverlay.setAttribute("style", "flex-basis: "+ def.width +";")
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
                activeTutorialElements = document.querySelectorAll("[tutorial-on='true']"),
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

                // Analytics event
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

    // Disable zoom if tutorial is engaged
    function disableZoom() {
        let activeZoomButton = document.querySelector("div.zoom button.selected");

        if (activeZoomButton) { activeZoomButton.click(); }
    }

    // Disable tutorial if zoom is engaged
    zoomButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            let tutorialState = document.querySelector("section.parts-primary").getAttribute("tutorial-active");

            if (button.classList.contains("selected") && tutorialState === "true") {
                let activeOverlay = document.querySelector("div.overlay-segment[tutorial-on='true']"),
                    activeButton = document.querySelector("button.button-segment[tutorial-on='true']"),
                    activeDescription = document.querySelector("article.description-segment[tutorial-on='true']");

                document.querySelector("section.parts-primary").setAttribute("tutorial-active","false");
                activeOverlay.setAttribute("tutorial-on", "false");
                activeButton.setAttribute("tutorial-on", "false");
            }
        });
    });
}
if (alt_tutorial) { addTutorial(); }

// Set active graph site link
function setActiveDatabase() {
    let url = targetWindow.location.href,
        dbLinks = document.querySelectorAll("div.external-links a");

    dbLinks.forEach(function(link) {
        let linkUrl = link.getAttribute("href");

        if ( url.includes(linkUrl) ) {
            link.setAttribute("class", "active");
        }
    });
}
setActiveDatabase();

// Expand / collapse function
function toggleExpandCollapse() {
    const graphIsIframe = (window.top !== window.self) ? true:false,
        graphBody = document.querySelector("body"),
        parentBody = window.top.document.querySelector("body"),
        expandCollapseButton = document.querySelector("button#expand-collapse");


    if ( graphIsIframe) { graphBody.setAttribute("data-graph-frame", "collapsed"); }


    if ( graphIsIframe && expandableOnly ) {
        const expandOnlyMax = ( expandableOnly === true ) ? 1000000:expandableOnly,
            expandOnlyStyle = document.createElement("style"),
            expandOnlyCss = `
            @media ( max-width: `+ expandOnlyMax +`px ) {
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
    } else if ( graphIsIframe && expandable ) {
        graphBody.setAttribute("data-expandable", "true");
    }

    const parentStyle = window.top.document.createElement("style"),
          parentCss = `
            :root {
                --header-height: `+ headerHeight +`;
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

        if ( frameState === "expanded" ) {
            graphBody.setAttribute("data-graph-frame", "collapsed");
            parentBody.setAttribute("data-graph-frame", "collapsed");
        } else {
            graphBody.setAttribute("data-graph-frame", "expanded");
            parentBody.setAttribute("data-graph-frame", "expanded");
        }

        e.stopPropagation();
    });

}

if ( expandable && accessDocumentTop ) { toggleExpandCollapse(); }

// Update user config for target + baseline
function setUserConfig() {
    let urlObj = new URL(document.URL),
        pathClean = urlObj.pathname.replace(/\W/g, ""),
        configName = pathClean.length > 0 ? "_" + pathClean + "_a" : "_a",
        configJson = {
            "phones": [],
            "normalMode": (norm_sel === 1) ? "Hz" : "dB",
            "normalValue": (norm_sel === 1) ? norm_fr : norm_phon
        },
        activeBaseline = baseline.p ? baseline.p.fileName : 0;

    activePhones.forEach(function(phone) {
        let phoneJson = {},
            fullName = phone.fullName,
            fileName = phone.fileName,
            isTarget = phone.isTarget ? phone.isTarget : false,
            isHidden = phone.hide ? phone.hide : false,
            isBaseline = fileName === activeBaseline ? true : false,
            isPinned = phone.pin ? phone.pin : false;

        if (isTarget || isBaseline) {
            phoneJson.fullName = fullName;
            phoneJson.fileName = fileName;
            phoneJson.isTarget = isTarget;
            phoneJson.isHidden = isHidden;
            phoneJson.isBaseline = isBaseline;
            phoneJson.isPinned = isPinned;

            configJson.phones.push(phoneJson);
        }
    });

    localStorage.setItem("userConfig" + configName, JSON.stringify(configJson));
}

// Insert user config phones to inits
function userConfigAppendInits(initReq) {
    if (targetRestoreLastUsed) {
        let urlObj = new URL(document.URL),
            pathClean = urlObj.pathname.replace(/\W/g, ""),
            configName = pathClean.length > 0 ? "_" + pathClean + "_a" : "_a",
            configJson = JSON.parse(localStorage.getItem("userConfig" + configName)),
            configNumOfPhones = configJson ? configJson.phones.length : 0;

        if (configJson && configNumOfPhones) {
            initReq.slice(0).forEach(function(item) {
                if (item && typeof item.endsWith === "function" && item.endsWith(" Target")) {
                    initReq.splice(initReq.indexOf(item), 1);
                }
            });

            configJson.phones.forEach(function(phone) {
                if (!initReq.includes(phone.fileName)) {
                    initReq.push(phone.fileName);
                }
            });
        }
    }
}

// Apply baseline and hide settings
function userConfigApplyViewSettings(phoneInTable) {
    if (targetRestoreLastUsed) {
        userConfigApplicationActive = 1;

        let urlObj = new URL(document.URL),
            pathClean = urlObj.pathname.replace(/\W/g, ""),
            configName = pathClean.length > 0 ? "_" + pathClean + "_a" : "_a",
            configJson = JSON.parse(localStorage.getItem("userConfig" + configName));

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
};

// Apply normalization config
function userConfigApplyNormalization() {
    userConfigApplicationActive = 1;

    let urlObj = new URL(document.URL),
        pathClean = urlObj.pathname.replace(/\W/g, ""),
        configName = pathClean.length > 0 ? "_" + pathClean + "_a" : "_a",
        configJson = JSON.parse(localStorage.getItem("userConfig" + configName));

    if ( configJson && configJson.normalMode === "Hz" ) {
        document.querySelector("input#norm-fr").value = configJson.normalValue;
        document.querySelector("input#norm-fr").dispatchEvent(new Event("change"));
    } else if ( configJson && configJson.normalMode === "dB" ) {
        document.querySelector("input#norm-phon").value = configJson.normalValue;
        document.querySelector("input#norm-phon").dispatchEvent(new Event("change"));
    }

    userConfigApplicationActive = 0;
}
