Build the complete Onboarding module for Driver + Vehicle registration in the Taxi Assist Driver App.

This must be multi-step and sequential:

Step 1: Driver Personal Details + Documents

- Form for name, ID, DOB, address, license details, bank details
- Image picker for selfie, ID copy, license, proof of residence
- Upload to Supabase Storage → insert into documents table with status PENDING

Step 2: Vehicle Registration

- Toggle: Private Owner vs Company
- Conditional fields based on ownership type
- Car details form (registration, make, model, category, VIN, etc.)
- Image picker for 5 vehicle photos + documents (NATIS, double disc, insurance)
- Upload all to respective storage buckets

Step 3: Summary & Submission

- Show all uploaded documents with status
- Submit button that sets profile status to PENDING

Use Riverpod for form state (StateNotifier for multi-step).
Create DocumentUploadService that handles file upload + DB insert.
Show progress indicators and clear success/error messages.

After submission, show "Waiting for back-office approval" screen with realtime listener on document status.
