# Finish BookFlow operations and branding

## What will change

- Replace the temporary “BF” badges in the public site, sign-in, business dashboard, and admin area with the uploaded BookFlow logo.
- Derive a lightweight square favicon from the uploaded logo and update the site icon.
- Retune the full color system from teal/sand to the logo’s deep navy and bright blue, preserving accessible light and dark themes.
- Finish and verify the independent BookFlow Control area, including business subscription state, monthly recurring revenue, monthly collections, total collections, plan breakdown, and payment history.
- Add clear appointment outcomes for service providers: **Completed** and **No-show / failed**, with safe status updates and visible filters/badges.
- Send an immediate booking confirmation to the client after a public reservation, and notify the business about the new appointment.
- Keep the scheduled pre-appointment reminder flow, remove duplicate-send risks, and schedule it against the published app once delivery is connected.
- Test the public booking flow, business appointment actions, admin pages, logo/favicon, and mobile/desktop layouts.

## Delivery setup needed

- App email needs a sender domain owned by you; BookFlow currently has none configured. I’ll prepare the templates and triggers, then the email setup card will collect the domain.
- Because phone is required while email is optional, reliable confirmations also need an SMS provider connection. I’ll use GatewayAPI and open its connection card rather than storing credentials in code.
- Until either delivery channel is connected, booking creation remains successful and records a clear skipped/failed delivery result instead of pretending a message was sent.

## Technical details

- Use the uploaded PNG as a CDN-hosted app asset; create a separate optimized 64px favicon in `public/`.
- Move appointment status updates into an authenticated server function and validate tenant access before writing.
- Replace the logging-only notification provider with real managed app email and GatewayAPI SMS sends; retain notification logs for business visibility.
- Preserve tenant isolation and the existing separate super-admin route tree.
