# Supabase Autonomy RLS Plan

Status: proposal only.

## Assumptions
- backend service-role writes only
- authenticated owner/admin reads
- no anonymous access

## Notes
RLS does not replace application-layer sanitization. Store sanitized summaries only.
