import nodemailer, { SendMailOptions } from "nodemailer";

const getTransporter = () => {
  const user = process.env.EMAIL_USER?.trim();
  const rawPass = process.env.EMAIL_PASSWORD || "";
  const pass = rawPass.replace(/["'\s]/g, "");
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

const transporter = {
  sendMail: (mailOptions: SendMailOptions) => {
    return getTransporter().sendMail(mailOptions);
  },
};

export const sendAppointmentAcknowledgment = async (
  patientEmail: string,
  patientName: string,
  appointment: {
    id: number;
    preferredDate: string;
    preferredTime?: string | null;
    tratmentType: string;
    contactMethod: string;
  },
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

export const sendProposedScheduleNotification = async (
  patientEmail: string,
  patientName: string,
  appointment: {
    id: number;
    preferredDate: string;
    preferredTime?: string | null;
    tratmentType: string;
    contactMethod?: string | null;
    note?: string | null;
    assignedDoctorName?: string | null;
    meetingLink?: string | null;
  },
) => {
  const noteSectionPlain = appointment.note
    ? `\nMessage from Clinic:\n${appointment.note}\n`
    : "";

  const doctorPlain = appointment.assignedDoctorName
    ? `\n- Assigned Doctor: ${appointment.assignedDoctorName}`
    : "";

  const meetingPlain = appointment.meetingLink
    ? `\n- Video Consultation Link: ${appointment.meetingLink}`
    : "";

  const plainText = `Hello ${patientName},

Our clinic team has reviewed your appointment request and proposed a new consultation schedule.

Appointment Details:
- Reference ID: #${appointment.id}
- Treatment: ${appointment.tratmentType}
- Proposed New Date: ${appointment.preferredDate}
- Proposed New Time: ${appointment.preferredTime ?? "To be confirmed"}
- Status: Proposed / Rescheduled${doctorPlain}${meetingPlain}
${noteSectionPlain}
If this proposed time is convenient for you, please reply to this email or visit your patient portal to confirm. If you need a different time slot, please contact us.

Thank you,
Dental Consultation Team
${process.env.EMAIL_USER || ""}`.trim();

  const noteSectionHtml = appointment.note
    ? `
      <div style="background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
        <h4 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #1e40af;">
          Note from Clinic Desk
        </h4>
        <p style="margin: 0; font-size: 14px; color: #1e3a8a; line-height: 1.5;">
          ${appointment.note}
        </p>
      </div>
    `
    : "";

  const doctorHtmlRow = appointment.assignedDoctorName
    ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Assigned Doctor:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${appointment.assignedDoctorName}</td>
      </tr>
    `
    : "";

  const meetingHtmlRow = appointment.meetingLink
    ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Video Consultation:</td>
        <td style="padding: 6px 0;">
          <a href="${appointment.meetingLink}" style="display: inline-block; color: #2563eb; font-weight: 600; text-decoration: underline;">
            Join Video Consultation
          </a>
        </td>
      </tr>
    `
    : "";

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #1d4ed8; padding: 24px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Dental Consultation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">New Appointment Time Proposed</p>
      </div>
      
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; margin-top: 0; color: #0f172a;">Hello <strong>${patientName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          Our clinic desk has reviewed your consultation request and proposed a new appointment schedule. Please review the updated time slot below:
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #1d4ed8; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Proposed Consultation Details
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
              <td style="padding: 6px 0; color: #64748b;">Proposed Date:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #1d4ed8; font-size: 15px;">${appointment.preferredDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Proposed Time:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #1d4ed8; font-size: 15px;">${appointment.preferredTime ?? "To be confirmed"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Status:</td>
              <td style="padding: 6px 0;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #dbeafe; color: #1e40af; font-weight: 600; font-size: 12px;">
                  Proposed / Rescheduled
                </span>
              </td>
            </tr>
            ${doctorHtmlRow}
            ${meetingHtmlRow}
          </table>
        </div>

        ${noteSectionHtml}

        <p style="font-size: 13px; color: #475569; margin-bottom: 24px; line-height: 1.6;">
          If this proposed schedule is convenient for you, please reply directly to this email or visit your patient portal to confirm. If you require an alternate time, please let us know.
        </p>

        <p style="margin: 0; font-size: 14px; color: #334155;">
          Warm regards,<br />
          <strong>Dental Consultation Team</strong>
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        This notification was sent to ${patientEmail}.
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Dental Consultation" <${process.env.EMAIL_USER}>`,
    to: patientEmail,
    replyTo: process.env.EMAIL_USER,
    subject: `Proposed Appointment Time (Ref #${appointment.id})`,
    text: plainText,
    html: htmlContent,
  });

  return info;
};

export const sendAppointmentApprovedNotification = async (
  patientEmail: string,
  patientName: string,
  appointment: {
    id: number;
    preferredDate: string;
    preferredTime?: string | null;
    tratmentType: string;
    contactMethod?: string | null;
    note?: string | null;
    assignedDoctorName?: string | null;
    meetingLink?: string | null;
  },
) => {
  const noteSectionPlain = appointment.note
    ? `\nMessage from Clinic:\n${appointment.note}\n`
    : "";

  const doctorPlain = appointment.assignedDoctorName
    ? `\n- Assigned Doctor: ${appointment.assignedDoctorName}`
    : "";

  const meetingPlain = appointment.meetingLink
    ? `\n- Video Consultation Link: ${appointment.meetingLink}`
    : "";

  const plainText = `Hello ${patientName},

Great news! Your dental consultation appointment has been APPROVED and CONFIRMED.

Appointment Details:
- Reference ID: #${appointment.id}
- Treatment: ${appointment.tratmentType}
- Confirmed Date: ${appointment.preferredDate}
- Confirmed Time: ${appointment.preferredTime ?? "As Scheduled"}
- Status: Approved & Confirmed${doctorPlain}${meetingPlain}
${noteSectionPlain}
Please ensure you join or arrive a few minutes prior to your scheduled time.

Thank you,
Dental Consultation Team
${process.env.EMAIL_USER || ""}`.trim();

  const noteSectionHtml = appointment.note
    ? `
      <div style="background: #ecfdf5; border-left: 4px solid #059669; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
        <h4 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #065f46;">
          Note from Clinic Desk
        </h4>
        <p style="margin: 0; font-size: 14px; color: #064e3b; line-height: 1.5;">
          ${appointment.note}
        </p>
      </div>
    `
    : "";

  const doctorHtmlRow = appointment.assignedDoctorName
    ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Assigned Doctor:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${appointment.assignedDoctorName}</td>
      </tr>
    `
    : "";

  const meetingHtmlRow = appointment.meetingLink
    ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Video Consultation:</td>
        <td style="padding: 6px 0;">
          <a href="${appointment.meetingLink}" style="display: inline-block; color: #059669; font-weight: 600; text-decoration: underline;">
            Join Video Consultation
          </a>
        </td>
      </tr>
    `
    : "";

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #0f766e; padding: 24px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Dental Consultation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Appointment Approved & Confirmed</p>
      </div>
      
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; margin-top: 0; color: #0f172a;">Hello <strong>${patientName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          We are pleased to inform you that your dental consultation request has been approved and officially confirmed!
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Confirmed Appointment Details
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
              <td style="padding: 6px 0; color: #64748b;">Confirmed Date:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f766e; font-size: 15px;">${appointment.preferredDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Confirmed Time:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f766e; font-size: 15px;">${appointment.preferredTime ?? "As scheduled"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Status:</td>
              <td style="padding: 6px 0;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #d1fae5; color: #065f46; font-weight: 600; font-size: 12px;">
                  Approved & Confirmed
                </span>
              </td>
            </tr>
            ${doctorHtmlRow}
            ${meetingHtmlRow}
          </table>
        </div>

        ${noteSectionHtml}

        <p style="font-size: 13px; color: #475569; margin-bottom: 24px; line-height: 1.6;">
          Please reach out if you have any questions or require special assistance prior to your appointment.
        </p>

        <p style="margin: 0; font-size: 14px; color: #334155;">
          Warm regards,<br />
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
    subject: `Appointment Approved & Confirmed (Ref #${appointment.id})`,
    text: plainText,
    html: htmlContent,
  });

  return info;
};

export const sendAppointmentCancelledNotification = async (
  patientEmail: string,
  patientName: string,
  appointment: {
    id: number;
    preferredDate: string;
    preferredTime?: string | null;
    tratmentType: string;
    contactMethod?: string | null;
    note?: string | null;
    assignedDoctorName?: string | null;
  },
) => {
  const noteSectionPlain = appointment.note
    ? `\nCancellation Reason / Clinic Note:\n${appointment.note}\n`
    : "";

  const plainText = `Hello ${patientName},

This is an update regarding your dental appointment request. Your consultation appointment (Ref #${appointment.id}) has been CANCELLED by the clinic administration.

Appointment Details:
- Reference ID: #${appointment.id}
- Treatment: ${appointment.tratmentType}
- Scheduled Date: ${appointment.preferredDate}
- Scheduled Time: ${appointment.preferredTime ?? "N/A"}
- Status: Cancelled
${noteSectionPlain}
If you wish to reschedule for a different date or time, or if you believe this was in error, please visit our online portal or contact our clinic desk.

Thank you,
Dental Consultation Team
${process.env.EMAIL_USER || ""}`.trim();

  const noteSectionHtml = appointment.note
    ? `
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
        <h4 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #991b1b;">
          Cancellation Reason / Clinic Note
        </h4>
        <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">
          ${appointment.note}
        </p>
      </div>
    `
    : "";

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #dc2626; padding: 24px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Dental Consultation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Appointment Cancelled</p>
      </div>
      
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; margin-top: 0; color: #0f172a;">Hello <strong>${patientName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          This notice is to inform you that your dental consultation appointment (Ref #${appointment.id}) has been <strong>cancelled</strong>.
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #dc2626; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Cancelled Consultation Details
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
              <td style="padding: 6px 0; color: #64748b;">Scheduled Date:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${appointment.preferredDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Scheduled Time:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${appointment.preferredTime ?? "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Status:</td>
              <td style="padding: 6px 0;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #fee2e2; color: #991b1b; font-weight: 600; font-size: 12px;">
                  Cancelled
                </span>
              </td>
            </tr>
          </table>
        </div>

        ${noteSectionHtml}

        <p style="font-size: 13px; color: #475569; margin-bottom: 24px; line-height: 1.6;">
          If you would like to reschedule your consultation for a more convenient date or time, please visit our online portal or reach out to our clinic team.
        </p>

        <p style="margin: 0; font-size: 14px; color: #334155;">
          Warm regards,<br />
          <strong>Dental Consultation Team</strong>
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        This notification was sent to ${patientEmail}.
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Dental Consultation" <${process.env.EMAIL_USER}>`,
    to: patientEmail,
    replyTo: process.env.EMAIL_USER,
    subject: `Appointment Cancelled (Ref #${appointment.id})`,
    text: plainText,
    html: htmlContent,
  });

  return info;
};

export const sendAppointmentReminderNotification = async (
  patientEmail: string,
  patientName: string,
  appointment: {
    id: number;
    preferredDate: string;
    preferredTime?: string | null;
    tratmentType: string;
    contactMethod?: string | null;
    assignedDoctorName?: string | null;
    meetingLink?: string | null;
    reminderType: "24_hour" | "1_hour" | "custom";
    customHours?: number;
  },
) => {
  const isOneHour = appointment.reminderType === "1_hour";
  const reminderLabel = isOneHour
    ? "Upcoming Consultation in 1 Hour"
    : appointment.reminderType === "24_hour"
    ? "Upcoming Consultation Tomorrow"
    : `Upcoming Consultation in ${appointment.customHours || 24} Hours`;

  const bannerColor = isOneHour ? "#d97706" : "#0d9488";
  const subjectPrefix = isOneHour ? "⏰ URGENT REMINDER (In 1 Hour):" : "📅 Reminder:";

  const doctorPlain = appointment.assignedDoctorName
    ? `\n- Assigned Doctor: ${appointment.assignedDoctorName}`
    : "";

  const meetingPlain = appointment.meetingLink
    ? `\n- Video Consultation Link: ${appointment.meetingLink}`
    : "";

  const plainText = `Hello ${patientName},

This is a reminder that your dental consultation is scheduled ${isOneHour ? "in 1 hour" : "for tomorrow"}.

Appointment Details:
- Reference ID: #${appointment.id}
- Treatment: ${appointment.tratmentType}
- Date: ${appointment.preferredDate}
- Time: ${appointment.preferredTime ?? "As Scheduled"}${doctorPlain}${meetingPlain}

Preparation Tips:
- Please ensure you are in a quiet, well-lit environment.
- Test your microphone and camera prior to joining.
- Have any relevant symptoms or questions ready.

${appointment.meetingLink ? `Join Video Consultation: ${appointment.meetingLink}` : "Please be ready at your scheduled time."}

Thank you,
Dental Consultation Team
${process.env.EMAIL_USER || ""}`.trim();

  const doctorHtmlRow = appointment.assignedDoctorName
    ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Assigned Doctor:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${appointment.assignedDoctorName}</td>
      </tr>
    `
    : "";

  const meetingHtmlRow = appointment.meetingLink
    ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Video Meeting:</td>
        <td style="padding: 6px 0;">
          <a href="${appointment.meetingLink}" style="display: inline-block; background: ${bannerColor}; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 13px;">
            Join Consultation Room
          </a>
        </td>
      </tr>
    `
    : "";

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: ${bannerColor}; padding: 24px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Dental Consultation</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 600;">${reminderLabel}</p>
      </div>
      
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; margin-top: 0; color: #0f172a;">Hello <strong>${patientName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          This is a friendly reminder that your dental consultation appointment is scheduled <strong>${isOneHour ? "in approximately 1 hour" : "for tomorrow"}</strong>.
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: ${bannerColor}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            Consultation Details
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
              <td style="padding: 6px 0; color: #64748b;">Scheduled Date:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-size: 15px;">${appointment.preferredDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Scheduled Time:</td>
              <td style="padding: 6px 0; font-weight: 700; color: ${bannerColor}; font-size: 15px;">${appointment.preferredTime ?? "As scheduled"}</td>
            </tr>
            ${doctorHtmlRow}
            ${meetingHtmlRow}
          </table>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #166534; font-weight: 600;">
            Preparation Tips for Your Consultation:
          </h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #15803d; line-height: 1.6;">
            <li>Ensure a stable internet connection and a quiet room.</li>
            <li>Have previous dental records or photos ready if applicable.</li>
            <li>Connect 5 minutes prior to the scheduled start time.</li>
          </ul>
        </div>

        <p style="margin: 0; font-size: 14px; color: #334155;">
          Warm regards,<br />
          <strong>Dental Consultation Team</strong>
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        This automated reminder was sent to ${patientEmail}.
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Dental Consultation" <${process.env.EMAIL_USER}>`,
    to: patientEmail,
    replyTo: process.env.EMAIL_USER,
    subject: `${subjectPrefix} Dental Consultation (Ref #${appointment.id})`,
    text: plainText,
    html: htmlContent,
  });

  return info;
};

export default {
  sendAppointmentAcknowledgment,
  sendProposedScheduleNotification,
  sendAppointmentApprovedNotification,
  sendAppointmentCancelledNotification,
  sendAppointmentReminderNotification,
};