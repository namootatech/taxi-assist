Apply final polish, navigation guards, and production readiness to the Taxi Assist Driver App.

1. Implement AppRouter with GoRouter:
   - Protected routes: only allow access to Home/Trip if driver APPROVED + vehicle linked
   - Redirect to Onboarding or Status screen when needed

2. Global error handler and connectivity listener

3. Add foreground service for location tracking on Android (required for live map during trips)

4. Battery optimization: reduce location frequency when app in background

5. Dark theme optimization + large fonts/touch targets for drivers

6. Add splash screen and app icon placeholders

7. Create a DashboardGuard widget that checks profile completeness and forces onboarding

Run flutter pub run build_runner build after changes.

Ensure the app feels responsive even on low-end Android devices common in South Africa.
