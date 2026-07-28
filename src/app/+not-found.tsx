import React from 'react';
import { Redirect } from 'expo-router';

/*
 * Catch-all for unmatched URLs. Reachable via a stale deep link or a typo'd
 * router.push, both of which get more likely once the app ships deep links for
 * chat threads and workspaces.
 *
 * Sending the user to "/" rather than showing a 404 screen is deliberate: "/"
 * re-runs bootstrap and then forks on auth state, so a bad link lands wherever
 * that user actually belongs instead of on a dead end. Revisit if the Core
 * section ever needs a real "this conversation no longer exists" screen — that
 * is a feature-level empty state, not a routing concern.
 */
export default function NotFoundRoute(): React.JSX.Element {
  return <Redirect href="/" />;
}
