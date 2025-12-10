/**
 * Hungarian Algorithm (Kuhn-Munkres) for Optimal Assignment
 *
 * Solves the assignment problem: Given an NxM cost matrix where each row
 * represents a worker and each column represents a task, find the optimal
 * 1-to-1 assignment that maximizes total score (or minimizes total cost).
 *
 * For name matching: rows = extracted names, columns = database members
 * We want to MAXIMIZE similarity scores, so we convert to cost minimization.
 */

/**
 * Solve the assignment problem using the Hungarian algorithm.
 * Returns the optimal column assignment for each row.
 *
 * @param scoreMatrix - NxM matrix of similarity scores (higher = better match)
 * @returns Array of length N where result[i] = column assigned to row i, or -1 if unassigned
 */
export function solveAssignment(scoreMatrix: number[][]): number[] {
    if (scoreMatrix.length === 0) return [];

    const numRows = scoreMatrix.length;
    const numCols = scoreMatrix[0]?.length || 0;

    if (numCols === 0) return new Array(numRows).fill(-1);

    // Convert to cost matrix (invert scores since Hungarian minimizes)
    // Find max score to invert
    let maxScore = 0;
    for (const row of scoreMatrix) {
        for (const score of row) {
            if (score > maxScore) maxScore = score;
        }
    }

    // Create square cost matrix (pad if needed)
    const size = Math.max(numRows, numCols);
    const costMatrix: number[][] = [];

    for (let i = 0; i < size; i++) {
        costMatrix[i] = [];
        for (let j = 0; j < size; j++) {
            if (i < numRows && j < numCols) {
                // Invert: high score = low cost
                costMatrix[i][j] = maxScore - scoreMatrix[i][j];
            } else {
                // Padding for rectangular matrices
                costMatrix[i][j] = maxScore; // High cost for dummy assignments
            }
        }
    }

    // Run Hungarian algorithm
    const assignment = hungarian(costMatrix);

    // Extract valid assignments (only for original rows and columns)
    const result: number[] = [];
    for (let i = 0; i < numRows; i++) {
        const col = assignment[i];
        result[i] = (col < numCols) ? col : -1;
    }

    return result;
}

/**
 * Core Hungarian algorithm implementation
 * Returns optimal column assignment for each row
 */
function hungarian(cost: number[][]): number[] {
    const n = cost.length;

    // u[i] = potential for row i, v[j] = potential for column j
    const u: number[] = new Array(n + 1).fill(0);
    const v: number[] = new Array(n + 1).fill(0);

    // p[j] = row assigned to column j (1-indexed, 0 = unassigned)
    const p: number[] = new Array(n + 1).fill(0);

    // way[j] = previous column in augmenting path
    const way: number[] = new Array(n + 1).fill(0);

    for (let i = 1; i <= n; i++) {
        p[0] = i;
        let j0 = 0; // Virtual column

        const minv: number[] = new Array(n + 1).fill(Infinity);
        const used: boolean[] = new Array(n + 1).fill(false);

        // Find augmenting path
        do {
            used[j0] = true;
            const i0 = p[j0];
            let delta = Infinity;
            let j1 = 0;

            for (let j = 1; j <= n; j++) {
                if (!used[j]) {
                    const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minv[j]) {
                        minv[j] = cur;
                        way[j] = j0;
                    }
                    if (minv[j] < delta) {
                        delta = minv[j];
                        j1 = j;
                    }
                }
            }

            // Update potentials
            for (let j = 0; j <= n; j++) {
                if (used[j]) {
                    u[p[j]] += delta;
                    v[j] -= delta;
                } else {
                    minv[j] -= delta;
                }
            }

            j0 = j1;
        } while (p[j0] !== 0);

        // Reconstruct path
        do {
            const j1 = way[j0];
            p[j0] = p[j1];
            j0 = j1;
        } while (j0 !== 0);
    }

    // Extract assignment: ans[row] = column (0-indexed)
    const ans: number[] = new Array(n).fill(-1);
    for (let j = 1; j <= n; j++) {
        if (p[j] !== 0) {
            ans[p[j] - 1] = j - 1;
        }
    }

    return ans;
}

/**
 * Get the total score for a given assignment
 */
export function getAssignmentScore(
    scoreMatrix: number[][],
    assignment: number[]
): number {
    let total = 0;
    for (let i = 0; i < assignment.length; i++) {
        const col = assignment[i];
        if (col >= 0 && col < scoreMatrix[i].length) {
            total += scoreMatrix[i][col];
        }
    }
    return total;
}
