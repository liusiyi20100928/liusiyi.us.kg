// admin.js —— 后台管理逻辑（含日志功能、先 getFile 再 putFile 修复）

let repoOwner = "", repoName = "", authToken = "";
let backendPass = "", localToken = "";

let infoData = [], infoSHA = "";
let imagesData = [], imagesSHA = "";
let helpSHA = "";

/*----------------------------------------
  DOM 引用
----------------------------------------*/
const loginSection    = document.getElementById("login-section");
const manageSection   = document.getElementById("manage-section");
const errorDiv        = document.getElementById("error");
const infoMessage     = document.getElementById("info-message");

const ghUserInput     = document.getElementById("gh-username");
const ghRepoInput     = document.getElementById("gh-repo");
const ghTokenInput    = document.getElementById("gh-token");
const setPassInput    = document.getElementById("set-pass");
const btnLogin        = document.getElementById("btn-login");
const btnLogout       = document.getElementById("btn-logout");

const btnToggleLog    = document.getElementById("btn-toggle-log");
const logPanel        = document.getElementById("log-panel");
const logHeader       = document.getElementById("log-header");
const logContent      = document.getElementById("log-content");

const btnManageAlbum  = document.getElementById("btn-manage-album");
const btnManageInfo   = document.getElementById("btn-manage-info");
const btnManageHelp   = document.getElementById("btn-manage-help");

const albumSection    = document.getElementById("album-manage-section");
const infoSection     = document.getElementById("info-manage-section");
const helpSection     = document.getElementById("help-manage-section");

const searchInput     = document.getElementById("search-input");
const albumListDiv    = document.getElementById("album-list");
const albumNameInput  = document.getElementById("album-name");
const albumUploadInput= document.getElementById("album-upload");
const btnUploadAlbum  = document.getElementById("btn-upload-album");
const albumMsgDiv     = document.getElementById("album-msg");

const infoTableBody   = document.querySelector("#info-table tbody");
const btnAddInfo      = document.getElementById("btn-add-info");
const messageDiv      = document.getElementById("message");

const helpInput       = document.getElementById("help-input");
const btnSaveHelp     = document.getElementById("btn-save-help");
const saveHelpMsg     = document.getElementById("save-help-msg");

const overlay         = document.getElementById("popup-overlay");
const popupTitle      = document.getElementById("popup-title");
const inpId           = document.getElementById("inp-id");
const inpName         = document.getElementById("inp-name");
const inpClass        = document.getElementById("inp-class");
const inpPhone        = document.getElementById("inp-phone");
const inpQQ           = document.getElementById("inp-qq");
const inpWechat       = document.getElementById("inp-wechat");
const inpPhoto        = document.getElementById("inp-photo");
const photoPreview    = document.getElementById("photo-preview");
const btnSaveInfo     = document.getElementById("btn-save-info");
const btnCancelInfo   = document.getElementById("btn-cancel-info");

let editInfoIndex = -1;
let uploadedPhotoData = "";

/*==========================================
  日志系统
==========================================*/
function appendLog(msg) {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] ${msg}\n`;
  logContent.textContent += line;
  logContent.scrollTop = logContent.scrollHeight;
}

/*==========================================
  本地存储：token & 密码
==========================================*/
function saveCredentials(token, password) {
  localStorage.setItem("admin-token", token);
  localStorage.setItem("admin-pass", password);
}
function loadCredentials() {
  localToken  = localStorage.getItem("admin-token")  || "";
  backendPass = localStorage.getItem("admin-pass")   || "";
}

/*==========================================
  GitHub Contents API
==========================================*/
async function getFile(path) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  const resp = await fetch(url, {
    headers: { Authorization: `token ${authToken}` }
  });
  if (!resp.ok) throw new Error(`无法获取 ${path} (HTTP ${resp.status})`);
  return resp.json();
}

async function putFile(path, contentBase64, sha, message) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  const body = { message, content: contentBase64, sha };
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${authToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error(`无法更新 ${path} (HTTP ${resp.status})`);
  return resp.json();
}

async function deleteFile(path, sha, message) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  const resp = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `token ${authToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, sha })
  });
  if (!resp.ok) throw new Error(`无法删除 ${path} (HTTP ${resp.status})`);
  return resp.json();
}

/*==========================================
  页面加载：检查是否已登录
==========================================*/
window.addEventListener("DOMContentLoaded", () => {
  loadCredentials();
  if (backendPass && localToken) {
    appendLog("检测到已保存令牌与密码，自动进入管理区");
    showManage();
  } else {
    appendLog("请先登录后台");
  }
});

/*==========================================
  登录逻辑
==========================================*/
btnLogin.addEventListener("click", async () => {
  errorDiv.textContent = "";

  const user  = ghUserInput.value.trim();
  const repo  = ghRepoInput.value.trim();
  const token = ghTokenInput.value.trim();
  const pass  = setPassInput.value.trim();

  if (!user || !repo || !token || !pass) {
    errorDiv.textContent = "请完整填写 GitHub 用户名、仓库、令牌、后台密码。";
    appendLog("登录失败：填写不完整");
    return;
  }
  if (pass.length < 6) {
    errorDiv.textContent = "后台密码至少 6 位。";
    appendLog("登录失败：密码长度不足");
    return;
  }

  repoOwner = user;
  repoName  = repo.split("/")[1];
  authToken = token;

  try {
    await getFile("data/info.json");
    saveCredentials(token, pass);
    appendLog("GitHub 验证通过，登录成功");
    showManage();
  } catch (err) {
    console.error(err);
    errorDiv.textContent = "GitHub 验证失败，请检查用户名/仓库/令牌。";
    appendLog(`GitHub 验证失败：${err.message}`);
  }
});

/*==========================================
  登出逻辑
==========================================*/
btnLogout.addEventListener("click", () => {
  localStorage.removeItem("admin-token");
  localStorage.removeItem("admin-pass");
  appendLog("已清除本地令牌与密码，返回登录页");
  location.reload();
});

/*==========================================
  日志面板 切换
==========================================*/
btnToggleLog.addEventListener("click", () => {
  if (logPanel.style.display === "none" || !logPanel.style.display) {
    logPanel.style.display = "block";
    appendLog("日志面板已展开");
  } else {
    logPanel.style.display = "none";
    appendLog("日志面板已折叠");
  }
});
logHeader.addEventListener("click", () => {
  if (logPanel.style.display === "none" || !logPanel.style.display) {
    logPanel.style.display = "block";
    appendLog("日志面板已展开");
  } else {
    logPanel.style.display = "none";
    appendLog("日志面板已折叠");
  }
});

/*==========================================
  展示管理区 & 加载数据
==========================================*/
function showManage() {
  loginSection.style.display = "none";
  manageSection.style.display = "block";
  authToken = localToken;
  repoOwner = ghUserInput.value.trim();
  repoName  = ghRepoInput.value.trim().split("/")[1];
  appendLog(`进入管理区（仓库：${repoOwner}/${repoName}）`);
  loadAllSections();
}

/*==========================================
  子面板切换
==========================================*/
btnManageAlbum.addEventListener("click", () => {
  albumSection.classList.remove("hidden");
  infoSection.classList.add("hidden");
  helpSection.classList.add("hidden");
  appendLog("切换到：回忆相册管理");
});
btnManageInfo.addEventListener("click", () => {
  albumSection.classList.add("hidden");
  infoSection.classList.remove("hidden");
  helpSection.classList.add("hidden");
  appendLog("切换到：信息查询管理");
});
btnManageHelp.addEventListener("click", () => {
  albumSection.classList.add("hidden");
  infoSection.classList.add("hidden");
  helpSection.classList.remove("hidden");
  appendLog("切换到：寻求帮助管理");
});

/*==========================================
  加载所有子功能区数据
==========================================*/
async function loadAllSections() {
  try {
    await loadImagesJSON();
    appendLog("加载 data/images.json 成功");
  } catch (err) {
    appendLog(`加载 images.json 失败：${err.message}`);
  }

  try {
    await loadInfoJSON();
    appendLog("加载 data/info.json 成功");
  } catch (err) {
    appendLog(`加载 info.json 失败：${err.message}`);
  }

  try {
    await loadHelpTXT();
    appendLog("加载 data/help.txt 成功");
  } catch (err) {
    appendLog(`加载 help.txt 失败：${err.message}`);
  }

  renderAlbumList(imagesData);
  renderInfoTable(infoData);
}

/*==========================================
  回忆相册 管理
==========================================*/
async function loadImagesJSON() {
  const data = await getFile("data/images.json");
  imagesSHA  = data.sha;
  imagesData = JSON.parse(atob(data.content));
}

function renderAlbumList(arr) {
  albumListDiv.innerHTML = "";
  arr.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "album-item";
    div.innerHTML = `
      <img src="../${item.path}" alt="${item.name}" />
      <span>${item.name}</span>
      <button class="delete-btn" onclick="deleteAlbum(${idx})">×</button>
    `;
    albumListDiv.appendChild(div);
  });
}

btnUploadAlbum.addEventListener("click", () => {
  const nameVal = albumNameInput.value.trim();
  const file    = albumUploadInput.files[0];
  if (!nameVal || !file) {
    albumMsgDiv.textContent = "请填写图片名称并选择文件。";
    appendLog("上传相册失败：名称或文件为空");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const base64Data = reader.result.split(",")[1];
      const filename   = `huiyi_${Date.now()}.jpg`;
      const newPath    = `image/${filename}`;

      appendLog(`开始上传相册图片：${filename}`);
      await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${newPath}`, {
        method: "PUT",
        headers: {
          Authorization: `token ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `上传相册图片 ${filename}`,
          content: base64Data
        })
      });
      appendLog(`图片上传成功：${newPath}`);

      const jsonResp = await getFile("data/images.json");
      imagesData = JSON.parse(atob(jsonResp.content));
      imagesData.push({ name: nameVal, path: newPath });
      imagesSHA = jsonResp.sha;

      const updated = btoa(JSON.stringify(imagesData, null, 2));
      await putFile("data/images.json", updated, imagesSHA, "更新 images.json：添加一条回忆");
      appendLog("data/images.json 更新成功：新条目已写入");

      renderAlbumList(imagesData);
      albumMsgDiv.textContent = "上传成功！";
      appendLog("回忆相册列表渲染完毕");
      albumNameInput.value = "";
      albumUploadInput.value = "";
    } catch (err) {
      console.error(err);
      albumMsgDiv.textContent = "上传失败，请检查控制台。";
      appendLog(`上传相册失败：${err.message}`);
    }
  };
  reader.readAsDataURL(file);
});

async function deleteAlbum(idx) {
  if (!confirm("确认删除该相册？")) return;
  try {
    const item = imagesData[idx];
    appendLog(`开始删除相册图片：${item.path}`);
    const imgData = await getFile(item.path);
    await deleteFile(item.path, imgData.sha, `删除回忆相册图片 ${item.path}`);
    appendLog(`图片文件已删除：${item.path}`);

    const jsonResp = await getFile("data/images.json");
    imagesData = JSON.parse(atob(jsonResp.content));
    imagesData.splice(idx, 1);
    imagesSHA = jsonResp.sha;

    const updated = btoa(JSON.stringify(imagesData, null, 2));
    await putFile("data/images.json", updated, imagesSHA, "更新 images.json：删除一条回忆");
    appendLog("data/images.json 更新成功：删除条目");

    renderAlbumList(imagesData);
    albumMsgDiv.textContent = "删除成功！";
  } catch (err) {
    console.error(err);
    albumMsgDiv.textContent = "删除失败，请检查控制台。";
    appendLog(`删除相册失败：${err.message}`);
  }
}

/*==========================================
  信息查询 管理
==========================================*/
async function loadInfoJSON() {
  const data = await getFile("data/info.json");
  infoSHA  = data.sha;
  infoData = JSON.parse(atob(data.content));
}

function renderInfoTable(arr) {
  infoTableBody.innerHTML = "";
  arr.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="../${item.photo}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;" /></td>
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.class}</td>
      <td>${item.phone}</td>
      <td>${item.qq}</td>
      <td>${item.wechat}</td>
      <td>
        <button class="action-btn" onclick="openEdit(${idx})">编辑</button>
        <button class="action-btn" style="background-color:#e74c3c;" onclick="deleteInfo(${idx})">删除</button>
      </td>`;
    infoTableBody.appendChild(tr);
  });
}

searchInput.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    const keyword = searchInput.value.trim();
    if (!keyword) {
      renderInfoTable(infoData);
      appendLog("信息查询：关键字为空，显示所有记录");
      return;
    }
    const filtered = infoData.filter(item =>
      item.name === keyword || item.id === keyword
    );
    renderInfoTable(filtered);
    appendLog(`信息查询：关键字 "${keyword}"，匹配到 ${filtered.length} 条记录`);
  }
});

btnAddInfo.addEventListener("click", () => {
  editInfoIndex = -1;
  popupTitle.textContent = "添加信息";
  clearPopupInputs();
  overlay.style.display = "flex";
  appendLog("弹出“添加信息”对话框");
});
btnCancelInfo.addEventListener("click", () => {
  overlay.style.display = "none";
  appendLog("取消“添加/编辑信息”对话框");
});

inpPhoto.addEventListener("change", () => {
  const file = inpPhoto.files[0];
  if (!file) {
    photoPreview.style.display = "none";
    appendLog("未选择新照片");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadedPhotoData = reader.result.split(",")[1];
    photoPreview.src = reader.result;
    photoPreview.style.display = "block";
    appendLog(`已选择照片：大小 ${file.size} 字节`);
  };
  reader.readAsDataURL(file);
});

function openEdit(idx) {
  const item = infoData[idx];
  editInfoIndex = idx;
  popupTitle.textContent = "编辑信息";
  inpId.value      = item.id;
  inpName.value    = item.name;
  inpClass.value   = item.class;
  inpPhone.value   = item.phone;
  inpQQ.value      = item.qq;
  inpWechat.value  = item.wechat;
  photoPreview.src = item.photo;
  photoPreview.style.display = "block";
  uploadedPhotoData = "";
  overlay.style.display = "flex";
  appendLog(`弹出“编辑信息”对话框：索引 ${idx}, 编号 ${item.id}`);
}

btnSaveInfo.addEventListener("click", async () => {
  const idVal     = inpId.value.trim();
  const nameVal   = inpName.value.trim();
  const classVal  = inpClass.value.trim();
  const phoneVal  = inpPhone.value.trim();
  const qqVal     = inpQQ.value.trim();
  const wechatVal = inpWechat.value.trim();

  if (!idVal || !nameVal || !classVal || !phoneVal || !qqVal || !wechatVal) {
    infoMessage.textContent = "请填写所有字段。";
    appendLog("保存信息失败：有必填字段为空");
    return;
  }

  try {
    let photoPath = "";
    if (uploadedPhotoData) {
      const filename = `student_${Date.now()}.jpg`;
      const newPath = `image/${filename}`;
      appendLog(`开始上传学生照片：${filename}`);
      await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${newPath}`, {
        method: "PUT",
        headers: {
          Authorization: `token ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `上传学生照片 ${filename}`,
          content: uploadedPhotoData
        })
      });
      photoPath = newPath;
      appendLog(`学生照片上传成功：${newPath}`);
    }

    appendLog("获取最新 data/info.json");
    const jsonResp = await getFile("data/info.json");
    const latestData = JSON.parse(atob(jsonResp.content));
    infoSHA = jsonResp.sha;
    infoData = latestData;

    if (editInfoIndex >= 0) {
      const oldItem = infoData[editInfoIndex];
      photoPath = photoPath || oldItem.photo;
      infoData[editInfoIndex] = {
        id: idVal,
        name: nameVal,
        class: classVal,
        phone: phoneVal,
        qq: qqVal,
        wechat: wechatVal,
        photo: photoPath
      };
      appendLog(`编辑记录：索引 ${editInfoIndex}, 新编号 ${idVal}`);
    } else {
      photoPath = photoPath || "image/sample.jpg";
      infoData.push({
        id: idVal,
        name: nameVal,
        class: classVal,
        phone: phoneVal,
        qq: qqVal,
        wechat: wechatVal,
        photo: photoPath
      });
      appendLog(`添加新记录：编号 ${idVal}`);
    }

    const updated = btoa(JSON.stringify(infoData, null, 2));
    appendLog("上传更新后的 data/info.json");
    await putFile("data/info.json", updated, infoSHA, "更新 info.json");
    appendLog("data/info.json 更新成功");

    const finalResp = await getFile("data/info.json");
    infoSHA  = finalResp.sha;
    infoData = JSON.parse(atob(finalResp.content));
    renderInfoTable(infoData);
    infoMessage.textContent = "保存成功！";
    appendLog("重新渲染信息列表 完成");
    overlay.style.display = "none";
  } catch (err) {
    console.error(err);
    infoMessage.textContent = "保存失败，请检查控制台。";
    appendLog(`保存信息失败：${err.message}`);
  }
});

async function deleteInfo(idx) {
  if (!confirm("确认删除此条信息？")) return;
  try {
    appendLog(`开始删除信息：索引 ${idx}`);
    const jsonResp = await getFile("data/info.json");
    let latestData = JSON.parse(atob(jsonResp.content));
    infoSHA = jsonResp.sha;
    latestData.splice(idx, 1);
    infoData = latestData;

    const updated = btoa(JSON.stringify(infoData, null, 2));
    appendLog("上传更新后的 data/info.json（删除记录）");
    await putFile("data/info.json", updated, infoSHA, "更新 info.json：删除一条记录");
    appendLog("data/info.json 更新成功（删除记录）");

    const finalResp = await getFile("data/info.json");
    infoSHA  = finalResp.sha;
    infoData = JSON.parse(atob(finalResp.content));
    renderInfoTable(infoData);
    messageDiv.textContent = "删除成功！";
    appendLog("重新渲染信息列表 完成（删除记录）");
  } catch (err) {
    console.error(err);
    messageDiv.textContent = "删除失败，请检查控制台。";
    appendLog(`删除信息失败：${err.message}`);
  }
}

function clearPopupInputs() {
  inpId.value      = "";
  inpName.value    = "";
  inpClass.value   = "";
  inpPhone.value   = "";
  inpQQ.value      = "";
  inpWechat.value  = "";
  inpPhoto.value   = "";
  photoPreview.style.display = "none";
  uploadedPhotoData = "";
}

/*==========================================
  寻求帮助 管理
==========================================*/
async function loadHelpTXT() {
  const data = await getFile("data/help.txt");
  helpSHA = data.sha;
  helpInput.value = atob(data.content).trim();
}

btnSaveHelp.addEventListener("click", async () => {
  const newLink = helpInput.value.trim();
  if (!newLink) {
    saveHelpMsg.textContent = "链接不能为空。";
    appendLog("保存 help.txt 失败：链接为空");
    return;
  }
  try {
    appendLog("获取最新 data/help.txt");
    const data = await getFile("data/help.txt");
    helpSHA = data.sha;
    const updated = btoa(newLink);
    appendLog("上传更新后的 data/help.txt");
    await putFile("data/help.txt", updated, helpSHA, "更新 help.txt");
    const finalData = await getFile("data/help.txt");
    helpSHA = finalData.sha;
    saveHelpMsg.textContent = "保存成功！";
    appendLog("data/help.txt 更新成功");
  } catch (err) {
    console.error(err);
    saveHelpMsg.textContent = "保存失败，请检查控制台。";
    appendLog(`保存 help.txt 失败：${err.message}`);
  }
});

/*==========================================
  初次加载时获取数据
==========================================*/
async function loadAllSections() {
  try {
    await loadImagesJSON();
    appendLog("成功加载 data/images.json");
  } catch (err) {
    appendLog(`加载 images.json 失败：${err.message}`);
  }

  try {
    await loadInfoJSON();
    appendLog("成功加载 data/info.json");
  } catch (err) {
    appendLog(`加载 info.json 失败：${err.message}`);
  }

  try {
    await loadHelpTXT();
    appendLog("成功加载 data/help.txt");
  } catch (err) {
    appendLog(`加载 help.txt 失败：${err.message}`);
  }

  renderAlbumList(imagesData);
  renderInfoTable(infoData);
}
