-- Prompt 6: faster expiry / compliance queries for drivers (optional performance).
create index if not exists documents_uploaded_expiry_status_idx
  on public.documents (uploaded_by, status, expiry_date);

comment on index documents_uploaded_expiry_status_idx is
  'Supports driver document list + expiry enforcement (PRD §5.5).';
