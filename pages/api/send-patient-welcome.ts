import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

// Create Resend instance with API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_PSM5uUUv_PAMrLCQJDNq4hfKrAD5443Gy');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, name, patientId } = req.body;

    if (!email || !name || !patientId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        console.log('Attempting to send email to:', email);
        
        // For testing purposes, we'll send to the real email but also a test email
        const { data, error } = await resend.emails.send({
            from: 'Acme <onboarding@resend.dev>', // Using Resend's approved sender domain
            to: [email], // Still send to the real patient email
            subject: 'Welcome to Our Healthcare Center',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to Our Healthcare Center</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            background-color: #f4f4f4;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background-color: #ffffff;
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        }
                        .header {
                            background-color: #4F46E5;
                            color: white;
                            padding: 20px;
                            text-align: center;
                        }
                        .content {
                            padding: 30px;
                            background-color: #ffffff;
                        }
                        .patient-id {
                            background-color: #f8f9fa;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                            border-left: 4px solid #4F46E5;
                        }
                        .footer {
                            text-align: center;
                            padding: 20px;
                            background-color: #f8f9fa;
                            color: #666;
                            font-size: 14px;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 24px;
                            background-color: #4F46E5;
                            color: white !important;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to Our Healthcare Center</h1>
                        </div>
                        <div class="content">
                            <h2>Dear ${name},</h2>
                            <p>Thank you for choosing our healthcare center for your medical needs. We are committed to providing you with the highest quality of care.</p>
                            
                            <div class="patient-id">
                                <h3 style="margin-top: 0;">Your Patient Information</h3>
                                <p><strong>Patient ID:</strong> ${patientId}</p>
                                <p><strong>Name:</strong> ${name}</p>
                            </div>

                            <p><strong>Important Next Steps:</strong></p>
                            <ul>
                                <li>Keep your Patient ID handy for all future appointments</li>
                                <li>Complete your medical history form during your next visit</li>
                                <li>Arrive 15 minutes early for your first appointment</li>
                            </ul>

                            <p>For any questions or to schedule an appointment, please don't hesitate to contact us.</p>
                            
                            <center>
                                <a href="tel:+91 8518999333" class="button">Contact Us</a>
                            </center>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Healthcare Center. All rights reserved.</p>
                            <p>This is an automated message, please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('Resend API error:', error);
            // Return 200 instead of 500 so patient creation still succeeds
            return res.status(200).json({ 
                message: 'Patient created but email failed to send',
                error 
            });
        }

        console.log('Email sent successfully:', data);
        return res.status(200).json({ 
            message: 'Welcome email sent successfully',
            data 
        });
    } catch (error) {
        console.error('Error sending email:', error);
        // Return 200 instead of 500 so patient creation still succeeds
        return res.status(200).json({ 
            message: 'Patient created but email failed to send',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
