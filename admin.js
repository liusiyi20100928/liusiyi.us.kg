/*==========================================
  全局状态 & DOM 引用
==========================================*/
let repoOwner = "", repoName = "", authToken = "";
let backendPass = "", localToken = "";

// 存储 info.json、images.json、help.txt
let infoData = [], infoSHA = "";
let imagesData = [], imagesSHA = "";
let helpSHA = "";

/*----------------------------------------
  DOM 元素
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

let editInfoIndex = -1;     // -1 = 添加；>=0 = 编辑
let uploadedPhotoData = ""; // Base64 数据

/*==========================================
  本地存储：令牌 & 密码
==========================================*/
function saveCredentials(token, password) {
  localStorage.setItem("memoryManual_token", token);
  localStorage.setItem("memoryManual_pass", password);
}
function loadCredentials() {
  localToken    = localStorage.getItem("memoryManual_token") || "";
  backendPass   = localStorage.getItem("memoryManual_pass")  || "";
}

/*==========================================
  GitHub Contents API 操作
==========================================*/
async function getFile(path) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  const resp = await fetch(url, {
    headers: { Authorization: `token ${authToken}` }
  });
  if (!resp.ok) throw new Error(`无法获取 ${path} (${resp.status})`);
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
  if (!resp.ok) throw new Error(`无法更新 ${path} (${resp.status})`);
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
  if (!resp.ok) throw new Error(`无法删除 ${path} (${resp.status})`);
  return resp.json();
}

/*==========================================
  初始化：检查 localStorage
==========================================*/
document.addEventListener("DOMContentLoaded", () => {
  loadCredentials();
  if (backendPass && localToken) showManage();
});

/*==========================================
  登录逻辑
==========================================*/
btnLogin.addEventListener("click", async () => {
  errorDiv.textContent = "";
  const user = ghUserInput.value.trim();
  const repo = ghRepoInput.value.trim();
  const token= ghTokenInput.value.trim();
  const pass = setPassInput.value.trim();

  if (!user || !repo || !token || !pass) {
    errorDiv.textContent = "请完整填写用户/仓库/令牌/密码。";
    return;
  }
  if (pass.length < 6) {
    errorDiv.textContent = "密码至少 6 位。";
    return;
  }

  repoOwner = user;
  repoName  = repo.split("/")[1];
  authToken = token;

  try {
    await getFile("data/info.json"); // 测试能否读取
    saveCredentials(token, pass);
    showManage();
  } catch (err) {
    console.error(err);
    errorDiv.textContent = "GitHub 验证失败，请检查信息。";
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
  显示后台管理区
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
  切换子面板
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
  加载所有子功能区数据
==========================================*/
async function loadAllSections() {
  await loadImagesJSON();
  await loadInfoJSON();
  await loadHelpTXT();

  renderAlbumList(imagesData);
  renderInfoTable(infoData);
}

/*==========================================
  回忆相册管理
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
    albumMsgDiv.textContent = "请填写名称并选择图片。";
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const base64Data = reader.result.split(",")[1];
      const filename   = `huiyi_${Date.now()}.jpg`;
      const newPath    = `image/${filename}`;

      // 上传图片
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

      // 更新 images.json
      const data = await getFile("data/images.json");
      imagesData = JSON.parse(atob(data.content));
      imagesData.push({ name: nameVal, path: newPath });
      imagesSHA = data.sha;
      const updated = btoa(JSON.stringify(imagesData, null, 2));
      await putFile("data/images.json", updated, imagesSHA, "更新 images.json，添加相册");
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
    const item = imagesData[idx];
    const imgData = await getFile(item.path);
    await deleteFile(item.path, imgData.sha, `删除相册图片 ${item.path}`);

    const data = await getFile("data/images.json");
    imagesData = JSON.parse(atob(data.content));
    imagesData.splice(idx, 1);
    imagesSHA = data.sha;
    const updated = btoa(JSON.stringify(imagesData, null, 2));
    await putFile("data/images.json", updated, imagesSHA, "更新 images.json，删除相册");
    renderAlbumList(imagesData);
    albumMsgDiv.textContent = "删除成功！";
  } catch (err) {
    console.error(err);
    albumMsgDiv.textContent = "删除失败，请检查控制台。";
  }
}

/*==========================================
  信息查询管理
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

btnAddInfo.addEventListener("click", () => {
  editInfoIndex = -1;
  popupTitle.textContent = "添加信息";
  clearPopupInputs();
  overlay.style.display = "flex";
});
btnCancelInfo.addEventListener("click", () => {
  overlay.style.display = "none";
});

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
    }

    const updatedJSON = btoa(JSON.stringify(infoData, null, 2));
    await putFile("data/info.json", updatedJSON, infoSHA, "更新 info.json");
    const newData = await getFile("data/info.json");
    infoSHA  = newData.sha;
    infoData = JSON.parse(atob(newData.content));
    renderInfoTable(infoData);
    infoMessage.textContent = "保存成功！";
    overlay.style.display = "none";
  } catch (err) {
    console.error(err);
    infoMessage.textContent = "保存失败，请检查控制台。";
  }
});

async function deleteInfo(idx) {
  if (!confirm("确认删除此条信息？")) return;
  try {
    infoData.splice(idx, 1);
    const updatedJSON = btoa(JSON.stringify(infoData, null, 2));
    await putFile("data/info.json", updatedJSON, infoSHA, "更新 info.json，删除记录");
    const newData = await getFile("data/info.json");
    infoSHA  = newData.sha;
    infoData = JSON.parse(atob(newData.content));
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
  寻求帮助管理
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
    const updated = btoa(newLink);
    await putFile("data/help.txt", updated, helpSHA, "更新 help.txt");
    const data = await getFile("data/help.txt");
    helpSHA = data.sha;
    saveHelpMsg.textContent = "保存成功！";
  } catch (err) {
    console.error(err);
    saveHelpMsg.textContent = "保存失败，请检查控制台。";
  }
});

/*==========================================
  初次加载：读取所有数据
==========================================*/
async function loadAllSections() {
  await loadImagesJSON();
  await loadInfoJSON();
  await loadHelpTXT();
  renderAlbumList(imagesData);
  renderInfoTable(infoData);
}
