import { inngest } from '../client';
import Ticket from '../../models/ticket.js';
import { NonRetriableError } from 'inngest';
import { sendMail } from '../../utils/emailService';
import analyzeTicket from '../../utils/ticketToAi';
import User from '../../models/user.js';

export const onTicketCreated = inngest.createFunction(
    {id: "onTicketCreated", retries: 3},
    {event: 'user/signUp'},

    async ({event, step}) => {
        try {
            const {ticketId} = event.data;

            //fetch ticket from database
            const ticket = await step.run("fetch-ticket", async()=>{
                const ticketObj = await Ticket.findById(ticketId);
                if(!ticket){
                    throw new NonRetriableError(`Ticket with ID ${ticketId} not found`);
                }

                return ticketObj;
            })

            await step.run("update-ticket-status", async()=>{
                await Ticket.findByIdAndUpdate(ticketId._id,{status: "TODO"});
            })

            const aiResponse = analyzeTicket(ticket);

            const relatedSkills = await step.run("ai-processing", async()=>{
                let skills = [];
                if(aiResponse){
                    await Ticket.findByIdAndUpdate(ticketId._id, {
                        priority: !["low", "medium", "high"].includes(aiResponse.priority) ? "medium" : aiResponse.priority,
                        helpfulNotes: aiResponse.helpfulNotes,
                        status: "In_Progress",
                        relatedSkills: aiResponse.relatedSkills,
                    })
                    skills = aiResponse.relatedSkills;
                }
                return skills;
            })

            const moderator = await step.run("assign-moderator", async()=>{
                let user = await User.findOne({
                    role: "moderator",
                    skills: {
                        $elemMatch: {
                            $regex: relatedSkills.join("|"),
                            $options: "i"
                        },
                    },
                });
                if(!user){
                    user = await User.findOne({role: "admin"});
                }
                await Ticket.findByIdAndUpdate(ticket._id, {assignedTo: user?._id || null});
                return user;
            })

            await step.run("send-email-notification", async()=>{
                if(moderator){
                    const finalTicket = await Ticket.findById(ticket._id);
                    await sendMail(
                        moderator.email,
                        `Ticket Assigned`,
                        `A new ticket has been assigned to you.\n\nTicket ID: ${finalTicket}\nTitle: ${ticket.title}\nDescription: ${ticket.description}\n\nPlease check the ticketing system for more details.`
                    )
                }
            })
            return {success: true};
        } catch (error) {
            console.log(`❌ Error running step: ${error.message}`);
            return {success: false};
        }
    }
)