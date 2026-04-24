const canvas = document.getElementById('maze-canvas');
const ctx = canvas.getContext('2d');
const btnGenerate = document.getElementById('btn-generate');
const btnSolve = document.getElementById('btn-solve');
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const speedInput = document.getElementById('speed');
const chkBonus = document.getElementById('bonus-cycles');
const rowsValspan = document.getElementById('rows-val');
const colsValspan = document.getElementById('cols-val');

// Assignment required variables
let R = parseInt(rowsInput.value);
let C = parseInt(colsInput.value);

// Data structure requirements
let northWall = []; // northWall[R][C]: if 1, top wall intact
let eastWall = [];  // eastWall[R][C]: if 1, right wall intact
let visited = [];   // tracking visited cells during generation
let solveVisited = []; // tracking visited cells during solving

// Canvas math
let cellSize = 20;
let offsetX = 0;
let offsetY = 0;

let isWorking = false; // prevents multiple generations at once
let mousePos = null; // tracking the invisible mouse location for drawing
let solvingPath = []; // stack for the solver
let deadEnds = []; // array of dead-end coordinates (blue dots)

// Listeners
rowsInput.addEventListener('input', () => { rowsValspan.textContent = rowsInput.value; R = parseInt(rowsInput.value); resizeCanvas(); drawMaze(); });
colsInput.addEventListener('input', () => { colsValspan.textContent = colsInput.value; C = parseInt(colsInput.value); resizeCanvas(); drawMaze(); });

function initArrays() {
    // Generate arrays of R rows and C columns
    northWall = Array.from({length: R}, () => Array(C).fill(1));
    eastWall = Array.from({length: R}, () => Array(C).fill(1));
    visited = Array.from({length: R}, () => Array(C).fill(0));
    solveVisited = Array.from({length: R}, () => Array(C).fill(0));
    solvingPath = [];
    deadEnds = [];
    mousePos = null;
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    // Fit maze to canvas
    const padding = 40;
    const availWidth = canvas.width - padding;
    const availHeight = canvas.height - padding;
    
    cellSize = Math.min(availWidth / C, availHeight / R, 30);
    offsetX = (canvas.width - (C * cellSize)) / 2;
    offsetY = (canvas.height - (R * cellSize)) / 2;
}

window.addEventListener('resize', () => { resizeCanvas(); drawMaze(); });

function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--wall-color').trim() || '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'square';
    
    const colors = {
        visited: getComputedStyle(document.body).getPropertyValue('--cell-visited').trim() || '#1e293b',
        mouse: getComputedStyle(document.body).getPropertyValue('--mouse-eat').trim() || '#fbbf24',
        redDot: getComputedStyle(document.body).getPropertyValue('--path-current').trim() || '#ef4444',
        blueDot: getComputedStyle(document.body).getPropertyValue('--path-deadend').trim() || '#3b82f6',
        start: getComputedStyle(document.body).getPropertyValue('--start-cell').trim() || '#22c55e',
        end: getComputedStyle(document.body).getPropertyValue('--end-cell').trim() || '#a855f7'
    };

    // Draw grid backgrounds and dots
    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            const x = offsetX + c * cellSize;
            const y = offsetY + r * cellSize;
            
            if (visited[r] && visited[r][c] === 1) {
                ctx.fillStyle = colors.visited;
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }

    // Draw start and end cells if they exist and maze is done
    if (!isWorking && visited.length > 0 && visited[0][0] === 1 && mousePos === null) {
        // Start is usually 0,0 and end is R-1, C-1
        ctx.fillStyle = colors.start;
        ctx.fillRect(offsetX, offsetY, cellSize, cellSize);
        ctx.fillStyle = colors.end;
        ctx.fillRect(offsetX + (C-1)*cellSize, offsetY + (R-1)*cellSize, cellSize, cellSize);
    }

    // Draw mouse if generating
    if (mousePos) {
        ctx.fillStyle = colors.mouse;
        ctx.fillRect(offsetX + mousePos.c * cellSize, offsetY + mousePos.r * cellSize, cellSize, cellSize);
    }

    // Draw dead ends (blue dots)
    for (let p of deadEnds) {
        const x = offsetX + p.c * cellSize + cellSize/2;
        const y = offsetY + p.r * cellSize + cellSize/2;
        ctx.beginPath();
        ctx.arc(x, y, cellSize/4, 0, Math.PI * 2);
        ctx.fillStyle = colors.blueDot;
        ctx.fill();
    }

    // Draw current path (red dots)
    for (let p of solvingPath) {
        const x = offsetX + p.c * cellSize + cellSize/2;
        const y = offsetY + p.r * cellSize + cellSize/2;
        ctx.beginPath();
        ctx.arc(x, y, cellSize/4, 0, Math.PI * 2);
        ctx.fillStyle = colors.redDot;
        ctx.fill();
    }

    // Draw walls
    ctx.beginPath();
    // Border walls (Bottom and Left edge explicitly per assignment logic)
    ctx.moveTo(offsetX, offsetY + R * cellSize);
    ctx.lineTo(offsetX + C * cellSize, offsetY + R * cellSize);
    
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX, offsetY + R * cellSize);

    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            const x = offsetX + c * cellSize;
            const y = offsetY + r * cellSize;

            // North Wall
            if (northWall[r] && northWall[r][c] === 1) {
                ctx.moveTo(x, y);
                ctx.lineTo(x + cellSize, y);
            }
            // East Wall
            if (eastWall[r] && eastWall[r][c] === 1) {
                ctx.moveTo(x + cellSize, y);
                ctx.lineTo(x + cellSize, y + cellSize);
            }
        }
    }
    // Also draw the outer right and top walls just in case
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX + C * cellSize, offsetY);
    ctx.moveTo(offsetX + C * cellSize, offsetY);
    ctx.lineTo(offsetX + C * cellSize, offsetY + R * cellSize);
    
    ctx.stroke();
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getDelay() {
    let speed = parseInt(speedInput.value);
    // speed is 1 to 100. 100 is fastest (0ms), 1 is slowest (100ms)
    return Math.max(0, 100 - speed);
}

// Generate Maze Algorithm (Stack-based DFS)
async function generateMaze() {
    if (isWorking) return;
    isWorking = true;
    btnGenerate.disabled = true;
    btnSolve.disabled = true;

    initArrays();
    drawMaze();

    // The mouse starts at 0, 0
    let stack = [];
    let startR = 0;
    let startC = 0;
    visited[startR][startC] = 1;
    stack.push({r: startR, c: startC});

    // Helper functions
    const getUnvisitedNeighbors = (r, c) => {
        let neighbors = [];
        if (r > 0 && visited[r-1][c] === 0) neighbors.push({r: r-1, c: c, dir: 'N'});
        if (c < C-1 && visited[r][c+1] === 0) neighbors.push({r: r, c: c+1, dir: 'E'});
        if (r < R-1 && visited[r+1][c] === 0) neighbors.push({r: r+1, c: c, dir: 'S'});
        if (c > 0 && visited[r][c-1] === 0) neighbors.push({r: r, c: c-1, dir: 'W'});
        return neighbors;
    };

    while (stack.length > 0) {
        let current = stack[stack.length - 1]; // peek at top
        mousePos = {r: current.r, c: current.c}; // update invisible mouse location
        
        let neighbors = getUnvisitedNeighbors(current.r, current.c);
        
        if (neighbors.length > 0) {
            // Choose random neighbor
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            // Eat through wall
            if (next.dir === 'N') northWall[current.r][current.c] = 0;
            if (next.dir === 'E') eastWall[current.r][current.c] = 0;
            if (next.dir === 'S') northWall[next.r][next.c] = 0; // South wall is the Next cell's North wall
            if (next.dir === 'W') eastWall[current.r][next.c] = 0; // West wall is the Next cell's East wall
            
            visited[next.r][next.c] = 1;
            stack.push({r: next.r, c: next.c});

            // Animate
            let delay = await getDelay();
            if (delay > 0) {
                drawMaze();
                await sleep(delay);
            }
        } else {
            // Trapped in a dead end, backtrack
            stack.pop();
            // Animate backtracking too
            mousePos = stack.length > 0 ? {r: stack[stack.length-1].r, c: stack[stack.length-1].c} : null;
            let delay = await getDelay();
            if (delay > 0) {
                drawMaze();
                await sleep(delay);
            }
        }
    }

    mousePos = null;

    // Bonus: Eat 1 in 20 extra walls to create cycles
    if (chkBonus.checked) {
        for (let r = 0; r < R; r++) {
            for (let c = 0; c < C; c++) {
                if (r > 0 && northWall[r][c] === 1 && Math.random() < 0.05) {
                    northWall[r][c] = 0;
                }
                if (c < C - 1 && eastWall[r][c] === 1 && Math.random() < 0.05) {
                    eastWall[r][c] = 0;
                }
            }
        }
    }

    // Open Start and End bounds
    // Opening at the left edge (start) and right edge (end)
    // Left edge logic is basically removing the leftmost limit. Currently we just draw a solid left vertical line.
    // Instead we can simulate this by assuming start is 0,0 and end is R-1, C-1 for the pathfinder.
    
    drawMaze();
    isWorking = false;
    btnGenerate.disabled = false;
    btnSolve.disabled = false;
}

async function solveMaze() {
    if (isWorking || !btnSolve.disabled === false && visited[0][0] !== 1) return;
    isWorking = true;
    btnGenerate.disabled = true;
    btnSolve.disabled = true;

    // Reset solving state but keep generated maze
    solveVisited = Array.from({length: R}, () => Array(C).fill(0));
    solvingPath = [];
    deadEnds = [];

    // Maze solver backtracking DFS
    let stack = [];
    stack.push({r: 0, c: 0});
    solveVisited[0][0] = 1;

    let found = false;

    // Helper functions
    const canMove = (currentR, currentC, nextR, nextC, dir) => {
        // Out of bounds
        if (nextR < 0 || nextR >= R || nextC < 0 || nextC >= C) return false;
        // Already visited by solver
        if (solveVisited[nextR][nextC] === 1) return false;
        
        // Wall tests
        if (dir === 'N') return northWall[currentR][currentC] === 0;
        if (dir === 'E') return eastWall[currentR][currentC] === 0;
        if (dir === 'S') return northWall[nextR][nextC] === 0;
        if (dir === 'W') return eastWall[currentR][nextC] === 0;
        
        return false;
    };

    while (stack.length > 0) {
        let current = stack[stack.length - 1]; // peek at top
        solvingPath = [...stack]; // current path is the stack

        if (current.r === R - 1 && current.c === C - 1) {
            found = true;
            break; // We reached the end!
        }

        // Try to move in a random direction that is valid
        let dirs = [
            {r: current.r - 1, c: current.c, dir: 'N'},
            {r: current.r, c: current.c + 1, dir: 'E'},
            {r: current.r + 1, c: current.c, dir: 'S'},
            {r: current.r, c: current.c - 1, dir: 'W'}
        ];
        
        // Shuffle directions to "try to move in a random direction"
        dirs.sort(() => Math.random() - 0.5);

        let moved = false;
        for (let next of dirs) {
            if (canMove(current.r, current.c, next.r, next.c, next.dir)) {
                solveVisited[next.r][next.c] = 1;
                stack.push({r: next.r, c: next.c});
                moved = true;
                break;
            }
        }

        let delay = await getDelay();
        if (delay > 0) {
            drawMaze();
            await sleep(delay);
        }

        if (!moved) {
            // Dead end
            let popped = stack.pop();
            deadEnds.push({r: popped.r, c: popped.c}); // Mark as blue dot
            // assignment: "The mouse can even put a wall up to avoid ever trying the dead-end cell again."
            // We achieve this naturally by just not un-visiting the cell (`solveVisited` remains 1).
        }
    }

    solvingPath = [...stack];
    drawMaze();

    isWorking = false;
    btnGenerate.disabled = false;
    btnSolve.disabled = false;
}

// Initialization and Event binding
btnGenerate.addEventListener('click', generateMaze);
btnSolve.addEventListener('click', solveMaze);

// Do initial draw
resizeCanvas();
initArrays();
drawMaze();
