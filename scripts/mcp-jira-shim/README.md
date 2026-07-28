# mcp-jira-shim

Drop-in replacement for `mcp-jira@0.1.0` that talks to Jira Cloud REST **v3** correctly.

## Why this exists

The `mcp-jira` npm package (v0.1.0, the only one on the registry) has two bugs that make it fail against any modern Jira Cloud instance:

1. **Hardcoded API version `v2`** — modern Jira Cloud only supports `v3` (returns 410 Gone on v2).
2. **Deprecated search endpoint `/search`** — Jira migrated to `/rest/api/3/search/jql`. The legacy path returns 410 Gone.

Both issues manifest as **403 Forbidden** in the MCP tool surface (mcp-jira's error mapper drops the real status code), which is misleading — there is no permission problem. The actual upstream response is 410 Gone.

This shim fixes both issues:

- Uses `/rest/api/3/` for every endpoint.
- Uses `/rest/api/3/search/jql` (cursor pagination via `nextPageToken`, **not** offset-based).
- Uses HTTP Basic auth (`email:api-token`) which is the canonical Jira Cloud auth scheme.

## Tools exposed (same surface as `mcp-jira@0.1.0`)

| Tool                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `jira_get_issue`      | Get one issue by key                 |
| `jira_search`         | JQL search (cursor paginated)        |
| `jira_create_issue`   | Create an issue (ADF body)           |
| `jira_update_issue`   | Update fields on an issue            |
| `jira_transition_issue` | Move an issue through a transition  |
| `jira_add_comment`    | Add an ADF comment to an issue       |

## Config

Required env vars (set in your shell / Windows user environment):

- `JIRA_BASE_URL` — e.g. `https://yourname.atlassian.net`
- `JIRA_EMAIL` — Atlassian account email
- `JIRA_API_TOKEN` — from <https://id.atlassian.com/manage-profile/security/api-tokens>

## Running directly

```bash
JIRA_BASE_URL=https://yourname.atlassian.net \
JIRA_EMAIL=you@example.com \
JIRA_API_TOKEN=xxxx \
node scripts/mcp-jira-shim/server.mjs
```

## Wiring into puku-cli

Point `mobile/.mcp.json` at this server instead of `mcp-jira`:

```json
"jira": {
  "type": "stdio",
  "command": "C:\\Program Files\\nodejs\\node.exe",
  "args": ["<repo>/mobile/scripts/mcp-jira-shim/server.mjs"],
  "env": {
    "JIRA_HOST": "${JIRA_HOST}",
    "JIRA_BASE_URL": "${JIRA_HOST}",
    "JIRA_EMAIL": "${JIRA_EMAIL}",
    "JIRA_API_TOKEN": "${JIRA_API_TOKEN}"
  }
}
```

After editing `.mcp.json`, **restart puku-cli** — MCP servers are only loaded at session start.

## Differences from upstream `mcp-jira@0.1.0`

- `jira_search.startAt` parameter is **removed**. Use `nextPageToken` (from the previous response's `nextPageToken` field) to paginate.
- Description/summary text is converted to Atlassian Document Format (ADF) automatically when writing.
- Error messages include the full upstream response body, not just status code.
