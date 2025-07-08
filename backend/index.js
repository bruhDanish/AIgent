import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { serve } from 'inngest/express';
import {configDotenv} from 'dotenv';
import userRoutes from './routes/user.js';
import ticketRoutes from './routes/ticket.js';
import { inngest } from './inngest/client.js';
import {onUserSignUp} from './inngest/functions/onSignUp.js';
import {onTicketCreated} from './inngest/functions/onTicketCreate.js';

const PORT = process.env.PORT|| 3000;
const app = express();

configDotenv();

app.use(cors());
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/ticket", ticketRoutes);

app.use(
    "/api/inngest", serve({
        client: inngest,
        functions: [onUserSignUp, onTicketCreated],
    })
)

mongoose.connect(process.env.MONGO_URI)
    .then(()=>{
        console.log('MongoDB connected successfully')
        app.listen(PORT, ()=> console.log(`🚀Server is running on port ${PORT}`));
    })
    .catch((err)=> console.log(`❌ MongoDB error ${err}`));