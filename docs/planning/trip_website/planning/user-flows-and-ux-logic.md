# Trip Website — User flows & UX logic

## Primary journeys

### 1. Rider download

1. Home → “Book a ride” / “Get the app”.
2. Platform detect: iOS → App Store, Android → Play; show QR optional.
3. Optional: email capture for “Notify me” if app not live in region.

### 2. Driver interest

1. Drivers page → requirements checklist (link to full driver PRD for ops).
2. CTA → driver app download or **waitlist form** if gated launch.

### 3. Partner / advertise

1. Advertise page → explain Taxi Assist Media (in-trip, rewarded attention).
2. CTA → **`Trip Media Web App`** signup or login (external URL).

### 4. Lead / contact

1. Contact form: name, email, phone optional, topic (rider/driver/partner/press), message.
2. Success state + expectation on response time.
3. Double confirmation email optional (implementation choice).

## Edge cases

- Offline form failure → retry message; no duplicate submit (disable button).
- Broken store links → fallback to “Contact us”.

## SEO / sharing

- Unique titles and meta descriptions per major page; Open Graph image when brand asset exists.
