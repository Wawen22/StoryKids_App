# StoryKids mobile app (Flutter)

**Status: deferred.** Scaffolding is held until the mockup screenshots arrive in `docs/mockups/`. The product doc requires pixel-precise design fidelity — starting Flutter work before the mockups exist would be wasteful.

## When mockups land, bootstrap:

```bash
cd apps/mobile
flutter create . --project-name storykids --org ai.storykids --platforms ios,android --empty
```

Then add to `pubspec.yaml`:

```yaml
dependencies:
  flutter_riverpod: ^2.6.1
  go_router: ^14.6.2
  dio: ^5.7.0
  hive: ^4.0.0
  hive_flutter: ^2.0.0
  flutter_secure_storage: ^9.2.2
  image_picker: ^1.1.2
  image_cropper: ^8.0.2
  image: ^4.3.0
  google_fonts: ^6.2.1
  purchases_flutter: ^8.0.0
  sentry_flutter: ^8.11.0

dev_dependencies:
  build_runner: ^2.4.13
  riverpod_generator: ^2.6.3
  riverpod_lint: ^2.6.3
```

## Screens to build in Sprint 1 (per AGENTS.md §8)

1. Welcome
2. Child details (name + age)
3. Photo upload (3–5 photos, client-side compressed to 1024 px / JPEG q85)
4. Theme picker (6 themes)
5. Art style picker (4 styles)
6. Generating (polls `GET /v1/stories/:id` every 3 s)
7. Preview + paywall (3 free pages + locked state)

## Design tokens (from product doc)

- `background`: `#FBF5EA` (cream)
- `primary`: `#2D1B3D` (deep aubergine)
- `accent`: `#C9663F` (terracotta)
- `secondary`: `#F3D5A7` (warm amber)
- Display font: **Fraunces** (italic for child name emphasis)
- Body font: **Manrope**
- Button radius: `999` (pill) for primary CTAs
- Card radius: 16–24
- Transitions: 300 ms ease-out

## Architecture

- State: Riverpod v2 generators (`@riverpod`).
- Routing: `go_router` with typed routes.
- HTTP: `dio` with a token-injecting interceptor reading from `flutter_secure_storage`.
- Persistence: `hive` for non-sensitive (themes, last-picked style), `flutter_secure_storage` for the Supabase JWT.
- Payments: `purchases_flutter` (RevenueCat). Never touch StoreKit/Play Billing directly.
