import cron from 'node-cron';
import main from '../src/scraper/scrapeProduct.js';
import Users from '../Models/users.js';
async function scheduleProductCheck() {
  const allUsers = await Users.find({})
  for (const user of allUsers) {
    for (const product of user.products) {
      const result = await main(product.url);
      if(result === undefined){
        console.log('Failed to fetch product details for URL: ' + product.url);
        continue;
      }
      if(Number(result.price) !== product.currentPrice){
          await Users.findOneAndUpdate({email: user.email, "products.url": product.url},{$set: { "products.$.currentPrice": Number(result.price) },
            $push: { "products.$.historicalPrices": { price: Number(product.currentPrice), date: new Date() } } })
  
        console.log(`Price updated for product ${product.title}. New price: ${result.price}`);

      }

    }}
  }

cron.schedule('* * 1 * *', () => {
  console.log('Running scheduled product price check...');
  scheduleProductCheck();
});

export default scheduleProductCheck;