Security Features

The MJIS application uses security controls across authentication, authorization, database access, and server-side integrations.

Row Level Security (RLS)

Where configured, database tables are protected with RLS policies designed to ensure that:

Users can access only data they are authorized to access

Managers can access appropriate team data

HR and Admin roles have appropriate elevated access

Public data is explicitly controlled and exposed only where required

Role-Based Access Control

MJIS supports the following application roles:

admin — Full MJIS system access and user/role management

hr — Employee management, payroll, recruitment, reports, and HR operations

manager — Team management and leave approval functions

employee — Employee self-service including profile, leaves, documents, attendance, and salary slips

Role checks and database policies should be enforced through trusted server-side/database mechanisms rather than relying solely on frontend controls.

Authentication

MJIS uses Supabase Auth for authentication.

Security-related controls include:

Secure session management using Supabase authentication

Email/password authentication

Optional Google and Facebook authentication where configured

Configurable authentication and redirect settings

Authorization based on authenticated users and application roles

API & Edge Function Security

MJIS uses Supabase Edge Functions for server-side integrations and protected operations.

Security practices include:

Authentication for protected API operations

Server-side handling of sensitive integrations

Request validation for Edge Functions

CORS configuration appropriate to the deployed application

Keeping API keys and service-role credentials out of frontend code

SMS & Email Security

MJIS may use TextBee for SMS functionality and Resend for email notifications where configured.

SMS and email service credentials must be stored as secure server-side secrets

TextBee API keys must never be exposed in frontend code

Supabase service-role keys must remain server-side only

Email and SMS integrations should be reviewed before production deployment

Security Acknowledgments

We would like to thank individuals who responsibly disclose security vulnerabilities and help improve the security of Maa Janki Industrial Services (MJIS).

No acknowledgments yet. Be the first to responsibly report a vulnerability.

Contact

For general business, website, HRMS, or security-related inquiries, please contact:

📧 info@mjis.in

For vulnerability reports, please use the same address and clearly mark the email as a Security Vulnerability Report.

Company: Maa Janki Industrial Services (MJIS)

Email: info@mjis.in

GitHub Repository: https://github.com/ranjeetkumarpandeyy/MJIS

This security policy is maintained for the MJIS project and may be updated as the application, infrastructure, and security requirements evolve.

© 2026 Maa Janki Industrial Services (MJIS). All rights reserved.
