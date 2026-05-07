Implement the Home/Dashboard screen for the Taxi Assist Driver App with strict Go Online/Offline business logic.

Screen must include:

- Daily earnings summary (today's trips + amount)
- Trips completed today
- Large prominent GO ONLINE / GO OFFLINE button
- Current status display (Online/Offline + reason if any)
- Available hours timer (soft for MVP)
- Quick links to Profile, Documents, Earnings

Core Logic (enforced in a GoOnlineNotifier):

- Before allowing ONLINE:
  - Check driver status == APPROVED
  - Check linked vehicle exists and APPROVED
  - Check no critical documents are EXPIRED (call Supabase function or query)
- If any check fails → Show clear blocking message with "Fix Documents" CTA
- On successful ONLINE → Update profile.online_status and broadcast via realtime

Use Realtime subscription to listen for document expiry or admin changes that force offline.

Add GPS permission request when going online.
