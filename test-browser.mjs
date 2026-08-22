import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    if (request.failure()) console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });
  
  await page.goto('http://localhost:3000/home', { waitUntil: 'networkidle0' }).catch(e => console.log('GOTO ERROR:', e));
  
  await browser.close();
})();
