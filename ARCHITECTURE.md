# Architecture Document: Real-Time Multiplayer Sync Engine

![alt text](image.png)
This document outlines the architectural decisions, system design, and network synchronization mechanisms for the custom real-time multiplayer canvas engine. The system is built using raw WebSockets, React, and Node.js, fulfilling the requirements for high-performance cursor synchronization, strict payload validation, and robust room isolation.

## 1. System Overview
The architecture is divided into three primary domains:
*   **The Sync Engine (Client):** A framework-agnostic WebSocket controller (`RoomController`) and an interpolation buffer that decouples fast-moving network data from the React render cycle.
*   **The Relay Server (Node.js):** A lightweight, memory-efficient WebSocket server responsible for strictly validated, room-isolated O(N) message broadcasting.
*   **The Presentation Layer (React/Tailwind):** A data-driven, scaled (125% baseline) UI utilizing a custom tool state machine and dual-layer rendering (DOM for static UI, `requestAnimationFrame` for high-frequency cursor rendering).

---

## 2. Network Protocol & Validation
To ensure systemic stability and prevent poisoned payloads from crashing the sync loop, the system enforces a strict, shared TypeScript protocol (`shared/protocol.ts`).

*   **Strict Runtime Validation:** Every incoming message on the server passes through rigorous type guards (e.g., `isValidClientMessage`). Malformed JSON or structurally invalid payloads are silently dropped without throwing unhandled exceptions.
*   **Throttling & Batching:** The client strictly throttles outgoing `mousemove` events to approximately 25Hz (every ~40ms). This prevents network saturation while providing enough timestamped data points for the client-side interpolation engine to recreate a fluid 60 FPS motion path.
*   **Sequence Numbering:** Every cursor coordinate payload includes a monotonically increasing `sequence` integer. The client controller aggressively discards out-of-order packets (where `incoming_sequence <= last_sequence`), guaranteeing cursors only move forward in time regardless of network jitter.

---

## 3. The Interpolation Engine (Time-Machine Buffer)
Rendering raw network coordinates directly to the screen results in visual stuttering and rubber-banding due to inherent network latency and jitter. 

To achieve a buttery-smooth, Figma-like visual experience, the client implements a **Time-Machine Buffer** (`CursorInterpolator`):
*   **100ms Render Delay:** The client deliberately renders the remote state 100ms in the past. This introduces a defensible tradeoff: an imperceptible delay in remote cursor presence in exchange for mathematically flawless visual movement.
*   **Linear Interpolation (Lerp):** By rendering 100ms behind real-time, the client engine guarantees it almost always possesses a "past" and "future" coordinate sample. The `requestAnimationFrame` loop calculates the exact pixel position between these two timestamps for every frame.
*   **Memory Bounding:** To prevent memory leaks during long sessions, the interpolation buffer is strictly bounded to a maximum of 10 historical samples per remote participant.

---

## 4. Server Architecture & Room Isolation
The Node.js server acts as a trustless, isolated relay. It does not store persistent canvas data, but it perfectly routes ephemeral state.

*   **Room-Based Isolation:** Connections are mapped using a nested hash map structure: `Map<RoomId, Map<ClientId, WebSocket>>`. This ensures O(1) room lookups and strictly isolates broadcast fan-outs so data never leaks across concurrent jam sessions.
*   **Asymmetric Broadcasting:** The `broadcast()` function iterates through the room's participant map and explicitly excludes the sender's WebSocket instance. This prevents the "echo bug," ensuring clients do not receive their own coordinates back from the server.
*   **Aggressive Cleanup:** The server listens for `close` and `error` events on the raw socket. Upon disconnection, the server instantly removes the `ClientId` from the room map and broadcasts a `presence_left` event to all peers, preventing "zombie cursors" from remaining on the canvas.

---

## 5. Frontend & UI Architecture
The React frontend is architected to handle high-frequency updates without choking the Virtual DOM.

*   **Render Cycle Decoupling:** Remote participant coordinates and interpolation states are held in mutable `useRef` structures and raw instance variables (inside `participantStore.ts`). The 60 FPS render loop runs entirely outside of React's `useState`, preventing continuous DOM recalculations.
*   **Tool State Machine:** The sidebar implements a functional state machine (`pointer`, `text`, `spark`). Selecting a tool hides the default OS cursor (`cursor-none`), intercepts the raw DOM click events, and dynamically routes the network broadcast (e.g., dispatching a targeted `react` payload instead of a standard `cursor` payload).
*   **Typography & Scaling:** The interface relies on the Plus Jakarta Sans geometric typeface to match modern design-tool aesthetics. The entire application is proportionally scaled to 125% by overriding the root CSS `html { font-size: 20px; }`, allowing Tailwind's `rem`-based classes to cleanly upscale the UI without breaking pixel-based coordinate mapping.