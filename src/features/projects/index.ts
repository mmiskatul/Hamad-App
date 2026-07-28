/*
 * Projects feature — public surface.
 *
 * Figma Core: Project list/empty (142:1070, 151:1742), New project (144:1229),
 * Rename project (152:1914), Instructions (152:1951), Menu Project (152:1913 +
 * 185:3248).
 *
 * ADAPTIVE subtree — every value from useTheme(). The rename and instructions
 * screens take their target from the store's `editingId`, never a route param.
 */
export { default as ProjectListScreen } from './screens/ProjectListScreen';
export { default as NewProjectScreen } from './screens/NewProjectScreen';
export { default as RenameProjectScreen } from './screens/RenameProjectScreen';
export { default as ProjectInstructionsScreen } from './screens/ProjectInstructionsScreen';
export { default as ProjectSourcesScreen } from './screens/ProjectSourcesScreen';
export {
  default as ProjectMenu,
  type ProjectMenuAction,
} from './components/ProjectMenu';
export {
  useProjectStore,
  visibleProjects,
  migrateProjectState,
  PROJECT_FILTERS,
  PROJECT_STORAGE_KEY,
  PROJECT_STORAGE_VERSION,
  type Project,
  type ProjectFilter,
  type ProjectScope,
  type ProjectSource,
} from './store/projectStore';
