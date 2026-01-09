import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import "dotenv/config";
import ProductSchema  from "./products.js";

type UserMethods = {
  comparePassword(candidatePassword: string): Promise<boolean>;
  createJWT(): string;
};

type UserDoc = mongoose.Document & {
  password: string;
  email: string;
  name: string;
  products: mongoose.Types.DocumentArray<any>;
} & UserMethods;

const UserSchema = new mongoose.Schema<UserDoc>(
  {
    password: {
      type: String,
      required: [true, "must enter password"],
      minlength: 7,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Please provide email"],
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ],
      unique: true,
    },
    name: {
      type: String,
      required: [true, "must enter a name"],
      maxlength: 25,
    },
    products: [ProductSchema],
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.createJWT = function () {
  const secret = process.env.JWT_SECRET;
  const lifetime = process.env.JWT_LIFETIME;

  if (!secret || !lifetime) throw new Error("JWT env not set");

  const options = { expiresIn: lifetime } as SignOptions;

  return jwt.sign(
    { userId: this._id, name: this.name },
    secret as Secret,
    options
  );
};
export default mongoose.model<UserDoc>("User", UserSchema);
