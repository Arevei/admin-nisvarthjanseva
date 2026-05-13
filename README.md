# admin-nisvarthjan

Standalone admin project for Nisvarthjan operations:
- Admin authentication
- First-admin bootstrap flow
- News management (TipTap rich text + Cloudinary image upload)
- Campaign management (TipTap rich text + Cloudinary image upload)
- Membership approval queue
- Approval email with payment QR image (manual payment flow)

## 1. Environment setup

Copy `.env.local.example` to `.env.local` and fill values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `DATABASE_URL`
- `MONGODB_DB_NAME`
- `SESSION_SECRET`
- `ADMIN_BOOTSTRAP_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_FOLDER`
- `MEMBERSHIP_UPI_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## 2. Install and run

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## 3. Set first admin

On first run, `/login` automatically shows **Set First Admin**.

Use:
1. Admin email
2. Admin password
3. Bootstrap key (`ADMIN_BOOTSTRAP_KEY` from `.env.local`)

After submitting, first admin account is created in MongoDB (`admins` collection) and you are logged in.

## 4. Normal admin login

After first admin setup, `/login` switches to regular admin login mode.

## 5. Membership flow

1. User submits membership in the user project.
2. New member appears as `pending` in admin Members tab.
3. Admin clicks **Approve & Send QR**.
4. System sets status to `payment_pending` and sends email with payment QR.
5. After manual payment confirmation, admin clicks **Activate (Payment Received)**.
