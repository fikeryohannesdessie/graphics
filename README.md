# FIKER YOHANNES .....................UGR/4617/16
# Maze Generator & Solver

This is my submission for the Maze Generator and Solver assignment. It uses a stack-based DFS to generate a proper maze, and a backtracking algorithm to solve it.

## How it works

1. **Data Structures**: As required, I used two 2D arrays to keep track of the walls:
   `let northWall = [];` // 1 means top wall is intact
   `let eastWall = [];` // 1 means right wall is intact
2. **Generation**: It starts with a grid full of walls. An invisible "mouse" starts at the top-left and randomly picks unvisited neighbors, knocking down walls. If it gets stuck at a dead end, it uses a stack to backtrack until it finds a cell with unvisited neighbors.
3. **Solving**: The solver starts at the top-left and tries to find the bottom-right exit. As it moves, it leaves a **red dot** on the current path. If it hits a dead end (no walls to move through that aren't already visited), it backtracks and leaves a **blue dot** to mark that cell as a bad path.

### Bonus / Challenge
I added a checkbox for the bonus addendum. If you check it, 1 in 20 walls will randomly be deleted after the maze is generated. This creates cycles/loops so the "shoulder-to-the-wall" tracking method wouldn't work, since you'd just loop in circles around an island!

## How to run it
Just double click the `index.html` file to open it in your browser. You can click "Generate Maze" to watch it build, and then "Solve Maze" to watch it run.
