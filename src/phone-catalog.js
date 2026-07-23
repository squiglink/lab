// ============================================================
// === listAugment.js ===
// ============================================================
function augmentInit() {
    targetBody = document.querySelector('body'),
    augmentStyle = document.createElement('style'),
    augmentCss = `
        :root {
            --icon-play-fill: url("data:image/svg+xml,%3Csvg id='Layer_1' data-name='Layer 1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:%23231f20;fill-rule:evenodd;%7D%3C/style%3E%3C/defs%3E%3Cpath class='cls-1' d='M12,21a9,9,0,1,0-9-9A9,9,0,0,0,12,21ZM10.78,8l5.65,3.14a1,1,0,0,1,0,1.74L10.78,16A1.2,1.2,0,0,1,9,15V9A1.2,1.2,0,0,1,10.78,8Z'/%3E%3C/svg%3E");
            --icon-review-fill: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2.87868 3.87868C2 4.75736 2 6.17157 2 9V15C2 17.8284 2 19.2426 2.87868 20.1213C3.75736 21 5.17157 21 8 21H16C18.8284 21 20.2426 21 21.1213 20.1213C22 19.2426 22 17.8284 22 15V9C22 6.17157 22 4.75736 21.1213 3.87868C20.2426 3 18.8284 3 16 3H8C5.17157 3 3.75736 3 2.87868 3.87868ZM16 8C16.5523 8 17 8.44772 17 9V17C17 17.5523 16.5523 18 16 18C15.4477 18 15 17.5523 15 17V9C15 8.44772 15.4477 8 16 8ZM9 11C9 10.4477 8.55228 10 8 10C7.44772 10 7 10.4477 7 11V17C7 17.5523 7.44772 18 8 18C8.55229 18 9 17.5523 9 17V11ZM13 13C13 12.4477 12.5523 12 12 12C11.4477 12 11 12.4477 11 13V17C11 17.5523 11.4477 18 12 18C12.5523 18 13 17.5523 13 17V13Z' fill='white'/%3E%3C/svg%3E%0A");
            --icon-star-empty: url("data:image/svg+xml,%3Csvg id='Layer_1' data-name='Layer 1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:none;stroke:%23231f20;%7D%3C/style%3E%3C/defs%3E%3Cpath class='cls-1' d='M10.14,6.59c.79-2,1.18-2.94,1.86-2.94s1.07,1,1.86,2.94l0,.09c.45,1.11.67,1.66,1.12,2a4.44,4.44,0,0,0,2.24.5h.21c1.95.18,2.92.27,3.13.89s-.51,1.27-2,2.59l-.48.43c-.73.67-1.1,1-1.27,1.44a1.83,1.83,0,0,0-.08.25,4.49,4.49,0,0,0,.21,1.9l.07.3c.39,1.78.59,2.66.24,3.05a1,1,0,0,1-.48.29c-.49.14-1.2-.44-2.61-1.58a4.65,4.65,0,0,0-1.91-1.22,2.29,2.29,0,0,0-.64,0,4.65,4.65,0,0,0-1.91,1.22c-1.41,1.14-2.12,1.72-2.61,1.58A1,1,0,0,1,6.68,20c-.35-.39-.15-1.27.24-3.05l.07-.3a4.49,4.49,0,0,0,.21-1.9,1.83,1.83,0,0,0-.08-.25c-.17-.44-.54-.77-1.27-1.44l-.48-.43c-1.45-1.32-2.17-2-2-2.59s1.18-.71,3.13-.89h.21A4.44,4.44,0,0,0,9,8.68c.45-.34.67-.89,1.12-2Z'/%3E%3C/svg%3E");
            --icon-star-fill: url("data:image/svg+xml,%3Csvg id='Layer_1' data-name='Layer 1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:%23231f20;stroke:%23231f20;stroke-width:2px;%7D%3C/style%3E%3C/defs%3E%3Cpath class='cls-1' d='M10.31,7.17c.64-1.6,1-2.4,1.48-2.51a1,1,0,0,1,.42,0c.52.11.84.91,1.48,2.51a4.57,4.57,0,0,0,.89,1.68,2.26,2.26,0,0,0,.31.23,4.52,4.52,0,0,0,1.88.37c1.66.15,2.5.22,2.75.7a.94.94,0,0,1,.11.32c.08.53-.53,1.09-1.76,2.2l-.34.31a4.38,4.38,0,0,0-1,1.11,2,2,0,0,0-.2.62,4.42,4.42,0,0,0,.2,1.5l.06.27c.3,1.36.45,2,.26,2.37a1,1,0,0,1-.82.51c-.38,0-.92-.42-2-1.3a4.55,4.55,0,0,0-1.46-1,2.05,2.05,0,0,0-1.1,0,4.55,4.55,0,0,0-1.46,1c-1.08.88-1.62,1.32-2,1.3a1,1,0,0,1-.82-.51c-.19-.33,0-1,.26-2.37l.06-.27a4.42,4.42,0,0,0,.2-1.5,2,2,0,0,0-.2-.62,4.38,4.38,0,0,0-1-1.11l-.34-.31C4.9,11.56,4.29,11,4.37,10.47a.94.94,0,0,1,.11-.32c.25-.48,1.09-.55,2.75-.7a4.52,4.52,0,0,0,1.88-.37,2.26,2.26,0,0,0,.31-.23A4.57,4.57,0,0,0,10.31,7.17Z'/%3E%3C/svg%3E");

        }

        div.phone-item span {
            position: relative;
            z-index: 1;
        }

        article.augment {
            box-sizing: border-box;

            width: calc(350px - 94px);
            margin-top: -6px;
            margin-bottom: 6px;
            border: 1px solid var(--font-color-primary);
            border-top: 6px solid var(--font-color-primary);
            border-top: none;
            border-radius: 0 0 6px 6px;

            max-height: 0px;
            overflow: hidden;
            opacity: 0%;

            animation: augmentOut ease-out 0.1s 1 forwards;
        }

        @media (max-width: 1000px) {
            article.augment {
                width: calc(100vw - 94px);
            }
        }

        div.phone-item[style*="display: none"] + article.augment {
            display: none;
        }

        div.phone-item[style*="border"] + article.augment {
            animation: augmentIn ease-out 0.1s 1 forwards;
        }

        @keyframes augmentIn {
            0% {
                max-height: 0px;
                opacity: 0%;
            }
            100% {
                max-height: 200px;
                opacity: 100%;
            }
        }

        @keyframes augmentOut {
            0% {
                max-height: 200px;
                opacity: 100%;
            }
            100% {
                max-height: 0px;
                opacity: 0%;
            }
        }

        article.augment a {
            color: var(--font-color-primary);
        }

        div.augment-rank {
            display: flex;

            padding: 11px 11px;

            background-color: var(--font-color-primary);
            color: var(--font-color-secondary);
        }

        div.augment-price {
            margin-left: auto;

            font-size: 16px;
            line-height: 1em;
        }

        div.augment-review {
            padding: 11px 11px;
        }

        div.augment-review a {
            display: flex;
            font-size: 12px;
            line-height: 18px;
        }

        div.augment-review a:before {
            content: '';
            display: block;
            flex: 18px 0 0;
            height: 18px;
            margin: 0 8px 0 0;
            background-color: currentColor;
            mask: var(--icon-review-fill);
            -webkit-mask: var(--icon-review-fill);
            mask-size: 18px;
            mask-repeat: no-repeat;
            mask-position: center;
            -webkit-mask-size: 18px;
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-position: center;
        }

        div.augment-review a.video:before {
            mask: var(--icon-play-fill);
            -webkit-mask: var(--icon-play-fill);
        }

        div.augment-review + div.augment-shop {
            border-top: 1px solid var(--background-color-contrast)
        }

        div.augment-shop {
            padding: 11px 11px;
        }

        div.augment-shop a {
            display: flex;
            font-size: 12px;
            line-height: 18px;
        }

        div.augment-shop a:before {
            content: '';
            display: block;
            flex: 18px 0 0;
            height: 18px;
            margin: 0 8px 0 0;
            background-color: currentColor;
            mask: var(--icon-new-tab);
            -webkit-mask: var(--icon-new-tab);
            mask-size: 14px;
            mask-repeat: no-repeat;
            mask-position: center;
            -webkit-mask-size: 14px;
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-position: center;
        }

        div.augment-score-unknown {
            font-size: 16px;
        }

        div.augment-stars {
            display: flex;
            align-items: flex-end;
        }

        div.augment-stars span {
            box-sizing: border-box;
            display: block;
            width: 18px;
            height: 18px;

            background-color: currentColor;

            mask: var(--icon-star-empty);
            -webkit-mask: var(--icon-star-empty);
            mask-size: 18px;
            mask-repeat: no-repeat;
            mask-position: center;
            -webkit-mask-size: 18px;
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-position: center;
        }

        div.augment-stars[data-score="5"] span {
            mask: var(--icon-star-fill);
            -webkit-mask: var(--icon-star-fill);
        }

        div.augment-stars[data-score="4"] span:nth-last-child(1n + 2) {
            mask: var(--icon-star-fill);
            -webkit-mask: var(--icon-star-fill);
        }

        div.augment-stars[data-score="3"] span:nth-last-child(1n + 3) {
            mask: var(--icon-star-fill);
            -webkit-mask: var(--icon-star-fill);
        }

        div.augment-stars[data-score="2"] span:nth-last-child(1n + 4) {
            mask: var(--icon-star-fill);
            -webkit-mask: var(--icon-star-fill);
        }

        div.augment-stars[data-score="1"] span:nth-last-child(1n + 5) {
            mask: var(--icon-star-fill);
            -webkit-mask: var(--icon-star-fill);
        }

        div.augment-stars[data-score="0"] span {
            opacity: 0.3;
        }

        div.augment-stars[data-score="0"]:after {
            content: 'TBD';

            margin-left: 6px;

            font-size: 10px;
            line-height: 18px;

            opacity: 0.3;
        }

        /*
        5-stars */

        div.scroll div.phone-item[style*="border"][data-score="5"] {
            color: var(--font-color-primary);

            border: 1px solid #ffeb40 !important;
            background-color: #ffeb40 !important;
            background: linear-gradient(-90deg, #ffeb40, #fff7b2) !important;
        }

        div.scroll div.phone-item[style*="border"][data-score="5"] span {
            padding: 11px 11px;
        }

        div.scroll div.phone-item[style*="border"] {
            background-color: var(--font-color-primary) !important;
        }

        div.scroll div.phone-item[style*="border"][data-score="5"] div.phone-item-add span.remove:before {
            background-color: var(--font-color-primary);
        }

        div.scroll div[style*="border"].phone-item[data-score="5"] + article {
            border-color: #ffeb40;
        }

        div.scroll div[style*="border"].phone-item[data-score="5"] + article div.augment-rank {
            color: var(--font-color-primary);

            background-color: #ffeb40 !important;
            background: linear-gradient(-90deg, #ffeb40, #fff7b2) !important;
        }
    `,
    isUs = window.navigator.language.split('-').pop() === 'US' ? 1 : 0;
    
    augmentStyle.textContent = augmentCss;
    targetBody.append(augmentStyle);
}
augmentInit();

function augmentList(phone) {
    let phoneName = phone.fullName,
        phoneListItem = document.querySelector('div[name="'+ phoneName +'"]'),
        phoneListItemAugmented = phoneListItem.getAttribute('data-augment'),
        reviewScore = phone.reviewScore ? phone.reviewScore.length === 1 && typeof parseInt(phone.reviewScore) === 'number' ? parseInt(phone.reviewScore) : phone.reviewScore : false,
        reviewStars = !reviewScore.length && reviewScore >= 0 && reviewScore <= 5 ? true : false,
        reviewLink = phone.reviewLink,
        reviewLinkLabel = reviewLink ? reviewLink.split('http.').pop().split('/').shift() : false,
        reviewLinkVideo = reviewLink ? reviewLink.includes('youtube') ? 1 : 0 : 0,
        shopLink = phone.shopLink,
        shopLinkAmazon = shopLink ? shopLink.indexOf('amazon') > 0 ? true : shopLink.indexOf('amzn') > 0 ? true : false : false,
        shopLinkAli = shopLink ? shopLink.indexOf('aliexpress') > 0 ? true : false : false,
        shopLinkLabel = shopLink ? shopLinkAmazon ? 'Amazon' : shopLinkAli ? 'AliExpress' : shopLink.replace('www.','').split('://').pop().split('/').shift() : false,
        price = phone.price;
    
    if (!phoneListItemAugmented) {
        let agumentsContainer = document.createElement('article'),
            augmentsRow1 = document.createElement('div'),
            augmentsRow1Col1 = document.createElement('div'),
            augmentsRow1Col2 = document.createElement('div'),
            augmentsStar1 = document.createElement('span'),
            augmentsStar2 = document.createElement('span'),
            augmentsStar3 = document.createElement('span'),
            augmentsStar4 = document.createElement('span'),
            augmentsStar5 = document.createElement('span'),
            augmentsRow2 = document.createElement('div'),
            augmentsRow3 = document.createElement('div'),
            augmentsReviewLink = document.createElement('a'),
            augmentsShopLink = document.createElement('a');
        
        phoneListItem.setAttribute('data-augment', '1');

        agumentsContainer.className = "augment";
                
        augmentsRow1.append(augmentsRow1Col1);
        augmentsRow1.append(augmentsRow1Col2);
        augmentsRow1Col2.textContent = price;
        augmentsRow1Col2.className = "augment-price";
        
        if (typeof reviewScore === 'number' && reviewStars) {
            agumentsContainer.append(augmentsRow1);
            augmentsRow1.className = "augment-rank";
            
            augmentsRow1Col1.setAttribute('data-score', reviewScore);
            augmentsRow1Col1.append(augmentsStar1);
            augmentsRow1Col1.append(augmentsStar2);
            augmentsRow1Col1.append(augmentsStar3);
            augmentsRow1Col1.append(augmentsStar4);
            augmentsRow1Col1.append(augmentsStar5);
            augmentsRow1Col1.className = "augment-stars";
        } else if (reviewScore && !reviewStars) {
            agumentsContainer.append(augmentsRow1);
            augmentsRow1.className = "augment-rank";
            
            augmentsRow1Col1.className = "augment-score augment-score-unknown";
            augmentsRow1Col1.textContent = reviewScore;
        }
        
        if (reviewLink) {
            augmentsRow2.append(augmentsReviewLink);
            augmentsReviewLink.setAttribute('target', '_blank');
            augmentsRow2.className = "augment-review";
            
            if (reviewLinkVideo) {
                augmentsReviewLink.classList.add('video');
            }
            augmentsReviewLink.setAttribute('href', reviewLink);
            augmentsReviewLink.textContent = 'Review';
            if (analyticsEnabled) {
                augmentsReviewLink.addEventListener('click', function() {
                    pushPhoneTag("clicked_review", phone);
                });
            }

            agumentsContainer.append(augmentsRow2);
        }
        
        if (shopLink) {
            augmentsRow3.append(augmentsShopLink);
            augmentsRow3.className = "augment-shop";
            augmentsShopLink.setAttribute('target', '_blank');
            
            augmentsShopLink.setAttribute('href', shopLink);
            augmentsShopLink.textContent = shopLinkLabel;
            if (analyticsEnabled) {
                augmentsShopLink.addEventListener('click', function() {
                    pushPhoneTag("clicked_store", phone);
                });
            }

            agumentsContainer.append(augmentsRow3);
        }
        
        phoneListItem.parentNode.insertBefore(agumentsContainer, phoneListItem.nextSibling);
    }
}

// ============================================================
// === src/phones/model.js ===
// ============================================================
/* Phone catalog object normalization.
 * Kept as classic script globals so existing graph code can call these without module loading. */
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

// ============================================================
// === src/phones/phone-book.js ===
// ============================================================
/* Phone-book fetch helper. This is deliberately tiny for now; selector/table UI can move here next. */
function loadPhoneBookCatalog() {
    let url = typeof PHONE_BOOK !== "undefined" ? PHONE_BOOK
        : DIR+"phone_book.json?"+ new Date().getTime();
    return d3.json(url);
}

// ============================================================
// === src/phones/selector.js ===
// ============================================================
/* Brand/model selector setup for the left catalog panel. */
function initPhoneSelectorUi(options) {
    options = options || {};
    let brands = options.brands || [];
    let allPhones = options.allPhones || [];
    let targetGroups = options.targets;
    let isInit = options.isInit || (_ => false);
    let inits = options.inits || [];
    let showPhone = options.showPhone;
    let currentBrands = [];

    function setClicks(fn) { return function (elt) {
        elt .on("mousedown", () => d3.event.preventDefault())
            .on("click", p => fn(p,!d3.event.ctrlKey))
            .on("auxclick", p => d3.event.button===1 ? fn(p,0) : 0);
    }; }

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

    let brandSel = doc.select("#brands").selectAll()
        .data(brands).join("div")
        .text(b => b.name + (b.suffix?" "+b.suffix:""))
        .call(setClicks(setBrand));

    let bg = (h,fn) => function (p) {
        d3.select(this).style("background", fn(p));
        (p.objs||[p]).forEach(q=>hl(q,h));
    };
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
                phoneDiv.append("div")
                    .attr("class", "phone-item-add")
                    .on("click", p => {
                        d3.event.stopPropagation();
                        showPhone(p, 0);
                    });
           });
    };
    updatePhoneSelect();

    if (targetGroups) {
        let b = window.brandTarget = { name:"Targets", active:false },
            ph = t => ({
                isTarget:true, brand:b,
                dispName:t, phone:t, fullName:t+" Target", fileName:t+" Target"
            });
        d3.select(".manage").insert("div",".manageTable")
            .attr("class", "targets collapseTools");
        let l = (text,c) => s => s.append("div").attr("class","targetLabel").append("span").text(text);
        let ts = b.phoneObjs = doc.select(".targets").call(l("Targets"))
            .selectAll().data(targetGroups).join("div").call(l(t=>t.type))
            .style("flex-grow", t => t.files.length)
            .attr("class","targetClass")
            .attr("data-target-type", t => t.type)
            .selectAll().data(t=>t.files.map(ph))
            .join("div").text(t=>t.dispName).attr("class","target")
            .call(setClicks(showPhone))
            .data();
        ts.forEach((t,i) => {
            t.id = i-ts.length;
            if (isInit(t.fileName)) inits.push(t);
        });
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

    return {
        brandSelection: brandSel,
        currentBrands: () => currentBrands.slice()
    };
}

// ============================================================
// === src/phones/table-core.js ===
// ============================================================
/* Pure helpers for the manage-table row order. Kept browser-agnostic so they can be unit-tested. */
function computeManageTableBasePhoneOrder(activePhones, phonesClusteredTargetsFirst, initPhoneOrderIndex, initOrderRankForPhone, phoneManageIdentity) {
    let curvesAll = [];
    (activePhones || []).forEach(p => {
        if (p && Array.isArray(p.activeCurves)) {
            curvesAll.push(...p.activeCurves);
        }
    });
    let phoneOrder = [],
        seenP = new Set();
    curvesAll.forEach(c => {
        if (!c || !c.p || seenP.has(c.p)) {
            return;
        }
        seenP.add(c.p);
        phoneOrder.push(c.p);
    });
    let clustered = phonesClusteredTargetsFirst(phoneOrder);
    if (!initPhoneOrderIndex.size) {
        return clustered;
    }
    let sortSeg = (seg) => seg.slice().sort((a, b) => {
        let ra = initOrderRankForPhone(a),
            rb = initOrderRankForPhone(b);
        if (ra == null) {
            ra = 1e6 + phoneManageIdentity(a) * 1e-6;
        }
        if (rb == null) {
            rb = 1e6 + phoneManageIdentity(b) * 1e-6;
        }
        if (ra !== rb) {
            return ra - rb;
        }
        return phoneManageIdentity(a) - phoneManageIdentity(b);
    });
    return sortSeg(clustered.filter((p) => p && p.isTarget))
        .concat(sortSeg(clustered.filter((p) => p && !p.isTarget)));
}

function computeManageTableRows(phoneOrder, phoneManageIdentity) {
    let rows = [];
    (phoneOrder || []).forEach(p => {
        let pid = phoneManageIdentity(p),
            ac = p.activeCurves || [];
        if (p.samp && ac.length > 1) {
            ac.forEach((curve, i) => {
                rows.push({
                    p,
                    sub: i,
                    key: pid + "\t" + String(curve.id) + "\ts" + i
                });
            });
        } else {
            let cid = ac[0] ? String(ac[0].id) : String(p.fileName || p.dispName || "");
            rows.push({
                p,
                sub: null,
                key: pid + "\t" + cid + "\tm"
            });
        }
    });
    return rows;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        computeManageTableBasePhoneOrder,
        computeManageTableRows
    };
}

// ============================================================
// === src/phones/table.js ===
// ============================================================
/* Manage-table rendering and row ordering live here so graphtool.js stays focused on graph behavior. */
function getManageTableBasePhoneOrder() {
    return computeManageTableBasePhoneOrder(
        activePhones,
        phonesClusteredTargetsFirst,
        initPhoneOrderIndex,
        initOrderRankForPhone,
        phoneManageIdentity
    );
}

function manageTableRows() {
    return computeManageTableRows(getManageTableBasePhoneOrder(), phoneManageIdentity);
}

function updateChannels(p, ch, comp) {
    if (comp) {
        for (let i = 0; i < ch.length; i++) {
            ch[i] = ch[i].map((d, j) => [d[0], d[1] - comp[Math.min(j, comp.length - 1)]]);
        }
    }
    p.channels = ch;
    p.rawChannels = ch;
    if (p.activeCurves.length > 1) {
        for (let i = 0; i < p.activeCurves.length; i++) {
            p.activeCurves[i].l = ch[i];
            p.activeCurves[i].p = p;
        }
    } else {
        p.activeCurves[0].l = avgCurves(ch);
    }
    normalizePhone(p);
    p.smooth = null;
    smoothPhone(p);
    updatePaths();
}

function handleComp(p, opt) {
    if (!p.preComp) p.preComp = p.rawChannels;
    let ch = [...p.preComp];
    if (opt !== "<no comp>") {
        let compTarget = window.brandTarget.phoneObjs.find(t => t.dispName === opt);
        p.comp = opt;
        if (!compTarget || !compTarget.rawChannels) {
            loadFiles(compTarget, function (tch) {
                compTarget.rawChannels = tch;
                let comp = compTarget.rawChannels[0].map(d => d[1]);
                updateChannels(p, ch, comp);
            });
        } else {
            let comp = compTarget.rawChannels[0].map(d => d[1]);
            updateChannels(p, ch, comp);
        }
    } else {
        p.comp = opt;
        updateChannels(p, ch);
    }
}

function updatePhoneTable(trigger) {
    let rows = manageTableRows();
    let selTab = document.querySelector("div.select");
    let onEqManageTab = extraEnabled && extraEQEnabled && selTab
        && selTab.getAttribute("data-selected") === "extra";
    if (onEqManageTab && typeof window.__getEqParametricFocusContext === "function") {
        let ctx = window.__getEqParametricFocusContext();
        if (ctx && ctx.showSet) {
            rows = rows.filter(r => ctx.showSet.has(r.p));
            let rank = (p) => {
                if (p === ctx.targetP) {
                    return 0;
                }
                if (p === ctx.modelP) {
                    return 1;
                }
                if (p === ctx.eqP) {
                    return 2;
                }
                return 3;
            };
            rows.sort((a, b) => {
                let d = rank(a.p) - rank(b.p);
                if (d !== 0) {
                    return d;
                }
                /* Stable tie-break: targets / models cluster */
                let ta = a.p.isTarget ? 0 : 1;
                let tb = b.p.isTarget ? 0 : 1;
                if (ta !== tb) {
                    return ta - tb;
                }
                return String(a.p.fullName || "").localeCompare(String(b.p.fullName || ""));
            });
            rows = rows.map((r) => {
                if (r.sub != null && r.sub !== 0) {
                    return r;
                }
                let out = { ...r };
                delete out.eqManageDispOverride;
                if (ctx.targetP && r.p === ctx.targetP && !r.p.isTarget) {
                    let lab = (r.p.dispName != null && String(r.p.dispName).trim() !== "")
                        ? String(r.p.dispName)
                        : r.p.fullName;
                    out.eqManageDispOverride = "Target: " + lab;
                }
                return out;
            });
        } else {
            rows = [];
        }
    }
    let trJoin = table.selectAll("tr").data(rows, r => r.key);
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
    if (typeof compTargets !== "undefined" && compTargets && compTargets.length) {
        let cSel = f.filter(r => !r.p.isTarget).append("td").attr("class", "comp").append("select");
        cSel.selectAll("option").data(["<no comp>", ...compTargets])
            .enter().append("option").text(d => d);
        cSel.property("value", r => r.p.comp || "<no comp>");
        cSel.on("change", function(r) { handleComp(r.p, this.value); });
    }
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
        if (p.isTarget && isCompensationTargetNameMatch(p)) {
            p.compTargetUserToggledHide = true;
        }
        if (labelsShown) {
            clearLabels();
            drawLabels();
        }
    }
    window.__tableToggleHide = toggleHide;
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
    /* Replacing `.phonename` text while the variant picker is open clears the picker DOM and leaves
       `selectInProgress` true (blur may not fire) — fixes double-click + blank key/channel column. */
    enter.merge(trJoin).filter(isManageMainRow).each(function (r) {
        let p = r.p;
        if (p.selectInProgress) {
            return;
        }
        d3.select(this).select("td.item-line .phonename")
            .text(r.eqManageDispOverride != null ? r.eqManageDispOverride : p.dispName);
    });
}

// ============================================================
// === src/phones/variants.js ===
// ============================================================
/* Manage-table variant, key, and color controls.
 * This sits next to the table layer because it is the row-specific UI for phones/variants. */
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
    let n = t.append("div").attr("class","phonename")
        .text(r => r.eqManageDispOverride != null ? r.eqManageDispOverride : r.p.dispName);
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
        .filter((q) => q != null && q.id !== undefined)
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

// ============================================================
// === src/phones/actions.js ===
// ============================================================
/* Phone actions: add-button state, show/hide/remove flows, and bulk sample removal. */
let addPhoneSet = false, // Whether add phone button was clicked
    addPhoneLock = false;
function setAddButton(a) {
    if (a && cantCompare(activePhones)) return false;
    if (addPhoneSet !== a) {
        addPhoneSet = a;
        doc.select(".addPhone").classed("selected", a)
            .classed("locked", addPhoneLock &= a);
    }
    return true;
}
function setupAddPhoneUi() {
    if (typeof doc === "undefined" || !doc || typeof doc.select !== "function") {
        return;
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
}
setupAddPhoneUi();

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
        /* User measurement clones (`USRMT_*`) always carry in-memory FR; never fetch from DIR. */
        if (p.isTarget && p.userTargetFromMeasurement && /^USRMT_/i.test(String(p.fileName || ""))) {
            return;
        }
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
    if (p.isTarget && isCompensationTargetNameMatch(p) && !p.compTargetUserToggledHide) {
        p.hide = true;
    }
    if (exclusive) {
        /* Must use removePhone (not only active=false) so EQ children / p.eq links clear and
           extra-EQ reset runs — the old filter-assignment left orphan EQ traces on the graph. */
        activePhones.filter((q) => !keep(q)).forEach(removePhone);
        activePhones.forEach((q) => {
            if (keep(q)) {
                q.active = true;
            }
        });
        if (baseline.p && !baseline.p.active) {
            setBaseline(baseline0, 1);
        }
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
        .filter((p) => p != null && p.id !== undefined)
        .call(setPhoneTr);
    if (extraEnabled && extraEQEnabled && !p.isTarget && p.fullName && !p.fullName.match(/ EQ$/)) {
        let intent = (typeof window !== "undefined" && window.__eqCoord.modelIntent)
            ? String(window.__eqCoord.modelIntent).trim()
            : "";
        /* Measurements added only as EQ *target* (Target dropdown » Measurements) are still
           !isTarget — do not overwrite eqLastGraphModelForEq or the model dropdown steals the
           target and updateEQPhoneTargetSelect drops it from optgroups. */
        let bypass = (typeof window !== "undefined" && window.__eqCoord.modelStickyBypass)
            ? String(window.__eqCoord.modelStickyBypass).trim()
            : "";
        let suppressModelStickyForTargetMeas = !!(bypass && bypass === p.fullName);
        /* Avoid late async showPhone() for the *previous* model overwriting EQ focus while a new
           model is loading from the EQ dropdown (eqDropdownModelIntent). */
        /* Parallel init loads can finish out of order; do not let later fetches stomp sticky during
           bulk config/share/embed once another model is already on-graph. */
        let otherModels = activePhones.filter((q) =>
            q && q !== p && !q.isTarget && q.fullName && !String(q.fullName).match(/ EQ$/));
        let initBulk = trigger === "config" || trigger === "share" || trigger === "embed";
        if (!suppressModelStickyForTargetMeas && (!intent || p.fullName === intent)
                && !(initBulk && otherModels.length > 0)) {
            window.__eqCoord.lastGraphModel = p.fullName;
        }
        if (typeof window !== "undefined" && suppressModelStickyForTargetMeas) {
            window.__eqCoord.modelStickyBypass = "";
        }
    }
    if (extraEnabled && extraEQEnabled && p.isTarget && p.fullName && !isCompensationTargetNameMatch(p)) {
        /* init `inits.map(... showPhone(..., initMode))` can load several targets in parallel. Each
           async showPhone() would otherwise stomp `eqLastGraphTargetForEq` — whichever network fetch
           completes last “wins” instead of config/init order. Skip sticky updates when this target is
           joining one or more targets already on-graph during bulk init (config/share/embed). */
        let otherTargets = activePhones.filter((q) =>
            q && q !== p && q.isTarget && q.fullName && !isCompensationTargetNameMatch(q));
        let initBulk = trigger === "config" || trigger === "share" || trigger === "embed";
        if (!(initBulk && otherTargets.length > 0)) {
            window.__eqCoord.lastGraphTarget = p.fullName;
        }
    }
    if (extraEnabled && extraEQEnabled && typeof window.updateEQPhoneSelect === "function") {
        window.updateEQPhoneSelect();
        applyParametricEqGraphTraceFocus();
        /* Parametric focus sets base opacity on paths; updatePaths() already ran updateEqTraceOpacity
           earlier in showPhone — this pass must run again after applyParametric or parent/EQ A-B dims
           stay cleared until something else (e.g. live A-B toggle) calls updateEqTraceOpacity. */
        updateEqTraceOpacity();
        /* manageTable Eq-tab filter reads getParametricEqTraceFocusContext — must run *after*
           sticky + dropdown reconcile (otherwise an extra target click leaves the old row up). */
        updatePhoneTable(trigger);
    }
    /* Variant picker: focus after EQ/dropdown pass so a second updatePhoneTable does not wipe picker
       DOM (was breaking first open + blanking the channel cell). Same for Models tab as EQ tab. */
    if (!suppressVariant && p.fileNames && !p.copyOf) {
        let openVariantPickerLater = () => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    let vNode = table.selectAll("tr")
                        .filter(r => r.p === p && (r.sub === null || r.sub === 0))
                        .select(".variants").node();
                    if (!vNode) {
                        return;
                    }
                    try {
                        vNode.focus({ preventScroll: true });
                    } catch (err) {
                        try {
                            vNode.focus();
                        } catch (e2) { /* noop */ }
                    }
                });
            });
        };
        openVariantPickerLater();
    }
    if (p._eqNudgeApplyFromSelect && typeof window.eqOnPhoneDataReadyForEqUi === "function") {
        window.eqOnPhoneDataReadyForEqUi(p);
        p._eqNudgeApplyFromSelect = false;
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

function removePhone(p, opts) {
    opts = opts || {};
    let hadEqChild = Boolean(!p.isTarget && p.eq);
    /* Removing the EQ curve row (X on manage table) clears p.eqParent here before hadEqChild-style
       cleanup; that path did not run eqResetParametricAfterBaseModelRemoved — filters stayed stale.
       Skip when addOrUpdatePhone() replaces the same synthetic "… EQ" row during applyEQExec (old
       object still has eqParent → would wrongly full-reset parametric UI). */
    let removingDedicatedEqTrace = !opts.internalEqPhoneReplace
        && Boolean(!p.isTarget && p.eqParent);
    /* Bump load generation so any in-flight loadFiles() for this pool object bails before
       calling showPhone() — avoids the previous EQ model flashing back when its fetch
       completes after the user switched away. */
    p._lfGen = (p._lfGen || 0) + 1;
    if (p.eqParent) {
        p.eqParent.eq = null;
        p.eqParent = null;
    }
    if (p.eq) {
        let eqP = p.eq;
        p.eq = null;
        eqP.eqParent = null;
        eqP.active = false;
    }
    p.active = p.pin = false; nextPN = null;
    if (typeof window !== "undefined" && p.fullName) {
        if (window.__eqCoord.pendingModel === p.fullName) {
            window.__eqCoord.pendingModel = "";
        }
        if (window.__eqCoord.pendingTarget === p.fullName) {
            window.__eqCoord.pendingTarget = "";
        }
        if (window.__eqCoord.modelStickyBypass === p.fullName) {
            window.__eqCoord.modelStickyBypass = "";
        }
    }
    if (p.userTargetFromMeasurement && typeof window !== "undefined" && window.brandTarget
            && Array.isArray(window.brandTarget.phoneObjs)) {
        let i = window.brandTarget.phoneObjs.indexOf(p);
        if (i >= 0) {
            window.brandTarget.phoneObjs.splice(i, 1);
        }
    }
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
    if (extraEnabled && extraEQEnabled && typeof window.updateEQPhoneSelect === "function") {
        window.updateEQPhoneSelect();
        if ((hadEqChild || removingDedicatedEqTrace)
                && typeof window.eqResetParametricAfterBaseModelRemoved === "function") {
            /* EQ model dropdown: removing the previous base model already ran filter reset + apply
               in the select handler. eqReset would run applyEQ again, clear eqDropdownModelIntent,
               and produce an extra OG frame — targets never hit this path (hadEqChild is false). */
            let skipEqResetForModelHandoff = false;
            let selEq = "";
            let intentEq = "";
            if (!p.isTarget && p.fullName && !String(p.fullName).match(/ EQ$/)) {
                let eqSel = document.querySelector("div.extra-eq div.select-eq-phone-model-target select[name='phone']")
                    || document.querySelector("div.extra-eq select[name='phone']");
                selEq = eqSel && String(eqSel.value || "").trim();
                intentEq = (typeof window !== "undefined" && window.__eqCoord.modelIntent)
                    ? String(window.__eqCoord.modelIntent).trim()
                    : "";
                if ((selEq && selEq !== p.fullName)
                        || (intentEq && intentEq !== p.fullName)) {
                    skipEqResetForModelHandoff = true;
                }
            }
            if (skipEqResetForModelHandoff) {
                applyParametricEqGraphTraceFocus();
                updateEqTraceOpacity();
            } else {
                window.eqResetParametricAfterBaseModelRemoved();
            }
        } else {
            /* updatePaths() ran applyParametricEqGraphTraceFocus *before* updateEQPhoneSelect()
               rebuilt the EQ target dropdown; refresh focus once selections match remaining graph. */
            applyParametricEqGraphTraceFocus();
            updateEqTraceOpacity();
        }
        updatePhoneTable();
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
    if (extraEnabled && extraEQEnabled && typeof window.updateEQPhoneSelect === "function") {
        window.updateEQPhoneSelect();
    }
}
