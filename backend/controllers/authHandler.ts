import User from '../Models/users.js'
import dotenv from 'dotenv'
dotenv.config()
import {Request, Response} from 'express'

const registerUser = async (req: Request, res: Response) =>{
  console.log('Registering User...' + JSON.stringify(req.body));
  const {name, email,password} = req.body
  if(!name || !email || !password){
    return res.status(400).json({msg: "must enter email, name and password"})
  }
  if(await User.findOne({email})){
    return res.status(400).json({msg: "User already exists"})

  }
  const user = await User.create({ ...req.body })
  const token = user.createJWT()
  
  res.status(200).json({user: {name}, token})
}

const loginUser = async (req: Request, res: Response  ) =>{
  const {email, password} = req.body
  if(!email || !password){
    return res.status(400).json({msg: "must enter email and password"})
  }
  const user = await User.findOne({email})
  if(!user){
    return res.status(400).json({msg: "email not found."})

  }
  if(!await user.comparePassword(password)){
    return res.status(400).json({msg: "Wrong password. Try again"})
  }
  const token = user.createJWT()
  res.status(200).json({user: {name:user.name}, token})
}
export {registerUser, loginUser}