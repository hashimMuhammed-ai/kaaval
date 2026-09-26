---
trigger: always_on
---

Always read PROJECT_BRIEF.md and TASKLIST.md in full before starting any task in this workspace.

- Treat PROJECT_BRIEF.md as the source of truth for architecture, tech stack, multi-tenancy design, and feature scope. Do not deviate from it without flagging the conflict first.
- Treat TASKLIST.md as the current build plan. Work through phases in order unless told otherwise, and check off completed items as they're finished.
- Before generating or modifying any code, re-check both files if either may have changed since your last read.
- If a request conflicts with what's in PROJECT_BRIEF.md or TASKLIST.md, point out the conflict instead of silently overriding it.