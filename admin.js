// ====== 初始化变量 ======
let repoOwner = "", repoName = "", authToken = "", backendPass = "", localToken = "";
let infoData = [], infoSHA = "";
const loginSection = document.getElementById("login-section");
const manageSection = document.getElementById("manage-section");
const errorDiv = document.getElementById("error");
const messageDiv = document.getElementById("message");
const ghUserInput = document.getElementById("gh-username");
const ghRepoInput = document.getElementById("gh-repo");
const ghTokenInput = document.getElementById("gh-token");
const setPassInput = document.getElementById("set-pass");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const searchInput = document.getElementById("search-input");
const infoTableBody = document.querySelector("#info-table tbody");
const btnAdd = document.getElementById("btn-add");
const overlay = document.getElementById("popup-overlay");
const popupTitle = document.getElementById("popup-title");
const inpName = document.getElementById("inp-name");
const inpId = document.getElementById("inp-id");
const inpClass = document.getElementById("inp-class");
const inpPhone = document.getElementById("inp-phone");
const inpQQ = document.getElementById("inp-qq");
const inpWechat = document.getElementById("inp-wechat");
const inpPhoto = document.getElementById("inp-photo");
const photoPreview = document.getElementById("photo-preview");
const btnSave = document.getElementById("btn-save");
const btnCancel = document.getElementById("btn-cancel");
let editIndex = -1;
let uploadedPhotoData = "";

// ====== 存取 localStorage ======
function saveCredentials(token, password, owner, repo) {
  localStorage.setItem("mem_token", token);
  localStorage.setItem("mem_pass", password);
  localStorage.setItem("mem_owner", owner);
  localStorage.setItem("mem_repo", repo);
}
function loadCredentials() {
  localToken = localStorage.getItem("mem_token") || "";
  backendPass = localStorage.getItem("mem_pass") || "";
  repoOwner = localStorage.getItem("mem_owner") || "";
  repoName = localStorage.getItem("mem_repo") || "";
}

// ====== GitHub API 相关 ======
async function getFile(path) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  const resp = await fetch(url, { headers: { Authorization: `token ${authToken}` } });
  if (!resp.ok) throw new Error(`无法获取 ${path}`);
  return resp.json();
}
async function putFile(path, contentBase64, sha, message) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  const body = { message, content: contentBase64, sha };
  const resp = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `token ${authToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`无法更新 ${path}`);
  return resp.json();
}

// ====== 页面初始化 ======
document.addEventListener("DOMContentLoaded", () => {
  loadCredentials();
  if (backendPass && localToken && repoOwner && repoName) {
    authToken = localToken;
    showManage();
  }
});

// ====== 登录处理 ======
btnLogin.addEventListener("click", async () => {
  errorDiv.textContent = "";
  const user = ghUserInput.value.trim();
  const repoFull = ghRepoInput.value.trim();
  const token = ghTokenInput.value.trim();
  const pass = setPassInput.value.trim();
  if (!user || !repoFull || !token || !pass) {
    errorDiv.textContent = "请完整填写用户名/仓库/令牌/密码。";
    return;
  }
  if (pass.length < 6) {
    errorDiv.textContent = "密码至少6位。";
    return;
  }
  const parts = repoFull.split("/");
  if (parts.length !== 2) {
    errorDiv.textContent = "仓库格式需为 用户名/仓库名。";
    return;
  }
  repoOwner = parts[0];
  repoName = parts[1];
  authToken = token;
  try {
    await getFile("data/info.json");
    saveCredentials(token, pass, repoOwner, repoName);
    showManage();
  } catch (err) {
    console.error(err);
    errorDiv.textContent = "GitHub 验证失败，请检查信息。";
  }
});

// ====== 登出 ======
btnLogout.addEventListener("click", () => {
  localStorage.clear();
  location.reload();
});

// ====== 展示后台管理页 ======
function showManage() {
  loginSection.style.display = "none";
  manageSection.style.display = "block";
  ghTokenInput.value = "";
  setPassInput.value = "";
  loadAllData();
}

// ====== 加载全部数据 ======
async function loadAllData() {
  try {
    const data = await getFile("data/info.json");
    infoSHA = data.sha;
    infoData = JSON.parse(atob(data.content));
    renderTable(infoData);
  } catch (err) {
    console.error(err);
    messageDiv.textContent = "加载信息失败。";
  }
}

// ====== 渲染表格 ======
function renderTable(arr) {
  infoTableBody.innerHTML = "";
  arr.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${item.photo}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;" /></td>
      <td>${item.name}</td><td>${item.id}</td><td>${item.class}</td>
      <td>${item.phone}</td><td>${item.qq}</td><td>${item.wechat}</td>
      <td>
        <button class="action-btn" onclick="openEdit(${idx})">编辑</button>
        <button class="action-btn" onclick="handleDelete(${idx})" style="background-color:#e74c3c;">删除</button>
      </td>`;
    infoTableBody.appendChild(tr);
  });
}

// ====== 搜索功能 ======
searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    const keyword = searchInput.value.trim();
    if (!keyword) {
      renderTable(infoData);
      return;
    }
    const filtered = infoData.filter(item => item.name === keyword || item.id === keyword);
    renderTable(filtered);
  }
});

// ====== 添加记录 ======
btnAdd.addEventListener("click", () => {
  editIndex = -1;
  popupTitle.textContent = "添加信息";
  clearPopupInputs();
  overlay.style.display = "flex";
});
btnCancel.addEventListener("click", () => {
  overlay.style.display = "none";
});

// ====== 照片处理 ======
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

// ====== 编辑记录 ======
function openEdit(idx) {
  const item = infoData[idx];
  editIndex = idx;
  popupTitle.textContent = "编辑信息";
  inpName.value = item.name;
  inpId.value = item.id;
  inpClass.value = item.class;
  inpPhone.value = item.phone;
  inpQQ.value = item.qq;
  inpWechat.value = item.wechat;
  photoPreview.src = item.photo;
  photoPreview.style.display = "block";
  uploadedPhotoData = "";
  overlay.style.display = "flex";
}

// ====== 删除记录 ======
async function handleDelete(idx) {
  if (!confirm("确定删除？")) return;
  infoData.splice(idx, 1);
  try {
    const updated = btoa(JSON.stringify(infoData, null, 2));
    await putFile("data/info.json", updated, infoSHA, "删除记录");
    const res = await getFile("data/info.json");
    infoSHA = res.sha;
    infoData = JSON.parse(atob(res.content));
    renderTable(infoData);
    messageDiv.textContent = "删除成功！";
  } catch (err) {
    console.error(err);
    messageDiv.textContent = "删除失败。";
  }
}

// ====== 清空弹窗输入 ======
function clearPopupInputs() {
  inpName.value = "";
  inpId.value = "";
  inpClass.value = "";
  inpPhone.value = "";
  inpQQ.value = "";
  inpWechat.value = "";
  inpPhoto.value = "";
  photoPreview.style.display = "none";
  uploadedPhotoData = "";
}

// ====== 保存信息（添加或编辑） ======
btnSave.addEventListener("click", async () => {
  const nameVal = inpName.value.trim();
  const idVal = inpId.value.trim();
  const classVal = inpClass.value.trim();
  const phoneVal = inpPhone.value.trim();
  const qqVal = inpQQ.value.trim();
  const wechatVal = inpWechat.value.trim();
  if (!nameVal || !idVal || !classVal || !phoneVal || !qqVal || !wechatVal) {
    messageDiv.textContent = "请填写所有字段。";
    return;
  }
  try {
    let photoPath = "";
    if (uploadedPhotoData) {
      const filename = `stu_${Date.now()}.jpg`;
      const newPath = `image/${filename}`;
      await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${newPath}`, {
        method: "PUT",
        headers: {
          Authorization: `token ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `上传照片 ${filename}`,
          content: uploadedPhotoData,
        }),
      });
      photoPath = newPath;
    }

    if (editIndex >= 0) {
      const old = infoData[editIndex];
      photoPath = photoPath || old.photo;
      infoData[editIndex] = {
        name: nameVal,
        id: idVal,
        class: classVal,
        phone: phoneVal,
        qq: qqVal,
        wechat: wechatVal,
        photo: photoPath,
      };
    } else {
      photoPath = photoPath || "image/sample.jpg";
      infoData.push({
        name: nameVal,
        id: idVal,
        class: classVal,
        phone: phoneVal,
        qq: qqVal,
        wechat: wechatVal,
        photo: photoPath,
      });
    }

    const updated = btoa(JSON.stringify(infoData, null, 2));
    await putFile("data/info.json", updated, infoSHA, "更新 info.json");
    const data = await getFile("data/info.json");
    infoSHA = data.sha;
    infoData = JSON.parse(atob(data.content));
    renderTable(infoData);
    messageDiv.textContent = "保存成功！";
    overlay.style.display = "none";
  } catch (err) {
    console.error(err);
    messageDiv.textContent = "保存失败。";
  }
});
