# Mobile architecture

This project uses Expo Router with a feature-based source layout.

## Directory map

mobile/
  src/
    app/                 Expo Router routes and layouts only
      (auth)/            Authentication route group
      (app)/             Authenticated route group
      _layout.tsx        Root providers and navigation setup
      index.tsx          Bootstrap and initial redirect
    features/            Business features and their private UI
      auth/
      chat/
      dashboard/
      projects/
      settings/
    shared/              Reusable code with no single feature owner
      api/
      bootstrap/
      format/
      i18n/
      loading/
      models/
      plan/
      profile/
      theme/
      ui/
      usage/
  assets/                App-wide images, icons, and brand assets
  docs/                  Architecture notes and development screenshots
  scripts/               Developer tooling
  fastlane/              Native release automation

## Rules

- Keep src/app limited to route files, route layouts, redirects, and route tests. Expo Router turns files there into routes.
- Put feature screens, components, hooks, state, and API clients in the owning directory under src/features/<feature>.
- Put code in src/shared only when it is genuinely reusable across two or more features.
- Keep tests next to the feature or shared module they cover in __tests__ folders.
- Use the @/* alias for imports across feature boundaries; use relative imports only within a small local module group.
- Add new route files as thin adapters that render an exported feature screen.
- Keep screenshots, investigation artifacts, and design notes under docs/, never in the source tree.

## Adding a feature

1. Create src/features/<name>/ with screens/, components/, and store/ only as needed.
2. Export public screens and types from that feature's index.ts.
3. Add a thin route adapter under the correct src/app route group.
4. Add tests beside the feature code.
5. Run npm run typecheck, npm run lint, and npm test -- --runInBand before committing.
