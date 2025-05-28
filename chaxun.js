const btnAlbum = document.getElementById("btn-album");
const btnInfo  = document.getElementById("btn-info");
const btnHelp  = document.getElementById("btn-help");

const secAlbum = document.getElementById("section-album");
const secInfo  = document.getElementById("section-info");
const secHelp  = document.getElementById("section-help");

secAlbum.style.display = "block";
secInfo.style.display  = "none";
secHelp.style.display  = "none";

btnAlbum.addEventListener("click", () => {
  secAlbum.style.display = "block";
  secInfo.style.display  = "none";
  secHelp.style.display  = "none";
  loadAlbum();
});

btnInfo.addEventListener("click", () => {
  secAlbum.style.display = "none";
  secInfo.style.display  = "block";
  secHelp.style.display  = "none";
  document.getElementById("result").innerHTML = "";
  document.getElementById("searchForm").reset();
});

btnHelp.addEventListener("click", () => {
  secAlbum.style.display = "none";
  secInfo.style.display  = "none";
  secHelp.style.display  = "block";
  loadHelp();
});

async function loadAlbum() {
  secAlbum.innerHTML = "";
  try {
    const resp = await fetch("data/images.json");
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
loadAlbum();

const form = document.getElementById("searchForm");
const resultDiv = document.getElementById("result");

form.addEventListener("submit", function(e) {
  e.preventDefault();
  const keyword = document.getElementById("inq-name").value.trim();

  fetch("data/info.json")
    .then(resp => {
      if (!resp.ok) throw new Error("网络错误");
      return resp.json();
    })
    .then(data => {
      // 通过姓名或编号匹配
      const student = data.find(item =>
        item.name === keyword || item.id === keyword
      );
      if (student) {
        resultDiv.innerHTML = `
          <div class="student-card">
            <img src="${student.photo}" alt="学生照片" />
            <p>姓名：${student.name}</p>
            <p>编号：${student.id}</p>
            <p>班级：${student.class}</p>
            <p>电话：${student.phone}</p>
            <p>QQ：${student.qq}</p>
            <p>微信：${student.wechat}</p>
          </div>`;
      } else {
        resultDiv.innerHTML = `<p>未找到匹配信息</p>`;
      }
    })
    .catch(err => {
      console.error(err);
      resultDiv.innerHTML = `<p>查询失败。</p>`;
    });
});

async function loadHelp() {
  secHelp.innerHTML = "";
  try {
    const resp = await fetch("data/help.txt");
    const link = (await resp.text()).trim();
    secHelp.innerHTML = `
      <p class="help-text">点击下面按钮加入QQ群：</p>
      <p><a href="${link}" target="_blank" class="qq-link">加入QQ群</a></p>`;
  } catch (err) {
    console.error(err);
    secHelp.innerHTML = `<p class="notice">加载帮助链接失败。</p>`;
  }
}
