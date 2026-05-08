Implement the Documents screen and expiry enforcement system for Taxi Assist Driver App.

Features:

- Documents list grouped by Driver vs Vehicle
- Each document card shows: type, status (Pending/Approved/Declined/Expired), expiry date, preview image
- Re-upload button for Declined or Expired documents
- Expiry warning banners (30/14/7/3/1 days) with color coding
- Realtime listener: if any critical document expires → force offline + show modal

Create DocumentService:

- fetchDriverDocuments()
- uploadDocument(documentType, file, entityId)
- listenForDocumentChanges()

Add a global guard: App-wide listener that checks critical documents on every app resume and when going online.

Show clear decline reasons from back-office when applicable.
