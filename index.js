const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// अपना Admin Password यहां डालो
const ADMIN_PASSWORD = "CHANGE_ME_123";

const DATA_DIR = __dirname;
const VIDEO_DIR = path.join(DATA_DIR, "uploads");
const DATA_FILE = path.join(DATA_DIR, "videos.json");

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(VIDEO_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.random().toString(36).slice(2);
    cb(null, name + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }
});

function getVideos() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveVideos(videos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(videos, null, 2));
}

function page(content) {
  return `
<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Raja TV</title>

<style>
*{box-sizing:border-box}
body{
  margin:0;
  background:#111;
  color:white;
  font-family:Arial,sans-serif;
  padding-bottom:75px;
}
header{
  background:#ed0712;
  padding:16px;
  text-align:center;
  font-size:27px;
  font-weight:bold;
  position:sticky;
  top:0;
  z-index:10;
}
.container{
  max-width:700px;
  margin:auto;
  padding:15px;
}
.search{
  display:flex;
  gap:8px;
  margin:15px 0;
}
.search input{
  flex:1;
  padding:13px;
  border:0;
  border-radius:10px;
  font-size:16px;
}
button{
  border:0;
  border-radius:10px;
  padding:12px 16px;
  background:#ed0712;
  color:white;
  font-weight:bold;
}
.card{
  background:#222;
  border-radius:18px;
  padding:12px;
  margin:18px 0;
}
video{
  width:100%;
  max-height:600px;
  border-radius:13px;
  background:#000;
}
.title{
  font-size:19px;
  font-weight:bold;
  margin-top:12px;
}
.info{
  color:#aaa;
  margin-top:7px;
  font-size:14px;
}
.profile{
  background:#222;
  padding:20px;
  border-radius:18px;
}
input,textarea{
  width:100%;
  padding:12px;
  margin:7px 0;
  border-radius:9px;
  border:0;
}
.bottom{
  position:fixed;
  bottom:0;
  left:0;
  right:0;
  background:#202020;
  display:flex;
  justify-content:space-around;
  padding:10px 4px;
  z-index:20;
}
.bottom a{
  color:white;
  text-decoration:none;
  text-align:center;
  font-size:12px;
}
.bottom b{
  display:block;
  font-size:21px;
}
.admin{
  background:#181818;
  border:1px solid #444;
  padding:15px;
  border-radius:15px;
  margin-top:20px;
}
.delete{
  background:#b00000;
  margin-top:10px;
}
</style>
</head>

<body>

<header>📺 Raja TV</header>

<div class="container">
${content}
</div>

<div class="bottom">
<a href="/"><b>🏠</b>Home</a>
<a href="/search"><b>🔎</b>Search</a>
<a href="/foryou"><b>❤️</b>For You</a>
<a href="/profile"><b>👤</b>Profile</a>
<a href="/admin"><b>⬆️</b>Admin</a>
</div>

</body>
</html>
`;
}

function videoCard(v) {
  return `
  <div class="card">
    <video controls playsinline preload="metadata"
      src="${v.url}"
      data-id="${v.id}"
      onplay="addHistory(${v.id})"></video>

    <div class="title">${escapeHtml(v.title)}</div>
    <div class="info">👁️ ${v.views || 0} views</div>
  </div>
  `;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// HOME
app.get("/", (req, res) => {
  const videos = getVideos();

  let html = `
  <div class="search">
    <form action="/search" method="get" style="display:flex;width:100%;gap:8px">
      <input name="q" placeholder="Video title search करें">
      <button>🔎</button>
    </form>
  </div>

  <h2>Latest Videos</h2>
  `;

  if (!videos.length) {
    html += `<p>अभी कोई video upload नहीं हुई है।</p>`;
  } else {
    html += videos.map(videoCard).join("");
  }

  html += `
  <script>
  function addHistory(id){
    let h = JSON.parse(localStorage.getItem("history") || "[]");
    h = h.filter(x => x !== id);
    h.unshift(id);
    localStorage.setItem("history", JSON.stringify(h.slice(0,50)));

    fetch("/view/" + id, {method:"POST"});
  }
  </script>
  `;

  res.send(page(html));
});

// SEARCH
app.get("/search", (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const videos = getVideos();

  const results = videos.filter(v =>
    String(v.title || "").toLowerCase().includes(q)
  );

  let html = `
  <h2>🔎 Search</h2>
  <form action="/search" method="get" class="search">
    <input name="q" value="${escapeHtml(q)}" placeholder="Title search करें">
    <button>Search</button>
  </form>
  `;

  if (!results.length) {
    html += `<p>कोई video नहीं मिली।</p>`;
  } else {
    html += results.map(videoCard).join("");
  }

  html += `
  <script>
  function addHistory(id){
    let h=JSON.parse(localStorage.getItem("history")||"[]");
    h=h.filter(x=>x!==id);
    h.unshift(id);
    localStorage.setItem("history",JSON.stringify(h.slice(0,50)));
    fetch("/view/"+id,{method:"POST"});
  }
  </script>
  `;

  res.send(page(html));
});

// VIEW COUNT
app.post("/view/:id", (req, res) => {
  const id = Number(req.params.id);
  const videos = getVideos();
  const video = videos.find(v => v.id === id);

  if (video) {
    video.views = (video.views || 0) + 1;
    saveVideos(videos);
  }

  res.json({ ok:true });
});

// FOR YOU / HISTORY
app.get("/foryou", (req, res) => {
  const videos = getVideos();

  let html = `
  <h2>❤️ For You</h2>
  <p style="color:#aaa">आपने जो videos देखी हैं वे यहां दिखाई देंगी।</p>
  <div id="history"></div>

  <script>
  const ids = JSON.parse(localStorage.getItem("history") || "[]");
  const all = ${JSON.stringify(videos)};

  const found = ids
    .map(id => all.find(v => v.id === id))
    .filter(Boolean);

  const box = document.getElementById("history");

  if(!found.length){
    box.innerHTML = "<p>अभी कोई viewing history नहीं है।</p>";
  }else{
    box.innerHTML = found.map(v => \`
      <div class="card">
        <video controls playsinline src="\${v.url}"></video>
        <div class="title">\${v.title}</div>
        <div class="info">👁️ \${v.views || 0} views</div>
      </div>
    \`).join("");
  }
  </script>
  `;

  res.send(page(html));
});

// PROFILE
app.get("/profile", (req, res) => {
  const html = `
  <h2>👤 Profile</h2>

  <div class="profile">
    <h3>आपकी Profile</h3>

    <label>नाम</label>
    <input id="name" placeholder="अपना नाम">

    <label>Gmail / Mobile</label>
    <input id="contact" placeholder="Gmail या Mobile">

    <label>Profile Photo URL</label>
    <input id="photo" placeholder="Photo URL">

    <button onclick="saveProfile()">Save Profile</button>

    <div id="saved" style="margin-top:20px"></div>
  </div>

  <script>
  function loadProfile(){
    const p=JSON.parse(localStorage.getItem("profile")||"{}");

    document.getElementById("name").value=p.name||"";
    document.getElementById("contact").value=p.contact||"";
    document.getElementById("photo").value=p.photo||"";

    if(p.name){
      document.getElementById("saved").innerHTML =
      "<h3>👤 "+p.name+"</h3>"+
      (p.photo ? "<img src='"+p.photo+"' style='width:90px;height:90px;border-radius:50%;object-fit:cover'>" : "")+
      "<p>"+(p.contact||"")+"</p>";
    }
  }

  function saveProfile(){
    const p={
      name:document.getElementById("name").value,
      contact:document.getElementById("contact").value,
      photo:document.getElementById("photo").value
    };

    localStorage.setItem("profile",JSON.stringify(p));
    loadProfile();
    alert("Profile saved!");
  }

  loadProfile();
  </script>
  `;

  res.send(page(html));
});

// ADMIN LOGIN + UPLOAD
app.get("/admin", (req, res) => {
  const html = `
  <h2>⬆️ Admin Panel</h2>

  <div class="admin">
    <form action="/admin/upload" method="post" enctype="multipart/form-data">

      <label>Admin Password</label>
      <input type="password" name="password" required>

      <label>Video Title</label>
      <input type="text" name="title" placeholder="Video title" required>

      <label>Video File</label>
      <input type="file" name="video" accept="video/*" required>

      <button type="submit">⬆️ Upload Video</button>

    </form>
  </div>

  <h3>Admin से Video Delete</h3>

  <form action="/admin/delete" method="post">
    <input type="password" name="password" placeholder="Admin Password" required>
    <input type="number" name="id" placeholder="Video ID" required>
    <button class="delete">🗑️ Delete Video</button>
  </form>

  <h3>Uploaded Videos</h3>
  `;

  const videos = getVideos();

  const list = videos.map(v => `
    <div class="card">
      <b>ID: ${v.id}</b><br>
      ${escapeHtml(v.title)}<br>
      👁️ ${v.views || 0} views
    </div>
  `).join("");

  res.send(page(html + (list || "<p>No videos.</p>")));
});

// UPLOAD
app.post("/admin/upload", upload.single("video"), (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.send(page("<h2>❌ Wrong Admin Password</h2><a href='/admin'>Back</a>"));
  }

  if (!req.file) {
    return res.send(page("<h2>❌ Video select करें</h2><a href='/admin'>Back</a>"));
  }

  const videos = getVideos();

  const newVideo = {
    id: Date.now(),
    title: req.body.title,
    description: "",
    url: "/uploads/" + req.file.filename,
    views: 0,
    createdAt: new Date().toISOString()
  };

  videos.unshift(newVideo);
  saveVideos(videos);

  res.send(page(`
    <h2>✅ Video Upload हो गई!</h2>
    <p>${escapeHtml(newVideo.title)}</p>
    <a href="/">🏠 Home पर जाएं</a>
  `));
});

// DELETE
app.post("/admin/delete", (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.send(page("<h2>❌ Wrong Admin Password</h2><a href='/admin'>Back</a>"));
  }

  const id = Number(req.body.id);
  const videos = getVideos();
  const video = videos.find(v => v.id === id);

  if (!video) {
    return res.send(page("<h2>❌ Video नहीं मिली</h2><a href='/admin'>Back</a>"));
  }

  const filename = path.basename(video.url);
  const filepath = path.join(VIDEO_DIR, filename);

  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

  saveVideos(videos.filter(v => v.id !== id));

  res.send(page(`
    <h2>✅ Video Delete हो गई!</h2>
    <a href="/admin">Admin Panel</a>
  `));
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("==============================");
  console.log(" Raja TV Show चालू हो गया!");
  console.log("==============================");
  console.log("");
  console.log("Browser में खोलें:");
  console.log("http://127.0.0.1:" + PORT);
  console.log("");
});
