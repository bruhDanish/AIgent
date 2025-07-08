import { inngest } from '../client.js';
import User from '../../models/user.js';
import { NonRetriableError } from 'inngest';
import { sendMail } from '../../utils/mailer.js';

export const onUserSignUp = inngest.createFunction(
    {id: "onUserSignUp", retries: 3},
    {event: 'user/signUp'},

    async({event, step}) => {
        try {
            const {email} = event.data
            const user = await step.run("get-user-email", async()=>{
                const userObj = User.finOne({email})
                if(!userObj) {
                    throw new NonRetriableError(`User with email ${email} not found`);
                }
                return userObj;
            });

            await step.run("send-welcome-email", async()=>{
                const subject = "Welcome to AIgent Ticketing System";
                const msg = `Hello ${user.name || 'User'},\n\nThank you for signing up for the AIgent Ticketing System. We are excited to have you on board!\n\nBest regards,\nAIgent Team`;
                await sendMail(user.email, subject, msg);
                console.log(`✅ Welcome email sent to ${user.email}`);
            })

            return {success: true};
        } catch (error) {
            console.log(`❌ Error running step ${error.message}`);
            return {success: false, error: error.message};
        }
    }
)