js_path = "D:/AI视频/website/js/main.js"
h_path = "D:/AI视频/website/index.html"
css_path = "D:/AI视频/website/css/style.css"

js = open(js_path, "r", encoding="utf-8").read()
html = open(h_path, "r", encoding="utf-8").read()
css = open(css_path, "r", encoding="utf-8").read()

# === HTML: Add hidden file input before script tags ===
old_html_end = '<script src="js/projects.js"></script>'
new_html_end = '<input type="file" id="videoUploadInput" accept="video/*" style="display:none">\n<script src="js/projects.js"></script>'
html = html.replace(old_html_end, new_html_end)

# === JS: Add video upload support ===

# 1. Add video storage functions
js = js.replace(
    'var workGrid = document.getElementById("workGrid");',
    'var workGrid = document.getElementById("workGrid");\n    var videoUploadInput = document.getElementById("videoUploadInput");\n    var currentUploadProjectId = null;\n\n    function getCustomVideos() { try { return JSON.parse(localStorage.getItem("lulu_videos")) || {}; } catch(e) { return {}; } }\n    function saveCustomVideos(v) { try { localStorage.setItem("lulu_videos", JSON.stringify(v)); } catch(e) { alert("视频太大，建议放入视频素材文件夹后配置路径"); } }'
)

# 2. In openModal, after showing modal, add video upload button
js = js.replace(
    'document.body.style.overflow = "hidden";\n        modal.classList.add("open");\n    }',
    '// Check for custom uploaded video\n        var customVideos = getCustomVideos();\n        if (customVideos[project.id]) {\n            var mediaDiv = modalContent.querySelector(".modal-media");\n            if (mediaDiv) {\n                mediaDiv.innerHTML = "<video class=\\"modal-video\\" src=\\"" + customVideos[project.id] + "\\" controls preload=\\"metadata\\" playsinline webkit-playsinline style=\\"width:100%;display:block;background:#1a1a1a\\"></video>";\n            }\n        } else if (!project.detail.video) {\n            var mediaDiv = modalContent.querySelector(".modal-media");\n            if (mediaDiv) {\n                var uploadDiv = document.createElement("div");\n                uploadDiv.className = "modal-video-upload";\n                uploadDiv.innerHTML = "<button class=\\"btn-upload-video\\">上传视频</button>";\n                mediaDiv.appendChild(uploadDiv);\n                uploadDiv.querySelector(".btn-upload-video").addEventListener("click", function() {\n                    currentUploadProjectId = project.id;\n                    videoUploadInput.click();\n                });\n            }\n        }\n\n        document.body.style.overflow = "hidden";\n        modal.classList.add("open");\n    }'
)

# 3. Add video file input handler before Init
js = js.replace(
    '// ---------- Init ----------',
    '// ---------- Video Upload Handler ----------\n    if (videoUploadInput) {\n        videoUploadInput.addEventListener("change", function(e) {\n            var file = e.target.files[0];\n            if (!file || !currentUploadProjectId) return;\n            if (file.size > 50 * 1024 * 1024) { alert("视频不能超过 50MB"); return; }\n            var reader = new FileReader();\n            reader.onload = function(ev) {\n                var videos = getCustomVideos();\n                videos[currentUploadProjectId] = ev.target.result;\n                saveCustomVideos(videos);\n                videoUploadInput.value = "";\n                // Re-open modal\n                for (var i = 0; i < projects.length; i++) {\n                    if (projects[i].id === currentUploadProjectId) {\n                        openModal(projects[i]);\n                        break;\n                    }\n                }\n            };\n            reader.readAsDataURL(file);\n        });\n    }\n\n    // ---------- Init ----------'
)

# === CSS: Add upload video button styles ===
old_css_end = "img, video {\n    max-width: 100%;\n    height: auto;\n}"
new_css_end = """img, video {
    max-width: 100%;
    height: auto;
}

/* Video upload button in modal */
.modal-video-upload {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    background: var(--dark-gray);
    border-radius: 14px;
}
.btn-upload-video {
    padding: 12px 28px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
    color: var(--silver);
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: var(--font-sans);
}
.btn-upload-video:hover {
    color: var(--white);
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.25);
}"""

css = css.replace(old_css_end, new_css_end)

# Write all files
open(js_path, "w", encoding="utf-8").write(js)
open(h_path, "w", encoding="utf-8").write(html)
open(css_path, "w", encoding="utf-8").write(css)

print("Files updated!")
print(f"JS: {len(js)} chars")
print(f"HTML: {len(html)} chars")
print(f"CSS: {len(css)} chars")
