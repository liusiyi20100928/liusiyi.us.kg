function toggleSecret() {
  const secret = document.getElementById('secret-area');
  const devInfo = document.getElementById('dev-info');
  if (secret.classList.contains('hidden')) {
    secret.classList.remove('hidden');
    devInfo.classList.remove('hidden');
  } else {
    secret.classList.add('hidden');
    devInfo.classList.add('hidden');
  }
}
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let meteors = [];
function createMeteor() {
  const length = Math.random() * 50 + 30;
  const speed  = Math.random() * 4 + 2;
  const startX = Math.random() * canvas.width;
  const startY = -length;
  const angle = Math.PI / 4;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  meteors.push({ x: startX, y: startY, len: length, vx, vy });
}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  meteors.forEach((m, i) => {
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x + m.len * Math.cos(Math.PI/4), m.y + m.len * Math.sin(Math.PI/4));
    ctx.stroke();
    m.x += m.vx;
    m.y += m.vy;
    if (m.x > canvas.width || m.y > canvas.height) {
      meteors.splice(i, 1);
    }
  });
  if (Math.random() < 0.05) {
    createMeteor();
  }
  requestAnimationFrame(draw);
}
draw();
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
