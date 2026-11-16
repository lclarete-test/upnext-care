# UpNext Care workspace access

The public website remains on GitHub Pages. `/hub/` uses the existing Firebase Authentication project and Firestore. No service account or private Firebase credential is shipped to the browser.

`firestore.rules` preserves the existing account-owned `users/{uid}` DPP rules and adds isolated workspace collections. These rules were published to `dpp-comunidade-brasileira` through the Firebase console on November 16, 2026. A GitHub Pages deployment does not publish Firestore rules automatically.

## Access model

- Verified users may create an organization they own. The first version has one owner per workspace; there is no staff delegation or administrator role granted by choosing a portal.
- The owner creates cohorts, hosts text lessons and HTTPS resource links, schedules sessions, invites participants and records attendance.
- Invitation links contain a random document ID. Acceptance requires the invited verified email, an unexpired pending invitation and an atomic invitation/enrollment write.
- Patients query only their own enrollments and may open lessons and sessions for active enrollments. They report their own lesson completion and can withdraw.
- Partners see their own cohort rosters, self-reported course progress and attendance. They cannot read patients’ personal DPP check-ins or other organizations’ records.
- The legacy `/providers/` reimbursement pilot remains separate, browser-local and sample-ID-only. No claims or payments are submitted by `/hub/`.

## Checks

Use Node 22.22.2+ (or Node 24.15+) and Java 21. From this directory:

```sh
npm install
npm test
```

Tests use `demo-upnext-care` and the local Firestore emulator. They do not create production users or records. The UI flow test runs the actual hub controller in a DOM fixture with synthetic identities against the emulator, covering organization and cohort creation, lessons, sessions, invitation acceptance, progress and attendance. Additional authorization checks cover cross-owner isolation, unverified users, wrong email, invitation expiry, ownership changes and access revocation.

## Current limits

Text and resource-link hosting only. Invitations are created in the workspace and copied by the owner to send through their own email. Attendance is owner-recorded; completion is patient-reported. This is not a claims submission system or a clinical record system. Existing DPP enrollment and other well-being programs remain in their original course areas, linked from the patient dashboard.
