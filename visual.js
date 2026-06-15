const tavernLayers = document.querySelectorAll(".tavern-layer");

let targetX = 0;
let targetY = 0;

let currentX = 0;
let currentY = 0;

let time = 0;

function updateTavernParallax() {
  time += 0.025;

  const idleX = Math.sin(time) * 10;
  const idleY = Math.cos(time * 0.8) * 7;

  currentX += (targetX - currentX) * 0.08;
  currentY += (targetY - currentY) * 0.08;

  tavernLayers.forEach((layer) => {
    const depth = Number(layer.dataset.depth || 0.3);

    const moveX = (currentX + idleX) * depth;
    const moveY = (currentY + idleY) * depth;

    layer.style.setProperty("--parallax-x", `${moveX}px`);
    layer.style.setProperty("--parallax-y", `${moveY}px`);
  });

  requestAnimationFrame(updateTavernParallax);
}

function handlePointerMove(event) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  targetX = (event.clientX - centerX) / 10;
  targetY = (event.clientY - centerY) / 10;
}

function handlePointerLeave() {
  targetX = 0;
  targetY = 0;
}

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerleave", handlePointerLeave);

updateTavernParallax();