/* the drawing app, from silveia.github.io/drawing-app — built into the draw page itself (14 Oct, by request:
   framed, it was a page of its own inside the page, with its own lights, its own way of being coloured and
   its own fonts, and it always looked a little different from everything else). its functions are as they
   were; what changed is where it lives:
   - everything is inside #drawPanel, and the whole of it runs inside this one function, so none of its
     names can meet the site's
   - it starts the first time the draw page is shown (window.startDrawing): started hidden, its sheet
     measured as nothing
   - its keys only work on the draw page (drawHere)
   - its little windows, sprites and fish stay inside the page, not the whole window
   - its pictures are under drawing/ */
window.startDrawing = function () {
    if (window.startDrawing.started) return;
    window.startDrawing.started = true;
    const DRAW_ROOT = document.getElementById('drawPanel');
    const drawHere = () => typeof activeSectionId !== 'undefined' && activeSectionId === 'draw' && !DRAW_ROOT.hidden && !document.querySelector('.modal-veil:not([hidden])');

/* ===== the game (drawing/game.js) ===== */
const bgWorld = document.getElementById('gameWorldBackground');
const playerEl = document.getElementById('gamePlayer');
let isPlaying = false;
let gameLoopId = null;

let visualHitboxEl = null;   // was never declared, so starting the game threw
let coinPositions = []; 
const MAX_COINS = 20;   
let coinAnimTimer = 0;  
let playerCoins = 0;    

let keyHistory = [];
let lastHorizontalFacing = 'd';

let worldPlayerX = 512;
let worldPlayerY = 512;

let camX = 0;
let camY = 0;
let moveSpeed = 1.5; 

const DESIGN_WIDTH = 300;
const DESIGN_HEIGHT = 295;
let viewWidth = 300;
let viewHeight = 295;

let animFrame = 0;
let animTimer = 0;
let playerRow = 5;      
const ANIM_SPEED = 6;   
const FRAME_SIZE = 32;  

const keysPressed = { w: false, s: false, a: false, d: false };

const mapBarriers = [
    { x: 495, y: 870, width: 400, height: 20 },
    { x: 658, y: 837, width: 200, height: 50 },
    { x: 752, y: 805, width: 120, height: 80 },
    { x: 257, y: 166, width: 27, height: 10 },
    { x: 320, y: 326, width: 27, height: 10 },
    { x: 161, y: 550, width: 27, height: 10 },
    { x: 194, y: 586, width: 27, height: 10 },
    { x: 221, y: 551, width: 27, height: 10 },
    { x: 767, y: 518, width: 27, height: 10 },
    { x: 798, y: 488, width: 27, height: 10 },
    { x: 828, y: 489, width: 27, height: 10 },
    { x: 804, y: 430, width: 27, height: 10 },
    { x: 737, y: 362, width: 27, height: 10 }
];

const treePositions = [
    { x: 211, y: 600 }, { x: 178, y: 567 }, { x: 338, y: 342 }, { x: 274, y: 183 },
    { x: 754, y: 378 }, { x: 820, y: 447 }, { x: 843, y: 504 }, { x: 814, y: 504 }, { x: 783, y: 534 }  
];

function updateViewportDimensions() {
    const container = document.getElementById('gameViewport'); 
    
    if (document.fullscreenElement) {
        if (container) {
            viewWidth = container.clientWidth || window.innerWidth || DESIGN_WIDTH;
            viewHeight = container.clientHeight || window.innerHeight || DESIGN_HEIGHT;
        }
    } else {
        viewWidth = DESIGN_WIDTH;   
        viewHeight = DESIGN_HEIGHT; 
    }
}

// the player walks 140–880 each way and picks a coin up within 20px of its middle, so a coin's
// middle is kept 60px inside that fence — near the edge it could land on the fence, out of reach
const COIN_SIZE = 48;
const COIN_AREA = { min: 140 + 60, max: 880 - 60 };
function wellInside(x, y) {
    const cx = x + COIN_SIZE / 2, cy = y + COIN_SIZE / 2;
    return cx >= COIN_AREA.min && cx <= COIN_AREA.max && cy >= COIN_AREA.min && cy <= COIN_AREA.max;
}

function spawnCoinOutsideView() {
    if (coinPositions.length >= MAX_COINS) return;
    const mapSize = 1024;
        const MIN_COIN_DISTANCE = 60;

    const visibleMinX = worldPlayerX - (viewWidth / 2);
    const visibleMaxX = worldPlayerX + (viewWidth / 2);
    const visibleMinY = worldPlayerY - (viewHeight / 2);
    const visibleMaxY = worldPlayerY + (viewHeight / 2);

    let validLocation = false;
    let spawnX = 0, spawnY = 0, attempts = 0;

    while (!validLocation && attempts < 150) {
        attempts++;
        let rawX = Math.floor(Math.random() * mapSize); 
        let rawY = Math.floor(Math.random() * mapSize);
        spawnX = Math.max(40, Math.min(rawX, mapSize - 40));
        spawnY = Math.max(40, Math.min(rawY, mapSize - 40));

        if (!wellInside(spawnX, spawnY)) continue; 

        const isVisible = spawnX >= visibleMinX && spawnX <= visibleMaxX && spawnY >= visibleMinY && spawnY <= visibleMaxY;
        let isWalkable = true;
        for (let barrier of mapBarriers) {
            if (spawnX < barrier.x + barrier.width + 40 && spawnX + COIN_SIZE > barrier.x - 40 &&
                spawnY < barrier.y + barrier.height + 40 && spawnY + COIN_SIZE > barrier.y - 40) {
                isWalkable = false;
                break;
            }
        }
        if (isVisible || !isWalkable) continue;
        let tooCloseToOtherCoin = false;
        for (let existingCoin of coinPositions) {
            const dx = spawnX - existingCoin.x;
            const dy = spawnY - existingCoin.y;
            if (Math.sqrt(dx * dx + dy * dy) < MIN_COIN_DISTANCE) {
                tooCloseToOtherCoin = true;
                break;
            }
        }

        if (!tooCloseToOtherCoin) validLocation = true;
    }

    if (!validLocation) return;
    const world = document.getElementById('gameWorldBackground');
    const coinEl = document.createElement('img');
    coinEl.src = 'drawing/coin.gif';
    coinEl.className = 'map-coin';
    coinEl.style.left = `${spawnX}px`;
    coinEl.style.top = `${spawnY}px`;
    coinEl.style.zIndex = spawnY + 16; 
    world.appendChild(coinEl);

    coinPositions.push({ x: spawnX, y: spawnY, element: coinEl });
}

function spawnTrees() {
    const world = document.getElementById('gameWorldBackground');
    if (!world) return;
    document.querySelectorAll('.map-tree').forEach(t => t.remove());
    treePositions.forEach(pos => {
        const tree = document.createElement('div');
        tree.className = 'map-tree';
        tree.style.left = `${pos.x}px`;
        tree.style.top = `${pos.y}px`;
        tree.style.zIndex = pos.y;
        world.appendChild(tree);
    });
}

function spawnInitialCoins() {
    const mapSize = 1024;
    const MIN_COIN_DISTANCE = 60;

    while (coinPositions.length < MAX_COINS) {
        let validLocation = false, spawnX = 0, spawnY = 0, attempts = 0;
        while (!validLocation && attempts < 100) {
            attempts++;
            let rawX = Math.floor(Math.random() * mapSize); 
            let rawY = Math.floor(Math.random() * mapSize);
            spawnX = Math.max(80, Math.min(rawX, mapSize - 80));
            spawnY = Math.max(80, Math.min(rawY, mapSize - 80));

            if (!wellInside(spawnX, spawnY)) continue; 

            let isWalkable = true;
            for (let barrier of mapBarriers) {
                if (spawnX < barrier.x + barrier.width + 40 && spawnX + COIN_SIZE > barrier.x - 40 &&
                    spawnY < barrier.y + barrier.height + 40 && spawnY + COIN_SIZE > barrier.y - 40) {
                    isWalkable = false;
                    break;
                }
            }
            if (!isWalkable) continue;
            let tooCloseToOtherCoin = false;
            for (let existingCoin of coinPositions) {
                const dx = spawnX - existingCoin.x;
                const dy = spawnY - existingCoin.y;
                if (Math.sqrt(dx * dx + dy * dy) < MIN_COIN_DISTANCE) {
                    tooCloseToOtherCoin = true;
                    break;
                }
            }

            if (!tooCloseToOtherCoin) validLocation = true;
        }
        if (!validLocation) continue;
        const world = document.getElementById('gameWorldBackground');
        const coinEl = document.createElement('img');
        coinEl.src = 'drawing/coin.gif';
        coinEl.className = 'map-coin';
        coinEl.style.left = `${spawnX}px`;
        coinEl.style.top = `${spawnY}px`;
        coinEl.style.zIndex = spawnY + 16; 
        world.appendChild(coinEl);
        coinPositions.push({ x: spawnX, y: spawnY, element: coinEl });
    }
}

function isCollidingWithBarriers(targetMapX, targetMapY) {
    const pWidth = 16, pHeight = 16;
    const pX = targetMapX - (pWidth / 2);
    const pY = targetMapY + 4; 
    for (let barrier of mapBarriers) {
        if (pX < barrier.x + barrier.width && pX + pWidth > barrier.x &&
            pY < barrier.y + barrier.height && pY + pHeight > barrier.y) {
            return true; 
        }
    }
    return false;
}

function runGameTick() {
    if (!isPlaying) return;

    let isMoving = false;
    let nextWorldX = worldPlayerX;
    let nextWorldY = worldPlayerY;

    const minFenceX = 140; 
    const maxFenceX = 880; 
    const minFenceY = 140; 
    const maxFenceY = 880; 

    if (keysPressed.a) nextWorldX -= moveSpeed;
    if (keysPressed.d) nextWorldX += moveSpeed;
    if (!isCollidingWithBarriers(nextWorldX, worldPlayerY) && nextWorldX >= minFenceX && nextWorldX <= maxFenceX) {
        worldPlayerX = nextWorldX;
    }

    if (keysPressed.w) nextWorldY -= moveSpeed;
    if (keysPressed.s) nextWorldY += moveSpeed;
    if (!isCollidingWithBarriers(worldPlayerX, nextWorldY) && nextWorldY >= minFenceY && nextWorldY <= maxFenceY) {
        worldPlayerY = nextWorldY;
    }

    if (keysPressed.w || keysPressed.s || keysPressed.a || keysPressed.d) {
        isMoving = true;
    }

    if (keysPressed.a) lastHorizontalFacing = 'a';
    if (keysPressed.d) lastHorizontalFacing = 'd';

    let diagonalOverrideFlip = null;

    if (keyHistory.length > 0) {
        if (keysPressed.w && keysPressed.d) { 
            playerRow = 3; 
            diagonalOverrideFlip = 'scale(2, 2)';  
        } 
        else if (keysPressed.w && keysPressed.a) { 
            playerRow = 3; 
            diagonalOverrideFlip = 'scale(-2, 2)'; 
        } 
        else if (keysPressed.s && keysPressed.d) { 
            playerRow = 4; 
            diagonalOverrideFlip = 'scale(-2, 2)'; 
        } 
        else if (keysPressed.s && keysPressed.a) { 
            playerRow = 4; 
            diagonalOverrideFlip = 'scale(2, 2)';  
        }
        else {
            const currentFacingKey = keyHistory[keyHistory.length - 1];
            if (currentFacingKey === 'w') { playerRow = 6; } 
            else if (currentFacingKey === 's') { playerRow = 5; } 
            else if (currentFacingKey === 'a' || currentFacingKey === 'd') { playerRow = 2; }
        }
    }

    if (isMoving) {
        animTimer++;
        if (animTimer >= ANIM_SPEED) {
            animTimer = 0;
            animFrame = (animFrame + 1) % 8; 
        }
    } else {
        animFrame = 0; 
    }

    playerEl.style.backgroundPosition = `${-(animFrame * FRAME_SIZE)}px ${-(playerRow * FRAME_SIZE)}px`;

    let scaleFactor = 1;
    let alignmentOffsetX = 0;
    let alignmentOffsetY = 0;

    if (document.fullscreenElement) {
        const scaleX = viewWidth / DESIGN_WIDTH;
        const scaleY = viewHeight / DESIGN_HEIGHT;
        scaleFactor = Math.min(Math.min(scaleX, scaleY), 2.0);

        alignmentOffsetX = (viewWidth - (DESIGN_WIDTH * scaleFactor)) / 2;
        alignmentOffsetY = (viewHeight - (DESIGN_HEIGHT * scaleFactor)) / 2;
    }

    if (document.fullscreenElement) {
        camX = (DESIGN_WIDTH / 2) - worldPlayerX;
        camY = (DESIGN_HEIGHT / 2) - worldPlayerY;
    } else {
        camX = (viewWidth / 2) - worldPlayerX;
        camY = (viewHeight / 2) - worldPlayerY;
    }

    let maxMapScrollX = 1024 - DESIGN_WIDTH;
    let maxMapScrollY = 1024 - DESIGN_HEIGHT;
    
    let minScrollLimitX = 0;
    let minScrollLimitY = 0;

    if (document.fullscreenElement) {
        let hPadding = ((viewWidth / scaleFactor) - DESIGN_WIDTH) / 2;
        let vPadding = ((viewHeight / scaleFactor) - DESIGN_HEIGHT) / 2;

        minScrollLimitX = hPadding;
        minScrollLimitY = vPadding;
        maxMapScrollX = 1024 - DESIGN_WIDTH - hPadding;
        maxMapScrollY = 1024 - DESIGN_HEIGHT - vPadding;
    } else {
        maxMapScrollX = 1024 - viewWidth;
        maxMapScrollY = 1024 - viewHeight;
    }

    if (camX > -minScrollLimitX) camX = -minScrollLimitX;
    if (camY > -minScrollLimitY) camY = -minScrollLimitY;

    if (camX < -maxMapScrollX) camX = -maxMapScrollX;
    if (camY < -maxMapScrollY) camY = -maxMapScrollY;

    if (document.fullscreenElement) {
        bgWorld.style.transform = `translate(${alignmentOffsetX}px, ${alignmentOffsetY}px) scale(${scaleFactor}) translate(${camX}px, ${camY}px)`;
    } else {
        bgWorld.style.transform = `scale(1) translate(${camX}px, ${camY}px)`;
    }

    playerEl.style.left = `${worldPlayerX}px`;
    playerEl.style.top = `${worldPlayerY}px`;
    playerEl.style.zIndex = Math.floor(worldPlayerY + 16);

    let facingDirectionTransform = 'scale(2, 2)';
    if (diagonalOverrideFlip) {
        facingDirectionTransform = diagonalOverrideFlip;
    } else {
        if (lastHorizontalFacing === 'd') {
            facingDirectionTransform = 'scale(-2, 2)'; 
        } else if (lastHorizontalFacing === 'a') {
            facingDirectionTransform = 'scale(2, 2)';  
        }
    }
    playerEl.style.transform = `translate(-50%, -50%) ${facingDirectionTransform}`;

    if (Math.random() < 0.01) spawnCoinOutsideView();

    // the coins' gif loops on its own: reloading it under a new address every 45 frames fetched it again ~27 times a second
    const playerCenterX = playerEl.offsetLeft;
    const playerCenterY = playerEl.offsetTop; 

    if (visualHitboxEl) {
        visualHitboxEl.style.left = `${playerCenterX - 20}px`;
        visualHitboxEl.style.top = `${playerCenterY - 20}px`;
        visualHitboxEl.style.zIndex = Math.floor(worldPlayerY + 17);
        visualHitboxEl.style.display = 'none';
    }

    coinPositions = coinPositions.filter(coin => {
        const coinCenterX = coin.element.offsetLeft + (coin.element.offsetWidth / 2);
        const coinCenterY = coin.element.offsetTop + (coin.element.offsetHeight / 2);

        const dx = playerCenterX - coinCenterX;
        const dy = playerCenterY - coinCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 20) { 
            coin.element.remove(); 
            
            playerCoins++;
            const counterLabel = document.getElementById('coinScoreValue');
            if (counterLabel) counterLabel.innerText = playerCoins;

            return false; 
        }
        return true; 
    });

    gameLoopId = requestAnimationFrame(runGameTick);
}

window.initCustomGame = function() {
    isPlaying = false; 
    if (gameLoopId) cancelAnimationFrame(gameLoopId);

    for (let key in keysPressed) keysPressed[key] = false;
    keyHistory = []; 
    lastHorizontalFacing = 'd'; 
    
    updateViewportDimensions();
    
    worldPlayerX = 512;
    worldPlayerY = 512;
    playerRow = 5; 
    animFrame = 0;
    animTimer = 0;

    playerCoins = 0;
    const counterLabel = document.getElementById('coinScoreValue');
    if (counterLabel) counterLabel.innerText = playerCoins;

    spawnTrees();
    document.querySelectorAll('.map-coin').forEach(c => c.remove());
    coinPositions = []; 
    spawnInitialCoins(); 

    if (!visualHitboxEl) {
        visualHitboxEl = document.createElement('div');
        visualHitboxEl.style.position = 'absolute';
        visualHitboxEl.style.border = '2px solid red';
        visualHitboxEl.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        visualHitboxEl.style.borderRadius = '50%';
        visualHitboxEl.style.width = '40px';
        visualHitboxEl.style.height = '40px';
        visualHitboxEl.style.pointerEvents = 'none';
        bgWorld.appendChild(visualHitboxEl);
    }


    isPlaying = true;
    gameLoopId = requestAnimationFrame(runGameTick);
};

window.teleportToSpawn = function() {
    worldPlayerX = 512;
    worldPlayerY = 512;
    playerRow = 5; 
    animFrame = 0;
};

document.body.addEventListener('keydown', (e) => {
    if (!drawHere()) return;     // only on the draw page
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;     // typing a colour code doesn't walk
    const key = e.key.toLowerCase();
    if (key in keysPressed && !keysPressed[key]) {
        keysPressed[key] = true;
        keyHistory.push(key); 
    }
});

document.body.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key in keysPressed) {
        keysPressed[key] = false;
        keyHistory = keyHistory.filter(k => k !== key);
    }
});

(() => {
    const fullscreenBtn = document.getElementById('fullscreenBtn'); 

    window.toggleFullscreen = function() {
    const gameContainer = document.getElementById('gameViewport'); 
    if (!gameContainer) return;

    if (!document.fullscreenElement) {
        const requestFS = gameContainer.requestFullscreen || gameContainer.webkitRequestFullscreen;
        if (requestFS) {
            requestFS.call(gameContainer).then(() => {
                setTimeout(updateViewportDimensions, 100);
            });
        }
    } else {
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFS) {
            exitFS.call(document).then(() => {
                setTimeout(updateViewportDimensions, 100);
            });
        }
    }
};
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', window.toggleFullscreen);
    }

    document.addEventListener('fullscreenchange', () => {
        updateViewportDimensions();
    });
})();

// keys let go of while the frame wasn't listening never say so: the player stops rather than walking on
window.addEventListener('blur', () => {
    for (let key in keysPressed) keysPressed[key] = false;
    keyHistory = [];
});

// the yams window shut: the loop stops and the keys let go, so nothing walks or runs on behind it
window.stopCustomGame = function () {
    isPlaying = false;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
    for (let key in keysPressed) keysPressed[key] = false;
    keyHistory = [];
};
// and opened again, it carries on where it was
window.resumeCustomGame = function () {
    if (isPlaying) return;
    isPlaying = true;
    gameLoopId = requestAnimationFrame(runGameTick);
};


/* ===== the canvas and its tools (drawing/script.js) ===== */
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
    miniWindow.style.zIndex = '2147483005';
    miniWindow2.style.zIndex = '2147483004';
    localStorage.setItem('gameWindowOpen', 'true');
    tuckIn(miniWindow, 'miniWindowLeft', 'miniWindowTop');
    // a game that was going when the window shut carries on
    if (!gameScreen.classList.contains('hidden-game-element') && typeof window.resumeCustomGame === 'function') window.resumeCustomGame();
});

referenceBtn.addEventListener('click', () => {
    miniWindow2.classList.remove('hidden-window');
    miniWindow2.style.display = 'block';
    miniWindow2.style.zIndex = '2147483005';
    miniWindow.style.zIndex = '2147483004';
    localStorage.setItem('referenceWindowOpen', 'true');
    tuckIn(miniWindow2, 'miniWindow2Left', 'miniWindow2Top');
});

closeWindowBtn.addEventListener('click', () => {
    miniWindow.classList.add('hidden-window'); 
    if (typeof window.stopCustomGame === 'function') window.stopCustomGame();     // shut is stopped: the game loop and its keys
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
    miniWindow.style.zIndex = '2147483005';
    miniWindow2.style.zIndex = '2147483004';
});

miniWindow2.addEventListener('mousedown', () => {
    miniWindow2.style.zIndex = '2147483005';
    miniWindow.style.zIndex = '2147483004';
});

windowHeader.addEventListener('mousedown', (e) => {
    isDraggingWindow = true;
    offsetX = e.clientX - miniWindow.offsetLeft;
    offsetY = e.clientY - miniWindow.offsetTop;
    
    windowHeader.style.backgroundColor = '';   // the held look is the stylesheet's (.is-held)
    windowHeader.classList.add('is-held'); 
    miniWindow.style.zIndex = '2147483005';
    miniWindow2.style.zIndex = '2147483004';
});

windowHeader2.addEventListener('mousedown', (e) => {
    isDraggingWindow2 = true;
    offsetX = e.clientX - miniWindow2.offsetLeft;
    offsetY = e.clientY - miniWindow2.offsetTop;
    
    windowHeader2.style.backgroundColor = '';   // the held look is the stylesheet's (.is-held)
    windowHeader2.classList.add('is-held'); 
    miniWindow.style.zIndex = '2147483004';
    miniWindow2.style.zIndex = '2147483005';
});

// a little window is kept wholly on the page: dragged, put back from storage, or left behind by the
// page getting smaller, it stops at the edges instead of going out of reach
function keepInside(win, left, top) {
    const most = (room, size) => Math.max(0, room - size);
    const x = Math.min(Math.max(0, left), most(DRAW_ROOT.clientWidth, win.offsetWidth));     // the page's own edges, not the window's
    const y = Math.min(Math.max(0, top), most(DRAW_ROOT.clientHeight, win.offsetHeight));
    return { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` };
}
function tuckIn(win, leftKey, topKey) {
    if (win.classList.contains('hidden-window')) return;
    const at = keepInside(win, win.offsetLeft, win.offsetTop);
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
    imageLoader.value = '';     // the same picture chosen again still loads
    imageLoader.blur();         // shift stamps straight away, not only after a click on the sheet
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

// what used to wait for the frame's load runs as the page is first shown
(() => {
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
            ctx.drawImage(img, 0, 0);
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
})();

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
            currentTool = brushType.value;     // the pen's tip draws with whatever the toolbar has (the eraser too)
            canvas.style.cursor = currentTool === 'eraser' ? 'cell' : 'crosshair';
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
// the drawing is kept in this browser (it was read back on load, but nothing ever wrote it): a moment after
// each change, so a long stroke isn't encoded over and over
let keepArtSoon = 0;
function keepArt() {
    clearTimeout(keepArtSoon);
    keepArtSoon = setTimeout(() => {
        try { localStorage.setItem('mySavedArt', canvas.toDataURL()); } catch (error) { /* too big for the store: kept for this visit */ }
    }, 600);
}
window.addEventListener('pointerup', () => { if (undoStack.length) keepArt(); });

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
    const room = DRAW_ROOT.getBoundingClientRect();     // they fly inside the page, not the whole window
    const fish = document.createElement('img');
    fish.src = 'drawing/fish.png'; 
    
    fish.style.position = 'absolute';
    fish.style.left = `${mouseX * (rect.width / canvas.clientWidth) + rect.left - room.left}px`;
    fish.style.top = `${mouseY * (rect.height / canvas.clientHeight) + rect.top - room.top}px`;
    fish.style.width = '120px'; 
    fish.style.height = 'auto';
    fish.style.imageRendering = 'pixelated';
    fish.style.pointerEvents = 'none';
    fish.style.zIndex = '2147483006';     // over the sheet, which lies over the colour layer
    fish.style.marginTop = '-60px';  
    fish.style.marginLeft = '-60px'; 
    
    DRAW_ROOT.appendChild(fish);

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
    if (!drawHere()) return;     // only on the draw page: elsewhere these keys are the rest of the site's
    // typing in a box (the colour code) is typing, not the canvas's shortcuts
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
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
            if (e.shiftKey) executeRedo();     // ctrl+shift+z is redo, as everywhere else on the site
            else executeUndo();
        }
        if (e.key.toLowerCase() === 'y') {
            e.preventDefault();
            executeRedo();
        }
    }

    if (e.key.toLowerCase() === 't') {
        isTKeyPressed = true;
        wakeTick();
    }

    if (e.key === 'Shift' && !e.repeat) {     // one stamp per press: held, the key repeats and filled undo with stamps
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

// keys let go of while the frame wasn't listening (the page behind it clicked, the window left) never
// say so, so they are let go of here: no endless fish, no stuck panning
window.addEventListener('blur', () => {
    isTKeyPressed = false;
    isSpacePressed = false;
    isPanning = false;
    canvas.style.cursor = 'crosshair';
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
    keepArt();
    // 20 art pixels per step of the brush: written as 2.5 when an art pixel was 8 screen pixels, which left a
    // stamp 5 pixels wide — a dot — once the sheet went to one screen pixel per art pixel
    const baseSize = Math.max(1, Math.round(Number(brushSize.value) * 20));
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
    // they live inside the sheet's box, so its rounded corners clip them: they walk along the sheet's own
    // foot and slip behind the curve at either end, rather than standing on the outline over the corners
    constructor() {
        this.x = Math.random() * Math.max(0, container.clientWidth - 64);
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
        container.appendChild(this.element); 
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
        const floorLevel = this.floor();

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
    
            if (this.x <= 0 || this.x >= this.wall()) {
                this.x = this.x <= 0 ? 0 : this.wall();
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
        if (this.x > this.wall()) this.x = this.wall();

        if (this.state !== 'climbing' && this.velocityX !== 0) {
            this.element.style.transform = this.velocityX > 0 ? 'scaleX(1)' : 'scaleX(-1)';
        }
        this.updateElementPosition();
    }

    floor() { return container.clientHeight - (this.element.offsetHeight || 64); }
    wall() { return Math.max(0, container.clientWidth - (this.element.offsetWidth || 64)); }

    updateElementPosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }
}

clearBtn.addEventListener('click', () => {
    const preSnapshot = canvas.toDataURL();
    undoStack.push(preSnapshot);
    if (undoStack.length > MAX_STATES) undoStack.shift();
    redoStack = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    keepArt();
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
    wakeTick();
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

            if (p.y > DRAW_ROOT.clientHeight + 100) {
                p.element.remove();
                htmlFishParticles.splice(i, 1);
            }
        }
    }

    // only runs while there is something to move: a loop forever on the main thread costs every page
    if (characters.length || htmlFishParticles.length || isTKeyPressed) requestAnimationFrame(animationTick);
    else ticking = false;
}
let ticking = false;
function wakeTick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(animationTick);
}

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
        ctx.drawImage(img, 0, 0);     // at its own size: stretched to a sheet that had grown since, it blurred
        keepArt();
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
        ctx.drawImage(img, 0, 0);
        keepArt();
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


/* ===== the toolbar's menus, the tool, the colour and the size (drawing/index.html) ===== */
// the two menus in the toolbar: a press opens one, a row picks, anywhere else or escape shuts it
(function () {
    var picks = Array.prototype.slice.call(DRAW_ROOT.querySelectorAll('.pick'));
    // in: the box unrolls down out of its button (the colour adjuster instead grows from its dot) — revealed top to bottom with a clip, nothing
    // scaled, so the words and the 1px outline stay crisp the whole way. out: it rolls back up,
    // quicker. either starts from wherever the other left off, so a quick open-and-shut never jumps
    var SHUT = 'inset(0 0 100% 0 round 14px)', OPEN = 'inset(0 0 0 0 round 14px)';
    var roll = function (menu, opening, time, easing) {
        var shape = menu.shapes || { shut: SHUT, open: OPEN };
        var to = opening ? shape.open : shape.shut;
        var from = menu.moving ? getComputedStyle(menu).clipPath : (opening ? shape.shut : shape.open);
        var fade = menu.moving ? getComputedStyle(menu).opacity : (opening ? '0' : '1');
        if (menu.moving) menu.moving.cancel();
        menu.moving = menu.animate([
            { clipPath: from, opacity: fade },
            { clipPath: to, opacity: opening ? 1 : (menu.shapes ? 1 : 0) }
        ], { duration: time, easing: easing, fill: 'forwards' });
        return menu.moving;
    };
    var openMenu = function (pick) {
        var face = pick.querySelector('.pick-face');
        var menu = pick.querySelector('.pick-menu');
        menu.hidden = false;
        menu.isOpen = true;
        face.setAttribute('aria-expanded', 'true');
        // the colour adjuster opens on the canvas's own top-left corner, its edges on the canvas's
        if (pick.id === 'colourPick') {
            var sheet = document.getElementById('canvas-container').getBoundingClientRect();
            var here = pick.getBoundingClientRect();
            menu.style.left = (sheet.left - here.left) + 'px';
            menu.style.top = (sheet.top - here.top) + 'px';
            // it grows out of the colour dot as a circle, and shrinks back into it: the circle's
            // middle is the dot's, and open it reaches the adjuster's farthest corner
            var dot = face.querySelector('.colour-dot').getBoundingClientRect();
            var cx = dot.left + dot.width / 2 - sheet.left, cy = dot.top + dot.height / 2 - sheet.top;
            var reach = Math.ceil(Math.hypot(Math.max(cx, menu.offsetWidth - cx), Math.max(cy, menu.offsetHeight - cy))) + 2;
            var at = ' at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px)';
            menu.shapes = { shut: 'circle(' + (dot.width / 2) + 'px' + at, open: 'circle(' + reach + 'px' + at };
            // then what is in it comes in one after another: the square, the strip, the code
            // with the site's colour on they don't move at all: a part on the move gathers what is in it into one
            // picture, and the colour dot in the code went under the adjuster's copy of the colour layer for the slide
            if (!menu.moving && !document.documentElement.classList.contains('tinted')) {
                Array.prototype.forEach.call(menu.children, function (part, i) {
                    part.animate([
                        { opacity: 0, transform: 'translateY(8px)' },
                        { opacity: 1, transform: 'none' }
                    ], { duration: 360, delay: 110 + i * 70, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
                });
            }
        }
        if (pick.id === 'colourPick' && window.sparkleAround) window.sparkleAround(menu, 7);     // the site's sparkles round it as it opens
        var growing = pick.id === 'colourPick';
        roll(menu, true, growing ? 460 : 240, growing ? 'cubic-bezier(0.5, 0, 0.15, 1)' : 'cubic-bezier(0.22, 1, 0.36, 1)').onfinish = function () {
            if (!menu.isOpen) return;
            menu.moving.cancel();
            menu.moving = null;
        };
    };
    var closeMenu = function (pick) {
        var face = pick.querySelector('.pick-face');
        var menu = pick.querySelector('.pick-menu');
        if (!menu.isOpen) return;
        menu.isOpen = false;
        face.setAttribute('aria-expanded', 'false');
        var shrinking = pick.id === 'colourPick';
        roll(menu, false, shrinking ? 300 : 170, shrinking ? 'cubic-bezier(0.55, 0, 0.75, 0.2)' : 'cubic-bezier(0.4, 0, 0.6, 1)').onfinish = function () {
            if (menu.isOpen) return;
            menu.hidden = true;
            menu.moving.cancel();
            menu.moving = null;
        };
    };
    var shut = function (except) {
        picks.forEach(function (pick) { if (pick !== except) closeMenu(pick); });
    };
    picks.forEach(function (pick) {
        var face = pick.querySelector('.pick-face');
        var menu = pick.querySelector('.pick-menu');
        face.addEventListener('click', function () {
            shut(pick);
            if (menu.isOpen) closeMenu(pick); else openMenu(pick);
        });
    });
    document.addEventListener('pointerdown', function (event) {
        if (!event.target.closest('.pick')) shut(null);
    }, true);
    window.addEventListener('keydown', function (event) { if (event.key === 'Escape') shut(null); });
    window.addEventListener('blur', function () { shut(null); });

    // the tool: one press swaps pen and eraser on the select underneath and tells script.js, the
    // way choosing in it would. the mark changes face at once and spins one turn as it does
    var tool = document.getElementById('brushType');
    var swap = document.getElementById('toolSwap');
    var turn = document.getElementById('toolTurn');
    var shown = null;
    var paintTool = function () {
        var rubbing = tool.value === 'eraser';
        if (shown === rubbing) return;
        shown = rubbing;
        turn.classList.toggle('is-rubbing', rubbing);
        swap.title = rubbing ? 'eraser · press for pen' : 'pen · press for eraser';
        swap.setAttribute('aria-label', rubbing ? 'eraser — press for the pen' : 'pen — press for the eraser');
    };
    var spinning = null;
    swap.addEventListener('click', function () {
        tool.value = tool.value === 'eraser' ? 'round' : 'eraser';
        tool.dispatchEvent(new Event('change'));
        paintTool();                       // the face changes on the press itself; the spin plays over it
        if (spinning) spinning.cancel();
        // pen to eraser turns clockwise, eraser back to pen turns the other way
        var way = tool.value === 'eraser' ? 1 : -1;
        spinning = turn.animate([
            { transform: 'rotate(0deg) scale(1)' },
            { offset: 0.4, transform: 'rotate(' + (160 * way) + 'deg) scale(0.8)' },
            { transform: 'rotate(' + (360 * way) + 'deg) scale(1)' }
        ], { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    });
    // a pen's own eraser end switches the tool from script.js without telling anyone
    window.addEventListener('pointerup', paintTool);
    paintTool();

    // the colour: a square for shade and brightness, a strip for hue, and the code to type — every
    // colour there is, set straight on the colour field underneath that script.js reads
    var colour = document.getElementById('colorPicker');
    var colourPick = document.getElementById('colourPick');
    var field = document.getElementById('tintField');
    var ring = document.getElementById('tintRing');
    var hueStrip = document.getElementById('tintHue');
    var hueRing = document.getElementById('hueRing');
    var code = document.getElementById('tintCode');
    var now = document.getElementById('tintNow');
    var hsv = { h: 0, s: 0, v: 0 };
    var toHex = function (h, s, v) {
        var f = function (n) {
            var k = (n + h / 60) % 6;
            var c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
            return ('0' + Math.round(c * 255).toString(16)).slice(-2);
        };
        return '#' + f(5) + f(3) + f(1);
    };
    var fromHex = function (hex) {
        var r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
        var most = Math.max(r, g, b), least = Math.min(r, g, b), d = most - least, h = 0;
        if (d) h = most === r ? ((g - b) / d) % 6 : most === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return { h: d ? (h * 60 + 360) % 360 : hsv.h, s: most ? d / most : 0, v: most };
    };
    var paintColour = function (keepCode) {
        colourPick.querySelector('.colour-dot').style.background = colour.value;
        now.style.background = colour.value;
        field.style.setProperty('--hue', 'hsl(' + hsv.h + ', 100%, 50%)');
        ring.style.left = (hsv.s * 100) + '%';
        ring.style.top = ((1 - hsv.v) * 100) + '%';
        hueRing.style.left = (hsv.h / 360 * 100) + '%';
        hueStrip.setAttribute('aria-valuenow', String(Math.round(hsv.h)));
        if (!keepCode) code.value = colour.value.slice(1);
    };
    var setColour = function (keepCode) {
        colour.value = toHex(hsv.h, hsv.s, hsv.v);
        colour.dispatchEvent(new Event('input'));
        paintColour(keepCode);
    };
    var drag = function (el, take) {
        var at = function (event) {
            var box = el.getBoundingClientRect();
            take(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
                 Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)));
            setColour();
        };
        el.addEventListener('pointerdown', function (event) {
            event.preventDefault();
            el.setPointerCapture(event.pointerId);
            el.classList.add('is-held');
            at(event);
        });
        el.addEventListener('pointermove', function (event) { if (el.hasPointerCapture(event.pointerId)) at(event); });
        el.addEventListener('pointerup', function () { el.classList.remove('is-held'); });
        el.addEventListener('pointercancel', function () { el.classList.remove('is-held'); });
    };
    drag(field, function (x, y) { hsv.s = x; hsv.v = 1 - y; });
    drag(hueStrip, function (x) { hsv.h = Math.min(359.9, x * 360); });
    field.addEventListener('keydown', function (event) {
        var moves = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, 0.02], ArrowDown: [0, -0.02] }[event.key];
        if (!moves) return;
        event.preventDefault();
        hsv.s = Math.max(0, Math.min(1, hsv.s + moves[0]));
        hsv.v = Math.max(0, Math.min(1, hsv.v + moves[1]));
        setColour();
    });
    hueStrip.addEventListener('keydown', function (event) {
        var step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 4 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -4 : 0;
        if (!step) return;
        event.preventDefault();
        hsv.h = (hsv.h + step + 360) % 360;
        setColour();
    });
    // the code: taken as soon as it is a whole colour (three or six hex figures)
    code.addEventListener('input', function () {
        var typed = code.value.replace(/[^0-9a-f]/gi, '').slice(0, 6);
        if (typed !== code.value) code.value = typed;
        if (typed.length === 3) typed = typed.split('').map(function (c) { return c + c; }).join('');
        if (typed.length !== 6) return;
        hsv = fromHex('#' + typed.toLowerCase());
        setColour(true);
    });
    code.addEventListener('blur', function () { paintColour(); });
    code.addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); shut(null); } });
    colour.addEventListener('input', function () { if (colour.value !== toHex(hsv.h, hsv.s, hsv.v)) { hsv = fromHex(colour.value); paintColour(); } });
    hsv = fromHex(colour.value);
    paintColour();

    // the size: the slider is dragged or pressed anywhere along it; less and more at its ends step
    // it (held, they keep stepping); the wheel and the arrow keys nudge it. it sets the range
    // underneath and tells script.js the way the range itself would
    var size = document.getElementById('brushSize');
    var step = document.getElementById('sizeStep');
    var track = document.getElementById('sizeTrack');
    var thumb = document.getElementById('sizeThumb');
    var read = document.getElementById('sizeRead');
    var most = Number(size.max), least = Number(size.min);
    var paintSize = function () {
        var v = Number(size.value);
        read.textContent = v + 'px';
        thumb.style.left = ((v - least) / (most - least) * 100) + '%';
        document.getElementById('sizeDone').style.width = thumb.style.left;
        track.setAttribute('aria-valuenow', String(v));
    };
    var setSize = function (v) {
        v = Math.max(least, Math.min(most, Math.round(v)));
        if (String(v) === size.value) { paintSize(); return; }
        size.value = String(v);
        size.dispatchEvent(new Event('input'));
        paintSize();
    };
    var fromPointer = function (event) {
        var box = track.getBoundingClientRect();
        var t = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
        setSize(least + t * (most - least));
    };
    track.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        track.setPointerCapture(event.pointerId);
        track.classList.add('is-held');
        fromPointer(event);
    });
    track.addEventListener('pointermove', function (event) { if (track.hasPointerCapture(event.pointerId)) fromPointer(event); });
    var letGo = function () { track.classList.remove('is-held'); };
    track.addEventListener('pointerup', letGo);
    track.addEventListener('pointercancel', letGo);
    var holdTimer = 0;
    var stopHold = function () { clearTimeout(holdTimer); holdTimer = 0; };
    [['.step-less', -1], ['.step-more', 1]].forEach(function (pair) {
        var button = step.querySelector(pair[0]);
        button.addEventListener('pointerdown', function (event) {
            event.preventDefault();
            setSize(Number(size.value) + pair[1]);
            // held, it keeps going: a beat first, then quicker
            var again = function (wait) {
                holdTimer = setTimeout(function () { setSize(Number(size.value) + pair[1]); again(Math.max(35, wait * 0.85)); }, wait);
            };
            stopHold();
            holdTimer = setTimeout(function () { again(90); }, 380);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (name) { button.addEventListener(name, stopHold); });
    });
    step.addEventListener('wheel', function (event) {
        event.preventDefault();
        setSize(Number(size.value) + (event.deltaY < 0 || event.deltaX > 0 ? 1 : -1));
    }, { passive: false });
    track.addEventListener('keydown', function (event) {
        var v = Number(size.value);
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); setSize(v + 1); }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); setSize(v - 1); }
    });
    // the tool switching (or a pen's eraser end) puts that tool's own size back into the range
    document.getElementById('brushType').addEventListener('change', paintSize);
    window.addEventListener('pointerup', paintSize);
    paintSize();

    document.getElementById('undoBtn').addEventListener('click', function () { executeUndo(); });
    document.getElementById('redoBtn').addEventListener('click', function () { executeRedo(); });

    // spawn with no sprite: a note drops in under the button, its arrow at upload sprite beside it
    var hint = document.getElementById('spriteHint');
    var hintTimer = 0;
    window.askForSprite = function () {
        clearTimeout(hintTimer);
        hint.hidden = false;
        hint.classList.remove('is-leaving');
        hint.style.animation = 'none';
        void hint.offsetWidth;          // so a second press plays the drop again
        hint.style.animation = '';
        hintTimer = setTimeout(function () {
            hint.classList.add('is-leaving');
            hintTimer = setTimeout(function () { hint.hidden = true; }, 200);
        }, 2400);
    };
})();

// the sheet lies over the site's colour layer, and what lies over the sheet carries its own copy of the layer
// (.own-layer: the windows, the colour adjuster, the corner marks, the note), pinned to where each sits —
// so they are placed again whenever something here may have moved them
['pointerup', 'click', 'keyup'].forEach((name) => DRAW_ROOT.addEventListener(name, () => requestAnimationFrame(window.placeOwnLayers), { capture: true, passive: true }));
window.addEventListener('mousemove', () => { if (isDraggingWindow || isDraggingWindow2) window.placeOwnLayers(); }, { passive: true });
new ResizeObserver(() => window.placeOwnLayers()).observe(DRAW_ROOT);
window.placeOwnLayers();

};
// opened straight onto the draw page, the site has already shown it before this file arrived
if (typeof activeSectionId !== 'undefined' && activeSectionId === 'draw' && !document.getElementById('drawPanel').hidden) window.startDrawing();
