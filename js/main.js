// ============================================
// 浠欎緺鐜勫够AI - Main JavaScript
// ============================================

document.addEventListener("DOMContentLoaded", function() {
    // ========== COS Upload (Web Crypto API, no SDK) ==========
    var COS_KEY = "cos_config_site";
    function loadCos() {
        try { var s = localStorage.getItem(COS_KEY); return s ? JSON.parse(s) : null; } catch(e) { return null; }
    }
    function saveCos(cfg) {
        try { localStorage.setItem(COS_KEY, JSON.stringify(cfg)); } catch(e) {}
    }
    function canCos() {
        var c = loadCos();
        return c && c.secretId && c.secretKey && c.bucket && c.region;
    }
    function getCosUrl() {
        var c = loadCos();
        return c ? "https://" + c.bucket + ".cos." + c.region + ".myqcloud.com" : null;
    }
    // Web Crypto API COS 鐩磋繛涓婁紶
    function hexBuf(buf) {
        return Array.from(new Uint8Array(buf)).map(function(b) {
            return b.toString(16).padStart(2, "0");
        }).join("");
    }
    function enc(s) { return new TextEncoder().encode(s); }
    function encPath(p) {
        return p.split("/").map(function(s) { return encodeURIComponent(s); }).join("/");
    }
    // ====== SHA-1 (works on Uint8Array, no string conversion) ======
    function sha1Raw(bytes) {
        var ml = bytes.length * 8;
        var padZ = (56 - (bytes.length + 1) % 64 + 64) % 64;
        var p = new Uint8Array(bytes.length + 1 + padZ + 8);
        p.set(bytes); p[bytes.length] = 0x80;
        var dv = new DataView(p.buffer);
        dv.setUint32(p.length - 8, ml / 0x100000000 | 0, false);
        dv.setUint32(p.length - 4, ml | 0, false);
        var H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
        for (var blk = 0; blk < p.length; blk += 64) {
            var w = new Array(80);
            for (var t = 0; t < 16; t++) w[t] = dv.getUint32(blk + t * 4, false);
            for (t = 16; t < 80; t++) { var x = w[t-3] ^ w[t-8] ^ w[t-14] ^ w[t-16]; w[t] = (x << 1) | (x >>> 31); }
            var a = H[0], b2 = H[1], c2 = H[2], d2 = H[3], e2 = H[4];
            for (t = 0; t < 80; t++) {
                var f, k;
                if (t < 20) { f = (b2 & c2) | (~b2 & d2); k = 0x5A827999; }
                else if (t < 40) { f = b2 ^ c2 ^ d2; k = 0x6ED9EBA1; }
                else if (t < 60) { f = (b2 & c2) | (b2 & d2) | (c2 & d2); k = 0x8F1BBCDC; }
                else { f = b2 ^ c2 ^ d2; k = 0xCA62C1D6; }
                var temp = ((a << 5) | (a >>> 27)) + f + e2 + k + w[t] | 0;
                e2 = d2; d2 = c2; c2 = (b2 << 30) | (b2 >>> 2); b2 = a; a = temp;
            }
            H[0] = (H[0] + a) | 0; H[1] = (H[1] + b2) | 0; H[2] = (H[2] + c2) | 0; H[3] = (H[3] + d2) | 0; H[4] = (H[4] + e2) | 0;
        }
        var r = new DataView(new Uint8Array(20).buffer);
        r.setUint32(0, H[0], false); r.setUint32(4, H[1], false); r.setUint32(8, H[2], false);
        r.setUint32(12, H[3], false); r.setUint32(16, H[4], false);
        return new Uint8Array(r.buffer.slice(0, 20));
    }
    function concatBytes(a, b) {
        var r = new Uint8Array(a.length + b.length);
        r.set(a); r.set(b, a.length); return r;
    }
    function bytesToHexStr(b) {
        var s = "";
        for (var i = 0; i < b.length; i++) s += (b[i]>>4).toString(16) + (b[i]&15).toString(16);
        return s;
    }
    function hexToRawBytes(h) {
        var b = new Uint8Array(h.length / 2);
        for (var i = 0; i < h.length; i += 2) b[i/2] = parseInt(h.substr(i, 2), 16);
        return b;
    }
    function hmacBytes(keyBytes, msgBytes) {
        var k = keyBytes;
        if (k.length > 64) k = sha1Raw(k);
        if (k.length < 64) { var p = new Uint8Array(64); p.set(k); k = p; }
        var ipad = new Uint8Array(64), opad = new Uint8Array(64);
        for (var i = 0; i < 64; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
        return bytesToHexStr(sha1Raw(concatBytes(opad, sha1Raw(concatBytes(ipad, msgBytes)))));
    }
    function hmacStr(keyStr, msgStr) {
        return hmacBytes(enc(keyStr), enc(msgStr));
    }
    function jsSHA1(s) {
        return bytesToHexStr(sha1Raw(enc(s)));
    }
    function buildCosAuth(method, path, cfg, keyTime, contentType) {
        var host = cfg.bucket + ".cos." + cfg.region + ".myqcloud.com";
        var m = method.toLowerCase();
        var ct = contentType || "application/octet-stream";
        var headers = "content-type=" + encodeURIComponent(ct) + "&host=" + host;
        var hs = m + "\n" + path + "\n\n" + headers + "\n";
        var hs1 = jsSHA1(hs);
        var sts = "sha1\n" + keyTime + "\n" + hs1 + "\n";
        var sk = hmacStr(cfg.secretKey, keyTime);
        var sig = hmacBytes(hexToRawBytes(sk), enc(sts));
        return "q-sign-algorithm=sha1&q-ak=" + cfg.secretId +
            "&q-sign-time=" + keyTime + "&q-key-time=" + keyTime +
            "&q-header-list=content-type;host&q-url-param-list=&q-signature=" + sig;
    }
    function upCos(file, key) {
        var cfg = loadCos();
        if (!cfg) return Promise.reject(new Error("COS \u672a\u914d\u7f6e"));
        var host = cfg.bucket + ".cos." + cfg.region + ".myqcloud.com";
        var cPath = "/" + encPath(key);
        var url = "https://" + host + cPath;
        var now = Math.floor(Date.now() / 1000);
        var kt = now + ";" + (now + 86400);
        
        // LOGGING: 鎵撳嵃绛惧悕杩囩▼鐨勬瘡涓楠?        var ct = file.type || "application/octet-stream";
        var m = "put";
        var headers = "content-type=" + encodeURIComponent(ct) + "&host=" + host;
        var hs = m + "\n" + cPath + "\n\n" + headers + "\n";
        var hs1 = jsSHA1(hs);
        var sts = "sha1\n" + kt + "\n" + hs1 + "\n";
        var sk = hmacStr(cfg.secretKey, kt);
        var sig = hmacBytes(hexToRawBytes(sk), enc(sts));
        var auth = "q-sign-algorithm=sha1&q-ak=" + cfg.secretId +
            "&q-sign-time=" + kt + "&q-key-time=" + kt +
            "&q-header-list=content-type;host&q-url-param-list=&q-signature=" + sig;
        
        console.log("=== COS DEBUG ===");
        console.log("URL:", url);
        console.log("HttpString:", JSON.stringify(hs));
        console.log("SHA1(HttpString):", hs1);
        console.log("StringToSign:", JSON.stringify(sts));
        console.log("SignKey:", sk);
        console.log("Signature:", sig);
        console.log("Authorization:", auth);
        console.log("=================");
        
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("PUT", url, true);
            xhr.setRequestHeader("Authorization", auth);
            xhr.setRequestHeader("Content-Type", ct);
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(url + "?t=" + now);
                } else {
                    var errText = xhr.responseText || "unknown error";
                    try { var p = new DOMParser(); var xd = p.parseFromString(errText, "text/xml"); var code = xd.getElementsByTagName("Code")[0]; var msg = xd.getElementsByTagName("Message")[0]; console.error("COS \u9519\u8bef\u4ee3\u7801:", code ? code.textContent : "?", msg ? msg.textContent : "?"); } catch(e) {}
                    console.error("COS \u8fd4\u56de\u539f\u59cb\u9519\u8bef:", errText.slice(0, 500));
                    reject(new Error("HTTP " + xhr.status + ": " + errText.slice(0, 200)));
                }
            };
            xhr.onerror = function() {
                console.error("COS \u7f51\u7edc\u9519\u8bef\uff1a\u65e0\u6cd5\u8fde\u63a5\u5230\u670d\u52a1\u5668");
                reject(new Error("\u7f51\u7edc\u9519\u8bef\uff0c\u8bf7\u68c0\u67e5CORS\u8bbe\u7f6e"));
            };
            xhr.send(file);
        });
    }
    // ====== COS: GET JSON (read projects.json from COS) ======
    function getCosJson(path) {
        var cfg = loadCos();
        if (!cfg) return Promise.reject(new Error("COS未配置"));
        var url = "https://" + cfg.bucket + ".cos." + cfg.region + ".myqcloud.com/" + path;
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try { resolve(JSON.parse(xhr.responseText)); } catch(e) { reject(new Error("JSON解析失败")); }
                } else if (xhr.status === 404) {
                    resolve(null);
                } else {
                    reject(new Error("HTTP " + xhr.status));
                }
            };
            xhr.onerror = function() { reject(new Error("网络错误")); };
            xhr.send();
        });
    }

    // ====== COS: PUT JSON (sync projects data to COS) ======
    function syncProjectsToCos() {
        var cfg = loadCos();
        if (!cfg) return Promise.reject(new Error("COS未配置"));
        var data = loadProjects();
        var jsonStr = JSON.stringify(data, null, 2);
        var blob = new Blob([jsonStr], { type: "application/json" });
        var key = "site/projects.json";
        return upCos(blob, key).then(function(url) {
            console.log("项目数据已同步到COS:", url);
            try { localStorage.setItem("cos_projects_synced", Date.now().toString()); } catch(e) {}
            return url;
        });
    }

    // ====== COS: Load projects from COS on startup ======
    function loadProjectsFromCos() {
        getCosJson("site/projects.json").then(function(data) {
            if (data && Array.isArray(data) && data.length > 0) {
                saveProjects(data);
                var active = document.querySelector(".filter-btn.active");
                renderProjects(active ? active.getAttribute("data-filter") : "all");
                renderAdminList();
                console.log("已从COS加载项目数据，共" + data.length + "个项目");
            }
        }).catch(function(err) {
            console.log("从COS加载项目数据失败:", err && err.message ? err.message : err);
        });
    }

    var STORAGE_KEY = "lulu_projects_data";
    var COVERS_KEY = "lulu_covers";
    var DB_NAME = "LuluStudioDB";
    var DB_VER = 1;
    var VIDEO_STORE = "videos";

    var workGrid = document.getElementById("workGrid");
    var modal = document.getElementById("projectModal");
    var modalContent = document.getElementById("modalContent");
    var modalClose = document.getElementById("modalClose");
    var videoUploadInput = document.getElementById("videoUploadInput");
    var adminPanel = document.getElementById("adminPanel");
    var adminToggle = document.getElementById("adminToggle");
    var adminClose = document.getElementById("adminClose");
    var adminList = document.getElementById("adminProjectList");
    var addProjectBtn = document.getElementById("addProjectBtn");
    var projectForm = document.getElementById("projectForm");
    var formModal = document.getElementById("formModal");
    var formCancel = document.getElementById("formCancel");
    var formCoverFile = document.getElementById("formCoverFile");
    var formVideoFile = document.getElementById("formVideoFile");
    var formCoverPreview = document.getElementById("formCoverPreview");
    var currentUploadProjectId = null;

    var typeLabels = {
        "short-drama": "AI鐭墽",
        "commercial": "AI骞垮憡鐗?",
        "micro-film": "AI寰數褰?",
        "comic": "AI婕墽",
        "brand": "鍝佺墝瑙嗚"
    };

    // ---------- Data ----------
    function loadProjects() {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { try { return JSON.parse(saved); } catch(e) {} }
        var seed = JSON.parse(JSON.stringify(projects));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
    }
    function saveProjects(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {} }

    function getCover(id) { try { return (JSON.parse(localStorage.getItem(COVERS_KEY))||{})[id]; } catch(e) { return null; } }
    function saveCover(id, dataUrl) {
        try {
            var c = JSON.parse(localStorage.getItem(COVERS_KEY)) || {};
            c[id] = dataUrl;
            localStorage.setItem(COVERS_KEY, JSON.stringify(c));
        } catch(e) { alert("灏侀潰鍥剧墖澶ぇ锛屽缓璁帇缂╁悗涓婁紶"); }
    }
    function deleteCover(id) {
        try { var c = JSON.parse(localStorage.getItem(COVERS_KEY))||{}; delete c[id]; localStorage.setItem(COVERS_KEY,JSON.stringify(c)); } catch(e) {}
    }

    // ---------- IndexedDB ----------
    function openDB() {
        return new Promise(function(res, rej) {
            var r = indexedDB.open(DB_NAME, DB_VER);
            r.onupgradeneeded = function(e) {
                if (!e.target.result.objectStoreNames.contains(VIDEO_STORE))
                    e.target.result.createObjectStore(VIDEO_STORE);
            };
            r.onsuccess = function(e) { res(e.target.result); };
            r.onerror = function(e) { rej(e); };
        });
    }
    function saveVideoDB(id, blob) {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).put(blob, String(id));
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
    }
    function getVideoDB(id) {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readonly");
                var r = t.objectStore(VIDEO_STORE).get(String(id));
                r.onsuccess = function() { res(r.result ? URL.createObjectURL(r.result) : null); };
                r.onerror = function(e) { rej(e); };
            });
        });
    }
    function deleteVideoDB(id) {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).delete(String(id));
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
    }

    // ---------- Render Cards ----------
    function renderProjects(filter) {
        var all = loadProjects();
        var list = [];
        for (var i = 0; i < all.length; i++) {
            if (filter === "all" || all[i].type === filter) list.push(all[i]);
        }
        workGrid.innerHTML = "";
        for (var i = 0; i < list.length; i++) {
            (function(project) {
                var card = document.createElement("div");
                card.className = "work-card reveal";
                card.style.transitionDelay = (i * 0.08) + "s";

                var colors = project.colors || ["#1a1a1a","#2a2a2a"];
                var gradient = "linear-gradient(135deg," + colors[0] + "," + colors[1] + ")";
                var cover = getCover(project.id);
                var bgStyle = cover ? "background:url(\x27" + cover + "\x27) center/cover no-repeat" : "background:" + gradient;

                card.innerHTML =
                    "<div class=\"work-card-bg\" style=\"" + bgStyle + "\"></div>" +
                    "<div class=\"work-card-overlay\"></div>" +
                    "<div class=\"work-card-content\">" +
                        "<span class=\"work-card-type\">" + project.typeLabel + "</span>" +
                        "<h3 class=\"work-card-title\">" + project.title + "</h3>" +
                        "<p class=\"work-card-highlight\">" + project.highlight + "</p>" +
                    "</div>" +
                    "<div class=\"work-card-hover\"><span>鏌ョ湅椤圭洰</span><span class=\"arrow\">鈫?/span></div>";

                card.addEventListener("click", function() { openModal(project); });
                workGrid.appendChild(card);
            })(list[i]);
        }
        setTimeout(function() {
            var els = document.querySelectorAll(".work-card.reveal");
            for (var i = 0; i < els.length; i++) els[i].classList.add("visible");
        }, 50);
    }

    // ---------- Open Modal ----------
    function openModal(project) {
        var detail = project.detail || {};
        var highlights = detail.highlights || [];
        var hlHtml = "";
        for (var i = 0; i < highlights.length; i++) hlHtml += "<li>" + highlights[i] + "</li>";

        var colors = project.colors || ["#1a1a1a","#2a2a2a"];
        var posterGrad = "linear-gradient(135deg," + colors[0] + "," + colors[1] + ")";
        var cover = getCover(project.id);
        var posterStyle = cover ? "background:url(\x27" + cover + "\x27) center/cover no-repeat" : "background:" + posterGrad;

        modalContent.innerHTML =
            "<div class=\"modal-header\">" +
                "<span class=\"modal-type\">" + project.typeLabel + "</span>" +
                "<h2 class=\"modal-title\">" + project.title + "</h2>" +
            "</div>" +
            "<div class=\"modal-media\" style=\"" + posterStyle + ";min-height:260px\">" +
                "<div class=\"modal-media-placeholder\" style=\"display:flex;align-items:center;justify-content:center;height:260px\">" +
                    "<span style=\"font-size:48px;opacity:0.2\">馃幀</span>" +
                "</div>" +
            "</div>" +
            (detail.subtitle ? "<p class=\"modal-subtitle\">" + detail.subtitle + "</p>" : "") +
            (hlHtml ? "<ul class=\"modal-highlights\">" + hlHtml + "</ul>" : "");

        var mediaDiv = modalContent.querySelector(".modal-media");

                // ---- Handle video + cover buttons ----
        // 瑙嗛浼樺厛绾? detail.videoUrl > IndexedDB涓婁紶 > detail.video > 涓婁紶鎸夐挳
        function renderVideoActions(hasVideo_local) {
            var actionsDiv = document.createElement("div");
            actionsDiv.style.cssText = "margin-top:20px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap";
            var hasV = !!(detail.videoUrl || hasVideo_local || detail.video);
            actionsDiv.innerHTML =
                "<button class=\"btn-upload-video\" id=\"changeCoverBtn\" style=\"font-size:12px;padding:8px 20px\">馃柤 鏇存崲灏侀潰</button>" +
                (hasV ? "<button class=\"btn-upload-video\" id=\"deleteVideoBtn\" style=\"font-size:12px;padding:8px 20px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)\">馃棏 鍒犻櫎瑙嗛</button>" : "");
            modalContent.appendChild(actionsDiv);

            document.getElementById("changeCoverBtn").addEventListener("click", function() {
                var inp = document.createElement("input");
                inp.type = "file"; inp.accept = "image/*";
                inp.style.display = "none";
                document.body.appendChild(inp);
                inp.click();
                inp.addEventListener("change", function() {
                    if (!inp.files[0]) { document.body.removeChild(inp); return; }
                    var r = new FileReader();
                    r.onload = function(ev) {
                        saveCover(project.id, ev.target.result);
                        document.body.removeChild(inp);
                        openModal(project);
                    };
                    r.readAsDataURL(inp.files[0]);
                });
            });

            var delBtn = document.getElementById("deleteVideoBtn");
            if (delBtn) {
                delBtn.addEventListener("click", function() {
                    if (confirm("纭畾鍒犻櫎姝ら」鐩殑瑙嗛锛?")) {
                        deleteVideoDB(project.id).then(function() { openModal(project); });
                    }
                });
            }
        }

        if (detail.videoUrl) {
            mediaDiv.innerHTML = "<video class=\"modal-video\" src=\"" + detail.videoUrl + "\" controls preload=\"metadata\" playsinline style=\"width:100%;display:block;background:#1a1a1a;max-height:500px;border-radius:14px\"></video>";
            renderVideoActions(null);
        } else {
            getVideoDB(project.id).then(function(videoUrl) {
                if (videoUrl) {
                    mediaDiv.innerHTML = "<video class=\"modal-video\" src=\"" + videoUrl + "\" controls preload=\"metadata\" playsinline style=\"width:100%;display:block;background:#1a1a1a;max-height:500px;border-radius:14px\"></video>";
                } else if (detail.video) {
                    mediaDiv.innerHTML = "<video class=\"modal-video\" src=\"" + detail.video + "\" controls preload=\"metadata\" playsinline style=\"width:100%;display:block;background:#1a1a1a;max-height:500px;border-radius:14px\"></video>";
                } else {
                    var uploadDiv = document.createElement("div");
                    uploadDiv.className = "modal-video-upload";
                    uploadDiv.innerHTML = "<button class=\"btn-upload-video\">涓婁紶瑙嗛鍒版椤圭洰</button>";
                    mediaDiv.appendChild(uploadDiv);
                    uploadDiv.querySelector("button").addEventListener("click", function() {
                        currentUploadProjectId = project.id;
                        videoUploadInput.click();
                    });
                }
                renderVideoActions(videoUrl);
            });
        }document.body.style.overflow = "hidden";
        modal.classList.add("open");
    }
function closeModal() { modal.classList.remove("open"); document.body.style.overflow = ""; }
    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", function(e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function(e) { if (e.key === "Escape") closeModal(); });

    // ---------- Video Upload ----------
    if (videoUploadInput) {
        videoUploadInput.addEventListener("change", function(e) {
            var file = e.target.files[0];
            if (!file || !currentUploadProjectId) return;
            saveVideoDB(currentUploadProjectId, file).then(function() {
                closeModal();
                alert("瑙嗛涓婁紶鎴愬姛");
            });
        });
    }

    // ---------- Showcase ----------
    var showcaseItems = document.querySelectorAll(".showcase-item");
    for (var i = 0; i < showcaseItems.length; i++) {
        (function(item) {
            item.addEventListener("click", function() {
                var f = item.getAttribute("data-filter");
                document.getElementById("work").scrollIntoView({ behavior:"smooth" });
                setTimeout(function() {
                    var t = document.querySelector(".filter-btn[data-filter=\"" + f + "\"]");
                    if (t) t.click();
                }, 400);
            });
        })(showcaseItems[i]);
    }

    // ---------- Chips ----------
    var chips = document.querySelectorAll(".direction-chip[data-filter]");
    for (var i = 0; i < chips.length; i++) {
        (function(chip) {
            chip.addEventListener("click", function() {
                var f = chip.getAttribute("data-filter");
                document.getElementById("work").scrollIntoView({ behavior:"smooth" });
                setTimeout(function() {
                    var t = document.querySelector(".filter-btn[data-filter=\"" + f + "\"]");
                    if (t) t.click();
                }, 400);
            });
        })(chips[i]);
    }

    // ---------- Navbar ----------
    var navbar = document.getElementById("navbar");
    window.addEventListener("scroll", function() { navbar.classList.toggle("scrolled", window.scrollY > 60); });

    // ---------- Mobile Nav ----------
    var navToggle = document.getElementById("navToggle");
    var navMenu = document.getElementById("navMenu");
    navToggle.addEventListener("click", function() { navMenu.classList.toggle("open"); });
    var navLinks = document.querySelectorAll(".nav-link");
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener("click", function() { navMenu.classList.remove("open"); });
    }

    // ---------- Scroll Reveal ----------
    function initScrollReveal() {
        var els = document.querySelectorAll(".reveal:not(.visible)");
        if (els.length === 0) return;
        var o = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add("visible");
                    o.unobserve(entries[i].target);
                }
            }
        }, { threshold:0.1, rootMargin:"0px 0px -60px 0px" });
        for (var i = 0; i < els.length; i++) o.observe(els[i]);
    }
    var sections = document.querySelectorAll(".section-header, .about-content, .contact-content, .footer");
    for (var i = 0; i < sections.length; i++) sections[i].classList.add("reveal");

    // ---------- Admin Panel ----------
    adminToggle.addEventListener("click", function() { adminPanel.classList.toggle("open"); renderAdminList(); });
    adminClose.addEventListener("click", function() { adminPanel.classList.remove("open"); });

    function renderAdminList() {
        var all = loadProjects();
        adminList.innerHTML = "";
        for (var i = 0; i < all.length; i++) {
            (function(p) {
                var item = document.createElement("div");
                item.className = "admin-item";
                item.innerHTML =
                    "<div class=\"admin-item-info\">" +
                        "<strong>" + p.title + "</strong>" +
                        "<span class=\"admin-item-type\">" + p.typeLabel + "</span>" +
                    "</div>" +
                    "<div class=\"admin-item-actions\">" +
                        "<button class=\"admin-btn edit\">缂栬緫</button>" +
                        "<button class=\"admin-btn delete\">鍒犻櫎</button>" +
                    "</div>";
                adminList.appendChild(item);
                item.querySelector(".edit").addEventListener("click", function() { openForm(p); });
                item.querySelector(".delete").addEventListener("click", function() {
                    if (confirm("鍒犻櫎銆? + p.title + "銆嶏紵鍒犻櫎鍚庢棤娉曟仮澶嶃€?)) deleteProject(p.id);
                });
            })(all[i]);
        }
    }

    function deleteProject(id) {
        var all = loadProjects();
        for (var i = 0; i < all.length; i++) {
            if (all[i].id === id) { all.splice(i, 1); break; }
        }
        saveProjects(all);
        deleteCover(id);
        deleteVideoDB(id);
        renderAdminList();
        // 删除后同步到COS
        if (canCos()) {
            syncProjectsToCos().catch(function(err) {
                console.error("删除后同步COS失败:", err && err.message ? err.message : err);
            });
        }
        var active = document.querySelector(".filter-btn.active");
        renderProjects(active ? active.getAttribute("data-filter") : "all");
    }

    addProjectBtn.addEventListener("click", function() { openForm(null); });

    function openForm(project) {
        formModal.classList.add("open");
        document.getElementById("formId").value = project ? project.id : "";
        document.getElementById("formTitle").value = project ? project.title : "";
        document.getElementById("formType").value = project ? project.type : "short-drama";
        document.getElementById("formHighlight").value = project ? project.highlight : "";
        document.getElementById("formSubtitle").value = project && project.detail ? project.detail.subtitle : "";
        var hlText = "";
        if (project && project.detail && project.detail.highlights) {
            hlText = project.detail.highlights.join("\n");
        }
        document.getElementById("formHighlights").value = hlText;
        formCoverPreview.innerHTML = "";
        formCoverFile.value = "";
        formVideoFile.value = "";
        document.getElementById("formCoverUrl").value = project ? (project.coverUrl || "") : "";
        document.getElementById("formVideoUrl").value = (project && project.detail) ? (project.detail.videoUrl || "") : "";
    }

        formCancel.addEventListener("click", function() { formModal.classList.remove("open"); });
    var formModalClose = document.getElementById("formModalClose");
    if (formModalClose) formModalClose.addEventListener("click", function() { formModal.classList.remove("open"); });
    formModal.addEventListener("click", function(e) { if (e.target === formModal) formModal.classList.remove("open"); });

    projectForm.addEventListener("submit", function(e) {
        e.preventDefault();
        var id = document.getElementById("formId").value;
        var title = document.getElementById("formTitle").value.trim();
        var type = document.getElementById("formType").value;
        var highlight = document.getElementById("formHighlight").value.trim();
        var subtitle = document.getElementById("formSubtitle").value.trim();
        var hlRaw = document.getElementById("formHighlights").value.trim();
        var hlList = hlRaw ? hlRaw.split("\n").map(function(s) { return s.trim(); }).filter(function(s) { return s; }) : [];

        var all = loadProjects();

        if (id) {
            id = parseInt(id);
            for (var i = 0; i < all.length; i++) {
                if (all[i].id === id) {
                    all[i].title = title;
                    all[i].type = type;
                    all[i].typeLabel = typeLabels[type] || type;
                    all[i].highlight = highlight;
                    if (!all[i].detail) all[i].detail = {};
                    all[i].detail.subtitle = subtitle;
                    all[i].detail.highlights = hlList;
                    all[i].coverUrl = document.getElementById("formCoverUrl").value.trim() || "";
                    all[i].detail.videoUrl = document.getElementById("formVideoUrl").value.trim() || "";
                    break;
                }
            }
        } else {
            var newId = Date.now();
            var np = {
                id: newId, title: title, type: type,
                typeLabel: typeLabels[type] || type,
                highlight: highlight || "",
                colors: ["#1a1a2e","#16213e","#0f3460"],
                coverUrl: document.getElementById("formCoverUrl").value.trim() || "",
                detail: { subtitle: subtitle || "", highlights: hlList, video: "", videoUrl: document.getElementById("formVideoUrl").value.trim() || "" }
            };
            all.push(np);
            id = newId;
        }

        saveProjects(all);

        if (formCoverFile.files[0]) {
            var cf = formCoverFile.files[0];
            if (canCos()) {
                var ext = cf.name.split(".").pop() || "jpg";
                var ck = "site/covers/" + id + "_" + Date.now() + "." + ext;
                upCos(cf, ck).then(function(url) {
                    var all = loadProjects();
                    for (var j = 0; j < all.length; j++) {
                        if (all[j].id === id) { all[j].coverUrl = url; break; }
                    }
                    saveProjects(all);
                }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err);
                    var r = new FileReader();
                    r.onload = function(ev) { saveCover(id, ev.target.result); };
                    r.readAsDataURL(cf);
                });
            } else {
                var r = new FileReader();
                r.onload = function(ev) { saveCover(id, ev.target.result); };
                r.readAsDataURL(cf);
            }
        }
        if (formVideoFile.files[0]) {
            var vf = formVideoFile.files[0];
            if (canCos()) {
                var ext = vf.name.split(".").pop() || "mp4";
                var vk = "site/videos/" + id + "_" + Date.now() + "." + ext;
                upCos(vf, vk).then(function(url) {
                    var all = loadProjects();
                    for (var j = 0; j < all.length; j++) {
                        if (all[j].id === id) {
                            if (!all[j].detail) all[j].detail = {};
                            all[j].detail.videoUrl = url;
                            break;
                        }
                    }
                    saveProjects(all);
                }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err);
                    saveVideoDB(id, vf);
                });
            } else {
                saveVideoDB(id, vf);
            }
        }

        // 如果配置了COS，自动同步项目数据
        if (canCos()) {
            syncProjectsToCos().catch(function(err) {
                console.error("自动同步到COS失败:", err && err.message ? err.message : err);
            });
        }
        // 如果配置了COS，自动同步项目数据
        if (canCos()) {
            syncProjectsToCos().catch(function(err) {
                console.error("自动同步到COS失败:", err && err.message ? err.message : err);
            });
        }
        formModal.classList.remove("open");
        renderAdminList();
        var active = document.querySelector(".filter-btn.active");
        renderProjects(active ? active.getAttribute("data-filter") : "all");
    });

    formCoverFile.addEventListener("change", function() {
        var f = this.files[0];
        if (!f) { formCoverPreview.innerHTML = ""; return; }
        var r = new FileReader();
        r.onload = function(e) { formCoverPreview.innerHTML = "<img src=\"" + e.target.result + "\" style=\"max-width:200px;max-height:120px;border-radius:8px;margin-top:8px;object-fit:cover\">"; };
        r.readAsDataURL(f);
    });

    // ---------- Init ----------
    renderProjects("all");
    initScrollReveal();
    // 尝试从COS加载已同步的项目数据（覆盖本地默认数据）
    setTimeout(function() { loadProjectsFromCos(); }, 500);
    // ---------- Background Image (IndexedDB - no size limit) ----------
    function saveBgImage(blob) {
        var file = blob;
        if (canCos()) {
            var key = "site/bg_" + Date.now() + ".jpg";
            return upCos(file, key).then(function(url) {
                try { localStorage.setItem("cos_bg_url", url); } catch(e) {}
            }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err);
                return saveBgToDB(blob);
            });
        }
        return saveBgToDB(blob);
    }
    function saveBgToDB(blob) {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).put(blob, "bg_image");
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
    }
    function getBgImage() {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readonly");
                var r = t.objectStore(VIDEO_STORE).get("bg_image");
                r.onsuccess = function() {
                    res(r.result ? URL.createObjectURL(r.result) : null);
                };
                r.onerror = function(e) { rej(e); };
            });
        });
    }
    function removeBgImage() {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).delete("bg_image");
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
    }

        var cosUrl = null;
        try { cosUrl = localStorage.getItem("cos_bg_url"); } catch(e) {}
        if (cosUrl) {
            document.body.style.backgroundImage = "url(" + cosUrl + ")";
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundPosition = "center";
            document.body.style.backgroundAttachment = "fixed";
            if (!document.getElementById("bgOverlay")) {
                var overlay = document.createElement("div");
                overlay.id = "bgOverlay";
                overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:-1;pointer-events:none";
                document.body.appendChild(overlay);
            }
            return;
        }
    function loadBgImage() {
        getBgImage().then(function(url) {
            if (url) {
                document.body.style.backgroundImage = "url(" + url + ")";
                document.body.style.backgroundSize = "cover";
                document.body.style.backgroundPosition = "center";
                document.body.style.backgroundAttachment = "fixed";
                if (!document.getElementById("bgOverlay")) {
                    var overlay = document.createElement("div");
                    overlay.id = "bgOverlay";
                    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:-1;pointer-events:none";
                    document.body.appendChild(overlay);
                }
            }
        });
    }

    // Add buttons to admin toolbar
    var tb = document.querySelector("#addProjectBtn").parentNode;

    var bgUploadBtn = document.createElement("button");
    bgUploadBtn.className = "btn btn-outline";
    bgUploadBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:10px";
    bgUploadBtn.textContent = "馃柤 鏇存崲缃戠珯鑳屾櫙鍥?";
    tb.appendChild(bgUploadBtn);

    bgUploadBtn.addEventListener("click", function() {
        var inp = document.createElement("input");
        inp.type = "file"; inp.accept = "image/*";
        inp.style.display = "none";
        document.body.appendChild(inp);
        inp.click();
        inp.addEventListener("change", function() {
            if (!inp.files[0]) { document.body.removeChild(inp); return; }
            saveBgImage(inp.files[0]).then(function() {
                document.body.removeChild(inp);
                loadBgImage();
                alert("鑳屾櫙鍥惧凡鏇存柊锛?");
            }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err);
                alert("涓婁紶澶辫触锛岃閲嶈瘯");
            });
        });
    });

    var bgRemoveBtn = document.createElement("button");
    bgRemoveBtn.className = "btn btn-outline";
    bgRemoveBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:6px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)";
    bgRemoveBtn.textContent = "鉁?鎭㈠榛樿榛戣壊鑳屾櫙";
    tb.appendChild(bgRemoveBtn);

    bgRemoveBtn.addEventListener("click", function() {
        removeBgImage().then(function() {
            document.body.style.backgroundImage = "";
            var ov = document.getElementById("bgOverlay");
            if (ov) ov.remove();
            alert("宸叉仮澶嶉粯璁ら粦鑹茶儗鏅?");
        });
    });

    loadBgImage();
    // ---------- Portrait Upload (About section) ----------
    function savePortrait(blob) {
        var file = blob;
        if (canCos()) {
            var key = "site/portrait_" + Date.now() + ".jpg";
            return upCos(file, key).then(function(url) {
                try { localStorage.setItem("cos_portrait_url", url); } catch(e) {}
            }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err);
                return saveToDB(blob, "portrait");
            });
        }
        return saveToDB(blob, "portrait");
    }
    function getPortrait() {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readonly");
                var r = t.objectStore(VIDEO_STORE).get("portrait");
                r.onsuccess = function() {
                    res(r.result ? URL.createObjectURL(r.result) : null);
                };
                r.onerror = function(e) { rej(e); };
            });
        });
    }
    function removePortrait() {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).delete("portrait");
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
    }

    function loadPortrait() {
        var cosUrl = null;
        try { cosUrl = localStorage.getItem("cos_portrait_url"); } catch(e) {}
        if (cosUrl) {
            var ph = document.querySelector(".about-portrait-placeholder");
            if (ph) {
                ph.style.cssText = "width:180px;height:180px;border-radius:50%;background:url(" + cosUrl + ") center/cover no-repeat;overflow:hidden";
                ph.innerHTML = "";
            }
            return;
        }
        getPortrait().then(function(url) {
            if (url) {
                var ph = document.querySelector(".about-portrait-placeholder");
                if (ph) {
                    ph.style.cssText = "width:180px;height:180px;border-radius:50%;background:url(" + url + ") center/cover no-repeat;overflow:hidden";
                    ph.innerHTML = "";
                }
            }
        });
    }

    // Add portrait upload button in admin toolbar
    var ptBtn = document.createElement("button");
    ptBtn.className = "btn btn-outline";
    ptBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:10px";
    ptBtn.textContent = "馃柤 涓婁紶涓汉澶村儚";
    tb.appendChild(ptBtn);

    ptBtn.addEventListener("click", function() {
        var inp = document.createElement("input");
        inp.type = "file"; inp.accept = "image/*";
        inp.style.display = "none";
        document.body.appendChild(inp);
        inp.click();
        inp.addEventListener("change", function() {
            if (!inp.files[0]) { document.body.removeChild(inp); return; }
            savePortrait(inp.files[0]).then(function() {
                document.body.removeChild(inp);
                loadPortrait();
                alert("澶村儚宸叉洿鏂帮紒");
            }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err); alert("涓婁紶澶辫触"); });
        });
    });

    var ptDelBtn = document.createElement("button");
    ptDelBtn.className = "btn btn-outline";
    ptDelBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:6px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)";
    ptDelBtn.textContent = "鉁?鍒犻櫎涓汉澶村儚";
    tb.appendChild(ptDelBtn);

    ptDelBtn.addEventListener("click", function() {
        removePortrait().then(function() {
            var ph = document.querySelector(".about-portrait-placeholder");
            if (ph) {
                ph.style.cssText = "";
                ph.innerHTML = "<span class=\"about-badge\" style=\"display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;font-size:28px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.08);border-radius:50%\">AI</span>";
            }
            alert("澶村儚宸插垹闄?");
        });
    });

    loadPortrait();
    // ---------- About Section Background ----------
    function saveAboutBg(blob) {
        var file = blob;
        if (canCos()) {
            var key = "site/about_" + Date.now() + ".jpg";
            return upCos(file, key).then(function(url) {
                try { localStorage.setItem("cos_about_url", url); } catch(e) {}
            }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err);
                return saveToDB(blob, "about_bg");
            });
        }
        return saveToDB(blob, "about_bg");
    }
    function getAboutBg() {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readonly");
                var r = t.objectStore(VIDEO_STORE).get("about_bg");
                r.onsuccess = function() {
                    res(r.result ? URL.createObjectURL(r.result) : null);
                };
                r.onerror = function(e) { rej(e); };
            });
        });
    }
    function removeAboutBg() {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).delete("about_bg");
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
    }
    function loadAboutBg() {
        var cosUrl = null;
        try { cosUrl = localStorage.getItem("cos_about_url"); } catch(e) {}
        if (cosUrl) {
            var sec = document.getElementById("about");
            if (sec) {
                sec.style.background = "url(" + cosUrl + ") center/cover no-repeat fixed";
                sec.style.position = "relative";
                var existing = sec.querySelector(".about-bg-overlay");
                if (!existing) {
                    var ov = document.createElement("div");
                    ov.className = "about-bg-overlay";
                    ov.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.6);z-index:0";
                    sec.insertBefore(ov, sec.firstChild);
                }
                var container = sec.querySelector(".section-container");
                if (container) container.style.position = "relative";
                if (container) container.style.zIndex = "1";
            }
            return;
        }
        getAboutBg().then(function(url) {
            var sec = document.getElementById("about");
            if (sec) {
                if (url) {
                    sec.style.background = "url(" + url + ") center/cover no-repeat fixed";
                    sec.style.position = "relative";
                    var existing = sec.querySelector(".about-bg-overlay");
                    if (!existing) {
                        var ov = document.createElement("div");
                        ov.className = "about-bg-overlay";
                        ov.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.6);z-index:0";
                        sec.insertBefore(ov, sec.firstChild);
                    }
                    // Make sure content is above overlay
                    var container = sec.querySelector(".section-container");
                    if (container) container.style.position = "relative";
                    if (container) container.style.zIndex = "1";
                } else {
                    sec.style.background = "";
                    var ov = sec.querySelector(".about-bg-overlay");
                    if (ov) ov.remove();
                }
            }
        });
    }

    var abBtn = document.createElement("button");
    abBtn.className = "btn btn-outline";
    abBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:10px";
    abBtn.textContent = "馃柤 涓婁紶銆岃瑙夊垱浣滆€呫€嶈儗鏅浘";
    tb.appendChild(abBtn);

    abBtn.addEventListener("click", function() {
        var inp = document.createElement("input");
        inp.type = "file"; inp.accept = "image/*";
        inp.style.display = "none";
        document.body.appendChild(inp);
        inp.click();
        inp.addEventListener("change", function() {
            if (!inp.files[0]) { document.body.removeChild(inp); return; }
            saveAboutBg(inp.files[0]).then(function() {
                document.body.removeChild(inp);
                loadAboutBg();
                alert("鑳屾櫙鍥惧凡鏇存柊锛?");
            }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err); alert("涓婁紶澶辫触"); });
        });
    });

    var abDelBtn = document.createElement("button");
    abDelBtn.className = "btn btn-outline";
    abDelBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:6px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)";
    abDelBtn.textContent = "鉁?鎭㈠銆岃瑙夊垱浣滆€呫€嶉粯璁よ儗鏅?";
    tb.appendChild(abDelBtn);

    abDelBtn.addEventListener("click", function() {
        removeAboutBg().then(function() {
            loadAboutBg();
            alert("宸叉仮澶嶉粯璁?");
        });
    });

    loadAboutBg();
    // ---------- Hero Background ----------
    function saveHeroBg(blob) {
        var file = blob;
        if (canCos()) {
            var key = "site/hero_" + Date.now() + ".jpg";
            return upCos(file, key).then(function(url) {
                try { localStorage.setItem("cos_hero_url", url); } catch(e) {}
            }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err);
                return saveToDB(blob, "hero_bg");
            });
        }
        return saveToDB(blob, "hero_bg");
    }
    function saveToDB(blob, storeKey) {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).put(blob, storeKey);
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
    }
    function getHeroBg() {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readonly");
                var r = t.objectStore(VIDEO_STORE).get("hero_bg");
                r.onsuccess = function() {
                    res(r.result ? URL.createObjectURL(r.result) : null);
                };
                r.onerror = function(e) { rej(e); };
            });
        });
    }
    function removeHeroBg() {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).delete("hero_bg");
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
    }
    function loadHeroBg() {
        var cosUrl = null;
        try { cosUrl = localStorage.getItem("cos_hero_url"); } catch(e) {}
        if (cosUrl) {
            var heroBg = document.querySelector(".hero-bg");
            if (heroBg) {
                heroBg.style.background = "url(" + cosUrl + ") center/cover no-repeat";
                heroBg.style.position = "absolute";
                heroBg.style.inset = "0";
                heroBg.style.zIndex = "0";
                var existing = heroBg.parentNode.querySelector(".hero-bg-overlay");
                if (!existing) {
                    var ov = document.createElement("div");
                    ov.className = "hero-bg-overlay";
                    ov.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:1";
                    heroBg.parentNode.insertBefore(ov, heroBg.nextSibling);
                }
            }
            return;
        }
        getHeroBg().then(function(url) {
            var heroBg = document.querySelector(".hero-bg");
            if (heroBg) {
                if (url) {
                    heroBg.style.background = "url(" + url + ") center/cover no-repeat";
                    heroBg.style.position = "absolute";
                    heroBg.style.inset = "0";
                    heroBg.style.zIndex = "0";
                    // Clear the pseudo-element light effects by adding dark overlay
                    var existing = heroBg.parentNode.querySelector(".hero-bg-overlay");
                    if (!existing) {
                        var ov = document.createElement("div");
                        ov.className = "hero-bg-overlay";
                        ov.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:1";
                        heroBg.parentNode.insertBefore(ov, heroBg.nextSibling);
                    }
                } else {
                    heroBg.style.background = "";
                    var ov = heroBg.parentNode.querySelector(".hero-bg-overlay");
                    if (ov) ov.remove();
                }
            }
        });
    }

    var heroBtn = document.createElement("button");
    heroBtn.className = "btn btn-outline";
    heroBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:10px";
    heroBtn.textContent = "馃柤 涓婁紶棣栭〉棣栧睆鑳屾櫙鍥?";
    tb.appendChild(heroBtn);

    heroBtn.addEventListener("click", function() {
        var inp = document.createElement("input");
        inp.type = "file"; inp.accept = "image/*";
        inp.style.display = "none";
        document.body.appendChild(inp);
        inp.click();
        inp.addEventListener("change", function() {
            if (!inp.files[0]) { document.body.removeChild(inp); return; }
            saveHeroBg(inp.files[0]).then(function() {
                document.body.removeChild(inp);
                loadHeroBg();
                alert("棣栭〉鑳屾櫙宸叉洿鏂帮紒");
            }).catch(function(err) { console.error("COS涓婁紶澶辫触:", err && err.message ? err.message : err); alert("涓婁紶澶辫触"); });
        });
    });

    var heroDelBtn = document.createElement("button");
    heroDelBtn.className = "btn btn-outline";
    heroDelBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:6px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)";
    heroDelBtn.textContent = "鉁?鎭㈠棣栭〉榛樿鏁堟灉";
    tb.appendChild(heroDelBtn);

    heroDelBtn.addEventListener("click", function() {
        removeHeroBg().then(function() {
            loadHeroBg();
            alert("宸叉仮澶嶉粯璁?");
        });
    });

    
    // ---------- COS Config Auto-load ----------
    // (toggle handled by native <details>)
    // COS 閰嶇疆闈㈡澘灞曞紑/鏀惰捣
    var cosToggleBtn = document.getElementById("cosToggleBtn");
    if (cosToggleBtn) {
        cosToggleBtn.addEventListener("click", function() {
            var panel = document.getElementById("cosConfigPanel");
            if (!panel) return;
            var isOpen = panel.style.display !== "none";
            panel.style.display = isOpen ? "none" : "block";
            if (!isOpen) {
                var c = loadCos() || {};
                var elBucket = document.getElementById("cosBucket");
                var elRegion = document.getElementById("cosRegion");
                var elSecretId = document.getElementById("cosSecretId");
                var elSecretKey = document.getElementById("cosSecretKey");
                var elStatus = document.getElementById("cosStatus");
                if (elBucket) elBucket.value = c.bucket || "qaz123456-1454067625";
                if (elRegion) elRegion.value = c.region || "";
                if (elSecretId) elSecretId.value = c.secretId || "";
                if (elSecretKey) elSecretKey.value = c.secretKey || "";
                if (elStatus) {
                    if (c.secretId) elStatus.innerHTML = "\u2714 \u5df2\u914d\u7f6e";
                    else elStatus.innerHTML = "";
                }
            }
        });
    }
    // ====== COS 配置保存按钮 ======
    var cosSaveBtn = document.getElementById("cosSaveBtn");
    if (cosSaveBtn) {
        cosSaveBtn.addEventListener("click", function() {
            var elBucket = document.getElementById("cosBucket");
            var elRegion = document.getElementById("cosRegion");
            var elSecretId = document.getElementById("cosSecretId");
            var elSecretKey = document.getElementById("cosSecretKey");
            var elStatus = document.getElementById("cosStatus");
            if (!elBucket || !elRegion || !elSecretId || !elSecretKey) return;
            var bucket = elBucket.value.trim();
            var region = elRegion.value.trim();
            var secretId = elSecretId.value.trim();
            var secretKey = elSecretKey.value.trim();
            if (!bucket || !region || !secretId || !secretKey) {
                if (elStatus) elStatus.innerHTML = "⚠️ 请填写所有字段";
                return;
            }
            saveCos({ bucket: bucket, region: region, secretId: secretId, secretKey: secretKey });
            if (elStatus) elStatus.innerHTML = "✅ 配置已保存，正在同步数据...";
            // 保存后自动同步项目数据到COS
            syncProjectsToCos().then(function() {
                if (elStatus) elStatus.innerHTML = "✅ 配置已保存，项目数据已同步到COS";
            }).catch(function(err) {
                console.error("COS同步失败:", err);
                if (elStatus) elStatus.innerHTML = "✅ 配置已保存，但数据同步失败。请检查密钥是否正确以及COS存储桶CORS配置";
            });
        });
    }

    // ---------- 添加"同步到COS"按钮到管理面板 ----------
    (function addSyncBtn() {
        var tb = document.querySelector("#addProjectBtn") ? document.querySelector("#addProjectBtn").parentNode : null;
        if (!tb) return;
        // 检查是否已添加
        if (document.getElementById("syncCosBtn")) return;
        var syncBtn = document.createElement("button");
        syncBtn.id = "syncCosBtn";
        syncBtn.className = "btn btn-outline";
        syncBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:8px";
        syncBtn.textContent = "☁️ 同步项目数据到COS";
        tb.appendChild(syncBtn);
        syncBtn.addEventListener("click", function() {
            if (!canCos()) { alert("请先在COS配置中填写存储桶信息"); return; }
            syncBtn.textContent = "☁️ 同步中...";
            syncBtn.disabled = true;
            syncProjectsToCos().then(function() {
                syncBtn.textContent = "✅ 同步成功";
                setTimeout(function() { syncBtn.textContent = "☁️ 同步项目数据到COS"; syncBtn.disabled = false; }, 2000);
            }).catch(function(err) {
                syncBtn.textContent = "❌ 同步失败";
                console.error("同步失败:", err);
                setTimeout(function() { syncBtn.textContent = "☁️ 同步项目数据到COS"; syncBtn.disabled = false; }, 3000);
            });
        });
    })();

    // ====== COS 配置保存按钮 ======
    var cosSaveBtn = document.getElementById("cosSaveBtn");
    if (cosSaveBtn) {
        cosSaveBtn.addEventListener("click", function() {
            var elBucket = document.getElementById("cosBucket");
            var elRegion = document.getElementById("cosRegion");
            var elSecretId = document.getElementById("cosSecretId");
            var elSecretKey = document.getElementById("cosSecretKey");
            var elStatus = document.getElementById("cosStatus");
            if (!elBucket || !elRegion || !elSecretId || !elSecretKey) return;
            var bucket = elBucket.value.trim();
            var region = elRegion.value.trim();
            var secretId = elSecretId.value.trim();
            var secretKey = elSecretKey.value.trim();
            if (!bucket || !region || !secretId || !secretKey) {
                if (elStatus) elStatus.innerHTML = "⚠️ 请填写所有字段";
                return;
            }
            saveCos({ bucket: bucket, region: region, secretId: secretId, secretKey: secretKey });
            if (elStatus) elStatus.innerHTML = "✅ 配置已保存，正在同步数据...";
            // 保存后自动同步项目数据到COS
            syncProjectsToCos().then(function() {
                if (elStatus) elStatus.innerHTML = "✅ 配置已保存，项目数据已同步到COS";
            }).catch(function(err) {
                console.error("COS同步失败:", err);
                if (elStatus) elStatus.innerHTML = "✅ 配置已保存，但数据同步失败。请检查密钥和COS存储桶CORS配置";
            });
        });
    }

    // ---------- 添加"同步到COS"按钮到管理面板 ----------
    (function addSyncBtn() {
        var tb = document.querySelector("#addProjectBtn") ? document.querySelector("#addProjectBtn").parentNode : null;
        if (!tb) return;
        if (document.getElementById("syncCosBtn")) return;
        var syncBtn = document.createElement("button");
        syncBtn.id = "syncCosBtn";
        syncBtn.className = "btn btn-outline";
        syncBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:8px";
        syncBtn.textContent = "☁️ 同步项目数据到COS";
        tb.appendChild(syncBtn);
        syncBtn.addEventListener("click", function() {
            if (!canCos()) { alert("请先在COS配置中填写存储桶信息"); return; }
            syncBtn.textContent = "☁️ 同步中...";
            syncBtn.disabled = true;
            syncProjectsToCos().then(function() {
                syncBtn.textContent = "✅ 同步成功";
                setTimeout(function() { syncBtn.textContent = "☁️ 同步项目数据到COS"; syncBtn.disabled = false; }, 2000);
            }).catch(function(err) {
                syncBtn.textContent = "❌ 同步失败";
                console.error("同步失败:", err);
                setTimeout(function() { syncBtn.textContent = "☁️ 同步项目数据到COS"; syncBtn.disabled = false; }, 3000);
            });
        });
    })();

    // ---------- Service Item Clicks (scroll to work + filter) ----------
    var serviceMap = {
        "AI鐭墽": "short-drama",
        "AI寰數褰?": "micro-film",
        "鍝佺墝瑙嗚": "brand",
        "AI宸ヤ綔娴?": "all"
    };
    var serviceItems = document.querySelectorAll(".service-item");
    for (var i = 0; i < serviceItems.length; i++) {
        (function(item) {
            item.style.cursor = "pointer";
            item.addEventListener("click", function() {
                var nameEl = item.querySelector(".service-name");
                if (!nameEl) return;
                var text = nameEl.textContent;
                var filter = "all";
                for (var key in serviceMap) {
                    if (text.indexOf(key) >= 0) {
                        filter = serviceMap[key];
                        break;
                    }
                }
                document.getElementById("work").scrollIntoView({ behavior: "smooth" });
                setTimeout(function() {
                    var target = document.querySelector(".filter-btn[data-filter=\"" + filter + "\"]");
                    if (target) target.click();
                }, 400);
            });
        })(serviceItems[i]);
    }
});



















