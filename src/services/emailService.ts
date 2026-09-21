import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendAppointmentAcknowledgment = async (
  patientEmail: string,
  patientName: string,
  appointment: {
    id: number;
    preferredDate: string;
    preferredTime?: string | null;
    tratmentType: string;
    contactMethod: string;
  }
) => {
  const plainText = `Hello ${patientName},

Thank you for requesting an appointment with our dental clinic. We have received your appointment request successfully.

Appointment Details:
- Reference ID: #${appointment.id}
- Treatment: ${appointment.tratmentType}
- Preferred Date: ${appointment.preferredDate}
- Preferred Time: ${appointment.preferredTime ?? "Not specified"}
- Preferred Contact: ${appointment.contactMethod}
- Status: Pending Confirmation

Our team will review your request and reach out shortly to confirm your consultation.

Thank you,
Dental Consultation Team
${process.env.EMAIL_USER || ""}`.trim();

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #0f766e; padding: 24px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Dental Consultation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Appointment Request Received</p>
      </div>
      
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; margin-top: 0; color: #0f172a;">Hello <strong>${patientName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          Thank you for requesting an appointment with our dental clinic. We have received your booking details and our team is reviewing your schedule.
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Appointment Summary
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Reference ID:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">#${appointment.id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Treatment:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${appointment.tratmentType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Preferred Date:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${appointment.preferredDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Preferred Time:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${appointment.preferredTime ?? "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Contact Method:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-transform: capitalize;">${appointment.contactMethod}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Status:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #d97706;">Pending Confirmation</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
          Our clinical desk will contact you via your preferred method (${appointment.contactMethod}) to confirm the exact time slot.
        </p>

        <p style="margin: 0; font-size: 14px; color: #334155;">
          Thank you,<br />
          <strong>Dental Consultation Team</strong>
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        This confirmation was sent to ${patientEmail}.
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Dental Consultation" <${process.env.EMAIL_USER}>`,
    to: patientEmail,
    replyTo: process.env.EMAIL_USER,
    subject: `Appointment Request Received (Ref #${appointment.id})`,
    text: plainText,
    html: htmlContent,
  });

  return info;
};

export default {
  sendAppointmentAcknowledgment,
};