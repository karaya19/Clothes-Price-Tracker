export type ProductType = {
  _id: string;
  title: string;
  currentPrice: number;
  url: string;
  imageUrl?: string;          
  //historicalPrices: { price: number; date: string }[];
};

