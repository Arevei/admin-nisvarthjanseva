# Environment Variables Setup

## Required Environment Variables

### Twilio SMS Configuration
Required for SMS sending functionality (donations & membership receipts):

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Twilio phone number (with country code)
```

**How to find these:**
1. Login to [Twilio Console](https://www.twilio.com/console)
2. Copy Account SID and Auth Token from the main dashboard
3. Go to Phone Numbers section to get your assigned phone number

### NGO/Organization Configuration
For 80G receipt generation and organization details:

```
# 80G Tax Deduction Details
DONATION_80G_REGISTRATION_NUMBER=your_80g_number
DONATION_80G_VALIDITY=AY 2026-27 to AY 2028-2029

# Organization Details
DONATION_ORGANIZATION_PAN=your_organization_pan
DONATION_REGISTERED_ADDRESS=your_registered_address
```

### Database Configuration
```
MONGODB_URI=your_mongodb_connection_string
```

### Other Configuration
```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Debugging SMS Issues

If SMS is not sending, check:

1. **Server Console Logs** - Look for messages prefixed with `[Twilio]` or `[SMS]`
2. **Common Errors:**
   - `Twilio not configured. Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN` - Missing environment variables
   - `Missing TWILIO_PHONE_NUMBER` - Phone number not configured
   - Network errors - Check server connectivity and Twilio API status

3. **Test SMS Manually:**
   - Go to Admin Dashboard
   - Find a donation/membership record
   - Click "Send SMS" button
   - Check browser console and server logs for detailed error messages

## Troubleshooting

### Receipt showing garbled characters
**Fixed:** Unicode/Hindi text encoding issue has been resolved. The PDF now uses ASCII-compatible fonts.

### SMS sending fails with network errors
**Check:**
- Twilio API connectivity
- Firewall/network restrictions on server
- Twilio account has sufficient credits
- Phone numbers have correct format (+91 prefix for India)

### PDF character encoding issues
**Solution:** The application now uses fonts that support proper character encoding. If you see garbled text, clear browser cache and regenerate the receipt.
