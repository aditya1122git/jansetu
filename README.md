# E-Sewa Tarapur

E-Sewa Tarapur is a role-based application, grievance, and visitor appointment management portal for the Tarapur Assembly Constituency in Munger, Bihar. It gives administrators and block operators a single place to register applications, manage follow-ups, review documents, monitor reports, and coordinate visitor appointments.

## Main features

### Public home and authentication

- Responsive public home page with image slideshow, portal introduction, workflow, and service information.
- Login form is displayed directly on the home page; there is no separate login button required.
- CAPTCHA-protected login with clear validation messages.
- Role-based login for administrators and operators.
- Secure logout and token revocation. A session from an older backend process is rejected after the server restarts.
- Forgot-password flow through Google SMTP on port `465`.
- Password-reset links expire after 30 minutes and become invalid after successful use.
- Global loading indicator for login, reset-password, and other asynchronous operations.

### Roles and access control

| Capability | Administrator | Operator |
| --- | :---: | :---: |
| View all applications | Yes | No |
| View applications entered by the signed-in user | Yes | Yes |
| Create and update applications | Yes | Yes |
| Delete or bulk-clear application data | Yes | No |
| View complete analytics | Yes | No |
| View own-entry analytics | Yes | Yes |
| Create and delete operator accounts | Yes | No |
| Edit administrator profile and password | Yes | No |
| Register visitor requests | No | Yes |
| Approve, reject, or reschedule appointments | Yes | No |

Operators can only access applications, reports, and appointments associated with their own account. Administrators can view data created by every operator.

### Tarapur block mapping

Every operator is permanently assigned to one block when the administrator creates the account. The block cannot be changed later, which keeps historical ownership and reporting consistent.

| Block | LGD code |
| --- | ---: |
| Asarganj | 2451 |
| Haveli Kharagpur | 1872 |
| Sangrampur | 2457 |
| Tarapur | 2458 |
| Tetiha Bambar | 1877 |

Application intake is fixed to **Munger District** and **Tarapur Assembly Constituency**. The signed-in operator's assigned block and LGD code are used with their records.

### Application and grievance management

- New application/complaint intake with applicant, contact, address, category, subject, description, priority, and assignment details.
- Automatic application ID generation.
- `IMPORTANT` and `NORMAL` priority classification.
- Status workflow including pending, in progress, awaiting information, completed, disposed, and rejected.
- Follow-up history, next follow-up date, action notes, completion details, and reopen support.
- Search by application ID, applicant, mobile number, subject, and related fields.
- Filters for block, category, priority, status, and date range.
- Detailed application view with operator attribution and change history.
- CSV export of permitted application data.
- Password-confirmed deletion dialogs for sensitive administrator actions.
- Deleting an operator account does **not** delete applications entered by that operator; the operator name and block remain preserved on historical records.

### Secure document handling

- Up to 10 attachments can be uploaded with an application.
- Supported formats: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, and XLSX.
- Configurable per-file size limit through `MAX_UPLOAD_SIZE_MB` (default: 200 MB).
- File names are sanitized and uploaded files are checked by content signature, not only by extension.
- Executable and script signatures are rejected.
- Documents are served through authenticated endpoints and can be previewed or downloaded by an authorized user.
- Abandoned upload files are cleaned automatically.

### Reports and analytics

- Dashboard totals for applications, priority, status, overdue cases, active follow-ups, and applications received today.
- Chart.js visualizations through `react-chartjs-2`.
- Block-wise breakdown for the five Tarapur blocks.
- Complaint-category analysis, pending-ageing analysis, and operator workload reporting.
- Administrators receive combined analytics for all operators; operators receive analytics only for their own entries.
- CSV download support for further analysis.

### Visitor appointments

1. An operator registers a visitor's name, phone number, address, and purpose.
2. The request is saved with its creation date/time, operator identity, and assigned block.
3. The administrator receives the new request in the Appointments section without a manual page refresh.
4. The administrator can reject it or approve it by selecting a date, hour, minute, and AM/PM.
5. A confirmed appointment can be rescheduled later.
6. Approval, rejection, and rescheduling updates are sent to the relevant operator in real time.

Appointments are shown in a compact table, with a separate detailed view for the complete visitor and scheduling information. Real-time synchronization uses an authenticated Server-Sent Events stream.

### Administration

- Separate administrator profile section.
- Profile editing is enabled only after selecting **Edit Profile**.
- Password change with current, new, and confirm-password fields and show/hide controls.
- Operator creation with name, email, phone, fixed district/constituency, block, password, and password confirmation.
- Operator list excludes the administrator account.
- Operator account deletion requires administrator password confirmation.
- Complaint-category management and system settings.

## Technology stack

### Frontend

- React 18 and TypeScript
- Vite
- Bootstrap 5
- Font Awesome
- Chart.js and React Chart.js 2

### Backend

- Node.js 20+
- Express and TypeScript
- Official MongoDB Node.js driver
- JSON Web Tokens and bcrypt
- Multer for document uploads
- Nodemailer for password-reset email
- Server-Sent Events for live appointment updates

### Deployment

- Multi-stage Docker build
- Docker Compose with a persistent uploads volume
- MongoDB Atlas for application data
- Container health check at `/api/health`
- Read-only production container filesystem, except the mounted uploads volume and temporary filesystem

## Project structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- middleware/       # Authentication and upload security
|   |   |-- routes/           # API routes
|   |   |-- scripts/          # Database setup and seed commands
|   |   `-- database.ts       # MongoDB repositories and indexes
|   |-- uploads/              # Local uploaded documents
|   `-- .env.example
|-- frontend/
|   |-- public/assets/        # Images and other static assets
|   `-- src/
|       |-- components/       # Pages, dashboards, forms, and shared UI
|       |-- services/         # API client
|       `-- types/            # Shared frontend types
|-- Dockerfile
|-- docker-compose.yml
`-- DEPLOYMENT_GUIDE.md
```

## Prerequisites

- Node.js 20 or newer
- npm
- A MongoDB Atlas database or another compatible MongoDB deployment
- A Google account with 2-Step Verification and an App Password if password-reset email is required
- Docker and Docker Compose for container deployment

## Environment configuration

Copy the example environment file:

```powershell
Copy-Item backend/.env.example backend/.env
```

Configure these values in `backend/.env`:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection URI, including the database name |
| `JWT_SECRET` | Long random secret used to sign authentication tokens |
| `ADMIN_EMAIL` | Email used by the administrator seed command |
| `ADMIN_PASSWORD` | Initial administrator password; use at least 8 characters |
| `MAX_UPLOAD_SIZE_MB` | Optional per-file upload limit; defaults to `200` |
| `SMTP_USER` | Google account used to send reset emails |
| `SMTP_APP_PASSWORD` | Google App Password, not the normal account password |
| `SMTP_FROM` | Sender name and address displayed in reset emails |
| `SMTP_HOST` | SMTP host; defaults to `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port; use `465` for implicit TLS |
| `APP_BASE_URL` | Public HTTPS origin used to generate password-reset links |

Never commit `backend/.env`, the root deployment `.env`, database credentials, SMTP credentials, or production passwords.

## Local installation

Install frontend and backend dependencies:

```powershell
npm.cmd run install:all
```

Create MongoDB indexes and seed the Bihar master data:

```powershell
npm.cmd run db:setup
```

Create the initial administrator once:

```powershell
npm.cmd run db:seed-admin
```

The seed is idempotent. If the configured email already exists, it does not overwrite that account or its password.

### Development mode

Run the backend:

```powershell
npm.cmd run dev:backend
```

In another terminal, run the Vite frontend:

```powershell
npm.cmd run dev:frontend
```

Vite proxies `/api` requests to the backend on port `5000`.

### Production build

```powershell
npm.cmd run build
npm.cmd start
```

Open `http://localhost:5000` unless `PORT` is configured differently.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run install:all` | Install backend and frontend packages |
| `npm run dev:backend` | Start the TypeScript backend in development mode |
| `npm run dev:frontend` | Start the Vite development server |
| `npm run build` | Build the frontend and backend |
| `npm start` | Run the compiled production server |
| `npm run db:setup` | Create indexes and seed Bihar master data |
| `npm run db:seed-admin` | Create the initial administrator if absent |
| `npm run db:seed-master` | Seed/refresh the Bihar district and constituency master records |
| `npm run db:clear` | Run the project data-clear utility |

## Docker deployment

Docker Compose reads deployment variables from a `.env` file next to `docker-compose.yml`. For local Docker testing, copy the configured backend file to the project root:

```powershell
Copy-Item backend/.env .env
docker compose up -d --build
```

The application is exposed on `${APP_PORT:-5000}`. Uploaded documents are stored in the named `jansetu_uploads` volume, while business data remains in MongoDB.

For Hostinger VPS Docker Manager instructions, environment-variable setup, and troubleshooting, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## API overview

| Area | Base path | Purpose |
| --- | --- | --- |
| Authentication | `/api/auth` | CAPTCHA, login, logout, profile, users, and password reset |
| Applications | `/api/applications` | Intake, search, update, export, and protected deletion |
| Documents | `/api/upload`, `/api/documents/:filename` | Authenticated upload and file access |
| Appointments | `/api/appointments` | Visitor requests, decisions, rescheduling, and live updates |
| Reports | `/api/reports` | Dashboard, block, category, ageing, and workload analytics |
| Categories | `/api/categories` | Complaint-category management |
| Master data | `/api/master` | Bihar district and constituency reference data |
| Reminders | `/api/reminders` | Follow-ups and reopening workflows |
| Settings | `/api/settings` | Portal configuration |
| Health | `/api/health` | Service and database health check |

All protected endpoints enforce authentication and role checks on the backend; hiding an option in the interface is not treated as authorization.

## Operational notes

- Back up MongoDB through Atlas backup policies and back up the Docker uploads volume separately.
- Keep the Atlas network allowlist restricted to trusted deployment addresses.
- Serve the portal over HTTPS in production.
- Rotate the JWT secret, database credentials, SMTP App Password, and administrator password periodically.
- Ensure outbound TCP port `465` is allowed, otherwise Gmail SMTP can fail with `ETIMEDOUT`.
- If port `5000` is already in use on Windows, find the process with `Get-NetTCPConnection -LocalPort 5000` or set a different `PORT`/`APP_PORT`.

## License

No license file is currently included. Add an appropriate license before public distribution or third-party reuse.
