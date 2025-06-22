// —— DOM 引用 —— 
const btnAlbum = document.getElementById("btn-album");
const btnInfo  = document.getElementById("btn-info");
const btnHelp  = document.getElementById("btn-help");

const secAlbum = document.getElementById("section-album");
const secInfo  = document.getElementById("section-info");
const secHelp  = document.getElementById("section-help");

const form     = document.getElementById("searchForm");
const resultDiv = document.getElementById("result");

// 页面初始：仅显示“回忆相册”
secAlbum.style.display = "block";
secInfo.style.display  = "none";
secHelp.style.display  = "none";

// —— 切换到“回忆相册” —— 
btnAlbum.addEventListener("click", () => {
  secAlbum.style.display = "block";
  secInfo.style.display  = "none";
  secHelp.style.display  = "none";
  loadAlbum();
});

// —— 切换到“信息查询” —— 
btnInfo.addEventListener("click", () => {
  secAlbum.style.display = "none";
  secInfo.style.display  = "block";
  secHelp.style.display  = "none";
  // 清空上次查询结果与输入框
  resultDiv.innerHTML = "";
  form.reset();
});

// —— 切换到“寻求帮助” —— 
btnHelp.addEventListener("click", () => {
  secAlbum.style.display = "none";
  secInfo.style.display  = "none";
  secHelp.style.display  = "block";
  loadHelp();
});

// —— 异步加载并渲染“回忆相册” —— 
async function loadAlbum() {
  secAlbum.innerHTML = ""; // 先清空
  try {
    const resp = await fetch("data/images.json");
    if (!resp.ok) throw new Error("加载 images.json 失败");
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      secAlbum.innerHTML = '<p class="notice">暂无回忆相册。</p>';
      return;
    }
    data.forEach(item => {
      const div = document.createElement("div");
      div.className = "album-item";
      div.innerHTML = `
        <div class="album-name">${item.name}</div>
        <img src="${item.path}" alt="${item.name}" />`;
      secAlbum.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    secAlbum.innerHTML = '<p class="notice">加载相册失败。</p>';
  }
}
// 页面初次加载时渲染一次“回忆相册”
loadAlbum();


// —— 信息查询：提交表单时触发 —— 
form.addEventListener("submit", async function(e) {
  e.preventDefault();
  const rawKeyword = document.getElementById("inq-name").value.trim();
  resultDiv.innerHTML = ""; // 清空上次结果

  if (!rawKeyword) {
    resultDiv.innerHTML = `<p>请输入姓名或编号进行查询。</p>`;
    return;
  }

  // 转成小写，用于不区分大小写匹配
  const keyword = rawKeyword.toLowerCase();

  try {
    const resp = await fetch("data/info.json");
    if (!resp.ok) throw new Error("加载 info.json 失败");
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      resultDiv.innerHTML = `<p>当前无任何信息数据。</p>`;
      return;
    }

    // 过滤：姓名或编号包含关键字（不区分大小写）
    const matches = data.filter(item => {
      const nameLower = item.name.toLowerCase();
      const idLower   = item.id.toLowerCase();
      return nameLower.includes(keyword) || idLower.includes(keyword);
    });

    if (matches.length > 0) {
      // 循环渲染每一个匹配到的学生信息卡片
      matches.forEach(student => {
        const card = document.createElement("div");
        card.className = "student-card";
        card.innerHTML = `
          <img src="${student.photo}" alt="学生照片" />
          <p>姓名：${student.name}</p>
          <p>编号：${student.id}</p>
          <p>班级：${student.class}</p>
          <p>电话：${student.phone}</p>
          <p>QQ：${student.qq}</p>
          <p>微信：${student.wechat}</p>
        `;
        resultDiv.appendChild(card);
      });
    } else {
      resultDiv.innerHTML = `<p>未找到匹配信息。</p>`;
    }
  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = `<p>查询失败，请稍后再试。</p>`;
  }
});


// —— 寻求帮助：加载 data/help.txt 并渲染 —— 
async function loadHelp() {
  secHelp.innerHTML = ""; // 清空
  try {
    const resp = await fetch("data/help.txt");
    if (!resp.ok) throw new Error("加载 help.txt 失败");
    const link = (await resp.text()).trim();
    if (!link) {
      secHelp.innerHTML = `<p class="notice">暂无帮助链接。</p>`;
      return;
    }
    secHelp.innerHTML = `
      <p class="help-text">加qq:3573926115</p>
      <p><a href="${link}" target="_blank" class="qq-link">加入QQ群</a></p>`;
  } catch (err) {
    console.error(err);
    secHelp.innerHTML = `<p class="notice">加载帮助链接失败。</p>`;
  }
}