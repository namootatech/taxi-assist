export interface BrandedWrapperInput {
  brandName: string
  contentHtml: string
  previewText: string
  subject: string
  supportEmail: string
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;")
}

export function renderBrandedWrapper({
  brandName,
  contentHtml,
  previewText,
  subject,
  supportEmail,
}: BrandedWrapperInput) {
  const safeBrandName = escapeHtml(brandName)
  const safePreviewText = escapeHtml(previewText)
  const safeSubject = escapeHtml(subject)
  const safeSupportEmail = escapeHtml(supportEmail)
  const supportHref = `mailto:${escapeAttribute(supportEmail)}`

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f5f8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#122033;">
    <span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">
      ${safePreviewText}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f5f8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e4e8ef;">
            <tr>
              <td style="background:#244065;padding:20px 24px;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#ffffffb3;">Trip Platform</div>
                <div style="margin-top:6px;font-size:22px;font-weight:700;color:#ffffff;">${safeBrandName}</div>
                <div style="margin-top:2px;font-size:14px;color:#ffffffcc;">Operational update from your team</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 12px 24px;">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px 24px;">
                <hr style="border:none;border-top:1px solid #e6ebf2;margin:0 0 16px 0;" />
                <p style="margin:0 0 4px 0;font-size:13px;line-height:1.6;color:#4c5f78;">
                  Need help? Contact us at
                  <a href="${supportHref}" style="color:#fe0000;text-decoration:none;">${safeSupportEmail}</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#667892;">
                  You are receiving this transactional email because your account has activity that needs attention.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
