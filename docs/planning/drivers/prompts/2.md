Implement the Authentication and Driver Profile foundation for Taxi Assist Driver App.

Create:
1. Auth feature with:
   - Login screen (email + password)
   - Register screen (basic driver details + cellphone OTP simulation)
   - Forgot password flow

2. Models:
   - DriverProfile model with all fields from business logic (status, online_status, linked_vehicle_id, etc.)

3. SupabaseService with methods:
   - signIn, signUp, signOut
   - getCurrentDriverProfile()
   - updateProfile()

4. Riverpod providers:
   - authProvider (listening to Supabase auth)
   - currentDriverProvider (async notifier that fetches profile)

5. After successful login:
   - Redirect based on profile status:
     - PENDING → Onboarding flow
     - APPROVED + vehicle linked → Home
     - Else → Show status screen with clear message

Add loading states, error handling with Toast, and biometric hint for future.