# Redesign the public booking experience

## What will change

- Finish removing the “BookFlow” word beside the logo in the public navigation and business sidebar.
- Redesign each business’s booking page with a compact cover image, business logo, clearer service/staff/date/time steps, and a persistent booking summary.
- Add logo and cover-image uploads to Business Settings, with preview, replacement, file validation, and secure per-business storage.
- Keep customer choice of stylist/barber and make the selected person visible in the booking summary and confirmation.
- After a successful booking, show a polished confirmation receipt and provide a **Download PDF receipt** button.
- Include the booking reference, business, customer, service, selected staff member, date/time, duration, price, payment status, location, and contact details in the receipt.
- Verify the booking page and receipt flow on mobile and desktop, plus the settings upload controls.

## Technical details

- Use a public Lovable Cloud storage bucket with authenticated, tenant-scoped upload/update/delete policies; save resulting public URLs in the existing `businesses.logo_url` and `businesses.cover_url` fields.
- Generate the receipt entirely in the customer’s browser after booking, avoiding server filesystem dependencies and exposing only the booking result already returned to that customer.
- Expand the booking result with the safe display fields required by the receipt, including selected staff and location names.
- Keep all visual colors on the existing navy/blue semantic token system and use the uploaded cover as a subtle background image rather than a full-screen decorative backdrop.
