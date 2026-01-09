
import connectDB from './db/connect.js'
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import authMiddleware from './middleware/authMiddleware.js'
import clothesTrackingRouter from './routes/clothes-tracking-route.js'
import authRouter from './routes/auth-route.js'
const app = express();
dotenv.config();


app.use(cors());
app.use(express.json());
app.use('/api/v1/clothes-tracker', authMiddleware, clothesTrackingRouter);
app.use('/api/v1/auth', authRouter);




function start(){
  try{
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in the environment variables');
    }
    connectDB(mongoUri);
    app.listen(8000,()=>{
      console.log('Server is listening on port 8000...');
    })
  }catch(error){
    console.error(error);
  }
}
start();