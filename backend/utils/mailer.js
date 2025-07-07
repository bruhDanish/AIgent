import nodemailer from 'nodemailer';

export const sendMail = async(to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth: {
            user: process.env.MAILTRAP_SMTP_USER,
            pass: process.env.MAILTRAP_SMTP_PASSWORD,
    },
        });

        const info = await transporter.sendMail({
            from: '"AIgent Support" <',
            to,
            subject,
            text,
        });

        console.log("✅ Message sent:", info.messageId);
        return info;
    } catch (error) {
        console.log(`❌ Error sending email: ${error.message}`);   
        throw error;
    }
}