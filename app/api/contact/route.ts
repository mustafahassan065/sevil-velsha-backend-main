import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { RateLimiterMemory } from 'rate-limiter-flexible';

function getAllowedOrigin(): string {
  return process.env.ALLOWED_ORIGIN ?? '*';
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ---------------------------------------------------------------------------
// Rate limiting – 5 requests per 15 minutes per IP (resets on cold start)
// ---------------------------------------------------------------------------
const rateLimiter = new RateLimiterMemory({
  points: 5,       // max requests
  duration: 60,   // per 15 minutes (seconds)
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

interface ContactFormBody {
  fullName?: string;
  email?: string;
  currentRole?: string;
  highStakes?: string;
  whyNow?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  website?: string; // honeypot – must be absent / empty
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders();

  // --- Rate limiting ---
  const ip = getClientIp(req);
  try {
    await rateLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers },
    );
  }

  try {
    const body: ContactFormBody = await req.json();

    // --- Honeypot ---
    if (body.website) {
      // Silently reject bots without revealing the check
      return NextResponse.json({ success: true }, { headers });
    }

    const {
      fullName = '',
      email = '',
      currentRole = '',
      highStakes = '',
      whyNow = '',
      utm_source = '',
      utm_medium = '',
      utm_campaign = '',
    } = body;

    // --- Validation ---
    if (!fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400, headers });
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400, headers });
    }

    if (!currentRole.trim()) {
      return NextResponse.json({ error: 'Current role is required.' }, { status: 400, headers });
    }

    if (!highStakes.trim()) {
      return NextResponse.json({ error: 'High-stakes situation is required.' }, { status: 400, headers });
    }

    if (!whyNow.trim()) {
      return NextResponse.json({ error: 'Why now is required.' }, { status: 400, headers });
    }

    // --- Env vars ---
    const apiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL;
    const recipientEmail = process.env.CONTACT_RECIPIENT_EMAIL;

    if (!apiKey || !senderEmail || !recipientEmail) {
      console.error('Missing Resend environment variables');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500, headers });
    }

    const htmlContent = buildEmailHtml({ fullName, email, currentRole, highStakes, whyNow, utm_source, utm_medium, utm_campaign });

    // --- Send via Resend ---
    const resend = new Resend(apiKey);
    const { error: resendError } = await resend.emails.send({
      from: `Application Form <${senderEmail}>`,
      to: [recipientEmail],
      replyTo: email,
      subject: `New Application: ${fullName}`,
      html: htmlContent,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 502, headers },
      );
    }

    return NextResponse.json({ success: true }, { headers });
  } catch (err) {
    console.error('Contact route error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500, headers: corsHeaders() });
  }
}

// ---- Helpers ----------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(label: string, value: string, shaded: boolean): string {
  const bg = shaded ? 'background:#f9fafb;' : '';
  return `
    <tr style="${bg}">
      <td style="padding:10px 12px 10px 0;font-size:12px;color:#6b7280;font-weight:700;
                 text-transform:uppercase;letter-spacing:.05em;width:36%;vertical-align:top;">
        ${label}
      </td>
      <td style="padding:10px 0;font-size:14px;color:#111827;white-space:pre-wrap;">
        ${escapeHtml(value)}
      </td>
    </tr>`;
}

function buildEmailHtml(fields: {
  fullName: string;
  email: string;
  currentRole: string;
  highStakes: string;
  whyNow: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}): string {
  const hasUtm = fields.utm_source || fields.utm_medium || fields.utm_campaign;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;
                      padding:32px 40px;max-width:600px;width:100%;">
          <tr>
            <td>
              <h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">
                New Application Submission
              </h2>
              <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
                Submitted via the website contact form.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-top:1px solid #e5e7eb;">
                ${row('Full Name', fields.fullName, false)}
                ${row('Email', fields.email, true)}
                ${row('Current Role', fields.currentRole, false)}
                ${row('High-Stakes Situation', fields.highStakes, true)}
                ${row('Why Now', fields.whyNow, false)}
                ${hasUtm ? `
                <tr>
                  <td colspan="2" style="padding:16px 0 4px;font-size:11px;font-weight:700;
                      color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;border-top:1px solid #e5e7eb;">
                    UTM Attribution
                  </td>
                </tr>
                ${fields.utm_source ? row('Source', fields.utm_source, false) : ''}
                ${fields.utm_medium ? row('Medium', fields.utm_medium, true) : ''}
                ${fields.utm_campaign ? row('Campaign', fields.utm_campaign, false) : ''}
                ` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
