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
    var formCoverUrlInput = document.getElementById("formCoverUrl");
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

    // ====== COS Upload using Official Tencent SDK ======
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
        var bucket = c ? c.bucket : DEFAULT_BUCKET;
        var region = c ? c.region : DEFAULT_REGION;
        return "https://" + bucket + ".cos." + region + ".myqcloud.com";
    }
    function initCos() {
        var c = loadCos();
        if (!c || !c.secretId || !c.secretKey || !c.bucket || !c.region) return null;
        if (typeof COS === "undefined") {
            console.error("COS SDK not loaded. Check CDN script.");
            return null;
        }
        return new COS({
            SecretId: c.secretId,
            SecretKey: c.secretKey
        });
    }

    function upCos(file, key, timeout) {
        timeout = timeout || 30000;
        var cos = initCos();
        if (!cos) return Promise.reject(new Error("COS未配置或SDK未加载"));
        var c = loadCos();
        return new Promise(function(resolve, reject) {
            var timedOut = false;
            var timer = setTimeout(function() {
                timedOut = true;
                reject(new Error("COS上传超时(" + (timeout/1000) + "秒)"));
            }, timeout);
            cos.putObject({
                Bucket: c.bucket,
                Region: c.region,
                Key: key,
                Body: file,
                ACL: "public-read",
                onProgress: function() {}
            }, function(err, data) {
                if (timedOut) return;
                clearTimeout(timer);
                if (err) {
                    console.error("COS SDK错误:", err);
                    reject(new Error(err.message || "COS上传失败"));
                } else {
                    var url = "https://" + c.bucket + ".cos." + c.region + ".myqcloud.com/" + key;
                    resolve(url + "?t=" + Math.floor(Date.now() / 1000));
                }
            });
        });
    }

    // ====== COS Data Sync ======
    var COS_BUCKET_KEY = "cos_bucket_info";
    function saveCosBucketInfo(cfg) {
        try { localStorage.setItem(COS_BUCKET_KEY, JSON.stringify({bucket: cfg.bucket, region: cfg.region})); } catch(e) {}
    }
    function loadCosBucketInfo() {
        try { var s = localStorage.getItem(COS_BUCKET_KEY); return s ? JSON.parse(s) : null; } catch(e) { return null; }
    }
    var DEFAULT_BUCKET = "qaz123456-1454067625";
    var DEFAULT_REGION = "ap-beijing";
    function getCosJson(path) {
        var info = loadCosBucketInfo();
        var bucket = info ? info.bucket : DEFAULT_BUCKET;
        var region = info ? info.region : DEFAULT_REGION;
        var url = "https://" + bucket + ".cos." + region + ".myqcloud.com/" + path;
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
        // 合并lulu_covers到detail.coverUrl，确保封面URL一定被同步
        try {
            var covers = JSON.parse(localStorage.getItem(COVERS_KEY) || "{}");
            for (var si = 0; si < data.length; si++) {
                if (!data[si].detail) data[si].detail = {};
                if (!data[si].detail.coverUrl && covers[data[si].id]) {
                    data[si].detail.coverUrl = covers[data[si].id];
                }
            }
        } catch(se) {}
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
                // 合并数据：保留本地的coverUrl，不被COS旧数据冲掉
                var local = loadProjects();
                try {
                    var covers = JSON.parse(localStorage.getItem(COVERS_KEY) || "{}");
                } catch(ce) { var covers = {}; }
                for (var mi = 0; mi < data.length; mi++) {
                    if (!data[mi].detail) data[mi].detail = {};
                    // 从本地项目数据合并
                    for (var li = 0; li < local.length; li++) {
                        if (data[mi].id === local[li].id) {
                            var localCover = local[li].detail && local[li].detail.coverUrl;
                            if (localCover) {
                                data[mi].detail.coverUrl = localCover;
                            }
                            break;
                        }
                    }
                    // 从lulu_covers合并（兜底）
                    if (!data[mi].detail.coverUrl && covers[data[mi].id]) {
                        data[mi].detail.coverUrl = covers[data[mi].id];
                    }
                }
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
            // 压缩大图再保存到localStorage
            var img = new Image();
            img.onload = function() {
                try {
                    var maxW = 800, maxH = 600;
                    var w = img.width, h = img.height;
                    if (w > maxW || h > maxH) {
                        var ratio = Math.min(maxW / w, maxH / h, 1);
                        w = Math.round(w * ratio); h = Math.round(h * ratio);
                    }
                    var cvs = document.createElement("canvas");
                    cvs.width = w; cvs.height = h;
                    var ctx = cvs.getContext("2d");
                    ctx.drawImage(img, 0, 0, w, h);
                    var compressed = cvs.toDataURL("image/jpeg", 0.85);
                    var c = JSON.parse(localStorage.getItem(COVERS_KEY)) || {};
                    c[id] = compressed;
                    localStorage.setItem(COVERS_KEY, JSON.stringify(c));
                } catch(ce) {}
            };
            img.src = dataUrl;
        } catch(e) {}
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
                var cosCover = project.detail && project.detail.coverUrl;
                var localCover = getCover(project.id);
                var cover = cosCover || localCover || "";
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
        var cosCover2 = project.detail && project.detail.coverUrl;
        var localCover2 = getCover(project.id);
        var cover = cosCover2 || localCover2 || "";
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
        var cosVideo = detail && detail.videoUrl;
        if (cosVideo) {
            mediaDiv.innerHTML = "<video class=\"modal-video\" src=\"" + cosVideo + "\" controls preload=\"metadata\" playsinline style=\"width:100%;display:block;background:#1a1a1a;max-height:500px;border-radius:14px\"></video>";
        } else {
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
                        console.log("[封面DEBUG] saveCover done for project.id=" + project.id);
                        var f = inp.files[0];
                        if (canCos()) {
                            var coverKey = "covers/" + project.id + "_" + Date.now();
                            upCos(f, coverKey).then(function(url) {
                                var all = loadProjects();
                                for (var ci = 0; ci < all.length; ci++) {
                                    if (all[ci].id === project.id) {
                                        if (!all[ci].detail) all[ci].detail = {};
                                        all[ci].detail.coverUrl = url;
                                        saveProjects(all);
                                        console.log("[封面DEBUG] saveProjects done, verifying...");
                                        var v = loadProjects();
                                        var found = false;
                                        for (var vi = 0; vi < v.length; vi++) {
                                            if (v[vi].id === project.id) {
                                                found = true;
                                                if (v[vi].detail && v[vi].detail.coverUrl) {
                                                    console.log("[封面DEBUG] VERIFY OK: coverUrl=" + v[vi].detail.coverUrl);
                                                } else {
                                                    console.error("[封面DEBUG] VERIFY FAILED: coverUrl is missing after save!");
                                                }
                                                break;
                                            }
                                        }
                                        if (!found) console.error("[封面DEBUG] VERIFY FAILED: project.id=" + project.id + " not found in localStorage after save!");
                                        break;
                                    }
                                }
                                                                // 强制同步（封面URL可能未更新，但其他数据要同步）
                                syncProjectsToCos().catch(function(e2) {
                                    console.error("最终同步失败:", e2);
                                });
                            }).catch(function(err) {
                                console.error("封面上传到COS失败:", err && err.message ? err.message : err);
                            });
                        }
                        document.body.removeChild(inp);
                        // Reload fresh data before showing modal
                        var fresh = loadProjects();
                        var found = null;
                        for (var fi = 0; fi < fresh.length; fi++) {
                            if (fresh[fi].id === project.id) { found = fresh[fi]; break; }
                        }
                        openModal(found || project);
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
        }

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
        if (formCoverUrlInput) {
            formCoverUrlInput.value = (project && project.detail && project.detail.coverUrl) || "";
        }
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
        var coverUrlText = document.getElementById("formCoverUrl").value.trim();

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
                    all[i].detail.coverUrl = coverUrlText || all[i].detail.coverUrl || "";
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
                detail: { subtitle: subtitle || "", highlights: hlList, video: "", coverUrl: coverUrlText || "" }
            };
            all.push(np);
            id = newId;
        }

        saveProjects(all);

        var cosTasks = [];
        var uploadErrors = [];

        if (formCoverFile.files[0]) {
            // If URL text is filled, only save locally, dont upload to COS
            var f = formCoverFile.files[0];
            var r = new FileReader();
            r.onload = function(ev) { saveCover(id, ev.target.result); };
            r.readAsDataURL(f);
            if (canCos() && !coverUrlText) {
                var coverKey = "covers/" + id + "_" + Date.now();
                // 先计算预期URL并写入项目数据，确保同步时一定有值
                var baseUrl = getCosBaseUrl();
                var expectedUrl = baseUrl + "/" + coverKey + "?t=" + Math.floor(Date.now() / 1000);
                var allNow = loadProjects();
                for (var ni = 0; ni < allNow.length; ni++) {
                    if (allNow[ni].id === id) {
                        if (!allNow[ni].detail) allNow[ni].detail = {};
                        allNow[ni].detail.coverUrl = expectedUrl;
                        saveProjects(allNow);
                        console.log("[封面] 预写入coverUrl:", expectedUrl.slice(0,60));
                        break;
                    }
                }
                // 上传到COS并更新URL（带时间戳的新URL）
                try {
                    cosTasks.push(
                        upCos(f, coverKey).then(function(url) {
                            var all2 = loadProjects();
                            for (var ci = 0; ci < all2.length; ci++) {
                                if (all2[ci].id === id) {
                                    if (!all2[ci].detail) all2[ci].detail = {};
                                    all2[ci].detail.coverUrl = url;
                                    saveProjects(all2);
                                    console.log("[封面] COS上传成功,已更新coverUrl:", url.slice(0,60));
                                    break;
                                }
                            }
                        }).catch(function(err) {
                            // 上传失败但coverUrl已有值（预期URL），依然可用
                            uploadErrors.push("封面: " + (err.message || err));
                            console.error("[封面] COS上传失败,已保留预写入URL:", err);
                        })
                    );
                } catch(e) {
                    uploadErrors.push("封面上传异常: " + (e.message || e));
                    console.error("[封面] 上传异常:", e);
                }
            }
        }
        if (formVideoFile.files[0]) {
            (function(f) {
                var videoKey = "videos/" + id + "_" + Date.now();
                saveVideoDB(id, f);
                if (canCos()) {
                    cosTasks.push(
                        upCos(f, videoKey).then(function(url) {
                            for (var vi = 0; vi < all.length; vi++) {
                                if (all[vi].id === id) {
                                    if (!all[vi].detail) all[vi].detail = {};
                                    all[vi].detail.videoUrl = url;
                                    saveProjects(all);
                                    break;
                                }
                            }
                        })
                    );
                }
            })(formVideoFile.files[0]);
        }

        var doSync = function() {
            if (canCos()) {
                syncProjectsToCos().catch(function(err) {
                    console.error("自动同步到COS失败:", err && err.message ? err.message : err);
                });
            }
        };
        if (cosTasks.length > 0) {
            // allSettled: ensure sync runs even if upload fails
            var settleAll = typeof Promise.allSettled === "function"
                ? Promise.allSettled(cosTasks)
                : Promise.all(cosTasks.map(function(p) {
                    return p.then(function(v) { return {status:"fulfilled",value:v}; }, function(e) { return {status:"rejected",reason:e}; });
                }));
            settleAll.then(function(results) {
                var failed = results.filter(function(r) { return r.status === "rejected"; });
                if (failed.length > 0 || uploadErrors.length > 0) {
                    console.warn((failed.length + uploadErrors.length) + " upload(s) had issues, data still synced");
                }
                doSync();
            }).catch(function(e) {
                console.error("settleAll failed, forcing sync:", e);
                doSync();
            });
        } else {
            doSync();
        }
        // 即使上传失败，项目数据也会同步到COS（除封面图片本身外）
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
    // ====== COS 配置面板展开/收起 ======
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
                    if (c.secretId) elStatus.textContent = "已配置";
                    else elStatus.textContent = "";
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
            var cfg = {
                bucket: elBucket.value.trim(),
                region: elRegion.value.trim(),
                secretId: elSecretId.value.trim(),
                secretKey: elSecretKey.value.trim()
            };
            saveCos(cfg);
            saveCosBucketInfo(cfg);
            if (elStatus) elStatus.innerHTML = "配置已保存，正在同步...";
            syncProjectsToCos().then(function() {
                if (elStatus) elStatus.innerHTML = "配置已保存，数据已同步到COS";
            }).catch(function(err) {
                console.error("COS同步失败:", err);
                if (elStatus) elStatus.innerHTML = "配置已保存，但同步失败";
            });
        });
    }

    // ====== COS 连接测试 ======
    var cosTestBtn = document.getElementById("cosTestBtn");
    if (cosTestBtn) {
        cosTestBtn.addEventListener("click", function() {
            var elStatus = document.getElementById("cosStatus");
            if (!elStatus) return;
            var bucket = (document.getElementById("cosBucket") || {}).value || "";
            var region = (document.getElementById("cosRegion") || {}).value || "";
            var secretId = (document.getElementById("cosSecretId") || {}).value || "";
            var secretKey = (document.getElementById("cosSecretKey") || {}).value || "";
            if (!bucket || !region || !secretId || !secretKey) {
                elStatus.innerHTML = "请先填写所有COS配置字段";
                elStatus.style.color = "";
                return;
            }
            if (typeof COS === "undefined") {
                elStatus.innerHTML = "COS SDK未加载，检查网络";
                elStatus.style.color = "#ff6b6b";
                return;
            }
            elStatus.innerHTML = "正在测试连接...";
            elStatus.style.color = "";
            cosTestBtn.disabled = true;
            var host = bucket + ".cos." + region + ".myqcloud.com";
            var url = "https://" + host + "/?t=" + Date.now();
            cosTestBtn.disabled = true;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.onload = function() {
                cosTestBtn.disabled = false;
                if (xhr.status === 403 || xhr.status === 200 || xhr.status === 404) {
                    elStatus.innerHTML = "存储桶可达 (HTTP " + xhr.status + ") - 若为403可能是密钥问题";
                    elStatus.style.color = "#4caf50";
                } else {
                    elStatus.innerHTML = "HTTP " + xhr.status;
                    elStatus.style.color = "#ff6b6b";
                }
            };
            xhr.onerror = function() {
                cosTestBtn.disabled = false;
                elStatus.innerHTML = "无法连接 - 请在COS控制台设置CORS允许 https://xuanhuanai.github.io";
                elStatus.style.color = "#ff6b6b";
            };
            xhr.send();
        });
    }

    // ---------- 添加同步按钮到管理面板 ----------
    var tb = document.querySelector("#addProjectBtn") ? document.querySelector("#addProjectBtn").parentNode : null;
    (function() {
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
        }).then(function() {
            if (!canCos()) return;
            return upCos(blob, "assets/bg_image.jpg").catch(function(e) {
                console.error("网站背景COS上传失败:", e);
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
        var cosUrl = getCosBaseUrl() ? getCosBaseUrl() + "/assets/bg_image.jpg" : null;
        getBgImage().then(function(url) {
            var finalUrl = cosUrl || url || null;
            if (finalUrl) {
                document.body.style.backgroundImage = "url(" + finalUrl + ")";
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
        }).then(function() {
            if (!canCos()) return;
            return upCos(blob, "assets/portrait.jpg").catch(function(e) {
                console.error("头像COS上传失败:", e);
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
        var cosUrl = getCosBaseUrl() + "/assets/portrait.jpg";
        getPortrait().then(function(url) {
            var finalUrl = cosUrl || url || null;
            if (finalUrl) {
                var ph = document.querySelector(".about-portrait-placeholder");
                if (ph) {
                    ph.style.cssText = "width:180px;height:180px;border-radius:50%;background:url(" + finalUrl + ") center/cover no-repeat;overflow:hidden";
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
        }).then(function() {
            if (!canCos()) return;
            return upCos(blob, "assets/about_bg.jpg").catch(function(e) {
                console.error("关于背景COS上传失败:", e);
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
        var cosUrl = getCosBaseUrl() ? getCosBaseUrl() + "/assets/about_bg.jpg" : null;
        getAboutBg().then(function(url) {
            var sec = document.getElementById("about");
            if (sec) {
                var finalUrl = cosUrl || url || null;
                if (finalUrl) {
                    sec.style.background = "url(" + finalUrl + ") center/cover no-repeat fixed";
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
        }).then(function() {
            if (!canCos()) return;
            return upCos(blob, "assets/hero_bg.jpg").catch(function(e) {
                console.error("首屏背景COS上传失败:", e);
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
        var cosUrl = getCosBaseUrl() ? getCosBaseUrl() + "/assets/hero_bg.jpg" : null;
        getHeroBg().then(function(url) {
            var heroBg = document.querySelector(".hero-bg");
            if (heroBg) {
                // Priority: COS > local blob > gradient
                var finalUrl = cosUrl || url || null;
                if (finalUrl) {
                    heroBg.style.background = "url(" + finalUrl + ") center/cover no-repeat";
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














