import { test, expect } from '@playwright/test';

test('Diagnostic test for admin page', async ({ page }) => {
  console.log('Navigating to /admin...');
  await page.goto('/admin');
  
  console.log('Waiting for network idle...');
  await page.waitForLoadState('networkidle');
  
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());
  
  const pageContent = await page.content();
  console.log('First 1000 characters of page content:');
  console.log(pageContent.substring(0, 1000));
  
  const bodyText = await page.textContent('body');
  console.log('First 500 characters of body text:');
  console.log(bodyText?.substring(0, 500));
  
  const allText = await page.locator('body').textContent();
  console.log('Searching for keywords in page...');
  
  const keywords = ['JARVIS', 'Command', 'Center', 'Admin', 'Dashboard', 'Chat', 'Input'];
  
  for (const keyword of keywords) {
    const hasKeyword = allText?.includes(keyword) || false;
    console.log(`Keyword "${keyword}": ${hasKeyword ? 'FOUND' : 'NOT FOUND'}`);
  }
  
  await page.screenshot({ path: 'diagnostic-screenshot.png', fullPage: true });
  console.log('Screenshot saved as diagnostic-screenshot.png');
});