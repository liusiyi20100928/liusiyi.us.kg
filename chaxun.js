// —— DOM 引用 —— 
const btnAlbum = document.getElementById("btn-album");
const btnInfo  = document.getElementById("btn-info");
const btnHelp  = document.getElementById("btn-help");

const secAlbum = document.getElementById("section-album");
const secInfo  = document.getElementById("section-info");
const secHelp  = document.getElementById("section-help");

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
  document.getElementById("result").innerHTML = "";
  document.getElementById("searchForm").reset();
});

// —— 切换到“寻求帮助” —— 
btnHelp.addEventListener("click", () => {
  secAlbum.style.display = "none";
  secInfo.style.display  = "none";
  secHelp.style.display  = "block";
  loadHelp();
});

// —— 加载回忆相册 —— 
async function loadAlbum() {
  secAlbum.innerHTML = "";
  try {
    const resp = await fetch("data/images.json");
    if (!resp.ok) throw new Error("加载 images.json 失败");
    const data = await resp.json();
    if (!data.length) {
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


// —— 信息查询 —— 
const form = document.getElementById("searchForm");
const resultDiv = document.getElementById("result");

form.addEventListener("submit", async function(e) {
  e.preventDefault();
  const keyword = document.getElementById("inq-name").value.trim();

  try {
    const resp = await fetch("data/info.json");
    if (!resp.ok) throw new Error("加载 info.json 失败");
    const data = await resp.json();

    // 用 filter 找到所有 “姓名 等于 keyword” 或 “编号 等于 keyword” 的记录
    const matches = data.filter(item => item.name === keyword || item.id === keyword);

    if (matches.length > 0) {
      // 清空之前结果
      resultDiv.innerHTML = "";
      // 循环创建多个“学生卡片”
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
      resultDiv.innerHTML = `<p>未找到匹配信息</p>`;
    }
  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = `<p>查询失败，请稍后再试。</p>`;
  }
});


// —— 寻求帮助 —— 
async function loadHelp() {
  secHelp.innerHTML = "";
  try {
    const resp = await fetch("data/help.txt");
    if (!resp.ok) throw new Error("加载 help.txt 失败");
    const link = (await resp.text()).trim();
    secHelp.innerHTML = `
      <p class="help-text">点击下面按钮加入QQ群：</p>
      <p><a href="${link}" target="_blank" class="qq-link">加入QQ群</a></p>`;
  } catch (err) {
    console.error(err);
    secHelp.innerHTML = `<p class="notice">加载帮助链接失败。</p>`;
  }
}
