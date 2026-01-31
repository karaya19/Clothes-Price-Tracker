import main from "../src/scraper/scrapeProduct.js";
import Users from "../Models/users.js";

async function scheduleProductCheck() {
  const allUsers = await Users.find({});

  let checked = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of allUsers) {
    for (const product of user.products) {
      // skip if already checked today (and lastChecked exists)
      if (product.lastChecked) {
        const last = new Date(product.lastChecked).toDateString();
        const today = new Date().toDateString();
        if (last === today) {
          skipped++;
          continue;
        }
      }

      let result;
      try {
        result = await main(product.url, product.size);
        if (!result) {
          console.log("Failed to fetch product details for URL:", product.url);
          failed++;
          continue;
        }
      } catch (error) {
        console.error("Error fetching product details for URL:", product.url, error);
        failed++;
        continue;
      }

      checked++;

      const newPrice = Number(result.price);
      if (!Number.isFinite(newPrice)) {
        console.log("Invalid price returned for URL:", product.url, result.price);
        failed++;
        continue;
      }

      if (newPrice !== product.currentPrice) {
        await Users.findOneAndUpdate(
          { email: user.email, "products.url": product.url },
          {
            $set: {
              "products.$.currentPrice": newPrice,
              "products.$.lastChecked": new Date(),
            },
            $push: {
              "products.$.historicalPrices": {
                price: Number(product.currentPrice),
                date: new Date(),
              },
            },
          }
        );

        updated++;
        console.log(`Price updated for product ${product.title}. New price: ${newPrice}`);
      } else {
        // still mark as checked even if price didn’t change
        await Users.findOneAndUpdate(
          { email: user.email, "products.url": product.url },
          { $set: { "products.$.lastChecked": new Date() } }
        );
      }
    }
  }

  return { checked, updated, skipped, failed };
}

export default scheduleProductCheck;
