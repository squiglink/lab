// ============================================================
// === saveSvgAsPng.js ===
// ============================================================
// Adapted from https://github.com/exupero/saveSvgAsPng
/*
The MIT License (MIT)

Copyright (c) 2014 Eric Shull

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
(function() {
  const out$ = typeof exports != 'undefined' && exports || typeof define != 'undefined' && {} || this || window;
  if (typeof define !== 'undefined') define('save-svg-as-png', [], () => out$);
  out$.default = out$;

  const xmlNs = 'http://www.w3.org/2000/xmlns/';
  const xhtmlNs = 'http://www.w3.org/1999/xhtml';
  const svgNs = 'http://www.w3.org/2000/svg';
  const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
  const urlRegex = /url\(["']?(.+?)["']?\)/;
  const fontFormats = {
    woff2: 'font/woff2',
    woff: 'font/woff',
    otf: 'application/x-font-opentype',
    ttf: 'application/x-font-ttf',
    eot: 'application/vnd.ms-fontobject',
    sfnt: 'application/font-sfnt',
    svg: 'image/svg+xml'
  };

  const isElement = obj => obj instanceof HTMLElement || obj instanceof SVGElement;
  const requireDomNode = el => {
    if (!isElement(el)) throw new Error(`an HTMLElement or SVGElement is required; got ${el}`);
  };
  const requireDomNodePromise = el =>
    new Promise((resolve, reject) => {
      if (isElement(el)) resolve(el)
      else reject(new Error(`an HTMLElement or SVGElement is required; got ${el}`));
    })
  const isExternal = url => url && url.lastIndexOf('http',0) === 0 && url.lastIndexOf(window.location.host) === -1;

  const getFontMimeTypeFromUrl = fontUrl => {
    const formats = Object.keys(fontFormats)
      .filter(extension => fontUrl.indexOf(`.${extension}`) > 0)
      .map(extension => fontFormats[extension]);
    if (formats) return formats[0];
    console.error(`Unknown font format for ${fontUrl}. Fonts may not be working correctly.`);
    return 'application/octet-stream';
  };

  const arrayBufferToBase64 = buffer => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  const getDimension = (el, clone, dim) => {
    const v =
      (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
      (clone.getAttribute(dim) !== null && !clone.getAttribute(dim).match(/%$/) && parseInt(clone.getAttribute(dim))) ||
      el.getBoundingClientRect()[dim] ||
      parseInt(clone.style[dim]) ||
      parseInt(window.getComputedStyle(el).getPropertyValue(dim));
    return typeof v === 'undefined' || v === null || isNaN(parseFloat(v)) ? 0 : v;
  };

  const getDimensions = (el, clone, width, height) => {
    if (el.tagName === 'svg') return {
      width: width || getDimension(el, clone, 'width'),
      height: height || getDimension(el, clone, 'height')
    };
    else if (el.getBBox) {
      const {x, y, width, height} = el.getBBox();
      return {
        width: x + width,
        height: y + height
      };
    }
  };

  const reEncode = data =>
    decodeURIComponent(
      encodeURIComponent(data)
        .replace(/%([0-9A-F]{2})/g, (match, p1) => {
          const c = String.fromCharCode(`0x${p1}`);
          return c === '%' ? '%25' : c;
        })
    );

  const uriToBlob = uri => {
    const byteString = window.atob(uri.split(',')[1]);
    const mimeString = uri.split(',')[0].split(':')[1].split(';')[0]
    const buffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(buffer);
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([buffer], {type: mimeString});
  };

  const query = (el, selector) => {
    if (!selector) return;
    try {
      return el.querySelector(selector) || el.parentNode && el.parentNode.querySelector(selector);
    } catch(err) {
      console.warn(`Invalid CSS selector "${selector}"`, err);
    }
  };

  const detectCssFont = (rule, href) => {
    // Match CSS font-face rules to external links.
    // @font-face {
    //   src: local('Abel'), url(https://fonts.gstatic.com/s/abel/v6/UzN-iejR1VoXU2Oc-7LsbvesZW2xOQ-xsNqO47m55DA.woff2);
    // }
    const match = rule.cssText.match(urlRegex);
    const url = (match && match[1]) || '';
    if (!url || url.match(/^data:/) || url === 'about:blank') return;
    const fullUrl =
      url.startsWith('../') ? `${href}/../${url}`
      : url.startsWith('./') ? `${href}/.${url}`
      : url;
    return {
      text: rule.cssText,
      format: getFontMimeTypeFromUrl(fullUrl),
      url: fullUrl
    };
  };

  const inlineImages = el => Promise.all(
    Array.from(el.querySelectorAll('image')).map(image => {
      let href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || image.getAttribute('href');
      // Removed external handling in CrinGraph since it will fail cross-origin stuff anyway
      if (!href || isExternal(href)) return Promise.resolve(null);
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = href;
        img.onerror = () => reject(new Error(`Could not load ${href}`));
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL('image/png'));
          resolve(true);
        };
      });
    })
  );

  const cachedFonts = {};
  const inlineFonts = fonts => Promise.all(
    fonts.map(font =>
      new Promise((resolve, reject) => {
        if (cachedFonts[font.url]) return resolve(cachedFonts[font.url]);

        const req = new XMLHttpRequest();
        req.addEventListener('load', () => {
          // TODO: it may also be worth it to wait until fonts are fully loaded before
          // attempting to rasterize them. (e.g. use https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet)
          const fontInBase64 = arrayBufferToBase64(req.response);
          const fontUri = font.text.replace(urlRegex, `url("data:${font.format};base64,${fontInBase64}")`)+'\n';
          cachedFonts[font.url] = fontUri;
          resolve(fontUri);
        });
        req.addEventListener('error', e => {
          console.warn(`Failed to load font from: ${font.url}`, e);
          cachedFonts[font.url] = null;
          resolve(null);
        });
        req.addEventListener('abort', e => {
          console.warn(`Aborted loading font from: ${font.url}`, e);
          resolve(null);
        });
        req.open('GET', font.url);
        req.responseType = 'arraybuffer';
        req.send();
      })
    )
  ).then(fontCss => fontCss.filter(x => x).join(''));

  let cachedRules = null;
  const styleSheetRules = () => {
    if (cachedRules) return cachedRules;
    return cachedRules = Array.from(document.styleSheets).map(sheet => {
      try {
        return {rules: sheet.cssRules, href: sheet.href};
      } catch (e) {
        return {};
      }
    });
  };

  const inlineCss = (el, options) => {
    const {
      selectorRemap,
      modifyStyle,
      modifyCss,
      fonts
    } = options || {};
    const generateCss = modifyCss || ((selector, properties) => {
      const sel = selectorRemap ? selectorRemap(selector) : selector;
      const props = modifyStyle ? modifyStyle(properties) : properties;
      return `${sel}{${props}}\n`;
    });
    const css = [];
    const detectFonts = typeof fonts === 'undefined';
    const fontList = fonts || [];
    styleSheetRules().forEach(({rules, href}) => {
      if (!rules) return;
      Array.from(rules).forEach(rule => {
        if (typeof rule.style != 'undefined') {
          if (query(el, rule.selectorText)) css.push(generateCss(rule.selectorText, rule.style.cssText));
          else if (detectFonts && rule.cssText.match(/^@font-face/)) {
            const font = detectCssFont(rule, href);
            if (font) fontList.push(font);
          } else css.push(rule.cssText);
        }
      });
    });

    return inlineFonts(fontList).then(fontCss => css.join('\n') + fontCss);
  };

  const downloadOptions = () => {
    if (!navigator.msSaveOrOpenBlob && !('download' in document.createElement('a'))) {
      return {popup: window.open()};
    }
  };

  out$.prepareSvg = (el, options, done) => {
    requireDomNode(el);
    const {
      left = 0,
      top = 0,
      width: w,
      height: h,
      scale = 1,
      responsive = false,
    } = options || {};

    return inlineImages(el).then(() => {
      let clone = el.cloneNode(true);
      clone.style.backgroundColor = (options || {}).backgroundColor || el.style.backgroundColor;
      const {width, height} = getDimensions(el, clone, w, h);

      if (el.tagName !== 'svg') {
        if (el.getBBox) {
          if (clone.getAttribute('transform') != null) {
            clone.setAttribute('transform', clone.getAttribute('transform').replace(/translate\(.*?\)/, ''));
          }
          const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
          svg.appendChild(clone);
          clone = svg;
        } else {
          console.error('Attempted to render non-SVG element', el);
          return;
        }
      }

      clone.setAttribute('version', '1.1');
      clone.setAttribute('viewBox', [left, top, width, height].join(' '));
      if (!clone.getAttribute('xmlns')) clone.setAttributeNS(xmlNs, 'xmlns', svgNs);
      if (!clone.getAttribute('xmlns:xlink')) clone.setAttributeNS(xmlNs, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');

      if (responsive) {
        clone.removeAttribute('width');
        clone.removeAttribute('height');
        clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      } else {
        clone.setAttribute('width', width * scale);
        clone.setAttribute('height', height * scale);
      }

      Array.from(clone.querySelectorAll('foreignObject > *')).forEach(foreignObject => {
        foreignObject.setAttributeNS(xmlNs, 'xmlns', foreignObject.tagName === 'svg' ? svgNs : xhtmlNs);
      });

      return inlineCss(el, options).then(css => {
        const style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.innerHTML = `<![CDATA[\n${css}\n]]>`;

        const defs = document.createElement('defs');
        defs.appendChild(style);
        clone.insertBefore(defs, clone.firstChild);

        const outer = document.createElement('div');
        outer.appendChild(clone);
        const src = outer.innerHTML.replace(/NS\d+:href/gi, 'xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href');

        if (typeof done === 'function') done(src, width, height);
        else return {src, width, height};
      });
    });
  };

  out$.svgAsDataUri = (el, options, done) => {
    requireDomNode(el);
    return out$.prepareSvg(el, options)
      .then(({src, width, height}) => {
          const svgXml = `data:image/svg+xml;base64,${window.btoa(reEncode(doctype+src))}`;
          if (typeof done === 'function') {
              done(svgXml, width, height);
          }
          return svgXml;
      });
  };

  out$.svgAsPngUri = (el, options, done) => {
    requireDomNode(el);
    const {
      encoderType = 'image/png',
      encoderOptions = 0.8,
      canvg
    } = options || {};

    const convertToPng = ({src, width, height}) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;

      if (canvg) canvg(canvas, src);
      else context.drawImage(src, 0, 0);

      let png;
      try {
        png = canvas.toDataURL(encoderType, encoderOptions);
      } catch (e) {
        if ((typeof SecurityError !== 'undefined' && e instanceof SecurityError) || e.name === 'SecurityError') {
          console.error('Rendered SVG images cannot be downloaded in this browser.');
          return;
        } else throw e;
      }
      if (typeof done === 'function') done(png, canvas.width, canvas.height);
      return Promise.resolve(png);
    }

    if (canvg) return out$.prepareSvg(el, options).then(convertToPng);
    else return out$.svgAsDataUri(el, options).then(uri => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(convertToPng({
          src: image,
          width: image.width,
          height: image.height
        }));
        image.onerror = () => {
          reject(`There was an error loading the data URI as an image on the following SVG\n${window.atob(uri.slice(26))}Open the following link to see browser's diagnosis\n${uri}`);
        }
        image.src = uri;
      })
    });
  };

  out$.download = (name, uri, options) => {
    if (navigator.msSaveOrOpenBlob) navigator.msSaveOrOpenBlob(uriToBlob(uri), name);
    else {
      const saveLink = document.createElement('a');
      if ('download' in saveLink) {
        saveLink.download = name;
        saveLink.style.display = 'none';
        document.body.appendChild(saveLink);
        try {
          const blob = uriToBlob(uri);
          const url = URL.createObjectURL(blob);
          saveLink.href = url;
          saveLink.onclick = () => requestAnimationFrame(() => URL.revokeObjectURL(url));
        } catch (e) {
          console.error(e);
          console.warn('Error while getting object URL. Falling back to string URL.');
          saveLink.href = uri;
        }
        saveLink.click();
        document.body.removeChild(saveLink);
      } else if (options && options.popup) {
        options.popup.document.title = name;
        options.popup.location.replace(uri);
      }
    }
  };

  out$.saveSvg = (el, name, options) => {
    const downloadOpts = downloadOptions(); // don't inline, can't be async
    return requireDomNodePromise(el)
      .then(el => out$.svgAsDataUri(el, options || {}))
      .then(uri => out$.download(name, uri, downloadOpts));
  };

  out$.saveSvgAsPng = (el, name, options) => {
    const downloadOpts = downloadOptions(); // don't inline, can't be async
    return requireDomNodePromise(el)
      .then(el => out$.svgAsPngUri(el, options || {}))
      .then(uri => out$.download(name, uri, downloadOpts));
  };
})();

// graphAnalytics.js is injected dynamically by config.js — do not merge here.
// ============================================================
// === src/graph/core.js ===
// ============================================================
/* Small pure helpers shared by graph rendering and table UI. */
function channelbox_x(c) {
    return c ? -86 : -36;
}
function channelbox_tr(c) {
    return "translate(" + channelbox_x(c) + ",0)";
}
/** Legend / lineLabel text for user-derived targets (`USRMT_*` stays internal in fullName/fileName). */
function graphCurveLabelForPhone(p) {
    if (!p || !p.userTargetFromMeasurement) {
        return p ? p.fullName : "";
    }
    let brand = String(p.dispBrand || "").trim(),
        nm = String(p.phone || "").trim() || String(p.dispName || "").trim();
    let core = (brand && nm) ? `${brand} ${nm}`.trim() : (nm || "").trim();
    if (!core) {
        core = String(p.fullName || "").replace(/^USRMT_[a-z0-9]+$/i, "").trim();
    }
    if (!core) {
        core = "Target";
    }
    if (!/\sTarget$/i.test(core)) {
        core = `${core} Target`;
    }
    return core;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        channelbox_tr,
        channelbox_x,
        graphCurveLabelForPhone
    };
}

// ============================================================
// === src/graph/render.js ===
// ============================================================
/* Graph redraw/baseline helpers.
 * These remain classic globals so the rest of the app can keep using them directly. */
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
        p.activeCurves = [{id: graphCurveLabelForPhone(p), l:p.channels[0], p:p, o:0}];
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
let getOffset = p => (p.offset || 0) + (p.norm || 0);
window.getOffset = getOffset;


// ============================================================
// === src/graph/labels.js ===
// ============================================================
/* Graph label drawing and export helpers. */
let getFullName = p => p.dispBrand+" "+p.dispName,
    getChannelName = p => n => getFullName(p) + " ("+n+")";

let labelButton = null,
    labelsShown = false;
function ensureLabelButton() {
    if (!labelButton && typeof doc !== "undefined" && doc && typeof doc.select === "function") {
        labelButton = doc.select("#label");
    }
    return labelButton;
}
function setLabelButton(l) {
    let btn = ensureLabelButton();
    if (btn) {
        btn.classed("selected", labelsShown = l);
    } else {
        labelsShown = l;
    }
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
        .join("g").attr("class","lineLabel").attr("opacity", 0)
        .attr("pointer-events", "none");
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

function setupLabelUi() {
    if (typeof doc === "undefined" || !doc || typeof doc.select !== "function") {
        return;
    }
    ensureLabelButton();
    if (labelButton) {
        labelButton.on("click", () => (labelsShown?clearLabels:drawLabels)());
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
}
setupLabelUi();

// ============================================================
// === src/graph/interaction.js ===
// ============================================================
/* Graph interaction helpers for hover, inspector, and plot coordinate conversion. */
function setHover(elt, h) {
    elt.on("mouseover", h(true)).on("mouseout", h(false));
}

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
        .join("g").attr("class","lineLabel")
        .attr("pointer-events", "none");
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
function stopInspect() { gr.selectAll(".inspector").remove(); }

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

let interactInspect = false;
Object.defineProperty(window, 'interactInspect', { get: () => interactInspect, set: v => { interactInspect = v; }, configurable: true });
let graphInteract = imm => function () {
    /* EQ graph drag uses Pointer Events on document + pointer capture; d3 mousemove still fires on
       Safari/trackpad with coordinates that can disagree with the pointer stream, which fights
       syncEqHoverPreview and pathHL (strobe on nearest-curve highlight). Ignore synthetic mouse path
       for the whole gesture. */
    if (eqGraphPointerState) {
        return;
    }
    let ev = d3.event;
    if (ev && typeof ev.clientX === "number" && typeof ev.clientY === "number") {
        lastGraphPlotPointerClient = { x: ev.clientX, y: ev.clientY };
    }
    let cs = curvesPhonesFirstForPointer(d3.merge(activePhones.map(p=>p.hide?[]:(p.activeCurves||[]))));
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
    if (imm && eqGraphSuppressClickAddFromTouch) {
        eqGraphSuppressClickAddFromTouch = false;
        if (eqGraphTouchSuppressClearTimer) {
            clearTimeout(eqGraphTouchSuppressClearTimer);
            eqGraphTouchSuppressClearTimer = null;
        }
    } else if (imm && !interactInspect && tryEqGraphClickAddFilter(m)) {
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
                .attr("pointer-events", "none")
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
window.graphInteract = graphInteract;

// ============================================================
// === src/graph/smoothing.js ===
// ============================================================
/* Graph smoothing, averaging, and normalization helpers. */
let pair = (arr, fn) => arr.slice(1).map((v, i) => fn(v, arr[i]));

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

const iso223_params = { // :2003
    f  : [   20,    25, 31.5,    40,    50,    63,    80,   100,   125,  160,   200,   250,   315,   400,   500,   630,   800, 1000,  1250,  1600,  2000,  2500,  3150,  4000,  5000,  6300,  8000, 10000, 12500],
    a_f: [0.532, 0.506, 0.48, 0.455, 0.432, 0.409, 0.387, 0.367, 0.349, 0.33, 0.315, 0.301, 0.288, 0.276, 0.267, 0.259, 0.253, 0.25, 0.246, 0.244, 0.243, 0.243, 0.243, 0.242, 0.242, 0.245, 0.254, 0.271, 0.301],
    L_U: [-31.6, -27.2,  -23, -19.1, -15.9,   -13, -10.3,  -8.1,  -6.2, -4.5,  -3.1,    -2,  -1.1,  -0.4,     0,   0.3,   0.5,    0,  -2.7,  -4.1,    -1,   1.7,   2.5,   1.2,  -2.1,  -7.1, -11.2, -10.7,  -3.1],
    T_f: [ 78.5,  68.7, 59.5,  51.1,    44,  37.5,  31.5,  26.5,  22.1, 17.9,  14.4,  11.4,   8.6,   6.2,   4.4,     3,   2.2,  2.4,   3.5,   1.7,  -1.3,  -4.2,    -6,  -5.4,  -1.5,     6,  12.6,  13.9,  12.3]
};
const free_field = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0725,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0896,0,0,0,0,0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0967,0,0,0,0,0,0,0,0.0886,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0656,0,0,0,0,0,0.024,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.045,0,0,0,0,0,0,0.029,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1524,0.2,0.2,0.2386,0.3395,0.4,0.437,0.5,0.5287,0.6225,0.7,0.7063,0.7962,0.8,0.8941,0.9,0.9863,1,1.0729,1.1,1.1544,1.2,1.2504,1.3,1.3,1.3,1.3,1.3163,1.4,1.4,1.4,1.4,1.4017,1.4846,1.5,1.5,1.5748,1.6,1.6,1.653,1.7,1.7,1.7487,1.8,1.8341,1.9,1.9,1.9229,2,2,2,2.1,2.1,2.1897,2.2,2.2,2.2674,2.3,2.3,2.3567,2.4,2.4,2.4446,2.5,2.5262,2.6,2.6234,2.7149,2.8,2.8038,2.9011,2.9969,3.0913,3.1845,3.2762,3.3757,3.4649,3.5617,3.657,3.751,3.8,3.8432,3.9332,4,4,4,4.0121,4.1,4.1,4.1,4.0079,4,4,4,4,3.9334,3.9,3.9,3.9,3.8541,3.8,3.8,3.768,3.7,3.6761,3.6,3.6,3.5927,3.5,3.5,3.5,3.5,3.5,3.5761,3.6,3.6,3.6604,3.7,3.7514,3.8,3.8,3.8349,3.9,3.9218,4.0199,4.1123,4.2076,4.3016,4.3985,4.6816,5.0515,5.4222,5.8036,6.1097,6.4656,6.8461,7.3316,7.9083,8.4305,8.9369,9.5105,10.0759,10.6024,11.0027,11.4847,12.0482,12.5152,12.8994,13.2776,13.7381,14.1303,14.5168,14.8858,15.273,15.6547,15.9731,16.2596,16.542,16.7857,17.0111,17.2325,17.3532,17.522,17.6,17.6,17.6,17.6,17.5044,17.41,17.3145,17.2205,17.1255,17.0318,16.9373,16.784,16.6459,16.4536,16.2578,16.1234,15.967,15.8736,15.7552,15.566,15.3879,15.2881,15.0958,14.9064,14.8099,14.6287,14.5201,14.3477,14.2307,14.0709,13.9399,13.7916,13.6514,13.5552,13.4604,13.367,13.2718,13.1766,13.0812,12.9743,12.7916,12.6975,12.602,12.5078,12.3247,12.0547,11.7686,11.4154,11.1009,10.9385,10.7344,10.3998,10.0163,9.6382,9.2957,8.9799,8.6248,8.3404,8.0424,7.674,7.3851,7.0061,6.5307,6.1484,5.7696,5.4662,5.1084,4.7302,4.3498,3.971,3.6455,3.4075,3.1343,2.7917,2.5376,2.3484,2.1585,1.9849,1.9107,2,2,2,2.0894,2.1844,2.2787,2.374,2.6057,2.8265,3.0161,3.2057,3.3954,3.5851,3.8122,4.0967,4.354,4.5651,4.8509,5.1459,5.5259,5.9041,6.1881,6.5643,6.8561,7.1418,7.4251,7.7093,8.0593,8.3192,8.4541,8.5493,8.6437,8.7,8.7336,8.8,8.8,8.8,8.8,8.7926,8.7,8.7,8.6079,8.5133,8.5,8.4237,8.1863,7.968,7.7786,7.4219,6.948,6.4299,5.8212,5.1563,4.4634,3.7042,2.8897,1.9005,1.2368,0.5651,-0.2856,-0.8593,-2.9].map(v=>v-7);

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
        ff.push(free_field[Math.max(0,Math.min(free_field.length-1,ffi))]);
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
        if (!isFinite(dx)) break;
        x -= dx;
    } while (Math.abs(dx) > 0.01);
    return x;
}

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

function setupSmoothingUi() {
    if (typeof doc === "undefined" || !doc || typeof doc.select !== "function") {
        return;
    }
    let smoothLevelInput = doc.select("#smooth-level");
    if (smoothLevelInput && smoothLevelInput.node()) {
        smoothLevelInput.on("change input", function () {
            if (!this.checkValidity()) return;
            smooth_level = +this.value;
            smooth_param = undefined;
            line.curve(smooth_level ? d3.curveNatural : d3.curveCardinal.tension(0.5));
            activePhones.forEach(smoothPhone);
            updatePaths();
        });
    }
}
setupSmoothingUi();

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        avgCurves,
        find_offset,
        smooth,
        smooth_eval,
        smooth_prep
    };
}

// ============================================================
// === Section A: Measurement channels & file loading ===
// === Moved from graphtool.js ===
// ============================================================

// File loading and channel management
const LR = typeof default_channels !== "undefined" ? default_channels
                                                   : ["L","R"];
let getO = i => LR.length>1 ? -1+i*2/(LR.length-1) : 0;
const sampnums = typeof num_samples !== "undefined" ? d3.range(1,num_samples+1)
                                                    : [""];
window._measurementCalibrationPromise = Promise.resolve();
window._measurementCalibrationCurve = null;
function loadFiles(p, callback) {
    let gen = (p._lfGen = (p._lfGen||0) + 1);
    let fetchTxt = base => d3.text(DIR+base+".txt").catch(()=>null);
    let parseFr = f => {
        if (!f) return null;
        try { return Equalizer.interp(f_values, tsvParse(f)); }
        catch (e) { return null; }
    };
    let deliver = function (ch) {
        Promise.resolve(window._measurementCalibrationPromise || Promise.resolve()).then(function () {
            if (gen !== p._lfGen) {
                return;
            }
            callback(applyMeasurementCalibrationToChannels(ch, p));
        });
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
            deliver(ch);
        });

        Promise.all(f).then(function (frs) {
            if (gen !== p._lfGen) return;
            if (!frs.some(x => x !== null)) return;
            let ch = frs.map(parseFr);
            Promise.resolve(window._measurementCalibrationPromise || Promise.resolve()).then(function () {
                if (gen !== p._lfGen) return;
                ch = applyMeasurementCalibrationToChannels(ch, p);
                if (!early) {
                    callback(ch);
                    return;
                }
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
                if (typeof eqAfterMultiSampleRawRefined === "function") {
                    eqAfterMultiSampleRawRefined(p);
                }
            });
        });
        return;
    }

    Promise.all(f).then(function (frs) {
        if (gen !== p._lfGen) return;
        if (!frs.some(f=>f!==null)) return;
        let ch = frs.map(parseFr);
        deliver(ch);
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

// ============================================================
// === Section B: Color & rendering helpers ===
// === Moved from graphtool.js ===
// ============================================================

/** Baseline compensation targets (*Comp Target / *.txt); hidden from graph by default; omitted from EQ target picks. */
function isCompensationTargetNameMatch(p) {
    if (!p) {
        return false;
    }
    let fn = String(p.fileName || "").trim(),
        full = String(p.fullName || "").trim(),
        re = /comp target(\.txt)?$/i;
    return re.test(fn) || re.test(full);
}

/** Dash + stroke width per slot. `w` is the target trace stroke width in SVG user units (absolute, not added to NORMAL/SAMPLE). */
const TARGET_TRACE_DOT_SPECS = [
    { dash: "6 3", w: 2.5, cap: "butt" },
    { dash: "18 9", w: 1.5, cap: "round" },
    { dash: "3 6", w: 2.0, cap: "round" },
    { dash: "2 3", w: 2.0, cap: "round" },
    { dash: "8 6", w: 1.0, cap: "round" },
    { dash: "10 5", w: 1.3, cap: "round" },
    { dash: "14 4 2 4", w: 1.65, cap: "round" },
    { dash: "1 5", w: 1.95, cap: "round" },
    { dash: "8 3 2 3", w: 1.4, cap: "round" },
    { dash: "4 2 1 2 8 2", w: 1.7, cap: "round" },
];
/** Dash styles follow list position: 1st non–comp-target in `activePhones` = slot 0, 2nd = slot 1, … */
function refreshTargetStyleSlots() {
    activePhones.forEach((q) => {
        if (q && q.isTarget) {
            delete q._targetStyleSlotCache;
        }
    });
    let n = 0;
    activePhones.forEach((q) => {
        if (q && q.isTarget && !isCompensationTargetNameMatch(q)) {
            q._targetStyleSlotCache = n++;
        }
    });
    activePhones.forEach((q) => {
        if (q && q.isTarget && isCompensationTargetNameMatch(q)) {
            q._targetStyleSlotCache = 0;
        }
    });
}
/** Graph-only stroke fade for 2nd+ targets (table/key colors unchanged). Tweak here to taste. */
const TARGET_TRACE_OPACITY_SECOND = 0.52;
const TARGET_TRACE_OPACITY_REST = 0.38;
function graphPathOpacityForCurve(c) {
    if (!c || !c.p) {
        return null;
    }
    if (c.p.hide) {
        return 0;
    }
    if (!c.p.isTarget) {
        return null;
    }
    let slot = c.p._targetStyleSlotCache;
    if (!Number.isFinite(slot) || slot <= 0) {
        return null;
    }
    if (slot === 1) {
        return TARGET_TRACE_OPACITY_SECOND;
    }
    return TARGET_TRACE_OPACITY_REST;
}
function targetTraceDotSpecSlotForPhone(phone) {
    if (!phone || !phone.isTarget) {
        return 0;
    }
    if (phone._targetStyleSlotCache != null && Number.isFinite(phone._targetStyleSlotCache)) {
        return phone._targetStyleSlotCache;
    }
    return 0;
}
function targetTraceDotSpecForPhone(phone) {
    if (!phone) {
        return TARGET_TRACE_DOT_SPECS[0];
    }
    let slot = targetTraceDotSpecSlotForPhone(phone);
    return TARGET_TRACE_DOT_SPECS[slot % TARGET_TRACE_DOT_SPECS.length];
}
function targetTraceStrokeWidthFromSpec(spec) {
    let w = spec && typeof spec.w === "number" && Number.isFinite(spec.w)
        ? spec.w
        : TARGET_TRACE_DOT_SPECS[0].w;
    return Math.max(0.02, w);
}
function targetTraceStrokeWidthForPhone(phone) {
    return targetTraceStrokeWidthFromSpec(targetTraceDotSpecForPhone(phone));
}
function applyTargetCurveStrokePattern(pathSel, phone) {
    let spec = targetTraceDotSpecForPhone(phone);
    let cap = spec.cap || "round";
    pathSel
        .style("stroke-dasharray", spec.dash)
        .attr("stroke-linecap", cap)
        .attr("stroke-linejoin", cap === "round" ? "round" : "miter");
}
function clearNonTargetCurveStrokePattern(pathSel) {
    pathSel
        .style("stroke-dasharray", null)
        .attr("stroke-linecap", null)
        .attr("stroke-linejoin", null);
}

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

// ============================================================
// === Section C: Frequency utilities ===
// === Moved from graphtool.js ===
// ============================================================

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
