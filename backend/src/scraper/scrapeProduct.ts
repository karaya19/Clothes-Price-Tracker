import { chromium, type Page, type Locator } from "playwright";
import dotenv from "dotenv";
dotenv.config();


async function main(url: string, size: string, noPopUp: boolean = true): Promise< {price: Number, productTitle: String, imageUrl:String| null} | undefined> {

  const ublockPath = process.env.uBlockPath;

  const context = await chromium.launchPersistentContext(
  "C:/Users/araya/AppData/Local/PlaywrightEdgeProfile",
  {
    channel: "msedge",
    headless: false,
    args: [
      `--disable-extensions-except=${ublockPath}`,
      `--load-extension=${ublockPath}`,
      "--disable-features=msEdgeExtensions",
      "--window-position=-2000,0",
      "--window-size=1280,800"
    ],
    viewport: { width: 1280, height: 800 }
  }
);

  const page = await context.newPage();
  await page.evaluate(() => {
   window.moveTo(-2000, 0);
   window.resizeTo(1280, 800);
  });

  // quick proof it’s using the profile
    //"https://www.princesspolly.com.au/products/kasper-cinched-longline-tank-top-white";
 
  await page.goto(url);
  await page.waitForLoadState();

  const productTitle = await page.title();

  try {
    await waitForAddText(page);
    console.log("success");
  } catch (e) {
    console.log("❌ waitForFunction timed out or failed");
  }

  let boxFound = false;
  const productButton1 = await findProductBox(page);
  if (productButton1 !== null) {
    boxFound = true;
  }

  if (!boxFound) {
    console.log("Trying to select size..." + size);
    const sizeSelected = await selectSizeButton(page, [size]);
    if (sizeSelected) {
      try {
        console.log("waiting for add text");
        await page.waitForLoadState();
        await waitForAddText(page);
      } catch (e: any) {
        console.log(e?.message ?? String(e));
      }
      console.log("true  ---- -------- -- -");
    }
  }

  const productButton2 = await findProductBox(page);
   if (productButton2 === null) {
    console.log("❌ Could not find product box");
    if(noPopUp){
      return await main(url, size);
    }
    else{
      await context.close();

      return;
    }
    
  }
  let price;
  let imageUrl = null;
  const productBox = await climbToProductBox(productButton2, productTitle);
  if (productBox !== null) {
    imageUrl = await getProductImageUrl(productBox);
    price =  await findMoney(productBox);
  }
  await context.close();
  if (price === undefined) {
    console.log("❌ Could not find price");
    return;
  }
  //price found
  return {price, productTitle, imageUrl };

}


async function waitForAddText(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const normalize = (s: any) => ((s || "") as string).toLowerCase();
      const ACTION_WORDS = ["add"];
      const OBJECT_WORDS = ["cart", "bag", "basket", "trolley", "wishlist"];

      const selector =
        "button, a, input[type=submit], input[type=button], [role=button], [role=link]";

      const hasAddButton = Array.from(
        document.querySelectorAll(selector)
      ).some((el) => {
        const raw = normalize(
          (el as HTMLElement).textContent ||
            (el as HTMLInputElement).value ||
            ""
        );
        const tokens = raw
          .split(/[^a-z0-9]+/)
          .filter(Boolean)
          .map((t) => t.toLowerCase());
        if (!tokens.length) return false;

        const set = new Set(tokens);
        const hasAction = ACTION_WORDS.some((w) => set.has(w));
        const hasObject = OBJECT_WORDS.some((w) => set.has(w));

        return hasAction && hasObject;
      });

      return hasAddButton;
    },
    null,
    { timeout: 4000 }
  );
}


async function findProductBox(page: Page): Promise<Locator | null> {
  const buttons = page.locator(
    "button, a, input[type=submit], input[type=button], [role=button], [role=link]"
  );

  const keyWords = ["basket", "wishlist", "bag", "trolley", "cart"];

  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);

    const inNav = await button.evaluate(
      (el) => !!(el as HTMLElement).closest("header, footer, nav")
    );
    if (inNav) continue;

    const word = await button.evaluate((el) =>
      ((el as HTMLElement).innerText || "").toLowerCase().trim()
    );

    const hasAdd = word.includes("add");
    const hasObject = keyWords.some((kw) => word.includes(kw));

    if (hasAdd && hasObject) {
      return button;
    }
  }
  return null;
}


async function selectSizeDropdown(
  page: Page,
  userSize: string
): Promise<boolean> {
  const wanted = userSize.toLowerCase().trim();

  const selects = page.locator("select");
  const count = await selects.count();

  for (let i = 0; i < count; i++) {
    const sel = selects.nth(i);

    const name = (await sel.getAttribute("name")) ?? "";
    const id = (await sel.getAttribute("id")) ?? "";
    const cls = (await sel.getAttribute("class")) ?? "";

    const meta = `${name} ${id} ${cls}`.toLowerCase();
    if (!meta.includes("size")) continue;

    const optionLoc = sel.locator("option");
    const optionCount = await optionLoc.count();
    for (let j = 0; j < optionCount; j++) {
      const opt = optionLoc.nth(j);
      const label = (await opt.innerText()).trim();
      if (label.toLowerCase() === wanted) {
        await sel.selectOption({ label });
        console.log("Selected dropdown size: " + label);
        return true;
      }
    }
  }

  return false;
}


async function selectSizeButton(page: Page, sizes: string[]): Promise<boolean> {
  await page.waitForSelector(
    "[role=radio]:visible, [role=option]:visible, button:visible",
    { timeout: 8000 }
  );

  const normalizedSizes = sizes.map((s) => s.toLowerCase().trim());

  const clickables = page.locator(
    "button, [role=button], [role=option], [role=radio], input[type=radio] + label, label"
  );
  const count = await clickables.count();

  for (let i = 0; i < count; i++) {
    const el = clickables.nth(i);

    let text = "";
    try {
      text = (await el.innerText()).trim();
    } catch {
      continue;
    }
    if (!text) continue;

    const lower = text.toLowerCase();

    if (lower.length > 10) continue;

    if (normalizedSizes.includes(lower)) {
      const visible = await el.isVisible();
      if (!visible) continue;

      console.log("Selected dropdown size: " + (await el.getAttribute("class")));
      console.log("----");
      console.log("Clicking size button: " + lower);

      await el.click({ force: true });
      return true;
    }
  }

  return false;
}

async function climbToProductBox(
  start: Locator,
  title: string
): Promise<Locator | null> {
  let cur: Locator = start;

  for (let i = 0; i < 15; i++) {
    const parent = cur.locator("xpath=..");
    const parentCount = await parent.count();
    if (parentCount === 0) break;
    cur = parent;

    const allText = (await cur.innerText()).toLowerCase();

    const hasPrice = allText.includes("$");
    const hasSize =
      allText.includes("size") ||
      /\b(xs|s|m|l|xl|xxl)\b/.test(allText) ||
      /\b(28|30|32|34|36|38)\b/.test(allText);

    if (hasPrice) {
      console.log("has price");
    }

    let checkTitle = false;

    const titles = cur.locator(
      "h1, h2, h3, h4, div, .product-title, [itemprop=name]"
    );
    const tCount = await titles.count();
    for (let j = 0; j < tCount; j++) {
      const tLoc = titles.nth(j);
      const t = (await tLoc.innerText()).toLowerCase().trim();
      if (t && compareTitle(title, t)) {
        checkTitle = true;
        console.log("matched title: " + t);
        break;
      }
    }

    if (hasPrice && checkTitle) {
      console.log("Found product box: " + await cur.getAttribute("class"));
      return cur;
    }
  }

  return null;
}

function normalize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2);   // remove "of", "in", "us", etc
}
function compareTitle(a: string, b: string): boolean {
  const wa = normalize(a);
  const wb = normalize(b);

  const setB = new Set(wb);

  let common = 0;
  for (const w of wa) {
    if (setB.has(w)) common++;
  }

  const similarity = common / Math.min(wa.length, wb.length);

  return similarity >= 0.6; // 60% of words must match
}

async function findMoney(start: Locator): Promise<Number | undefined> {
  const priceCandidates = start.locator("span, div, p");
  const moneyPattern = /\$\s*\d+[.,]?\d*/;
  const percentPattern = /-?(100|[0-9]{1,2})\s*%/;

  let sale = false;
  const values: number[] = [];

  const count = await priceCandidates.count();
  for (let i = 0; i < count; i++) {
    if (values.length >= 2) break;

    const candidate = priceCandidates.nth(i);

    const text = await candidate.evaluate(
      (el) => ((el as HTMLElement).innerText || "").toLowerCase()
    );

    const percMatch = text.match(percentPattern);
    if (percMatch) {
      sale = true;
    }

    const moneyMatch = text.match(moneyPattern);
    if (!moneyMatch) continue;

    const priceText = moneyMatch[0];
    console.log(priceText);

    const numericPart = priceText.split("$")[1] ?? "";
    const price = parseFloat(numericPart.replace(",", "")); // close enough

    if (!values.includes(price)) {
      values.push(Number(price));
    }

    const struck = await isStruckOut(candidate);

    if (struck) {
      console.log("OLD price: " + priceText);
    } else {
      console.log("CURRENT price: " + priceText);
    }
  }

  if (values.length === 0) {
    console.log("No price found.");
    return;
  }

  if (sale) {
    console.log("here" + JSON.stringify(values));
    const actual = values.length > 0 ? values.reduce((min, v) => (v < min ? v : min), values[0]) : 0;
    console.log("Actual Price :" + actual);
  } else {
    console.log("Actual price: " + values[0]);
  }
  return values[0];
}

async function isStruckOut(el: Locator): Promise<boolean> {
  return await el.evaluate(`
    (node) => {
      function hasStrike(n) {
        const cs = getComputedStyle(n);
        if (
          (cs.textDecorationLine && cs.textDecorationLine.includes("line-through")) ||
          (cs.textDecoration && cs.textDecoration.includes("line-through"))
        ) return true;

        for (const child of n.children) {
          if (hasStrike(child)) return true;
        }
        return false;
      }

      if (hasStrike(node)) return true;

      const cls = (node.className || "").toString().toLowerCase();
      return /(old|was|strike|original)/.test(cls);
    }
  `);
}

async function getProductImageUrl(start: Locator): Promise<String | null> {
  let largestImg = 0;
  let largestImgUrl = null;
  let container = start;
  console.log("Getting product image..." + await start.getAttribute("class"));
  for(let i=0; i<3; i++){
    container = container.locator("..");
    const possibleImgs = container.locator("img");
    const count = await possibleImgs.count();
    for(let j=0; j<count; j++){
      const img = possibleImgs.nth(j);
      const rect = await img.boundingBox();
      if(rect === null){ 
        continue;
      }
      if(rect.width < 120 || rect.height < 120){
        continue;
      }
      if(rect.width * rect.height > largestImg){
        largestImg = rect.width * rect.height;
        largestImgUrl = await img.getAttribute("src");
      }
      
    };
    if(largestImgUrl !== null){
        console.log("Found image url: " + largestImgUrl);
        return largestImgUrl;
      }
  }
  return null;

}

export default main;