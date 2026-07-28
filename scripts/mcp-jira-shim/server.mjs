#!/usr/bin/env node
/**
 * mcp-jira-shim — drop-in replacement for mcp-jira@0.1.0 that targets the
 * correct Jira Cloud REST v3 endpoints.
 *
 * Why this exists:
 *   - upstream mcp-jira@0.1.0 hardcodes /rest/api/2/ and /search
 *   - Jira Cloud v3 deprecated /search (returns 410 Gone) in favor of
 *     /rest/api/3/search/jql
 *   - upstream also sends `Authorization: Bearer <token>` but Jira Cloud
 *     basic-auth (email + API token) is `Basic base64(email:token)`
 *
 * Config (env):
 *   JIRA_BASE_URL   e.g. https://yourname.atlassian.net
 *   JIRA_EMAIL      the Atlassian account email
 *   JIRA_API_TOKEN  https://id.atlassian.com/manage-profile/security/api-tokens
 *
 * The shim exposes the same tool surface as mcp-jira@0.1.0 so it can be
 * wired into puku-cli via .mcp.json by pointing command at this file.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/+$/, '');
const EMAIL = process.env.JIRA_EMAIL;
const TOKEN = process.env.JIRA_API_TOKEN;

if (!BASE_URL || !EMAIL || !TOKEN) {
  console.error(
    `[mcp-jira-shim] Missing required env vars: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN`,
  );
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

/**
 * Jira REST v3 call. Always JSON. Throws on non-2xx with the status + body.
 */
async function jiraFetch(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(`Jira API ${res.status} ${res.statusText}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/** Convert ADF-style rich text into Atlassian Document Format for create/update. */
function toAdf(text) {
  return {
    type: 'doc',
    version: 1,
    content: [
      { type: 'paragraph', content: [{ type: 'text', text }] },
    ],
  };
}

const server = new McpServer({
  name: 'jira-mcp-shim',
  version: '1.0.0',
});

// --- jira_get_issue ---------------------------------------------------------
server.registerTool(
  'jira_get_issue',
  {
    title: 'Get Jira Issue',
    description: 'Get details of a specific Jira issue',
    inputSchema: {
      issueKey: z.string().describe('The Jira issue key (e.g., OAH-123)'),
    },
  },
  async ({ issueKey }) => {
    const issue = await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`);
    return { content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }] };
  },
);

// --- jira_search ------------------------------------------------------------
server.registerTool(
  'jira_search',
  {
    title: 'Search Jira Issues',
    description:
      'Search issues using JQL (JIRA Query Language). Uses the v3 /search/jql endpoint which uses cursor pagination (nextPageToken), not offset.',
    inputSchema: {
      jql: z.string().describe('JQL query string'),
      maxResults: z.number().optional().describe('Maximum number of results per page (default: 50)'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Cursor token from a previous search response (omit to get the first page)'),
    },
  },
  async ({ jql, maxResults = 50, nextPageToken }) => {
    // Note: v3 /search/jql uses cursor pagination, NOT the legacy `startAt` offset.
    // Passing `startAt` in the body returns 400 Bad Request.
    const body = { jql, maxResults };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const data = await jiraFetch('/rest/api/3/search/jql', { method: 'POST', body });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// --- jira_create_issue ------------------------------------------------------
server.registerTool(
  'jira_create_issue',
  {
    title: 'Create Jira Issue',
    description: 'Create a new Jira issue',
    inputSchema: {
      project: z.string().describe('Project key'),
      issueType: z.string().describe('Issue type (e.g., Bug, Task, Story)'),
      summary: z.string().describe('Issue summary'),
      description: z.string().optional().describe('Issue description'),
      assignee: z.string().optional().describe('Assignee account ID'),
      priority: z.string().optional().describe('Priority name'),
    },
  },
  async ({ project, issueType, summary, description, assignee, priority }) => {
    const fields = {
      project: { key: project },
      issuetype: { name: issueType },
      summary,
    };
    if (description) fields.description = toAdf(description);
    if (assignee) fields.assignee = { accountId: assignee };
    if (priority) fields.priority = { name: priority };

    const created = await jiraFetch('/rest/api/3/issue', {
      method: 'POST',
      body: { fields },
    });
    return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] };
  },
);

// --- jira_update_issue ------------------------------------------------------
server.registerTool(
  'jira_update_issue',
  {
    title: 'Update Jira Issue',
    description: 'Update an existing Jira issue',
    inputSchema: {
      issueKey: z.string().describe('The Jira issue key (e.g., OAH-123)'),
      summary: z.string().optional().describe('New summary'),
      description: z.string().optional().describe('New description'),
      assignee: z.string().optional().describe('New assignee account ID'),
      priority: z.string().optional().describe('New priority name'),
    },
  },
  async ({ issueKey, summary, description, assignee, priority }) => {
    const fields = {};
    if (summary !== undefined) fields.summary = summary;
    if (description !== undefined) fields.description = toAdf(description);
    if (assignee !== undefined) fields.assignee = { accountId: assignee };
    if (priority !== undefined) fields.priority = { name: priority };

    await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      method: 'PUT',
      body: { fields },
    });
    return { content: [{ type: 'text', text: `Updated ${issueKey}` }] };
  },
);

// --- jira_transition_issue --------------------------------------------------
server.registerTool(
  'jira_transition_issue',
  {
    title: 'Transition Jira Issue',
    description: 'Transition an issue to a new status',
    inputSchema: {
      issueKey: z.string().describe('The Jira issue key'),
      transitionId: z.string().describe('The transition ID'),
      comment: z.string().optional().describe('Optional comment for the transition'),
    },
  },
  async ({ issueKey, transitionId, comment }) => {
    const body = { transition: { id: transitionId } };
    if (comment) body.update = { comment: [{ add: { body: toAdf(comment) } }] };

    await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
      method: 'POST',
      body,
    });
    return { content: [{ type: 'text', text: `Transitioned ${issueKey}` }] };
  },
);

// --- jira_add_comment -------------------------------------------------------
server.registerTool(
  'jira_add_comment',
  {
    title: 'Add Jira Comment',
    description: 'Add a comment to a Jira issue',
    inputSchema: {
      issueKey: z.string().describe('The Jira issue key'),
      comment: z.string().describe('Comment text'),
    },
  },
  async ({ issueKey, comment }) => {
    const created = await jiraFetch(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
      { method: 'POST', body: { body: toAdf(comment) } },
    );
    return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] };
  },
);

// --- start stdio transport --------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);