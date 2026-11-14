# Soup ML Training Run Monitor

A high-performance, production-ready frontend web application designed for ML engineers to inspect model training telemetry, ensure data truthfulness, track resource costs, and control cluster compute budgets.

Built as a take-home assessment for **TrySoup**.

---

## Key Features & Engineering Highlights

### 1. Robust Data Pipeline & "Truthfulness" (`dataProcessor.ts`)
* **Anomaly & Edge Case Handling:** Automatically sanitizes corrupted telemetry streams. Handles `NaN`, `Inf`, and `-Inf` values by converting them safely to `null` rather than dropping or coercing them into false zeros. This guarantees **visual truthfulness** (ensuring graphs display honest gaps during gradient explosions rather than falsely implying smooth convergence).
* **High-Performance Downsampling:** Implements a custom Min-Max downsampling algorithm to efficiently render massive telemetry workloads (1,000,000+ data points) without dropping critical outlier spikes or freezing the UI.
* **Automated Testing:** Covered with rigorous unit tests using **Vitest**, verifying edge cases, sorting, and downsampling integrity.

### 2. High-Density ML Interface & UX (Linear / WandB Style)
* **Multi-View Dashboard:** Seamless SPA navigation between a filterable, sortable run list and a detailed run analysis page.
* **Interactive Run Management:** Real-time search by ID/model/name, status filters (Completed, Failed, Anomalies), and quick actions (e.g., immediate cluster resource termination / *Kill Run* for expensive jobs).
* **Polished Application States:** 
  * **Loading States:** Smooth skeleton loaders for data grids and async spinners for deep run fetches.
  * **Empty States:** Clear guidance and recovery actions when filters yield no results.
  * **Error Handling:** Interactive error modals with simulated cluster timeout recovery (`Retry Sync`).
* **Accessibility & Responsiveness:** Fully responsive layout with keyboard navigation support (`Tab`, `Enter` activation) and high-contrast visual standards.

### 3. Fast Canvas Rendering (`uPlot`)
* Utilizes **uPlot** for blazing-fast chart rendering.
* Custom axis formatting: displays training steps instead of default timestamps, and scientific notation (`3.0e-4`) for ultra-precise learning rates (`lr`).

---

## 🔍 Reviewer Walkthrough (How to Verify Key Scenarios)

To quickly verify data truthfulness and edge-case handling in the live demo:

1. **Data Truthfulness & `NaN` Gaps (`run-02`):**
   * Filter by **⚠️ Anomalies** or open `run-02`.
   * Observe the **Loss** chart: instead of coercing `NaN`/`Infinity` spikes into `0` or interpolating across missing intervals, the chart renders an honest visual gap while the summary card reports the exact count of corrupted points.
2. **1,000,000+ Points Performance (`run-03`):**
   * Open `run-03` to test extreme telemetry volume.
   * The Min-Max downsampling pipeline compresses 1M raw points down to ~2,000 canvas-ready points in milliseconds, preserving outlier spikes while keeping hover and zoom interactions smooth at 60 FPS.
3. **Interactive Budget Control & Resilience:**
   * Use the **🛑 Kill Run** action on active runs (`soup-exp-20-ablation`) to simulate immediate cluster termination.
   * Click **Simulate Error Popup** in the top bar to test HTTP 504 timeout handling and the **Retry Sync** recovery flow.

---

## Architecture & Engineering Trade-offs

* **Client-Side Processing vs. Web Workers:** For simplicity and zero-configuration deployment, sanitization and Min-Max downsampling currently run synchronously in the main thread (`useMemo`). In a production environment with multi-run comparisons or live WebSocket streaming at 1M+ points, offloading `dataProcessor.ts` to a **Web Worker** (using `Transferable` `Float64Array` buffers) would eliminate any brief main-thread blocking on initial load.
* **Custom CSS vs. Component Libraries:** Built with pure CSS variables and semantic HTML rather than heavy UI kits to keep the bundle size minimal and give full control over table density, skeleton shimmer animations, and `uPlot` container resizing.
* **Deterministic Mock Telemetry:** Runs are generated deterministically by ID (`dataGenerator.ts`) so that reloading the page or sharing a specific run scenario produces reproducible metrics and anomalies.

## Tech Stack

* **Framework:** React + TypeScript (Vite)
* **Styling:** Pure Modern CSS (CSS Variables, Flexbox/Grid, animations) with zero heavy UI component libraries.
* **Charts:** `uPlot` (lightweight canvas-based time/step-series plotting)
* **Testing:** Vitest

---

## Getting Started & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd soup-run-monitor
# Testing & QA Verification

Automated Unit Tests: src/utils/dataProcessor.test.ts validates data sanitization, deduplication, and Min-Max spike preservation[cite: 1].

Manual Stress Testing: Verified under extreme workloads (run-03 with 1M points) to ensure smooth canvas interactions and correct gap rendering during NaN anomalies[cite: 1].# soup-run-monitor
