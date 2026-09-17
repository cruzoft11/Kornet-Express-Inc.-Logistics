import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting Kornet Express QA check...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.toString()));

  // 1. Load Root / Login
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  console.log('Initial URL:', page.url());

  if (page.url().includes('/login')) {
    console.log('Submitting login form with admin / kornet2000...');
    await page.type('#username', 'admin');
    await page.type('#password', 'kornet2000');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    console.log('Post-login URL:', page.url());
  }

  // 2. QA Check: Logistics Suite
  console.log('Testing /logistics...');
  await page.goto('http://localhost:3000/logistics', { waitUntil: 'networkidle0' });
  const logiTitle = await page.title();
  console.log('Logistics Title:', logiTitle);

  // 3. QA Check: Financial Statements (FS) System
  console.log('Testing /fs Fiscal Narrative...');
  await page.goto('http://localhost:3000/fs', { waitUntil: 'networkidle0' });
  let redErrors = await page.$$eval(
    '.bg-red-500, .bg-red-100, .text-red-500, .bg-error-container',
    (els) => els.map((e) => e.textContent?.trim() || '').filter(Boolean)
  );
  console.log('/fs red errors found:', redErrors);

  // 4. QA Check: FS Trial Balance
  console.log('Testing /fs/reports/trial-balance...');
  await page.goto('http://localhost:3000/fs/reports/trial-balance', { waitUntil: 'networkidle0' });
  redErrors = await page.$$eval(
    '.bg-red-500, .bg-red-100, .text-red-500',
    (els) => els.map((e) => e.textContent?.trim() || '').filter(Boolean)
  );
  console.log('/fs/reports/trial-balance red errors found:', redErrors);

  // 5. QA Check: Nationwide Map
  console.log('Testing Map Navigation...');
  await page.goto('http://localhost:3000/logistics', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(
      (el) => el.textContent && el.textContent.includes('Inter-Island Hubs & Lanes')
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  console.log('Map view checked');

  await browser.close();
  console.log('Puppeteer QA Complete. Total JS/Page error count:', pageErrors.length);
  if (pageErrors.length > 0) {
    console.log('Sample errors:', pageErrors.slice(0, 5));
  }
})();
