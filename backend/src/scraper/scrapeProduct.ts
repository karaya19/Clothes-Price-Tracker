import { chromium, type Page, type Locator } from "playwright";

async function main(url: string, noPopUp: boolean = true): Promise< {price: Number, productTitle: String} | undefined> {
  const context = await chromium.launchPersistentContext(
    "C:/Users/araya/AppData/Local/PlaywrightEdgeProfile",
    {
      channel: "msedge",
      headless: noPopUp,
    }
  );

  const page = await context.newPage();

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
    const sizeSelected = await selectSizeButton(page, ["au 14"]);
    if (sizeSelected) {
      try {
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
      return await main(url, false);
    }
    else{
      await context.close();

      return;
    }
    
  }

  //if (!boxFound) {
    //await CloseCookiePopUps(page);
  //}
  let price;
  const productBox = await climbToProductBox(productButton2, productTitle);
  if (productBox !== null) {
    getProductImageUrl(productBox);
    price =  await findMoney(productBox);
  }
  await context.close();
  if (price === undefined) {
    console.log("❌ Could not find price");
    return;
  }
  //price found
  return {price, productTitle };

  //if(await findPopupBox(page)!==null){
   // console.log("----------------");

    //console.log("Popup detected" + await findPopupBox(page));
   // console.log("----------------");

  //}else{
    //console.log("No popup detected");
  //}

}

// ---------- waitForAddText ----------

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

// ---------- findProductBox ----------

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

// ---------- selectSizeDropdown (unused, but ported) ----------

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

// ---------- selectSizeButton ----------

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

// ---------- climbToProductBox ----------

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
        break;
      }
    }

    if (hasPrice && checkTitle) {
      return cur;
    }
  }

  return null;
}

// ---------- compareTitle ----------

function compareTitle(headerTitle: string, productTitle: string): boolean {
  headerTitle = headerTitle.trim().toLowerCase();
  productTitle = productTitle.trim().toLowerCase();
  return headerTitle.includes(productTitle);
}

// ---------- findMoney ----------

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

// ---------- CloseCookiePopUps ----------

async function CloseCookiePopUps(page: Page): Promise<boolean> {
  const buttons = page.locator(
    "button:not(:is(nav *, header *, footer *, aside *)), " +
      "a:not(:is(nav *, header *, footer *, aside *)), " +
      "[role=button]:not(:is(nav *, header *, footer *, aside *))"
  );

  const acceptWords = ["accept all", "accept", "agree", "allow", "consent"];

  for (const word of acceptWords) {
    console.log("yo");
    const btn = buttons.filter({ hasText: new RegExp(word, "i") });
    const count = await btn.count();
    if (count > 0 && (await btn.first().isVisible())) {
      console.log("Clicked cookie accept: " + word);
      await btn.first().click({ force: true });
      return true;
    }
  }

  const closeX = buttons.filter({
    hasText: new RegExp("close|×|x", "i"),
  });

  if ((await closeX.count()) > 0 && (await closeX.first().isVisible())) {
    console.log("Closed cookie banner via close button");
    await closeX.first().click({ force: true });
    return true;
  }

  console.log("No cookie popup handled");
  return false;
}
async function isInsideLayoutJunk(el: Locator) {
  // closest() runs in the page, so it's reliable
  return await el.evaluate((node) => {
    const bad = node.closest("header, nav, footer, aside");
    return !!bad;
  });
}


// ---------- PopupHelper.findPopupBox logic (ported) ----------

async function findPopupBox(page: Page): Promise<Locator | null> {
  const candidates = page.locator("div, section, form");
  const total = await candidates.count();
  console.log("hhhere");
  console.log(total);  

  if (total === 0) return null;

  const vp = page.viewportSize();
  const viewportWidth = vp?.width ?? 1200;
  const viewportHeight = vp?.height ?? 800;
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;
  const MIN_W = 260;
  const MIN_H = 120;


  let best: Locator | null = null;
  let bestScore = 0;
 
  //const limit = Math.min(total, 2000);

  for (let i = 0; i < total; i++) {
    const cand = candidates.nth(i);

    if( await isInsideLayoutJunk(cand)){
      continue;
    }
    let visible = false;
    try {
      visible = await cand.isVisible();
    } catch {
      continue;
    }
    if (!visible) continue;

    const box = await cand.boundingBox();
    if (!box) continue;
    const w = box.width;
    const h = box.height;
    const cx = box.x + w / 2;
    const cy = box.y + h / 2;
    
    console.log("----------------");

    if (w > viewportWidth * 0.95 || h > viewportHeight * 0.95) {
      continue;
    }
    if (w < MIN_W || h < MIN_H) continue;

    
    let position = "";
    try {
      position = await cand.evaluate(
        (el) => window.getComputedStyle(el as HTMLElement).position
      );
    } catch {
      position = "";
    }
    const posLower = position.toLowerCase();
    if (posLower !== "fixed" && posLower !== "absolute") {
      continue;
    }

    let score = 0;

    const role = await safeAttr(cand, "role");
    if (role && role.toLowerCase().includes("dialog")) {
      score += 3;
    }

    const ariaModal = await safeAttr(cand, "aria-modal");
    if (ariaModal && ariaModal.toLowerCase() === "true") {
      score += 2;
    }

    const testid = await safeAttr(cand, "data-testid");
    if (containsIgnoreCase(testid, "popup")) score += 2;

    const cls = await safeAttr(cand, "class");
    if (containsAnyIgnoreCase(cls, "popup", "modal", "dialog", "klaviyo", "lightbox")) {
      score += 1;
    }

    const buttons = cand.locator('button, [role="button"]');
    const buttonCount = await safeCount(buttons);
    if (buttonCount > 0) score += 1;

    const inputs = cand.locator("input, textarea, select");
    const inputCount = await safeCount(inputs);
    if (inputCount > 0) score += 1;

    const emailInputs = cand.locator('input[type="email"]');
    if ((await safeCount(emailInputs)) > 0) score += 2;

    const passwordInputs = cand.locator('input[type="password"]');
    if ((await safeCount(passwordInputs)) > 0) score += 2;

    const dx = Math.abs(cx - centerX) / viewportWidth;
    const dy = Math.abs(cy - centerY) / viewportHeight;
    if (dx < 0.25 && dy < 0.3) {
      score += 2;
    }

    const text = await safeInnerText(cand);
    if (
      text &&
      containsAnyIgnoreCase(
        text,
        "subscribe",
        "discount",
        "sign up",
        "sign-in",
        "sign in",
        "log in",
        "login",
        "email",
        "email address",
        "first name",
        "last name",
        "password"
      )
    ) {

      score += 3;
    }
    console.log( await cand.getAttribute("class") + "  " + w + " " + h);

    if (score === 0) continue;

    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  if (bestScore >= 3) {
        console.log( "best here---" + await best.getAttribute("class"));
    return best;

  }
  page.pause();
  return null;
}

// --- helpers for PopupHelper ---

async function safeAttr(loc: Locator, name: string): Promise<string | null> {
  try {
    return await loc.getAttribute(name);
  } catch {
    return null;
  }
}

async function safeInnerText(loc: Locator): Promise<string> {
  try {
    const val = await loc.evaluate(
      (el) => (el as HTMLElement).innerText || ""
    );
    return val ?? "";
  } catch {
    return "";
  }
}

function containsIgnoreCase(text: string | null, needle: string): boolean {
  if (!text || !needle) return false;
  return text.toLowerCase().includes(needle.toLowerCase());
}

function containsAnyIgnoreCase(
  text: string | null,
  ...needles: string[]
): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return needles.some((n) => n && lower.includes(n.toLowerCase()));
}

async function safeCount(loc: Locator): Promise<number> {
  try {
    return await loc.count();
  } catch {
    return 0;
  }
}

async function getProductImageUrl(start: Locator): Promise<string | null> {
  let largestImg = 0;
  let largestImgUrl = null;
  for(let i=0; i<3; i++){
    const container = start.locator("..");
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
// ---------- run main ----------

export default main;