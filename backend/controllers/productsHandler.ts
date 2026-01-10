import getPrice from '../src/scraper/scrapeProduct.js';
import Users from '../Models/users.js';
import { type Request, type Response } from 'express';

type userIdType = {
  userId: string;
  name: string;
}


const addProduct = async (req: Request, res: Response) => {
  console.log('Adding Product...');

  try {
    const { userId } = req.user as userIdType;
    if(await Users.findOne({"products.url": req.body.url, _id: userId})){
      console.log('Product already exists for user: ' + userId);
      return res.status(400).json({ error: "Product already exists" });
    }
    console.log("about to get price");
    const result = await getPrice(req.body.url);
    console.log("got price");
    if (!result) {
      return res.status(400).json({ error: "Failed to fetch product details" });
    }
    
    const { price, productTitle , imageUrl} = result;
    console.log(imageUrl);
    const newProduct = {
      url: String(req.body.url),
      currentPrice: Number(price),
      historicalPrices: [{}],
      title: String(productTitle),
      imageUrl: imageUrl ? String(imageUrl) : undefined,
      notifications: req.body.notifications === true,
    };

    const updatedUser = await Users.findOneAndUpdate(
      { _id: userId },
      { $push: { products: newProduct } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(201).json({ products: updatedUser.products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add product" });
  }
};



const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.user as userIdType;
    const user = await Users.findById(userId);

    if (!user) return res.status(404).json({ products: [] });

    res.status(200).json({ products: user.products || [] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to get products" });
  }
};

export { getAllProducts,addProduct };