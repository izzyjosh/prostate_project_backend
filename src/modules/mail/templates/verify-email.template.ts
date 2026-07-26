export function verifyEmailTemplate(verificationUrl: string): string {
  return `
		<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; padding: 24px; background: #f9fafb;">
			<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
				<h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">Verify your email</h1>
				<p style="margin: 0 0 24px; font-size: 16px;">
					Click the button below to verify your email address and finish setting up your account.
				</p>
				<a
					href="${verificationUrl}"
					style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;"
				>
					Verify Email
				</a>
				<p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; word-break: break-all;">
					If the button does not work, paste this link into your browser:<br />
					<a href="${verificationUrl}" style="color: #2563eb;">${verificationUrl}</a>
				</p>
			</div>
		</div>
	`;
}
