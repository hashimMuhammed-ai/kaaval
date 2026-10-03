# WhatsApp Business Cloud API — Setup & Meta App Review Runbook

> **Critical Notice**: Start this process early. Meta App Review, Business Verification, and Display Name validation can take **2 to 5 business days**.

This guide provides the complete setup runbook for the official **Meta WhatsApp Business Cloud API** on the Caregiver Agency Platform. We use the official Cloud API (not unofficial wrappers) to prevent phone number bans and ensure reliable healthcare alerts.

---

## 1. Architecture & Capabilities

```
┌────────────────────────────────────────────────────────┐
│             Caregiver Agency Platform                  │
│                                                        │
│  [Intake Form] ──> [WhatsAppService] ──> [Meta Cloud]  │
│                           │                    │       │
│                  [Webhook Controller] <────────┘       │
│                           │                            │
│                 [Delivery Receipts]                    │
└────────────────────────────────────────────────────────┘
```

- **Official Cloud API**: Hosted on Meta's global infrastructure via Graph API `v21.0`.
- **Zero Unofficial Wrappers**: Eliminates risk of number bans.
- **Utility Category Compliance**: Healthcare enquiry alerts and caregiver dispatch notices are submitted as **UTILITY** templates (significantly lower cost than MARKETING templates and not subject to marketing spam limits).
- **Multi-Tenant Routing**: Alerts route to the specific agency owner's verified WhatsApp number based on the tenant subdomain.

---

## 2. Prerequisites

1. **Meta Developer Account**: Register at [developers.facebook.com](https://developers.facebook.com).
2. **Meta Business Manager**: Verified business account at [business.facebook.com](https://business.facebook.com).
3. **Dedicated Clean SIM / Phone Number**:
   - Must be able to receive an SMS or Voice OTP for verification.
   - **Must not** be currently active on personal WhatsApp or WhatsApp Business mobile app (delete the account from WhatsApp settings if previously used on a phone).
4. **GST / Incorporation Document**: For Meta Business Verification (required to unlock high messaging tiers: 1K -> 10K -> 100K messages/day).

---

## 3. Step-by-Step Setup Runbook

### Step 1: Create Meta Developer App
1. Go to **Meta for Developers** -> **My Apps** -> **Create App**.
2. Select **Business** as the application type.
3. Name your app (e.g., `Caregiver Agency Network`).
4. Link to your **Meta Business Account**.

### Step 2: Add WhatsApp Product
1. On the App Dashboard, locate **WhatsApp** and click **Set up**.
2. You will be provided with a sandbox test phone number, temporary access token, and Phone Number ID.

### Step 3: Add & Verify Real Agency Phone Number
1. Under WhatsApp -> **API Setup**, scroll down to **Step 5: Add a phone number**.
2. Enter the official Display Name: e.g., `CareKerala Healthcare Services` (must comply with Meta Display Name guidelines).
3. Select Category: **Medical & Health**.
4. Enter the phone number and select **SMS** or **Phone Call** for OTP verification.
5. Enter the 6-digit code received on the SIM card to complete verification.

### Step 4: Create System User & Permanent Access Token
Temporary tokens expire after 24 hours. A permanent token is mandatory for production:
1. Open **Business Manager** (`business.facebook.com/settings`).
2. Navigate to **Users** -> **System Users** -> **Add**.
3. Set role to **Admin**.
4. Click **Generate New Token**, select your App.
5. Select token expiration: **Never**.
6. Check required permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
7. Copy the generated permanent token into your `.env` file as `WHATSAPP_API_TOKEN`.

### Step 5: Configure Webhook
1. In Meta Developer Dashboard, go to **WhatsApp** -> **Configuration**.
2. Set **Callback URL**: `https://api.yourdomain.com/whatsapp/webhook`
3. Set **Verify Token**: Must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env`.
4. Click **Verify and Save**. Meta will send a `GET` request to your endpoint with `hub.challenge`.
5. Under **Webhook Fields**, click **Manage** and subscribe to:
   - `messages` (delivers delivery receipts and inbound messages)

### Step 6: Submit Pre-Approved Healthcare Templates
Business-initiated messages outside the 24-hour window require approved templates:
1. The platform includes pre-configured utility templates in [`whatsapp.constants.ts`](file:///c:/Users/Lenovo/Desktop/caregiver/apps/api/src/app/whatsapp/whatsapp.constants.ts):
   - `agency_new_enquiry_alert`: Instant alert to Agency Owner on form submit.
   - `customer_enquiry_acknowledgement`: Instant acknowledgement to the client family.
   - `staff_invite_code`: Single-use activation tokens.
   - `replacement_sla_escalation`: Escalation when replacement SLA is breached.
2. Trigger template sync via API:
   ```bash
   curl -X POST http://localhost:3000/whatsapp/sync-templates
   ```
3. Or view template statuses:
   ```bash
   curl http://localhost:3000/whatsapp/templates
   ```

---

## 4. Environment Variables Reference

Add the following to your `.env` configuration:

```env
# Meta WhatsApp Business Cloud API
WHATSAPP_API_VERSION=v21.0
WHATSAPP_API_TOKEN=EAAxxxxxxx... # Permanent System User Token
WHATSAPP_PHONE_NUMBER_ID=104829104812345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_WEBHOOK_VERIFY_TOKEN=caregiver-whatsapp-verify-token-change-me
WHATSAPP_APP_SECRET=a1b2c3d4e5f6... # App Secret from App Settings -> Basic
WHATSAPP_DEFAULT_ORIGIN_PHONE=+919876543210
WHATSAPP_DEV_MOCK_MODE=false # Set to true for local development without Meta credentials
```

---

## 5. Development Mock Mode

For local development and testing without live Meta credentials:
- Set `WHATSAPP_DEV_MOCK_MODE=true` in `.env`.
- All template messages, text messages, phone health checks, and webhooks will operate locally with realistic simulated IDs (`wamid.MOCK_...`).
- When ready for production, set `WHATSAPP_DEV_MOCK_MODE=false` and provide the live Meta token and phone number ID.

---

## 6. API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/whatsapp/status` | Check phone number verification, quality rating, and tier |
| `GET` | `/whatsapp/webhook` | Meta verification challenge handshake |
| `POST` | `/whatsapp/webhook` | Webhook event ingestion (delivery receipts, inbound texts) |
| `POST` | `/whatsapp/register` | Register phone number with 2-step verification PIN |
| `GET` | `/whatsapp/templates` | List registered templates and their Meta review statuses |
| `POST` | `/whatsapp/sync-templates`| Sync standard healthcare templates to Meta for approval |
