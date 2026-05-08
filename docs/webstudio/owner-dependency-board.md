# Owner Dependency Board

## Purpose

Track client-owned dependencies that block production deployment or live integrations.

## Common Owner Dependencies

| Dependency | Owner | Blocks Release? |
| --- | --- | --- |
| Legal/compliance review | owner/legal | yes if regulated |
| CRM/calendar credentials | owner | yes for live forms |
| Brand assets (logo/images) | owner | no if placeholder accepted |
| Testimonials/case studies | owner | no if process proof fallback |
| Payment gateway credentials | owner | yes for payment forms |
| Security certifications | owner | yes for security claims |

## Policy

- Document all owner dependencies visibly in the landing page
- Use placeholder CTAs until credentials provided
- Require separate deployment approval
- No live integrations without owner credentials
