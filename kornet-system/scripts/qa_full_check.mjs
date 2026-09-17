import puppeteer from 'puppeteer';

(async () => {
  console.log('--- Starting Comprehensive End-to-End QA Check for Kornet Express ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => pageErrors.push(`[Page Error] ${err.toString()}`));

  try {
    // 1. Root & Login
    console.log('[Step 1] Visiting http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log('Current URL:', page.url());

    if (page.url().includes('/login')) {
      console.log('Filling login credentials...');
      await page.type('#username', 'admin');
      await page.type('#password', 'kornet2000');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
      ]);
      console.log('Authenticated URL:', page.url());
    }

    // 2. Logistics Ocean Freight & Auto Bridge Check
    console.log('[Step 2] Visiting /logistics (Ocean Freight)...');
    await page.goto('http://localhost:3000/logistics', { waitUntil: 'networkidle0' });

    // Look for Auto-FS Check button
    const autoFsBtn = await page.waitForSelector('button ::-p-text(Auto-FS Check)', { timeout: 6000 }).catch(() => null);
    if (autoFsBtn) {
      console.log('Found "Auto-FS Check" button! Triggering automated check generation...');
      await autoFsBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      console.log('Triggered Auto-FS Check!');
    } else {
      console.log('Note: "Auto-FS Check" button not immediately visible on initial tab, checking Accounting Bridge...');
    }

    // 3. Accounting Bridge View
    console.log('[Step 3] Checking Accounting Bridge tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, a'));
      const bridgeTab = tabs.find(t => t.textContent && t.textContent.includes('Accounting Bridge'));
      if (bridgeTab) bridgeTab.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // 4. Financial Statements - Voucher Entry
    console.log('[Step 4] Visiting /fs/voucher...');
    await page.goto('http://localhost:3000/fs/voucher', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    const voucherContent = await page.evaluate(() => document.body.innerText);
    const hasVouchers = voucherContent.includes('Cash Disbursement') || voucherContent.includes('CDV') || voucherContent.includes('Voucher');
    console.log('Voucher page content loaded successfully. Contains CDV terms:', hasVouchers);

    // 5. Financial Statements - Trial Balance
    console.log('[Step 5] Visiting /fs/reports/trial-balance...');
    await page.goto('http://localhost:3000/fs/reports/trial-balance', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // 6. Financial Statements - Balance Sheet
    console.log('[Step 6] Visiting /fs/reports/balance-sheet...');
    await page.goto('http://localhost:3000/fs/reports/balance-sheet', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // 7. Check for unhandled exceptions or major crashes
    console.log('--- QA Test Run Complete ---');
    console.log('Total console/page error logs collected:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.log('Collected Errors:', pageErrors.slice(0, 10));
    } else {
      console.log('✨ 100% CLEAN RUN: Zero page/console errors encountered!');
    }

  } catch (err) {
    console.error('QA Test execution failed with error:', err);
  } finally {
    await browser.close();
  }
})();
