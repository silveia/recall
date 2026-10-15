const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clearBtn');
const brushType = document.getElementById('brushType');
const imageLoader = document.getElementById('imageLoader');
const container = document.getElementById('canvas-container');
const spawnBtn = document.getElementById('spawnBtn');
const characters = []; 
let charImgUrl = '';
let isCharImageLoaded = false;

// the sheet is pixel art: every art pixel is PIXEL screen pixels across, and sizes count art pixels
const PIXEL = 1;      // one art pixel per screen pixel: twice the sheet of 2, by request (8, then 2, came first)
let penSize = 2;
let eraserSize = 10;
let lastCell = null;   // the art pixel the stroke last reached, so a fast stroke is filled in between
const charLoader = document.getElementById('charLoader');

const miniWindow = document.getElementById('miniWindow');
const miniWindow2 = document.getElementById('miniWindow2');

const gameBtn = document.getElementById('gameBtn'); 
const referenceBtn = document.getElementById('referenceBtn'); 
const closeWindowBtn = document.getElementById('closeWindowBtn');
const closeWindowBtn2 = document.getElementById('closeWindowBtn2'); 
const resetGameBtn = document.getElementById('resetGameBtn');
const windowHeader = document.getElementById('windowHeader');
const windowHeader2 = document.getElementById('windowHeader2'); 

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const startGameBtn = document.getElementById('startGameBtn');

let zoomLevel = 1;
let canvasOffsetX = 0;
let canvasOffsetY = 0;

const ZOOM_SPEED = 0.25; 
const MAX_ZOOM = 5;
const MIN_ZOOM = 0.2;

let isDrawing = false;
let currentTool = 'round';
let mouseX = 0;
let mouseY = 0;
let livePoints = []; 

let undoStack = [];
let redoStack = [];
const MAX_STATES = 20; 

let isTKeyPressed = false;
let htmlFishParticles = [];
let spawnCooldown = 0; 

let isSpacePressed = false;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

let isDraggingWindow = false;
let isDraggingWindow2 = false;
let offsetX = 0;
let offsetY = 0;
const toggleFullscreenBtn = document.getElementById('toggleFullscreen');
const gameViewport = document.getElementById('gameViewport');

if (toggleFullscreenBtn && gameViewport) {
    toggleFullscreenBtn.addEventListener('click', () => {
        if (!startScreen.classList.contains('hidden-game-element')) {
            return;
        }

        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (gameViewport.requestFullscreen) {
                gameViewport.requestFullscreen();
            } else if (gameViewport.webkitRequestFullscreen) {
                gameViewport.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    });
}

startGameBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden-game-element');     
    gameScreen.classList.remove('hidden-game-element');  
    localStorage.setItem('gameActive', 'true');
    if (typeof window.initCustomGame === 'function') {
        window.initCustomGame(); 
    }
});

gameBtn.addEventListener('click', () => {
    miniWindow.classList.remove('hidden-window'); 
    miniWindow.style.display = 'block'; 
    miniWindow.style.zIndex = '100';
    miniWindow2.style.zIndex = '99';
    localStorage.setItem('gameWindowOpen', 'true');
    tuckIn(miniWindow, 'miniWindowLeft', 'miniWindowTop');
});

referenceBtn.addEventListener('click', () => {
    miniWindow2.classList.remove('hidden-window');
    miniWindow2.style.display = 'block';
    miniWindow2.style.zIndex = '100';
    miniWindow.style.zIndex = '99';
    localStorage.setItem('referenceWindowOpen', 'true');
    tuckIn(miniWindow2, 'miniWindow2Left', 'miniWindow2Top');
});

closeWindowBtn.addEventListener('click', () => {
    miniWindow.classList.add('hidden-window'); 
    localStorage.setItem('gameWindowOpen', 'false');
});

closeWindowBtn2.addEventListener('click', () => {
    miniWindow2.classList.add('hidden-window');
    miniWindow2.style.display = 'none';
    localStorage.setItem('referenceWindowOpen', 'false');
});

resetGameBtn.addEventListener('click', () => {
    if (typeof window.teleportToSpawn === 'function') {
        window.teleportToSpawn();
    }
});

miniWindow.addEventListener('mousedown', () => {
    miniWindow.style.zIndex = '100';
    miniWindow2.style.zIndex = '99';
});

miniWindow2.addEventListener('mousedown', () => {
    miniWindow2.style.zIndex = '100';
    miniWindow.style.zIndex = '99';
});

windowHeader.addEventListener('mousedown', (e) => {
    isDraggingWindow = true;
    offsetX = e.clientX - miniWindow.offsetLeft;
    offsetY = e.clientY - miniWindow.offsetTop;
    
    windowHeader.style.backgroundColor = '';   // the held look is the stylesheet's (.is-held)
    windowHeader.classList.add('is-held'); 
    miniWindow.style.zIndex = '100';
    miniWindow2.style.zIndex = '99';
});

windowHeader2.addEventListener('mousedown', (e) => {
    isDraggingWindow2 = true;
    offsetX = e.clientX - miniWindow2.offsetLeft;
    offsetY = e.clientY - miniWindow2.offsetTop;
    
    windowHeader2.style.backgroundColor = '';   // the held look is the stylesheet's (.is-held)
    windowHeader2.classList.add('is-held'); 
    miniWindow.style.zIndex = '99';
    miniWindow2.style.zIndex = '100';
});

// a little window is kept wholly on the page: dragged, put back from storage, or left behind by the
// page getting smaller, it stops at the edges instead of going out of reach
function keepInside(win, left, top) {
    const most = (room, size) => Math.max(0, room - size);
    const x = Math.min(Math.max(0, left), most(window.innerWidth, win.offsetWidth));
    const y = Math.min(Math.max(0, top), most(window.innerHeight, win.offsetHeight));
    return { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` };
}
function tuckIn(win, leftKey, topKey) {
    if (win.classList.contains('hidden-window')) return;
    const box = win.getBoundingClientRect();
    const at = keepInside(win, box.left, box.top);
    win.style.left = at.left;
    win.style.top = at.top;
    localStorage.setItem(leftKey, at.left);
    localStorage.setItem(topKey, at.top);
}
window.addEventListener('resize', () => {
    tuckIn(miniWindow, 'miniWindowLeft', 'miniWindowTop');
    tuckIn(miniWindow2, 'miniWindow2Left', 'miniWindow2Top');
});

window.addEventListener('mousemove', (e) => {
    if (isDraggingWindow) {
        const held = keepInside(miniWindow, e.clientX - offsetX, e.clientY - offsetY);
        const finalLeft = held.left;
        const finalTop = held.top;
        
        miniWindow.style.left = finalLeft;
        miniWindow.style.top = finalTop;
        
        localStorage.setItem('miniWindowLeft', finalLeft);
        localStorage.setItem('miniWindowTop', finalTop);
    }
    
    if (isDraggingWindow2) {
        const held2 = keepInside(miniWindow2, e.clientX - offsetX, e.clientY - offsetY);
        const finalLeft2 = held2.left;
        const finalTop2 = held2.top;
        
        miniWindow2.style.left = finalLeft2;
        miniWindow2.style.top = finalTop2;
        
        localStorage.setItem('miniWindow2Left', finalLeft2);
        localStorage.setItem('miniWindow2Top', finalTop2);
    }
});

window.addEventListener('mouseup', () => {
    if (isDraggingWindow) {
        isDraggingWindow = false;
        windowHeader.classList.remove('is-held'); 
    }
    if (isDraggingWindow2) {
        isDraggingWindow2 = false;
        windowHeader2.classList.remove('is-held'); 
    }
});

miniWindow2.addEventListener('mouseup', () => {
    tuckIn(miniWindow2, 'miniWindow2Left', 'miniWindow2Top');
    const rect = miniWindow2.getBoundingClientRect();
    localStorage.setItem('miniWindow2Width', `${rect.width}px`);
    localStorage.setItem('miniWindow2Height', `${rect.height}px`);
});

let stampImage = new Image();
let isImageLoaded = false;
stampImage.onload = () => { isImageLoaded = true; };

const referenceImage = document.getElementById('referenceImage');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const windowImageLoader = document.getElementById('windowImageLoader');

imageLoader.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        stampImage = new Image();
        stampImage.onload = () => { isImageLoaded = true; };
        stampImage.src = event.target.result;
    };
    if (e.target.files[0]) {
        reader.readAsDataURL(e.target.files[0]);
    }
});

if (windowImageLoader) {
    windowImageLoader.addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (referenceImage) {
                referenceImage.src = event.target.result;
                referenceImage.style.display = 'block'; 
            }
            if (uploadPlaceholder) {
                uploadPlaceholder.style.display = 'none'; 
            }
        };
        if (e.target.files[0]) {
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

charLoader.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        charImgUrl = event.target.result;
        isCharImageLoaded = true;
    };
    if (e.target.files[0]) {
        reader.readAsDataURL(e.target.files[0]);
    }
});

function updateCSSView() {
    canvas.style.transform = `translate(${canvasOffsetX}px, ${canvasOffsetY}px) scale(${zoomLevel})`;
    canvas.style.transformOrigin = '0 0';
}

function resizeCanvas() {
    if (!canvas.dataset.initialized) {
        // one canvas pixel per art pixel, drawn PIXEL times bigger and kept hard-edged
        const targetWidth = container ? container.clientWidth : 800;
        const targetHeight = container ? container.clientHeight : 600;
        const cols = Math.max(1, Math.ceil(targetWidth / PIXEL));
        const rows = Math.max(1, Math.ceil(targetHeight / PIXEL));

        canvas.width = cols;
        canvas.height = rows;
        canvas.style.width = `${cols * PIXEL}px`;
        canvas.style.height = `${rows * PIXEL}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        canvas.dataset.initialized = "true";
        
        updateCSSView();
    }
}

// the sheet grows with its box: it used to be sized once, when the page loaded, and a box that grew
// after (the frame settling, the window made bigger) left a band under it. what is drawn stays exactly
// where it was, pixel for pixel; the sheet never shrinks, so nothing is ever cut off
function growCanvas() {
    if (!canvas.dataset.initialized || !container) return;
    const cols = Math.max(canvas.width, Math.ceil(container.clientWidth / PIXEL));
    const rows = Math.max(canvas.height, Math.ceil(container.clientHeight / PIXEL));
    if (cols === canvas.width && rows === canvas.height) return;
    const keep = document.createElement('canvas');
    keep.width = canvas.width;
    keep.height = canvas.height;
    keep.getContext('2d').drawImage(canvas, 0, 0);
    canvas.width = cols;
    canvas.height = rows;
    canvas.style.width = `${cols * PIXEL}px`;
    canvas.style.height = `${rows * PIXEL}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(keep, 0, 0);
}
if (window.ResizeObserver && container) new ResizeObserver(growCanvas).observe(container);

window.addEventListener('load', () => {
    resizeCanvas(); 

    const savedLeft1 = localStorage.getItem('miniWindowLeft');
    const savedTop1 = localStorage.getItem('miniWindowTop');
    if (savedLeft1 && savedTop1) {
        miniWindow.style.left = savedLeft1;
        miniWindow.style.top = savedTop1;
    }

    const savedLeft2 = localStorage.getItem('miniWindow2Left');
    const savedTop2 = localStorage.getItem('miniWindow2Top');
    const savedWidth2 = localStorage.getItem('miniWindow2Width');
    const savedHeight2 = localStorage.getItem('miniWindow2Height');
    
    if (savedLeft2 && savedTop2) {
        miniWindow2.style.left = savedLeft2;
        miniWindow2.style.top = savedTop2;
    }
    if (savedWidth2 && savedHeight2) {
        miniWindow2.style.width = savedWidth2;
        miniWindow2.style.height = savedHeight2;
    }

    const savedDataUrl = localStorage.getItem('mySavedArt');
    if (savedDataUrl) {
        const img = new Image();
        img.onload = () => {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = savedDataUrl;
    }

    if (localStorage.getItem('referenceWindowOpen') === 'true') {
        miniWindow2.classList.remove('hidden-window');
        miniWindow2.style.display = 'block';
    }

    if (localStorage.getItem('gameWindowOpen') === 'true') {
        miniWindow.classList.remove('hidden-window'); 
        miniWindow.style.display = 'block'; 
    }
    tuckIn(miniWindow, 'miniWindowLeft', 'miniWindowTop');
    tuckIn(miniWindow2, 'miniWindow2Left', 'miniWindow2Top');
});

brushType.addEventListener('change', () => {
    currentTool = brushType.value;
    brushSize.value = currentTool === 'eraser' ? eraserSize : penSize;
});

const resetTracking = () => {
    // the stroke runs on to where the pointer actually stopped
    if (isDrawing && strokePts.length > 1) strokeTo(strokePts[strokePts.length - 1]);
    strokePts = [];
    isDrawing = false;
    isPanning = false; 
    canvas.style.cursor = isSpacePressed ? 'grab' : 'crosshair';
    livePoints = [];
    lastCell = null;
    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';
};

function getCanvasCoordinates(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / (rect.width / canvas.clientWidth);
    const y = (clientY - rect.top) / (rect.height / canvas.clientHeight);
    return { x, y };
}

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

canvas.addEventListener('pointerdown', (e) => {
    const isTabletHardwarePan = e.button === 1 || e.buttons === 4;

    if (isSpacePressed || isTabletHardwarePan) {
        e.preventDefault(); 
        isPanning = true;
        canvas.style.cursor = 'grabbing';
        
        startPanX = e.screenX - canvasOffsetX;
        startPanY = e.screenY - canvasOffsetY;
        return; 
    }

    if (e.pointerType === 'pen') {
        if (e.buttons === 32) {
            currentTool = 'eraser';
            canvas.style.cursor = 'cell'; 
            ctx.lineWidth = eraserSize;
            brushSize.value = eraserSize;
        } else {
            currentTool = 'round';
            brushType.value = 'round';
            canvas.style.cursor = 'crosshair';
            ctx.lineWidth = penSize;
            brushSize.value = penSize;
        }
    } else {
        currentTool = brushType.value;
        canvas.style.cursor = currentTool === 'eraser' ? 'cell' : 'crosshair';
        
        if (currentTool === 'eraser') {
            ctx.lineWidth = eraserSize;
            brushSize.value = eraserSize;
        } else {
            ctx.lineWidth = penSize;
            brushSize.value = penSize;
        }
    }

    isDrawing = true;
    
    const preSnapshot = canvas.toDataURL();
    undoStack.push(preSnapshot);
    if (undoStack.length > MAX_STATES) undoStack.shift();
    redoStack = []; 

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    mouseX = coords.x;
    mouseY = coords.y;
    livePoints = [{ x: mouseX, y: mouseY }];

    lastCell = cellAt(mouseX, mouseY);
    paintCell(lastCell.x, lastCell.y);
    strokePts = [artPoint(mouseX, mouseY)];
});

// a stroke follows the pointer through every position the browser recorded between frames (not just
// the one it hands over per frame), and runs through them as a smooth curve — a curve through the
// midpoints, each bent by the point between — so a quick round stroke stays round instead of breaking
// into straight pieces
let strokePts = [];
function artPoint(x, y) {
    return { x: x * canvas.width / canvas.clientWidth, y: y * canvas.height / canvas.clientHeight };
}
function strokeTo(pt) {
    const cell = { x: Math.floor(pt.x), y: Math.floor(pt.y) };
    if (!lastCell) paintCell(cell.x, cell.y);
    else if (cell.x !== lastCell.x || cell.y !== lastCell.y) paintLine(lastCell, cell);
    lastCell = cell;
}
function strokeAdd(pt) {
    strokePts.push(pt);
    const n = strokePts.length;
    if (n < 2) return;
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    if (n === 2) { strokeTo(mid(strokePts[0], strokePts[1])); return; }
    const a = strokePts[n - 3], b = strokePts[n - 2], c = strokePts[n - 1];
    const from = mid(a, b), to = mid(b, c);
    const reach = Math.hypot(b.x - from.x, b.y - from.y) + Math.hypot(to.x - b.x, to.y - b.y);
    const steps = Math.max(1, Math.ceil(reach));          // about one sample per art pixel along it
    for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        strokeTo({
            x: u * u * from.x + 2 * u * t * b.x + t * t * to.x,
            y: u * u * from.y + 2 * u * t * b.y + t * t * to.y
        });
    }
    if (strokePts.length > 3) strokePts.shift();
}

// pixel art: the pointer lands on an art pixel, and the brush is a block of whole art pixels round it
function cellAt(x, y) {
    return { x: Math.floor(x * canvas.width / canvas.clientWidth), y: Math.floor(y * canvas.height / canvas.clientHeight) };
}
// a round brush `size` art pixels across, every pixel of it either fully painted or not touched —
// each row of the round is one rectangle, so nothing is ever blended at an edge
function paintCell(cx, cy) {
    const size = currentTool === 'eraser' ? eraserSize : penSize;
    const half = (size - 1) / 2;
    const reach = (size / 2) * (size / 2);
    const left = cx - Math.floor(half);
    const top = cy - Math.floor(half);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = colorPicker.value;
    for (let j = 0; j < size; j++) {
        const dy = j - half;
        let from = -1, to = -1;
        for (let i = 0; i < size; i++) {
            const dx = i - half;
            if (dx * dx + dy * dy <= reach + 0.01) { if (from < 0) from = i; to = i; }
        }
        if (from < 0) continue;
        if (currentTool === 'eraser') ctx.clearRect(left + from, top + j, to - from + 1, 1);
        else ctx.fillRect(left + from, top + j, to - from + 1, 1);
    }
}
// every art pixel between where the stroke was and where it is now, so a quick stroke has no gaps
function paintLine(from, to) {
    let x = from.x, y = from.y;
    const dx = Math.abs(to.x - x), dy = -Math.abs(to.y - y);
    const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
        paintCell(x, y);
        if (x === to.x && y === to.y) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
    }
}

window.addEventListener('pointerup', resetTracking);

function draw(e) {
    if (isPanning) {
        e.preventDefault();
        canvasOffsetX += e.movementX;
        canvasOffsetY += e.movementY;
        updateCSSView();
        return; 
    }

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    mouseX = coords.x;
    mouseY = coords.y;

    if (e.pointerType === 'pen' && e.buttons !== 1 && e.buttons !== 32) return;
    if (!isDrawing || isTKeyPressed) return;        
    
    livePoints.push({ x: mouseX, y: mouseY });

    const between = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    (between.length ? between : [e]).forEach((one) => {
        const at = getCanvasCoordinates(one.clientX, one.clientY);
        strokeAdd(artPoint(at.x, at.y));
    });
}

window.addEventListener('pointermove', draw);

function spawnFloatingFish() {
    const rect = canvas.getBoundingClientRect();
    const fish = document.createElement('img');
    fish.src = 'fish.png'; 
    
    fish.style.position = 'fixed';
    fish.style.left = `${mouseX * (rect.width / canvas.clientWidth) + rect.left}px`;
    fish.style.top = `${mouseY * (rect.height / canvas.clientHeight) + rect.top}px`;
    fish.style.width = '120px'; 
    fish.style.height = 'auto';
    fish.style.imageRendering = 'pixelated';
    fish.style.pointerEvents = 'none';
    fish.style.zIndex = '9999999';
    fish.style.marginTop = '-60px';  
    fish.style.marginLeft = '-60px'; 
    
    document.body.appendChild(fish);

    const angle = (Math.random() * Math.PI) + Math.PI; 
    const speed = (Math.random() * 5) + 3;

    htmlFishParticles.push({
        element: fish,
        x: parseFloat(fish.style.left),
        y: parseFloat(fish.style.top),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() * 8) - 4
    });
}

window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            isSpacePressed = true;
            if (!isPanning) canvas.style.cursor = 'grab';
        }
    }

    if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=') {
            e.preventDefault(); 
            const containerRect = container.getBoundingClientRect();
            const centerX = containerRect.width / 2;
            const centerY = containerRect.height / 2;
            const mouseBeforeZoomX = (centerX - canvasOffsetX) / zoomLevel;
            const mouseBeforeZoomY = (centerY - canvasOffsetY) / zoomLevel;
            const oldZoom = zoomLevel;
            zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel + ZOOM_SPEED));
            canvasOffsetX -= mouseBeforeZoomX * (zoomLevel - oldZoom);
            canvasOffsetY -= mouseBeforeZoomY * (zoomLevel - oldZoom);
            updateCSSView();
        }
        if (e.key === '-') {
            e.preventDefault(); 
            const containerRect = container.getBoundingClientRect();
            const centerX = containerRect.width / 2;
            const centerY = containerRect.height / 2;
            const mouseBeforeZoomX = (centerX - canvasOffsetX) / zoomLevel;
            const mouseBeforeZoomY = (centerY - canvasOffsetY) / zoomLevel;
            const oldZoom = zoomLevel;
            zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - ZOOM_SPEED));
            canvasOffsetX -= mouseBeforeZoomX * (zoomLevel - oldZoom);
            canvasOffsetY -= mouseBeforeZoomY * (zoomLevel - oldZoom);
            updateCSSView();
        }
        if (e.key === '0') {
            e.preventDefault(); 
            zoomLevel = 1; 
            canvasOffsetX = 0; 
            canvasOffsetY = 0;
            updateCSSView();
        }
        if (e.key.toLowerCase() === 'z') {
            e.preventDefault(); 
            executeUndo();
        }
        if (e.key.toLowerCase() === 'y') {
            e.preventDefault();
            executeRedo();
        }
    }

    if (e.key.toLowerCase() === 't') {
        isTKeyPressed = true;
    }

    if (e.key === 'Shift') {
        drawCustomShape(mouseX, mouseY);
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
        isSpacePressed = false;
        isPanning = false;
        canvas.style.cursor = 'crosshair';
    }
    if (e.key.toLowerCase() === 't') {
        isTKeyPressed = false;
    }
});

function drawCustomShape(x, y) {
    if (!isImageLoaded || isTKeyPressed) return; 

    const preSnapshot = canvas.toDataURL();
    undoStack.push(preSnapshot);
    if (undoStack.length > MAX_STATES) undoStack.shift();
    redoStack = [];

    ctx.save();
    ctx.imageSmoothingEnabled = false;      // a stamp comes out as pixel art like everything else
    const at = cellAt(x, y);
    x = at.x + 0.5;
    y = at.y + 0.5;
    const baseSize = Math.max(1, Math.round(Number(brushSize.value) * 2.5)); 
    const aspect = stampImage.width / stampImage.height;
    let targetWidth = baseSize;
    let targetHeight = baseSize;

    if (aspect > 1) {
        targetHeight = baseSize / aspect;
    } else {
        targetWidth = baseSize * aspect;
    }

    targetWidth = Math.max(1, Math.round(targetWidth));
    targetHeight = Math.max(1, Math.round(targetHeight));
    const targetX = Math.round(x - (targetWidth / 2));
    const targetY = Math.round(y - (targetHeight / 2));
    
    ctx.drawImage(stampImage, targetX, targetY, targetWidth, targetHeight);
    ctx.restore();
}

class Shimeji {
    constructor() {
        this.x = Math.random() * (window.innerWidth - 100);
        this.y = -50; 
        this.velocityY = 0; 
        this.velocityX = (Math.random() - 0.5) * 2; 
        this.gravity = 0.4;
        this.bounceFactor = -0.3; 
        this.isGrounded = false;
        this.state = 'falling'; 
        this.stateTimer = 0;

        this.element = document.createElement('img');
        this.element.src = charImgUrl;
        this.element.classList.add('shimeji-char');
        document.body.appendChild(this.element); 
        this.updateElementPosition();
    }

    chooseNewState() {
        this.stateTimer = Math.floor(Math.random() * 120) + 60; 
        const choices = ['walking', 'idle', 'jumping'];
        this.state = choices[Math.floor(Math.random() * choices.length)];

        if (this.state === 'walking') {
            this.velocityX = (Math.random() > 0.5 ? 1 : -1) * 1.2;
        } else if (this.state === 'idle') {
            this.velocityX = 0;
        } else if (this.state === 'jumping') {
            this.velocityY = -8 - Math.random() * 5; 
            this.velocityX = (Math.random() - 0.5) * 4; 
            this.isGrounded = false;
            this.state = 'falling';
        }
    }
    
    update() {
        const floorLevel = window.innerHeight - 100;

        if (!this.isGrounded && this.state !== 'climbing') {
            this.velocityY += this.gravity;
            this.y += this.velocityY;
            this.x += this.velocityX;

            if (this.y >= floorLevel) {
                this.y = floorLevel;
                this.velocityY = this.velocityY * this.bounceFactor; 
                if (Math.abs(this.velocityY) < 1) {
                    this.velocityY = 0;
                    this.isGrounded = true;
                    this.chooseNewState();
                }
            }
        }
        else if (this.state === 'climbing') {
            this.y += this.velocityY; 
            this.stateTimer--;

            if (this.stateTimer <= 0 || this.y <= 0 || this.y >= floorLevel) {
                this.state = 'falling';
                this.isGrounded = false;
                this.velocityX = this.x <= 0 ? 1.5 : -1.5; 
                this.element.style.transform = 'rotate(0deg)'; 
            }
        }
        else {
            this.x += this.velocityX;
            this.stateTimer--;
            if (this.stateTimer <= 0) this.chooseNewState();
    
            if (this.x <= 0 || this.x >= window.innerWidth - 100) {
                this.x = this.x <= 0 ? 0 : window.innerWidth - 100;
                if (Math.random() > 0.5) {
                    this.state = 'climbing';
                    this.isGrounded = false;
                    this.velocityY = -1.5; 
                    this.velocityX = 0;
                    this.stateTimer = Math.floor(Math.random() * 150) + 100; 
                    this.element.style.transform = this.x <= 0 ? 'rotate(90deg)' : 'rotate(-90deg)';
                } else {
                    this.velocityX *= -1; 
                }
            }
        }
        
        if (this.x < 0) this.x = 0;
        if (this.x > window.innerWidth - 100) this.x = window.innerWidth - 100;

        if (this.state !== 'climbing' && this.velocityX !== 0) {
            this.element.style.transform = this.velocityX > 0 ? 'scaleX(1)' : 'scaleX(-1)';
        }
        this.updateElementPosition();
    }

    updateElementPosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }
}

clearBtn.addEventListener('click', () => {
    const preSnapshot = canvas.toDataURL();
    undoStack.push(preSnapshot);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    characters.forEach(char => char.element.remove());
    characters.length = 0;
});

spawnBtn.addEventListener('click', () => {
    if (!isCharImageLoaded) {
        // a little note on the page, pointing at the upload button, rather than the browser's own alert
        if (typeof window.askForSprite === 'function') window.askForSprite();
        else alert("pls upload sprite first");
        return; 
    }
    characters.push(new Shimeji());
});

function animationTick() {
    characters.forEach(char => char.update());

    if (isTKeyPressed) {
        spawnCooldown++;
        if (spawnCooldown % 5 === 0) { 
            spawnFloatingFish();
        }
    } else {
        spawnCooldown = 0;
    }

    if (htmlFishParticles.length > 0) {
        for (let i = htmlFishParticles.length - 1; i >= 0; i--) {
            const p = htmlFishParticles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.25;             
            p.rotation += p.rotSpeed; 

            p.element.style.left = `${p.x}px`;
            p.element.style.top = `${p.y}px`;
            p.element.style.transform = `rotate(${p.rotation}deg)`;

            if (p.y > window.innerHeight + 100) {
                p.element.remove();
                htmlFishParticles.splice(i, 1);
            }
        }
    }

    requestAnimationFrame(animationTick);
}
requestAnimationFrame(animationTick);

function executeUndo() {
    if (undoStack.length === 0) return;
    const currentState = canvas.toDataURL();
    redoStack.push(currentState);
    const previousState = undoStack.pop();
    const img = new Image();
    img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = previousState;
}

function executeRedo() {
    if (redoStack.length === 0) return;
    const nextState = redoStack.pop();
    undoStack.push(canvas.toDataURL());
    const img = new Image();
    img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = nextState;
}

container.addEventListener('wheel', (e) => {
    e.preventDefault(); 
    const isTabletScroll = e.pointerType === 'pen' || (e.deltaX === 0 && Math.abs(e.deltaY) < 10 && !e.ctrlKey); 
    
    if (isTabletScroll) {
        canvasOffsetX -= e.deltaX;
        canvasOffsetY -= e.deltaY;
        updateCSSView();
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseBeforeZoomX = (e.clientX - rect.left) / zoomLevel;
    const mouseBeforeZoomY = (e.clientY - rect.top) / zoomLevel;

    if (e.ctrlKey) {
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 40; 
        
        const oldZoom = zoomLevel;
        zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - delta * 0.008));

        canvasOffsetX -= mouseBeforeZoomX * (zoomLevel - oldZoom);
        canvasOffsetY -= mouseBeforeZoomY * (zoomLevel - oldZoom);
    } 
    else {
        let moveX = e.deltaX;
        let moveY = e.deltaY;
        if (e.deltaMode === 1) {
            moveX *= 40;
            moveY *= 40;
        }
        canvasOffsetX -= moveX;
        canvasOffsetY -= moveY;
    }

    updateCSSView();
}, { passive: false });

brushSize.addEventListener('input', (e) => {
    const newSize = parseInt(e.target.value);
    if (currentTool === 'eraser') {
        eraserSize = newSize; 
    } else {
        penSize = newSize;    
    }
});
