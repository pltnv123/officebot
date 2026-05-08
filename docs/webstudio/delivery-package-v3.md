# Delivery Package v3

## Structure

Each simulated package uses:

```text
project/
  intake.yaml
  risk.md
  copy.md
  structure.md
  static-site/
    index.html
    styles.css
  qa.md
  delivery-report.md
  owner-dependencies.md
```

## Release states

- `ready`
- `ready_with_caveats`
- `blocked_by_owner_dependency`
- `blocked_by_compliance`
- `needs_revision`

## Owner dependencies

CRM, calendar, legal/compliance review, brand assets, testimonials, and proof remain owner-owned until explicitly provided and approved.
