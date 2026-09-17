import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('response', (res) => {
    if (res.status() === 404) {
      console.log('404 URL:', res.url());
    }
  });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.type('#username', 'admin');
  await page.type('#password', 'kornet2000');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]')
  ]);

  await page.goto('http://localhost:3000/fs', { waitUntil: 'networkidle0' });
  await page.goto('http://localhost:3000/fs/reports/trial-balance', { waitUntil: 'networkidle0' });
  await browser.close();
})();
