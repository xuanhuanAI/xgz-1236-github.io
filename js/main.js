// ============================================
// 仙侠玄幻AI - Main JavaScript
// ============================================

document.addEventListener("DOMContentLoaded", function() {
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
        "short-drama": "AI短剧",
        "commercial": "AI广告片",
        "micro-film": "AI微电影",
        "comic": "AI漫剧",
        "brand": "品牌视觉"
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

    // ====== COS Upload using Web Crypto API ======
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
    function getCosBaseUrl() {
        var c = loadCos();
        return c ? "https://" + c.bucket + ".cos." + c.region + ".myqcloud.com" : null;
    }
    function encPath(p) {
        return p.split("/").map(function(s) { return encodeURIComponent(s); }).join("/");
    }
    
    // Web Crypto API helpers
    function bufToHex(buf) {
        return Array.from(new Uint8Array(buf)).map(function(b) {
            return (b >> 4).toString(16) + (b & 15).toString(16);
        }).join("");
    }
    function hexToBytes(hex) {
        var b = new Uint8Array(hex.length / 2);
        for (var i = 0; i < hex.length; i += 2) b[i/2] = parseInt(hex.substr(i, 2), 16);
        return b;
    }
    
    // Build COS auth using Web Crypto API (browser built-in, reliable)
    async function buildCosAuth(method, path, cfg, keyTime, contentType) {
        var host = cfg.bucket + ".cos." + cfg.region + ".myqcloud.com";
        var ct = contentType || "application/octet-stream";
        var enc = new TextEncoder();
        var headers = "content-type=" + encodeURIComponent(ct) + "&host=" + host;
        var hs = method.toLowerCase() + "\n" + path + "\n\n" + headers + "\n";
        var sha1Bytes = await crypto.subtle.digest("SHA-1", enc.encode(hs));
        var hs1 = bufToHex(sha1Bytes);
        var sts = "sha1\n" + keyTime + "\n" + hs1 + "\n";
        var key1 = await crypto.subtle.importKey("raw", enc.encode(cfg.secretKey),
            { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
        var skBuf = await crypto.subtle.sign("HMAC", key1, enc.encode(keyTime));
        var sk = bufToHex(skBuf);
        var key2 = await crypto.subtle.importKey("raw", hexToBytes(sk),
            { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
        var sigBuf = await crypto.subtle.sign("HMAC", key2, enc.encode(sts));
        var sig = bufToHex(sigBuf);
        return "q-sign-algorithm=sha1&q-ak=" + cfg.secretId +
            "&q-sign-time=" + keyTime + "&q-key-time=" + keyTime +
            "&q-header-list=content-type;host&q-url-param-list=&q-signature=" + sig;
    }
    
    function upCos(file, key) {
        var cfg = loadCos();
        if (!cfg) return Promise.reject(new Error("COS未配置"));
        var host = cfg.bucket + ".cos." + cfg.region + ".myqcloud.com";
        var cPath = "/" + encPath(key);
        var url = "https://" + host + cPath;
        var now = Math.floor(Date.now() / 1000);
        var kt = now + ";" + (now + 86400);
        var ct = file.type || "application/octet-stream";
        var m = "put";
        return buildCosAuth(m, cPath, cfg, kt, ct).then(function(auth) {
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
                        try {
                            var p = new DOMParser();
                            var xd = p.parseFromString(errText, "text/xml");
                            var code = xd.getElementsByTagName("Code")[0];
                            var msg = xd.getElementsByTagName("Message")[0];
                            console.error("COS错误:", code ? code.textContent : "?", msg ? msg.textContent : "?");
                        } catch(e) {}
                        reject(new Error("HTTP " + xhr.status + ": " + errText.slice(0, 200)));
                    }
                };
                xhr.onerror = function() { reject(new Error("网络错误")); };
                xhr.send(file);
            });
        });
    }
    
    // ====== COS Data Sync ======
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
        });
    }

    function loadProjectsFromCos() {
        getCosJson("site/projects.json").then(function(data) {
            if (data && Array.isArray(data) && data.length > 0) {
                saveProjects(data);
                var active = document.querySelector(".filter-btn.active");
                renderProjects(active ? active.getAttribute("data-filter") : "all");
                renderAdminList();
                console.log("已从COS加载" + data.length + "个项目");
            }
        }).catch(function(err) {
            console.log("从COS加载项目数据失败:", err && err.message ? err.message : err);
        });
    }

    function getCover(id) { try { return (JSON.parse(localStorage.getItem(COVERS_KEY))||{})[id]; } catch(e) { return null; } }
    function saveCover(id, dataUrl) {
        try {
            var c = JSON.parse(localStorage.getItem(COVERS_KEY)) || {};
            c[id] = dataUrl;
            localStorage.setItem(COVERS_KEY, JSON.stringify(c));
        } catch(e) { alert("封面图片太大，建议压缩后上传"); }
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
                    "<div class=\"work-card-hover\"><span>查看项目</span><span class=\"arrow\">→</span></div>";

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
                    "<span style=\"font-size:48px;opacity:0.2\">🎬</span>" +
                "</div>" +
            "</div>" +
            (detail.subtitle ? "<p class=\"modal-subtitle\">" + detail.subtitle + "</p>" : "") +
            (hlHtml ? "<ul class=\"modal-highlights\">" + hlHtml + "</ul>" : "");

        var mediaDiv = modalContent.querySelector(".modal-media");

        // ---- Handle video + cover buttons ----
        getVideoDB(project.id).then(function(videoUrl) {
            if (videoUrl) {
                mediaDiv.innerHTML = "<video class=\"modal-video\" src=\"" + videoUrl + "\" controls preload=\"metadata\" playsinline style=\"width:100%;display:block;background:#1a1a1a;max-height:500px;border-radius:14px\"></video>";
            } else if (detail.video) {
                mediaDiv.innerHTML = "<video class=\"modal-video\" src=\"" + detail.video + "\" controls preload=\"metadata\" playsinline style=\"width:100%;display:block;background:#1a1a1a;max-height:500px;border-radius:14px\"></video>";
            } else {
                var uploadDiv = document.createElement("div");
                uploadDiv.className = "modal-video-upload";
                uploadDiv.innerHTML = "<button class=\"btn-upload-video\">上传视频到此项目</button>";
                mediaDiv.appendChild(uploadDiv);
                uploadDiv.querySelector("button").addEventListener("click", function() {
                    currentUploadProjectId = project.id;
                    videoUploadInput.click();
                });
            }

            // ---- Cover change & delete video buttons ----
            var actionsDiv = document.createElement("div");
            actionsDiv.style.cssText = "margin-top:20px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap";
            var hasVideo = !!(videoUrl || detail.video);
            actionsDiv.innerHTML =
                "<button class=\"btn-upload-video\" id=\"changeCoverBtn\" style=\"font-size:12px;padding:8px 20px\">🖼 更换封面</button>" +
                (hasVideo ? "<button class=\"btn-upload-video\" id=\"deleteVideoBtn\" style=\"font-size:12px;padding:8px 20px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)\">🗑 删除视频</button>" : "");
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
                    if (confirm("确定删除此项目的视频？")) {
                        deleteVideoDB(project.id).then(function() { openModal(project); });
                    }
                });
            }
        });

        document.body.style.overflow = "hidden";
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
                videoUploadInput.value = "";
                var all = loadProjects();
                for (var i = 0; i < all.length; i++) {
                    if (all[i].id === currentUploadProjectId) { openModal(all[i]); break; }
                }
            }).catch(function() { alert("上传失败，请重试"); });
        });
    }

    // ---------- Filter ----------
    var filterBtns = document.querySelectorAll(".filter-btn");
    for (var i = 0; i < filterBtns.length; i++) {
        (function(btn) {
            btn.addEventListener("click", function() {
                for (var j = 0; j < filterBtns.length; j++) filterBtns[j].classList.remove("active");
                btn.classList.add("active");
                renderProjects(btn.getAttribute("data-filter"));
                initScrollReveal();
            });
        })(filterBtns[i]);
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
                        "<button class=\"admin-btn edit\">编辑</button>" +
                        "<button class=\"admin-btn delete\">删除</button>" +
                    "</div>";
                adminList.appendChild(item);
                item.querySelector(".edit").addEventListener("click", function() { openForm(p); });
                item.querySelector(".delete").addEventListener("click", function() {
                    if (confirm("删除「" + p.title + "」？删除后无法恢复。")) deleteProject(p.id);
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
        // 删除后同步到COS
        if (canCos()) {
            syncProjectsToCos().catch(function(err) {
                console.error("删除后同步COS失败:", err && err.message ? err.message : err);
            });
        }
        renderAdminList();
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
                detail: { subtitle: subtitle || "", highlights: hlList, video: "" }
            };
            all.push(np);
            id = newId;
        }

        saveProjects(all);

        if (formCoverFile.files[0]) {
            var r = new FileReader();
            r.onload = function(ev) { saveCover(id, ev.target.result); };
            r.readAsDataURL(formCoverFile.files[0]);
        }
        if (formVideoFile.files[0]) {
            saveVideoDB(id, formVideoFile.files[0]);
        }

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
    // 从COS加载项目数据
    setTimeout(function() { loadProjectsFromCos(); }, 500);
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
            saveCos({
                bucket: elBucket.value.trim(),
                region: elRegion.value.trim(),
                secretId: elSecretId.value.trim(),
                secretKey: elSecretKey.value.trim()
            });
            if (elStatus) elStatus.innerHTML = "配置已保存，正在同步...";
            syncProjectsToCos().then(function() {
                if (elStatus) elStatus.innerHTML = "配置已保存，数据已同步到COS";
            }).catch(function(err) {
                console.error("COS同步失败:", err);
                if (elStatus) elStatus.innerHTML = "配置已保存，但同步失败";
            });
        });
    }

    // ---------- 添加同步按钮到管理面板 ----------
    (function() {
        var tb = document.querySelector("#addProjectBtn") ? document.querySelector("#addProjectBtn").parentNode : null;
        if (!tb || document.getElementById("syncCosBtn")) return;
        var btn = document.createElement("button");
        btn.id = "syncCosBtn";
        btn.className = "btn btn-outline";
        btn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:8px";
        btn.textContent = "同步项目数据到COS";
        tb.appendChild(btn);
        btn.addEventListener("click", function() {
            if (!canCos()) { alert("请先配置COS"); return; }
            btn.textContent = "同步中...";
            btn.disabled = true;
            syncProjectsToCos().then(function() {
                btn.textContent = "同步成功";
                setTimeout(function() { btn.textContent = "同步项目数据到COS"; btn.disabled = false; }, 2000);
            }).catch(function(err) {
                btn.textContent = "同步失败";
                console.error("同步失败:", err);
                setTimeout(function() { btn.textContent = "同步项目数据到COS"; btn.disabled = false; }, 3000);
            });
        });
    })();

    // ---------- Background Image (IndexedDB - no size limit) ----------
    function saveBgImage(blob) {
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
    bgUploadBtn.textContent = "🖼 更换网站背景图";
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
                alert("背景图已更新！");
            }).catch(function() {
                alert("上传失败，请重试");
            });
        });
    });

    var bgRemoveBtn = document.createElement("button");
    bgRemoveBtn.className = "btn btn-outline";
    bgRemoveBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:6px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)";
    bgRemoveBtn.textContent = "✕ 恢复默认黑色背景";
    tb.appendChild(bgRemoveBtn);

    bgRemoveBtn.addEventListener("click", function() {
        removeBgImage().then(function() {
            document.body.style.backgroundImage = "";
            var ov = document.getElementById("bgOverlay");
            if (ov) ov.remove();
            alert("已恢复默认黑色背景");
        });
    });

    loadBgImage();
    // ---------- Portrait Upload (About section) ----------
    function savePortrait(blob) {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).put(blob, "portrait");
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
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
    ptBtn.textContent = "🖼 上传个人头像";
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
                alert("头像已更新！");
            }).catch(function() { alert("上传失败"); });
        });
    });

    var ptDelBtn = document.createElement("button");
    ptDelBtn.className = "btn btn-outline";
    ptDelBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:6px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)";
    ptDelBtn.textContent = "✕ 删除个人头像";
    tb.appendChild(ptDelBtn);

    ptDelBtn.addEventListener("click", function() {
        removePortrait().then(function() {
            var ph = document.querySelector(".about-portrait-placeholder");
            if (ph) {
                ph.style.cssText = "";
                ph.innerHTML = "<span class=\"about-badge\" style=\"display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;font-size:28px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.08);border-radius:50%\">AI</span>";
            }
            alert("头像已删除");
        });
    });

    loadPortrait();
    // ---------- About Section Background ----------
    function saveAboutBg(blob) {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).put(blob, "about_bg");
                t.oncomplete = function() { res(); };
                t.onerror = function(e) { rej(e); };
            });
        });
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
    abBtn.textContent = "🖼 上传「视觉创作者」背景图";
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
                alert("背景图已更新！");
            }).catch(function() { alert("上传失败"); });
        });
    });

    var abDelBtn = document.createElement("button");
    abDelBtn.className = "btn btn-outline";
    abDelBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:6px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)";
    abDelBtn.textContent = "✕ 恢复「视觉创作者」默认背景";
    tb.appendChild(abDelBtn);

    abDelBtn.addEventListener("click", function() {
        removeAboutBg().then(function() {
            loadAboutBg();
            alert("已恢复默认");
        });
    });

    loadAboutBg();
    // ---------- Hero Background ----------
    function saveHeroBg(blob) {
        return openDB().then(function(db) {
            return new Promise(function(res, rej) {
                var t = db.transaction(VIDEO_STORE, "readwrite");
                t.objectStore(VIDEO_STORE).put(blob, "hero_bg");
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
    heroBtn.textContent = "🖼 上传首页首屏背景图";
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
                alert("首页背景已更新！");
            }).catch(function() { alert("上传失败"); });
        });
    });

    var heroDelBtn = document.createElement("button");
    heroDelBtn.className = "btn btn-outline";
    heroDelBtn.style.cssText = "width:100%;padding:10px 20px;font-size:13px;margin-top:6px;color:#ff6b6b;border-color:rgba(255,68,68,0.2)";
    heroDelBtn.textContent = "✕ 恢复首页默认效果";
    tb.appendChild(heroDelBtn);

    heroDelBtn.addEventListener("click", function() {
        removeHeroBg().then(function() {
            loadHeroBg();
            alert("已恢复默认");
        });
    });

    loadHeroBg();
    // ---------- Service Item Clicks (scroll to work + filter) ----------
    var serviceMap = {
        "AI短剧": "short-drama",
        "AI微电影": "micro-film",
        "品牌视觉": "brand",
        "AI工作流": "all"
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














