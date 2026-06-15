const tavernLayers = document.querySelectorAll(".tavern-layer");

let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;
let idleTime = 0;

function updateTavernParallax() {
  idleTime += 0.01;

  const idleX = Math.sin(idleTime) * 3;
  const idleY = Math.cos(idleTime * 0.8) * 2;

  currentX += (targetX - currentX) * 0.08;
  currentY += (targetY - currentY) * 0.08;

  tavernLayers.forEach((layer) => {
    const depth = Number(layer.dataset.depth || 0.3);

    const moveX = (currentX + idleX) * depth;
    const moveY = (currentY + idleY) * depth;

    layer.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.03)`;
  });

  requestAnimationFrame(updateTavernParallax);
}

function handlePointerMove(event) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  targetX = (event.clientX - centerX) / 18;
  targetY = (event.clientY - centerY) / 18;
}

function handlePointerLeave() {
  targetX = 0;
  targetY = 0;
}

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerleave", handlePointerLeave);

updateTavernParallax();