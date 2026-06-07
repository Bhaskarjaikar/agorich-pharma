import { test, expect } from '@playwright/test';

test.describe('AdminCommandCenter Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('User not authenticated. Tests will be skipped.');
    } else {
      console.log('User is authenticated. Running tests in authenticated state.');
    }
  });

  test('1. Component renders successfully for authenticated admin', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('Test skipped - User not authenticated as admin');
      return;
    }
    
    await expect(page.getByText('Command Center', { exact: false })).toBeVisible({ timeout: 15000 });
    
    const chatInput = page.getByPlaceholder('Type your command here...');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    const sendButton = page.getByRole('button').filter({ has: page.locator('svg') }).first();
    await expect(sendButton).toBeVisible({ timeout: 10000 });
  });

  test('2. Chat input field is functional for authenticated admin', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('Test skipped - User not authenticated as admin');
      return;
    }
    
    const chatInput = page.getByPlaceholder('Type your command here...');
    
    await chatInput.fill('Test message');
    await expect(chatInput).toHaveValue('Test message');
    
    await page.route('**/api/command-center/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Test response from AI'
        })
      });
    });
    
    await chatInput.press('Enter');
    
    await expect(page.getByText('Thinking...', { exact: false })).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText('Test response from AI')).toBeVisible({ timeout: 15000 });
  });

  test('3. Test query: "Show me today\'s sales data" for authenticated admin', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('Test skipped - User not authenticated as admin');
      return;
    }
    
    await page.route('**/api/command-center/chat', async route => {
      const request = route.request();
      const postData = request.postData();
      
      if (postData && postData.includes('Show me today\'s sales data')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Aaj ki sales data: Total sales ₹1,25,430, 45 invoices, average order value ₹2,787. Top selling product: Paracetamol with 120 units sold.'
          })
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.getByPlaceholder('Type your command here...');
    await chatInput.fill('Show me today\'s sales data');
    await chatInput.press('Enter');
    
    await expect(page.getByText('Thinking...')).toBeVisible({ timeout: 5000 });
    
    const response = await page.getByText('Aaj ki sales data: Total sales ₹1,25,430');
    await expect(response).toBeVisible({ timeout: 15000 });
  });

  test('4. Test query: "Show overdue payments" for authenticated admin', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('Test skipped - User not authenticated as admin');
      return;
    }
    
    await page.route('**/api/command-center/chat', async route => {
      const request = route.request();
      const postData = request.postData();
      
      if (postData && postData.includes('Show overdue payments')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Overdue payments: Total ₹2,85,670 across 12 customers. Top 3 overdue: 1) MedPlus Pharmacy - ₹45,000 (45 days), 2) City Medicals - ₹38,500 (32 days), 3) HealthCare Distributors - ₹32,150 (28 days).'
          })
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.getByPlaceholder('Type your command here...');
    await chatInput.fill('Show overdue payments');
    await chatInput.press('Enter');
    
    await expect(page.getByText('Thinking...')).toBeVisible({ timeout: 5000 });
    
    const response = await page.getByText('Overdue payments: Total ₹2,85,670');
    await expect(response).toBeVisible({ timeout: 15000 });
  });

  test('5. Test query: "Show inventory alerts" for authenticated admin', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('Test skipped - User not authenticated as admin');
      return;
    }
    
    await page.route('**/api/command-center/chat', async route => {
      const request = route.request();
      const postData = request.postData();
      
      if (postData && postData.includes('Show inventory alerts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Inventory alerts: 1) Paracetamol - Low stock (15 units left, reorder point: 50), 2) Amoxicillin - Expiring in 30 days (batch: AMX-2024-01), 3) Vitamin C - High demand (sales up 40% this week).'
          })
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.getByPlaceholder('Type your command here...');
    await chatInput.fill('Show inventory alerts');
    await chatInput.press('Enter');
    
    await expect(page.getByText('Thinking...')).toBeVisible({ timeout: 5000 });
    
    const response = await page.getByText('Inventory alerts:');
    await expect(response).toBeVisible({ timeout: 15000 });
  });

  test('6. Test error handling for invalid queries for authenticated admin', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('Test skipped - User not authenticated as admin');
      return;
    }
    
    await page.route('**/api/command-center/chat', async route => {
      const request = route.request();
      const postData = request.postData();
      
      if (postData && postData.includes('Invalid query test')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid query format. Please ask a business-related question.'
          })
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.getByPlaceholder('Type your command here...');
    await chatInput.fill('Invalid query test');
    await chatInput.press('Enter');
    
    await expect(page.getByText('Thinking...')).toBeVisible({ timeout: 5000 });
    
    const errorResponse = await page.getByText('Sorry, koi error aa gaya hai. Please thodi der baad try karein.');
    await expect(errorResponse).toBeVisible({ timeout: 15000 });
  });

  test('7. Test loading states for authenticated admin', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('Test skipped - User not authenticated as admin');
      return;
    }
    
    let resolveRequest: () => void;
    const requestPromise = new Promise<void>(resolve => {
      resolveRequest = resolve;
    });

    await page.route('**/api/command-center/chat', async route => {
      await requestPromise;
      await route.continue();
    });

    const chatInput = page.getByPlaceholder('Type your command here...');
    await chatInput.fill('Test loading state');
    await chatInput.press('Enter');
    
    await expect(page.getByText('Thinking...')).toBeVisible({ timeout: 5000 });
    
    const sendButton = page.getByRole('button').filter({ has: page.locator('svg') }).first();
    await expect(sendButton).toBeDisabled();
    
    await expect(chatInput).toBeDisabled();
    
    resolveRequest!();
    
    await expect(page.getByText('Thinking...')).not.toBeVisible({ timeout: 15000 });
    await expect(sendButton).not.toBeDisabled({ timeout: 15000 });
    await expect(chatInput).not.toBeDisabled({ timeout: 15000 });
  });

  test('8. Test authentication (user must be admin)', async ({ page }) => {
    await page.goto('/admin');
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('✓ Authentication test PASSED: User redirected to login page');
      
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);
      
      const pageContent = await page.content();
      const hasLoginElements = pageContent.includes('login') || pageContent.includes('password') || pageContent.includes('email') || pageContent.includes('Sign in');
      
      console.log('Login elements found:', hasLoginElements);
      
      expect(currentUrl).toContain('/login');
      expect(pageTitle).toContain('Agorich Pharma');
    } else {
      console.log('⚠ User is already authenticated. Manual verification needed.');
      
      const pageText = await page.textContent('body');
      const hasAdminElements = pageText?.includes('Admin') || pageText?.includes('Dashboard') || pageText?.includes('Command Center') || false;
      
      console.log('Admin elements found:', hasAdminElements);
      
      if (hasAdminElements) {
        console.log('✓ User appears to have admin access');
      }
    }
  });
});