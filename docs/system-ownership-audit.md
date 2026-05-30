# System Ownership Audit

_BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase D._

| System              | Primary Audience | Secondary       | Approves         | Notified |
|---------------------|------------------|------------------|------------------|----------|
| Identity & Roles    | Admin            | All authed       | Super-admin      | Admin    |
| Businesses          | Provider Owner   | Admin            | Admin            | Provider |
| Provider Directory  | Public           | SEO crawlers     | n/a              | n/a      |
| Provider Review     | Admin            | Provider Owner   | Admin            | Provider, Admin |
| Memberships/Credits | Provider         | Admin            | Admin (manual)   | Provider |
| Leads               | Provider         | Admin            | Provider         | Provider |
| Quote Requests      | Customer         | Provider, Admin  | Provider         | Provider, Admin |
| Quotations          | Provider         | Customer         | Customer         | Customer, Provider |
| Contracts           | Provider         | Customer, Admin  | Customer + Provider | Both |
| Work Orders         | Provider Staff   | Manager          | Manager          | Staff, Manager |
| Measurements/BOQ    | Provider Staff   | Manager          | Manager          | Staff |
| Production Board    | Provider Staff   | Manager          | n/a (view)       | Staff |
| Procurement         | Provider Staff   | Suppliers        | Manager          | Staff |
| Supplier Quotes     | Provider Staff   | Suppliers        | Manager          | Staff |
| Purchase Orders     | Provider Staff   | Manager          | Manager          | Staff |
| Installation Appts  | Provider Staff   | Customer         | Customer         | Customer, Staff |
| Customer Tracking   | Customer         | Provider, Admin  | n/a              | Provider |
| Project Closure     | Provider         | Customer         | Customer         | Both |
| Warranty            | Customer         | Provider, Admin  | Provider         | Provider |
| Feedback / NPS      | Customer         | Admin            | n/a              | Admin |
| Notifications       | All authed       | Admin            | n/a              | self |
| Transactional Email | System           | Admin            | n/a              | recipients |
| Messaging           | All authed       | Admin            | n/a              | participants |
| Help Center         | All authed       | Admin            | Admin            | Admin (feedback) |
| Help Assistant      | All authed       | Admin            | n/a              | n/a |
| Provider Growth     | Provider         | Admin            | n/a              | Provider |
| Operations Center   | Admin            | Super-admin      | n/a              | Admin |
| Observability       | Admin            | Super-admin      | n/a              | Admin (alerts) |
| SEO Surface         | Public           | Admin            | Admin (content)  | n/a |
| Reference Resolver  | System           | All authed       | n/a              | n/a |
| Bookings            | Provider         | Customer         | Provider         | Both |
| Catalog & Categories| Provider         | Admin            | Admin            | Provider |
| Client Sites        | Provider Staff   | Manager          | Manager          | Staff |
| Barcodes            | Provider Staff   | Manager          | n/a              | n/a |
| Loyalty             | Customer         | Admin            | n/a              | Customer |
| Installments/BNPL   | Customer         | Provider, Admin  | Provider         | Customer |
| Blog / Content      | Admin            | Public           | Admin            | Admin |
| International       | System           | All              | Admin            | n/a |
| Files / Storage     | System           | All authed       | n/a              | n/a |
| Workspace State     | All authed       | n/a              | n/a              | n/a |
| Analytics & Tracking| Admin            | Super-admin      | n/a              | n/a |
| Contact Center      | Admin            | n/a              | Admin            | Admin |

## Ownership rules

1. Every customer-facing system MUST have a single provider owner role and
   a customer-token entry point.
2. Every admin-only system MUST be RBAC-gated through `has_role`.
3. Cross-cutting systems (Notifications, Reference, Files) have no business
   owner — they are platform services.
4. Approvals always go to the role identified above; no system bypasses an
   approval channel.