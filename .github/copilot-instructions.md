## Setup & Commands
- Install deps with `yarn install`; run the integrated canvas + worker dev server via `yarn dev` (Vite + @cloudflare/vite-plugin bundles the Durable Object worker and client UI together).
- Populate `.dev.vars` with `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`; Wrangler loads this for both local dev (`yarn dev`) and deploys.
- Build production assets with `yarn build`; use `wrangler dev` or `wrangler deploy` if you need to exercise the worker outside of Vite.
- The dev server exposes `/stream` locally; no extra proxy configuration is required.

## Core Architecture
- `client/` hosts the React/tldraw UI; `worker/` is a Cloudflare worker with a Durable Object; `shared/` contains prompt/action utilities reused on both sides.
- `client/app-radar.tsx` is the primary entry: the canvas renders inline with the threaded chat so users see drawings in context instead of a split chat/canvas layout.
- `client/components/radar/RadarExperience.tsx` handles the conversation UI, in-thread canvas host, and prompt form controls.
- `client/agent/TldrawAgent.ts` is the orchestrator: tracks chat state in atoms, prepares prompts, streams actions, persists context in `localStorage`.
- `worker/do/AgentDurableObject.ts` keeps one `AgentService` instance per room; it streams AI actions as Server-Sent Events consumed by the client `streamAgent` iterator.

## Agent Pipeline
- `TldrawAgent.prompt()` normalizes input (`AgentInput`), stores request metadata, then awaits `requestAgent`, which POSTs the assembled `AgentPrompt` to `/stream`.
- Responses arrive as incremental `Streaming<AgentAction>` objects; incomplete actions are applied inside `editor.run(...)` and reverted if the next chunk supersedes them.
- User edits collected during a run are stored in `$userActionHistory`; helpers replay them in prompts so the model sees recent manual changes.

## Prompt Parts & Models
- Prompt assembly is governed by `shared/AgentUtils.ts` — edit `PROMPT_PART_UTILS` to change what the model sees; each util extends `PromptPartUtil` and can override `getPriority`, `buildMessages`, `buildSystemPrompt`, `getModelName`.
- Worker-side `buildMessages`/`buildSystemPrompt` rebuild util instances without an agent; keep shared code pure (no editor access) or guard against missing `this.editor`.
- Model selection defaults to `DEFAULT_MODEL_NAME` (`worker/models.ts`); `ModelNamePartUtil` reads `$modelName` to honor user overrides, but individual parts can overrule it.

## Actions & Canvas Effects
- Agent capabilities live in `AGENT_ACTION_UTILS`; each util subclass specifies a Zod schema via `getSchema()` and executes mutations in `applyAction()`.
- Use `AgentHelpers` inside actions to unoffset coordinates (`removeOffsetFromVec`) and validate ids (`ensureShapeIdExists`, `ensureShapeIdIsUnique`) before touching the editor.
- `sanitizeAction()` is the choke point to discard or fix bad model output; returning `null` cancels the action without surfacing it in history.
- Actions default to persisting chat history entries; override `savesToHistory()` if an action should be hidden.

## Shared Formats & Conventions
- Shapes exchanged with the model use simplified schemas in `shared/format`; conversions (`convertTldrawShapeToSimpleShape`, `convertTldrawShapesToPeripheralShapes`) keep payloads concise.
- Always round numbers with `AgentHelpers.roundShape*` before sending to the model and unround on the way back to avoid small jitter on reapply.
- Context selections are deduplicated by shape id (`dedupeShapesContextItem`); when injecting context manually, supply `SimpleShape` instances.

## UI Hooks & Extending UX
- `client/components/radar/RadarExperience.tsx` drives the inline chat + canvas flow; extending UX typically means adjusting its thread rendering or prompt form while keeping `TldrawAgent` atoms as the source of truth.
- Legacy `client/components/ChatPanel` still exists for the split-pane demo but is no longer the focus of new work.
- Highlight overlays (`components/highlights`) read `$activeRequest` to visualize agent focus; follow that pattern for additional debugging UI.
- Custom helper buttons live in `components/CustomHelperButtons.tsx` and call `agent.schedule` / `agent.reset`; reuse them to expose new agent shortcuts.

## Worker Details & Deploy
- `AgentService` picks a provider via `AGENT_MODEL_DEFINITIONS`; extend the map and ensure the relevant SDK provider is configured with an API key.
- Streaming uses `ai.streamText` with a forced JSON prefix; `closeAndParseJson` tolerates partial chunks, so keep responses JSON-compatible (`{"actions": [...]}` guardianship).
- SSE headers are set both in the Worker route and Durable Object; preserve them if you refactor, otherwise the browser connection will buffer.

## Pitfalls & Checks
- `TldrawAgent` registers editor side-effects to capture user diffs; wrap agent-driven edits in `this.isActing` to prevent feedback loops when adding new actions.
- The Durable Object currently uses a constant id (`anonymous`); multi-user apps should derive ids from auth/session to avoid cross-tenant state bleed.
- Remember that prompt/action util constructors can run without an agent on the worker; guard `this.editor` and avoid accessing browser APIs there.
- When adding new prompt data, avoid large blobs — SSE bandwidth and model token limits degrade quickly; prefer summarized formats in `shared/parts`.
