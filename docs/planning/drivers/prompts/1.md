# Cursor-Ready Implementation Prompts: Taxi Assist Driver App (Flutter + Supabase)

**Project Goal:** Build a production-grade Driver App for Taxi Assist using Flutter + Supabase.  
Focus on **compliance-first**, real-time trip management, document workflow, and fast pilot launch in South African corridors.

**Tech Stack (Fixed):**

- Flutter 3.24+
- Supabase Flutter SDK
- Riverpod 2.0 (with riverpod_annotation + code generation)
- Google Maps Flutter + Geolocator
- Clean folder structure as per previous Tech Spec

**Important Rules for All Prompts:**

- Use Riverpod for state management (providers, notifiers)
- Enforce RLS via Supabase policies (assume backend policies are already set)
- All Supabase calls must be wrapped in a service layer
- Add proper error handling, loading states, and user-friendly messages
- Follow South African realities (network flakiness, battery optimization)
- Make every module testable and incremental

---

## Prompt 1: Project Setup & Core Architecture

```text
Create the complete foundational structure for the Taxi Assist Driver App in Flutter with Supabase and Riverpod.

1. Initialize a new Flutter project with the following dependencies in pubspec.yaml:
   - supabase_flutter
   - flutter_riverpod
   - riverpod_annotation
   - riverpod_generator
   - google_maps_flutter
   - geolocator
   - permission_handler
   - uuid
   - intl
   - fluttertoast

2. Set up the exact folder structure:
   lib/
   ├── core/
   │   ├── constants/
   │   ├── theme/
   │   ├── utils/
   │   └── supabase_client.dart
   ├── features/
   │   ├── auth/
   │   ├── onboarding/
   │   ├── home/
   │   ├── trip/
   │   ├── profile/
   │   ├── documents/
   │   └── earnings/
   ├── shared/
   │   ├── models/
   │   ├── widgets/
   │   └── services/
   └── main.dart

3. Create Supabase client singleton with proper initialization (supabase url and anon key from .env).

4. Set up Riverpod providers for auth state listening (supabase.auth.onAuthStateChange).

5. Add basic app theme (dark-friendly for drivers, large touch targets).

6. Create a base Scaffold with bottom navigation (Home, Trips, Profile, Documents, Earnings) – make it conditional (show only after full approval).

Output all files with proper imports and comments explaining the architecture.
```
