import { chromium, type Page, type Locator } from "playwright";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config();


async function main(url: string, size: string, noPopUp: boolean = true): Promise< {price: Number, productTitle: String, imageUrl:String| null} | undefined> {


  //const extensionPath = path.resolve("extensions/ublock");
  const context = await chromium.launchPersistentContext(
  "/tmp/pw-profile", // ephemeral, fine
  {
    headless: false,
    args: [
      //`--disable-extensions-except=${extensionPath}`,
      //`--load-extension=${extensionPath}`,
      "--no-sandbox",
      "--disable-dev-shm-usage"
    ],
    viewport: { width: 1280, height: 800 }
  }
);


  const page = await context.newPage();
  
  await page.evaluate(() => {
   window.moveTo(-2000, 0);
  window.resizeTo(1280, 800);
  });

  await page.goto(url);
  await page.waitForLoadState();
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  //fs.writeFileSync("debug_body.html", bodyHTML, "utf-8");

  const productTitle = await page.title();


  let boxFound = false;
  let productButton1 = await findProductBox(page);
  

  if (productButton1 !== null) {
    boxFound = true;
  }
  let sizeSelected = false;
  if(!boxFound){
    sizeSelected = await selectSize(size, page);
   
   if(!sizeSelected){
    await selectButton(page);
    sizeSelected = await selectSize(size, page);
   }
    // try selecting size first
    if (sizeSelected) {
      try {
        console.log("waiting for add text");
        await page.waitForLoadState();
        //await waitForAddText(page);
        productButton1 = await findProductBox(page);
      } catch (e: any) {
        console.log(e?.message ?? String(e));
      }
      console.log("true  ---- -------- -- -");
    }
  }
  


   if (productButton1 === null) {
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
  const productBox = await climbToProductBox(productButton1, productTitle);
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

async function selectButton(page: Page): Promise<void> {
  const buttons  = page.locator(
    "button, a, input[type=submit], input[type=button], [role=button], [role=link]"
  );
  const keyWords = ["size", "sizes"]
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
     const inNav = await button.evaluate(
      (el) => !!(el as HTMLElement).closest("header, footer, nav")
    );
    if(inNav) continue;
    const word = button.innerText.toString().toLocaleLowerCase();
    if(keyWords.some((kw) => word.includes(kw))){
      await button.click();
    }
}
}

async function selectSize(size: string, page: Page): Promise<boolean> {
  let sizeSelected = false;
  console.log("Trying to select size..." + size);
  sizeSelected = await selectSizeButton(page, [size]);
  if(!sizeSelected){
    if(!await selectSizeRadio(page, size, "select")){
      sizeSelected = await selectSizeRadio(page, size, "ul");
    }else{
      sizeSelected = true;
    }
  }

  return sizeSelected;
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



export async function findProductBox(page: Page): Promise<Locator | null> {
  const buttons = page.locator(
    "button, a, input[type=submit], input[type=button], [role=button], [role=link]"
  );

  const keyWords = ["basket", "wishlist", "bag", "trolley", "cart"];
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);

    const inNav = await button.evaluate(el => !!el.closest("header, footer, nav"));
    if (inNav) continue;

    // ✅ robust name: aria-label > visible text > all text (incl visually-hidden)
    const name = await button.evaluate(el => {
      const aria = el.getAttribute("aria-label") || "";
      const title = el.getAttribute("title") || "";

      // innerText = visible text only
      const visible = (el as HTMLElement).innerText || "";

      // textContent = includes visually-hidden text
      const anyText = el.textContent || "";

      return (aria || title || visible || anyText).toLowerCase().trim();
    });

    console.log(name);

    if (name.includes("add") && keyWords.some(kw => name.includes(kw))) {
      console.log("Found product box button: ");
      return button;
    }

    if (name.includes("checkout") || name === "buy now") {
      console.log("Found product box button: ");
      return button;
    }
  }

  return null;
}

async function selectSizeRadio(page: Page, userSize: string, target: string): Promise<boolean> {

  const wanted = userSize.toLowerCase().trim();

  const selects = page.locator(target);
  const count = await selects.count();
  console.log(count + " select elements found");
  for (let i = 0; i < count; i++) {
    const sel = selects.nth(i);
    let name = "";
    let id = "";
    let cls = "";
    try{
      name = (await sel.getAttribute("name")) ?? "";
      id = (await sel.getAttribute("id")) ?? "";
      cls = (await sel.getAttribute("class")) ?? "";
    }catch(e){
      continue;
    }

    const meta = `${name} ${id} ${cls}`.toLowerCase();
    const hasSizeWord =
      meta.includes("size") ||
      meta.includes("sizes") ||
      meta.includes("sizing") ||
      meta.includes("option") ||
      meta.includes("variant") ||
      meta.includes("attribute") ||
      meta.includes("dimension") ||
      meta.includes("fit");

  const hasVariantWord =
    meta.includes("select") ||
    meta.includes("picker") ||
    meta.includes("choice") ||
    meta.includes("option") ||
    meta.includes("variant") ||
    meta.includes("dropdown") ||
    meta.includes("swatch") ||
    meta.includes("selector");

  if (!hasSizeWord && !hasVariantWord) continue;
  
  const ok = await selectSizeFromSelect(sel, wanted);
  if (ok) return true;

  // select failed → try UL
  const idx = await sel.getAttribute("data-index");

  let ul: Locator;
  if (idx) {
    ul = page.locator(`ul[data-index="${idx}"]`).first();
  } else {
    ul = sel.locator("xpath=following-sibling::ul[1]");
  }

  return await selectSizeFromUlOrLi(ul, wanted);
  return false
    };
  return false;
}

async function selectSizeFromUlOrLi(container: Locator, userSize: string): Promise<boolean> {

  // Look for li options inside the container (ul/li custom dropdown)
  const items = container.locator("li[data-value], li.item_option");
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const li = items.nth(i);
    const label = (await li.innerText()).trim().toLowerCase();

    if (label === userSize) {
      await li.click();
      console.log("Selected list size:", label);
      return true;
    }
  }
  return false;
}

async function selectSizeFromSelect(sel: Locator, userSize: string): Promise<boolean> {
  

  await sel.selectOption({ value: userSize }).catch(() => null);

  // verify selection worked
  const picked = await sel.inputValue().catch(() => "");
  if (picked === userSize) {
    console.log("Selected dropdown size:", userSize);
    return true;
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
    
    text = (await el.innerText()).trim();
    if (!text) continue;

    const lower = text.toLowerCase();
    if (lower.length > 10) continue;
    if (normalizedSizes.includes(lower)) {
      console.log("Attempting to select size: " + lower);
      const visible = await el.isVisible();
      console.log("Is visible: " + visible);
      if (!visible) continue;

      console.log("Selected dropdown size: " + (await el.getAttribute("class")));

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