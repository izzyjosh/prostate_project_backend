interface PendingClinicianEmailData {
  firstName: string;
  lastName: string;
  email: string;
  licenseNumber: string;
  specialty?: string | null;
  hospitalAffiliation?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function pendingClinicianTemplate(
  data: PendingClinicianEmailData,
): string {
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  return `
<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f7f7;color:#172b2f;font-family:Arial,sans-serif;line-height:1.5;">
    <div style="max-width:620px;margin:32px auto;padding:0 16px;">
      <div style="background:#0d2f35;border-radius:12px 12px 0 0;padding:28px 32px;color:#ffffff;">
        <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#9bd8d2;">Prostatecare</div>
        <h1 style="margin:10px 0 0;font-size:25px;font-weight:600;">New clinician application</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #dce7e6;border-top:0;border-radius:0 0 12px 12px;padding:32px;">
        <p style="margin-top:0;font-size:16px;">A new clinician application is waiting for review.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f1;color:#617276;width:42%;">Name</td><td style="padding:10px 0;border-bottom:1px solid #edf1f1;font-weight:600;">${escapeHtml(fullName)}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f1;color:#617276;">Email</td><td style="padding:10px 0;border-bottom:1px solid #edf1f1;">${escapeHtml(data.email)}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f1;color:#617276;">License number</td><td style="padding:10px 0;border-bottom:1px solid #edf1f1;">${escapeHtml(data.licenseNumber)}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f1;color:#617276;">Specialty</td><td style="padding:10px 0;border-bottom:1px solid #edf1f1;">${escapeHtml(data.specialty || 'Not provided')}</td></tr>
          <tr><td style="padding:10px 0;color:#617276;">Hospital affiliation</td><td style="padding:10px 0;">${escapeHtml(data.hospitalAffiliation || 'Not provided')}</td></tr>
        </table>
        <p style="margin:24px 0 0;font-size:14px;color:#526568;">Sign in to the Prostatecare admin dashboard to review this application. Approval and rejection are available only inside the authenticated admin dashboard.</p>
        <p style="margin:28px 0 0;font-size:12px;color:#879799;">Please do not reply to this automated notification.</p>
      </div>
    </div>
  </body>
</html>`;
}
