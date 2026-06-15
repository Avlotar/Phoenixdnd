const tavernLayers = document.querySelectorAll(".tavern-layer");

let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

function updateTavernParallax() {
  currentX += (targetX - currentX) * 0.08;
  currentY += (targetY - currentY) * 0.08;

  tavernLayers.forEach((layer) => {
    const depth = Number(layer.dataset.depth || 0.3);

    const moveX = currentX * depth;
    const moveY = currentY * depth;

    layer.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });

  requestAnimationFrame(updateTavernParallax);
}

function handlePointerMove(event) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  targetX = (event.clientX - centerX) / 35;
  targetY = (event.clientY - centerY) / 35;
}

function handlePointerLeave() {
  targetX = 0;
  targetY = 0;
}

if (window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerleave", handlePointerLeave);
  updateTavernParallax();
}