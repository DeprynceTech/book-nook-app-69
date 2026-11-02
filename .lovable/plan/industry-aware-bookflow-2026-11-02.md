# Industry-aware BookFlow

## Goal
Upgrade the existing app into one booking platform that adapts to each industry, without replacing existing pages or losing bookings, services, staff assignments, or business settings.

## Audit findings
- Business category is currently a label; service forms, dashboards, and staff wording do not use a shared industry configuration.
- Customer staff selection exists, but automatic assignment does not yet assign a person. The server also needs to enforce service-to-staff eligibility.
- Custom service questions and plan-specific industry feature controls are not yet available.
- Existing tenant relationships, booking pages, branding uploads, revenue charts, receipts, and subscription lockout can be reused.

## What will change

### 1. Central industry configuration
Provide templates for Salon, Barbershop, Photography, Clinic/Healthcare, Consulting, Spa/Wellness, Fitness/Personal Training, Auto Repair, Cleaning, Tutoring/Education, and Other.

Each template defines staff terminology, service fields, booking options, and dashboard widgets. Map existing categories to compatible templates; ambiguous legacy categories keep their current label until the owner chooses a more specific industry. Changing industry must never replace existing records.

### 2. Registration and business settings
Use a shared industry selector during business setup and in Settings. Apply the selected template immediately across the workspace and public booking page. Keep signup, verification, and the existing seven-day trial unchanged.

### 3. Service creation and editing
Keep name, description, price, duration, and buffer as universal fields. Add configurable industry fields: treatments/grooming, photography packages and session types, consultation types, meeting formats, individual/group sessions, and relevant locations.

Add editing to the current service screen, staff-selection settings, and optional booking questions with text, number, selection, and checkbox answers. Owners control required questions and choice lists. Retain existing service assignments and pricing; packages use the existing service price unless a separately priced service is created.

### 4. Staff and customer booking
Use Stylist, Barber, Photographer, Practitioner, Consultant, Therapist, Trainer, Technician, Cleaner, Tutor, or Team member as appropriate throughout forms and navigation.

Support customer choice, required customer choice, or automatic assignment per service. Preserve current salon/barber selection. Display only the chosen service’s relevant options and questions, save answers with the appointment, and show them to authorized business members. Do not expose answers in public page data or notification events.

Validate staff eligibility and availability on the server. Automatic assignment finds an eligible available person and saves that assignment; businesses without staff retain an unassigned booking path when selection is optional. Protect simultaneous reservations from double booking.

### 5. Industry dashboards
Retain daily earnings, revenue, customers, appointments, date filters, and graphs. Add meaningful industry-specific views using real booking data: stylist performance/popular treatments, upcoming shoots/package activity, practitioner schedules/consultations, consultant availability/upcoming meetings, and equivalent staff/service activity for other industries. Show appropriate empty states rather than invented activity.

### 6. Super Admin and subscription control
Add an independent Industry configuration page within BookFlow Control to manage template terminology, available fields, workflows, and widgets.

Add optional-feature switches for each subscription plan. **Super Admin decides per plan** which features are included; do not infer privileges from package names. Standard industry terminology and existing booking functionality stay available. New paid optional features remain disabled until enabled for a plan; trial access follows the trial’s assigned plan. Businesses cannot grant themselves paid features.

### 7. Validation
Add focused tests for all requested industry mappings, configuration precedence, plan permissions, question validation, staff eligibility, automatic assignment, and tenant isolation.

Exercise Salon, Barbershop, Photography, Clinic, and Consulting through setup, service editing, staff configuration, customer booking, and appointment readback. Test rejected cross-business IDs and disabled features. Verify desktop and narrow-screen layouts, receipts, and existing subscription locking still work. Keep temporary test businesses out of the final account list.

## Technical approach
- Use additive database changes: industry templates, plan-feature configuration, business industry/override settings, service configuration/question definitions, and private appointment answers. Preserve legacy columns and relationships.
- Implement one typed resolver shared by frontend and server: template defaults → allowed plan capabilities → restricted business/service overrides. Overrides can disable or customize permitted features, never widen entitlements.
- Protect all new public-schema storage with explicit grants and tenant/admin RLS. Validate configuration writes and restricted fields through trusted server/database paths so direct browser requests cannot bypass permissions.
- Keep public booking responses limited to safe, effective configuration. Sensitive answers remain tenant-readable only; clinics get appointment questions, not a new medical-record system.
- Use existing TanStack server functions, auth middleware, design components, and private branding storage. Do not introduce a separate app or new authentication system.

## Scope
This upgrade does not add payment gateways, SMS providers, video meeting integrations, medical records, or new group-capacity booking rules. The unfinished admin lockout-filter work remains a separate task.