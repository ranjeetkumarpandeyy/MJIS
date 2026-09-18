# **Maa Janki Industrial Services (MJIS)**

A comprehensive human resource management and corporate website platform built for **Maa Janki Industrial Services (MJIS)** using React, TypeScript, Vite, Tailwind CSS, and Supabase.

## **Features**

- **Employee Management** - Employee records, management, and manager assignments
- **Leave Management** - Leave requests, approvals, and leave balance tracking
- **Attendance Tracking** - Employee clock in/out and attendance monitoring
- **Payroll Management** - Salary structures, payroll records, payslips, and payroll history
- **Salary Slips** - Employee access to salary slips with MJIS branding and print/download support
- **Performance Management** - Goals, performance reviews, and related analytics
- **Asset Management** - Track company assets assigned to employees
- **Document Management** - Secure employee document storage
- **Notifications** - Application notifications and email notification support
- **SMS Center** - SMS communication for HR and operational notifications
- **Authentication** - Email/password authentication with optional Google and Facebook sign-in
- **Role-Based Access** - Admin, HR, Manager, and Employee roles
- **Corporate Website** - MJIS public-facing website with company information and services
- **Career Enquiries** - Public career/application submission connected to the HR system
- **Work Enquiries** - Public business/work enquiry submission connected to the HR system
- **Contact Messages** - Public contact form connected to the HR system
- **PWA Support** - Progressive Web App support for the MJIS platform

## **Tech Stack**

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: TanStack Query
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **SMS**: TextBee through Supabase Edge Functions
- **Email**: Resend (where configured)
- **Deployment**: Vercel or Netlify

## **Prerequisites**

- Node.js 18+ and npm
- Supabase account
- TextBee account/device for SMS features
- Resend account for email notifications, where required

## **Setup Instructions**

### **1. Clone and Install**

```
git clone https://github.com/ranjeetkumarpandeyy/MJIS.git
cd MJIS
npm install
```

### **2. Supabase Setup**

#### **Create or Use the MJIS Supabase Project**

1. Open the Supabase Dashboard.
2. Create a project or connect the existing MJIS Supabase project.
3. Note the project URL and publishable/anon key from the API settings.

#### **Run Database Migrations**

**All production schema changes are stored in `supabase/migrations/` and should be applied in chronological order.**
The migrations cover MJIS application functionality such as:

- Employee and HR management data
- Leave and attendance functionality
- Payroll and salary slips
- Public website enquiries and messages
- Role-based access and related security rules
- Storage configuration and database functions/triggers used by the application

**Do not run development seed data against the production MJIS database.**

#### **Seed Data (Development Only)**

For development/testing, use the project seed file when available:

```
make seed
```

Or run the appropriate seed SQL manually through the Supabase SQL Editor.

> **Important:** Do not use development/test seed data on the production MJIS database.

#### **Enable Required Extensions**

When required by the deployed MJIS configuration, enable:

```
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### **3. Configure Authentication**

**In Supabase:**

1. Go to **Authentication > Providers**.
2. Enable **Email** authentication.
3. Enable **Google** and/or **Facebook** when those login methods are configured for MJIS.
4. Configure the production **Site URL** and allowed **Redirect URLs** for the deployed MJIS website.

For local development, use the local Vite URL configured for the project.

### **4. Environment Variables**

**Create a `.env` file in the project root:**

```
VITE_SUPABASE_PROJECT_ID="your-mjis-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
VITE_SUPABASE_URL="https://your-mjis-project-id.supabase.co"
```

Find these values in the Supabase Dashboard under the project's API settings.

> **Security:** Never place the Supabase service-role key, TextBee API key, or other server-side secrets in `VITE_*` variables or client-side code.

### **5. Edge Functions**

MJIS uses Supabase Edge Functions for server-side integrations and protected operations.
**Install the Supabase CLI and log in:**

```
npm install -g supabase
supabase login
```

**Link the MJIS Supabase project:**

```
supabase link --project-ref your-mjis-project-id
```

**Deploy functions:**

```
supabase functions deploy
```

### **6. SMS Configuration (TextBee)**

**SMS features use **TextBee** through Supabase Edge Functions.**
Set the TextBee API key as a Supabase secret:

```
supabase secrets set TEXTBEE_API_KEY="your-textbee-api-key"
```

For Supabase Auth phone OTP delivery, also configure the Send SMS Auth Hook secret in Supabase and store the hook secret securely as a Supabase Edge Function secret.

> **Important:** TextBee credentials and Supabase Auth Hook secrets must never be exposed in the frontend.

### **7. Optional Email Configuration**

**Where email notifications are enabled for MJIS, configure the required Resend and Supabase server-side secrets in the Supabase project.**
Typical server-side secrets may include:

| Secret NamePurpose          |                                                |
| --------------------------- | ---------------------------------------------- |
| `RESEND_API_KEY`            | Resend email delivery                          |
| `SUPABASE_URL`              | Server-side Supabase access                    |
| `SUPABASE_ANON_KEY`         | Server-side Supabase API access where required |
| `SUPABASE_SERVICE_ROLE_KEY` | Protected server-side operations only          |
| `CRON_SECRET`               | Securing scheduled function requests           |

> The `SUPABASE_SERVICE_ROLE_KEY` has elevated access and must remain server-side only.

### **8. Cron Jobs (Optional)**

Scheduled MJIS notifications/reminders can be configured through Supabase Cron and `pg_net`.
**Before enabling any scheduled job:**

1. Enable `pg_cron` and `pg_net`.
2. Deploy the relevant Edge Function.
3. Store any required secret, such as `CRON_SECRET`, in Supabase.
4. Configure the job URL for the actual MJIS Supabase project.

Example pattern:

```
SELECT cron.schedule(
  'mjis-scheduled-job',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://your-mjis-project-id.supabase.co/functions/v1/your-function',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    ),
    body:='{}'::jsonb
  );
  $$
);
```

View scheduled jobs:

```
SELECT * FROM cron.job;
```

Remove a job:

```
SELECT cron.unschedule('mjis-scheduled-job');
```

### **9. Run Locally**

```
npm run dev
```

**Open the local Vite URL shown in the terminal.**

### **10. Create the Initial MJIS Admin**

1. Create an account through the MJIS application.
2. In the Supabase SQL Editor, find the user:

```
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

3. Assign the admin role:

```
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## **Deployment**

### **Vercel / Netlify**

1. Connect the GitHub repository:
   `https://github.com/ranjeetkumarpandeyy/MJIS`
2. Set the MJIS `VITE_*` environment variables in the deployment platform.
3. Build command:

```
npm run build
```

4. Output directory:

```
dist
```

5. Configure SPA routing so application routes resolve to `index.html`.
6. After deployment, update the Supabase Authentication Site URL and Redirect URLs to the production MJIS domain.
7. Update Google/Facebook OAuth settings with the final MJIS production domain where applicable.

### **Production Environment Checklist**

**Before going live, verify:**

- Supabase production URL and publishable key are configured
- Database migrations are applied
- Storage buckets and policies are configured
- Authentication providers are configured
- OAuth redirect URLs match the production domain
- TextBee SMS integration is working
- Supabase Auth SMS hook is configured when phone OTP is enabled
- Server-side secrets are stored only in Supabase secrets
- Public website forms submit successfully
- HR/Admin dashboards receive career, work enquiry, and contact submissions
- Employee salary slips are available to the correct authenticated employees
- SPA routing works on direct page refreshes

## **Project Structure**

```
├── src/
│   ├── assets/           # MJIS branding and static assets
│   ├── components/       # Shared React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── dashboard/    # Dashboard widgets
│   │   ├── employees/    # Employee management
│   │   ├── leaves/       # Leave management
│   │   ├── payroll/      # Payroll and salary slip components
│   │   └── ...
│   ├── contexts/         # Authentication and application contexts
│   ├── hooks/            # Custom hooks
│   ├── integrations/     # Supabase and SMS integrations
│   ├── lib/              # Utility functions and PDF helpers
│   └── pages/            # Public website and HRMS pages
├── supabase/
│   ├── functions/        # Supabase Edge Functions
│   └── migrations/       # MJIS database migrations
├── public/               # Public static assets and PWA files
└── README.md
```

## **User Roles**

| RolePermissions |                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| `admin`         | Full MJIS system access and user/role management                                         |
| `hr`            | Employee management, payroll, recruitment, reports, and HR operations                    |
| `manager`       | Team management and leave approval functions                                             |
| `employee`      | Employee self-service including profile, leaves, documents, attendance, and salary slips |

## **MJIS Public Website**

The public MJIS website provides the company-facing experience for visitors and includes sections and forms for:

- Company introduction and services
- Projects and business information
- Career opportunities and applications
- Work/business enquiries
- Contact messages
- Login access to the MJIS HRMS portal

Public form submissions are stored in Supabase and surfaced to authorized HR/Admin users through the MJIS application.

## **License**

This project is maintained for **Maa Janki Industrial Services (MJIS)**.

---

## **Copyright**

© **2026 Maa Janki Industrial Services (MJIS)**. All rights reserved.

This project and its source code are maintained for **Maa Janki Industrial Services (MJIS)**. Unauthorized copying, redistribution, or commercial use is not permitted without prior written permission from MJIS.
