import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { useChatStore } from '@/features/chat';
import { ProjectListScreen, type Project } from '@/features/projects';

/*
 * "/projects" — project list, empty and populated (Figma 142:1070 / 151:1742).
 * Reached from the chat drawer's "Project" row.
 *
 * NOT a bare re-export, unlike its siblings, and deliberately so: opening a
 * project means starting a chat scoped to it, which touches BOTH features.
 * Neither may import the other, so the wiring lives here — a route file is a
 * composition root, the same reason src/app/index.tsx injects the auth feature's
 * hydration task into shared bootstrap.
 *
 * It still holds no UI. The screen belongs to the feature; this only says what
 * "open a project" means.
 */
export default function ProjectsRoute(): React.JSX.Element {
  const router = useRouter();
  const startProjectChat = useChatStore((state) => state.startProjectChat);

  const onOpenProject = useCallback(
    (project: Project) => {
      // Parks any open chat and tags the NEXT one with this project, so the
      // conversation view shows the "Project / name" breadcrumb.
      startProjectChat({ id: project.id, name: project.name });
      router.push('/conversation');
    },
    [startProjectChat, router],
  );

  return <ProjectListScreen onOpenProject={onOpenProject} />;
}
