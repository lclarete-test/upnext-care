# UpNext Care provider pilot workspace

Route: `/providers/`. Public sample workspace: `/providers/?demo=1`.

The interface supports sessions, attendance, participant test IDs, payer-specific rate snapshots, documentation checks and a manually maintained receivables ledger. English, Spanish and Portuguese are available. Google and email sign-in reuse the existing Firebase Authentication configuration. No DPP participant or health-record collections are read.

This release is a pilot prototype. Sample mode contains fictional IDs and illustrative rates. An authenticated workspace starts empty; edits are stored only in this browser, namespaced by the authenticated user ID. It is not an organization access-control system or a clinical record store. Use test IDs only. No cloud sync, provider roster import, eligibility lookup, payer adjudication, electronic claims, remittance integration or live Medicare/Medicaid fee schedule is provided.

Amounts use integer cents. Estimated unpaid amounts include only ready/submitted entries with verified attendance, participant eligibility, documentation, coverage and rate source. Recorded approvals and received amounts are reported separately. Absences and missing checks remove entries from unpaid estimates. Rates are copied into new estimates so later rate changes do not alter historical entries. Attendance does not determine service coverage, valid units, billing codes or entitlement to payment.

Source links under Payment references point to CMS/Medicare, New York Department of Health and eMedNY. Providers must enter the expected payer portion per service unit from the applicable verified contract or fee schedule, excluding patient cost sharing. CDSMP has no automatic payment mapping.

Before real deployment with participant information: implement organization membership and authorized staff access, verified server-side data storage, audit trails, and the applicable payer integrations. The public sample is deliberately separate from those services.

The portal omits the site's analytics/session-recording scripts so entered operational data is not sent to those services.
