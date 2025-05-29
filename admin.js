// ==========================================
// admin.js —— 后台管理脚本（已修复：先获取本地 info.json，再 PUT）
// ==========================================

// —— 全局状态 & DOM 引用 ——
// 后面要用 GitHub API，要有 repoOwner、repoName、authToken
let repoOwner = "", repoName = "", authToken = "";
// 后台密码存 localStorage，用于免输令牌
let backendPass = "", localToken = "";

// 三个数据文件的缓存与 sha 值
let infoData = [], infoSHA = "";
let imagesData = [], imagesSHA = "";
let helpSHA = "";

/*----------------------------------------
  DOM 元素引用
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

// 添加/编辑 信息 弹窗
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

let editInfoIndex = -1;     // -1 = 新增；>=0 = 编辑
let uploadedPhotoData = ""; // Base64 存储

/*==========================================
  本地存储：保存 GitHub 令牌 & 后台密码
==========================================*/
function saveCredentials(token, password) {
  localStorage.setItem("memoryManual_token", token);
  localStorage.setItem("memoryManual_pass", password);
}
function loadCredentials() {
  localToken    = localStorage.getItem("memoryManual_token")  || "";
  backendPass   = localStorage.getItem("memoryManual_pass")   || "";
}

/*==========================================
  GitHub Contents API 辅助函数
==========================================*/
async function getFile(path) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  const resp = await fetch(url, {
    headers: { Authorization: `token ${authToken}` }
  });
  if (!resp.ok) {
    throw new Error(`无法获取 ${path} (HTTP ${resp.status})`);
  }
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
  if (!resp.ok) {
    throw new Error(`无法更新 ${path} (HTTP ${resp.status})`);
  }
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
  if (!resp.ok) {
    throw new Error(`无法删除 ${path} (HTTP ${resp.status})`);
  }
  return resp.json();
}

/*==========================================
  页面加载：检查 localStorage 中是否已存在密码+令牌
==========================================*/
window.addEventListener("DOMContentLoaded", () => {
  loadCredentials();
  if (backendPass && localToken) {
    // 如果 localStorage 里已有 GitHub 令牌和后台密码，直接显示管理区
    showManage();
  }
});

/*==========================================
  登录逻辑（首次输入 GitHub 令牌 + 后台密码）
==========================================*/
btnLogin.addEventListener("click", async () => {
  errorDiv.textContent = "";

  const user  = ghUserInput.value.trim();
  const repo  = ghRepoInput.value.trim();
  const token = ghTokenInput.value.trim();
  const pass  = setPassInput.value.trim();

  if (!user || !repo || !token || !pass) {
    errorDiv.textContent = "请完整填写 GitHub 用户名、仓库、令牌、后台密码。";
    return;
  }
  if (pass.length < 6) {
    errorDiv.textContent = "后台密码至少 6 位。";
    return;
  }

  repoOwner = user;
  repoName  = repo.split("/")[1];
  authToken = token;

  try {
    // 测试能否读取 data/info.json
    await getFile("data/info.json");
    // 如果没有抛错，说明令牌有效
    saveCredentials(token, pass);
    showManage();
  } catch (err) {
    console.error(err);
    errorDiv.textContent = "GitHub 验证失败，请检查用户名/仓库/令牌。";
  }
});

/*==========================================
  登出逻辑
==========================================*/
btnLogout.addEventListener("click", () => {
  localStorage.removeItem("memoryManual_token");
  localStorage.removeItem("memoryManual_pass");
  location.reload();
});

/*==========================================
  显示管理面板 & 加载所有子功能区数据
==========================================*/
function showManage() {
  loginSection.style.display = "none";
  manageSection.style.display = "block";
  authToken = localToken;
  repoOwner = ghUserInput.value.trim();
  repoName  = ghRepoInput.value.trim().split("/")[1];
  loadAllSections();
}

/*==========================================
  切换“回忆相册”“信息查询”“寻求帮助”子面板
==========================================*/
btnManageAlbum.addEventListener("click", () => {
  albumSection.classList.remove("hidden");
  infoSection.classList.add("hidden");
  helpSection.classList.add("hidden");
});
btnManageInfo.addEventListener("click", () => {
  albumSection.classList.add("hidden");
  infoSection.classList.remove("hidden");
  helpSection.classList.add("hidden");
});
btnManageHelp.addEventListener("click", () => {
  albumSection.classList.add("hidden");
  infoSection.classList.add("hidden");
  helpSection.classList.remove("hidden");
});

/*==========================================
  加载并渲染“回忆相册”“信息查询”“帮助”三个数据文件
==========================================*/
async function loadAllSections() {
  await loadImagesJSON();
  await loadInfoJSON();
  await loadHelpTXT();

  renderAlbumList(imagesData);
  renderInfoTable(infoData);
}

/*==========================================
  —— 回忆相册 管理 —— 
    1. 拉取 data/images.json
    2. 渲染列表
    3. 上传新图片 → 上传到 image/ → 更新 JSON → PUT 回去 
    4. 删除图片 → DELETE image/xxx → 更新 JSON → PUT 回去
==========================================*/
async function loadImagesJSON() {
  try {
    const data = await getFile("data/images.json");
    imagesSHA  = data.sha;
    imagesData = JSON.parse(atob(data.content));
  } catch {
    imagesData = [];
    imagesSHA  = "";
  }
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
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const base64Data = reader.result.split(",")[1];
      const filename   = `huiyi_${Date.now()}.jpg`;
      const newPath    = `image/${filename}`;

      // 1. 上传图片到仓库
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

      // 2. 重新拉取 images.json 最新内容
      const jsonResp = await getFile("data/images.json");
      imagesData = JSON.parse(atob(jsonResp.content));
      imagesData.push({ name: nameVal, path: newPath });
      imagesSHA = jsonResp.sha;

      // 3. PUT 回 images.json
      const updated = btoa(JSON.stringify(imagesData, null, 2));
      await putFile("data/images.json", updated, imagesSHA, "更新 images.json：添加一条回忆");

      renderAlbumList(imagesData);
      albumMsgDiv.textContent = "上传成功！";
      albumNameInput.value = "";
      albumUploadInput.value = "";
    } catch (err) {
      console.error(err);
      albumMsgDiv.textContent = "上传失败，请检查控制台。";
    }
  };
  reader.readAsDataURL(file);
});

async function deleteAlbum(idx) {
  if (!confirm("确认删除该相册？")) return;
  try {
    // 1. 先删除 image/xxx.jpg
    const item = imagesData[idx];
    const imgData = await getFile(item.path);
    await deleteFile(item.path, imgData.sha, `删除回忆相册图片 ${item.path}`);

    // 2. 更新 imagesData 数组
    const jsonResp = await getFile("data/images.json");
    imagesData = JSON.parse(atob(jsonResp.content));
    imagesData.splice(idx, 1);
    imagesSHA = jsonResp.sha;

    // 3. PUT 回去 images.json
    const updated = btoa(JSON.stringify(imagesData, null, 2));
    await putFile("data/images.json", updated, imagesSHA, "更新 images.json：删除一条回忆");

    renderAlbumList(imagesData);
    albumMsgDiv.textContent = "删除成功！";
  } catch (err) {
    console.error(err);
    albumMsgDiv.textContent = "删除失败，请检查控制台。";
  }
}

/*==========================================
  —— 信息查询 管理 —— 
    1. 拉取 data/info.json
    2. 渲染表格
    3. 新增或编辑：先 getFile 获取最新 sha + 内容 → 修改本地数组 → putFile 上传
    4. 删除：先 getFile 获取最新 sha + 内容 → 修改本地数组 → putFile 上传
==========================================*/
async function loadInfoJSON() {
  try {
    const data = await getFile("data/info.json");
    infoSHA  = data.sha;
    infoData = JSON.parse(atob(data.content));
  } catch {
    infoData = [];
    infoSHA  = "";
  }
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

// 搜索 (按 姓名 或 编号 精确匹配)
searchInput.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    const keyword = searchInput.value.trim();
    if (!keyword) {
      renderInfoTable(infoData);
      return;
    }
    const filtered = infoData.filter(item =>
      item.name === keyword || item.id === keyword
    );
    renderInfoTable(filtered);
  }
});

// 点击“添加新信息”
btnAddInfo.addEventListener("click", () => {
  editInfoIndex = -1;
  popupTitle.textContent = "添加信息";
  clearPopupInputs();
  overlay.style.display = "flex";
});
btnCancelInfo.addEventListener("click", () => {
  overlay.style.display = "none";
});

// 预览上传的学生照片
inpPhoto.addEventListener("change", () => {
  const file = inpPhoto.files[0];
  if (!file) {
    photoPreview.style.display = "none";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadedPhotoData = reader.result.split(",")[1];
    photoPreview.src = reader.result;
    photoPreview.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// “编辑”按钮回调：把数据写入弹窗
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
}

// 点击“保存”按钮：首先 getFile 再 putFile
btnSaveInfo.addEventListener("click", async () => {
  const idVal     = inpId.value.trim();
  const nameVal   = inpName.value.trim();
  const classVal  = inpClass.value.trim();
  const phoneVal  = inpPhone.value.trim();
  const qqVal     = inpQQ.value.trim();
  const wechatVal = inpWechat.value.trim();

  if (!idVal || !nameVal || !classVal || !phoneVal || !qqVal || !wechatVal) {
    infoMessage.textContent = "请填写所有字段。";
    return;
  }

  try {
    // 1. 先上传新照片（如果有）
    let photoPath = "";
    if (uploadedPhotoData) {
      const filename = `student_${Date.now()}.jpg`;
      const newPath = `image/${filename}`;
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
    }

    // 2. 重新 GET 一次 info.json，确保拿到最新 sha 和内容
    const jsonResp = await getFile("data/info.json");
    const latestData = JSON.parse(atob(jsonResp.content));
    infoSHA = jsonResp.sha;
    infoData = latestData;

    // 3. 根据 editInfoIndex 决定是“编辑”还是“新增”
    if (editInfoIndex >= 0) {
      // 编辑：替换数组中对应项
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
    } else {
      // 新增：追加到数组末尾
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
    }

    // 4. PUT 回去 data/info.json
    const updated = btoa(JSON.stringify(infoData, null, 2));
    await putFile("data/info.json", updated, infoSHA, "更新 info.json");

    // 5. 重新 GET 一次，更新本地 infoSHA、infoData
    const finalResp = await getFile("data/info.json");
    infoSHA  = finalResp.sha;
    infoData = JSON.parse(atob(finalResp.content));

    renderInfoTable(infoData);
    infoMessage.textContent = "保存成功！";
    overlay.style.display = "none";
  } catch (err) {
    console.error(err);
    infoMessage.textContent = "保存失败，请检查控制台。";
  }
});

// 点击“删除”按钮
async function deleteInfo(idx) {
  if (!confirm("确认删除此条信息？")) return;
  try {
    // 1. 先 GET 最新 info.json
    const jsonResp = await getFile("data/info.json");
    let latestData = JSON.parse(atob(jsonResp.content));
    infoSHA = jsonResp.sha;
    // 2. 从数组中移除
    latestData.splice(idx, 1);
    infoData = latestData;
    // 3. PUT 回去
    const updated = btoa(JSON.stringify(infoData, null, 2));
    await putFile("data/info.json", updated, infoSHA, "更新 info.json：删除一条记录");
    // 4. 再次 GET 更新本地
    const finalResp = await getFile("data/info.json");
    infoSHA  = finalResp.sha;
    infoData = JSON.parse(atob(finalResp.content));

    renderInfoTable(infoData);
    infoMessage.textContent = "删除成功！";
  } catch (err) {
    console.error(err);
    infoMessage.textContent = "删除失败，请检查控制台。";
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
  —— 寻求帮助 管理 —— 
    1. GET data/help.txt
    2. 修改后 PUT 回去
==========================================*/
async function loadHelpTXT() {
  try {
    const data = await getFile("data/help.txt");
    helpSHA = data.sha;
    helpInput.value = atob(data.content).trim();
  } catch {
    helpInput.value = "";
    helpSHA = "";
  }
}

btnSaveHelp.addEventListener("click", async () => {
  const newLink = helpInput.value.trim();
  if (!newLink) {
    saveHelpMsg.textContent = "链接不能为空。";
    return;
  }
  try {
    // 先 GET 最新的 help.txt
    const data = await getFile("data/help.txt");
    helpSHA = data.sha;
    // PUT 新内容
    const updated = btoa(newLink);
    await putFile("data/help.txt", updated, helpSHA, "更新 help.txt");
    // 再次 GET 更新本地
    const finalData = await getFile("data/help.txt");
    helpSHA = finalData.sha;
    saveHelpMsg.textContent = "保存成功！";
  } catch (err) {
    console.error(err);
    saveHelpMsg.textContent = "保存失败，请检查控制台。";
  }
});

/*==========================================
  初次加载时，读取三个数据文件
==========================================*/
async function loadAllSections() {
  await loadImagesJSON();
  await loadInfoJSON();
  await loadHelpTXT();
  renderAlbumList(imagesData);
  renderInfoTable(infoData);
}
