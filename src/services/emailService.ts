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
  await transporter.sendMail({
    from: `"Dental Consultation" <${process.env.EMAIL_USER}>`,
    to: patientEmail,
    subject: "Appointment Request Received - Dental Consultation",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Appointment Request Received</h2>

        <p>Hello ${patientName},</p>

        <p>
          Thank you for requesting an appointment with our dental clinic.
          We have received your appointment request successfully.
        </p>

        <h3>Appointment Details</h3>

        <p><strong>Appointment ID:</strong> ${appointment.id}</p>
        <p><strong>Treatment:</strong> ${appointment.tratmentType}</p>
        <p><strong>Date:</strong> ${appointment.preferredDate}</p>
        <p><strong>Time:</strong> ${appointment.preferredTime ?? "Not specified"}</p>
        <p><strong>Contact Method:</strong> ${appointment.contactMethod}</p>
        <p><strong>Status:</strong> Pending</p>

        <p>
          Our team will review your request and confirm the appointment.
        </p>

        <p>
          Thank you,<br />
          Dental Consultation Team
        </p>
      </div>
    `,
  });
};