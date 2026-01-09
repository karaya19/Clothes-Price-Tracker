import mongoose from 'mongoose';


const ProductSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'Product URL is required'],
  },
  title:{
    type:String,
    required: [true , "Product title is required"]
  },
  notifications:{
    type:Boolean,
    required: [true , "Notifications preference is required"]
  },
  lastChecked:{
    type:Date,
    required: [true , "Last checked date is required"],
    default: Date.now
  },
  currentPrice:{
    type:Number,
    required: [true , "Current price is required"]

  },
  historicalPrices:    [{
      price:{ type: Number , required: true },
      date: { type: Date, default: Date.now }
      
    }]
  
});

export default ProductSchema;