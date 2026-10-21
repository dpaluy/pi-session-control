# Changelog

## 0.1.0 - 2026-10-20

### Added

- Initial Pi extension based on Armin Ronacher's `mitsuhiko/agent-stuff/extensions/control.ts`.
- Opt-in session control over local Unix sockets with `--session-control`.
- Session discovery by ID or name through `list_sessions` and `/control-sessions`.
- Inter-session messaging with steering, follow-up queueing, and optional turn-end waiting.
- Retrieval of assistant messages and model-generated activity summaries.
- Startup CLI flags for shell-driven messaging and the `PI_SESSION_ID` environment variable.
- Private socket permissions, bounded request input, and connection cleanup on shutdown.
- Practical setup and usage guide, workflow preview image, and Pi package gallery image.
- GitHub installation instructions, upstream attribution, Majestic Labs credit, and Apache-2.0 license.
- TypeScript checks and a real Pi socket integration test.

### Compatibility

- Adapted model completion to Pi 1.3.0's model registry API.
- Remote rewind of non-root sessions is explicitly unsupported; use `/tree` in the target session.
