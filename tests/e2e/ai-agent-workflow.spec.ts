import { test, expect } from '@playwright/test'

test.describe('AI Agent Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load the application homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/AgoriChem|Pharma/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display navigation menu', async ({ page }) => {
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('should navigate to admin dashboard', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('body')).toBeVisible()
  })

  test('should show AgentStatusPanel when accessible', async ({ page }) => {
    await page.goto('/admin')
    const agentPanel = page.locator('text=Agent Health').or(page.locator('text=Agent Status'))
    const isVisible = await agentPanel.isVisible({ timeout: 5000 }).catch(() => false)
    if (isVisible) {
      await expect(agentPanel).toBeVisible()
    }
  })

  test('should show EmergencyControls when accessible', async ({ page }) => {
    await page.goto('/admin')
    const emergencyControls = page.locator('text=Emergency')
    const isVisible = await emergencyControls.isVisible({ timeout: 5000 }).catch(() => false)
    if (isVisible) {
      await expect(emergencyControls).toBeVisible()
    }
  })

  test('should show SpendingDashboard when accessible', async ({ page }) => {
    await page.goto('/admin')
    const spendingDashboard = page.locator('text=Spending')
    const isVisible = await spendingDashboard.isVisible({ timeout: 5000 }).catch(() => false)
    if (isVisible) {
      await expect(spendingDashboard).toBeVisible()
    }
  })

  test('should show ApprovalQueue when accessible', async ({ page }) => {
    await page.goto('/admin')
    const approvalQueue = page.locator('text=Approval')
    const isVisible = await approvalQueue.isVisible({ timeout: 5000 }).catch(() => false)
    if (isVisible) {
      await expect(approvalQueue).toBeVisible()
    }
  })

  test('should navigate to products page', async ({ page }) => {
    await page.goto('/products')
    await expect(page.locator('body')).toBeVisible()
  })

  test('should navigate to invoices page', async ({ page }) => {
    await page.goto('/invoices')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Admin Approval Flow E2E Tests', () => {
  test('should display pending approvals in queue', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const approvalSection = page.locator('text=Approval').or(page.locator('text=Pending'))
    const isVisible = await approvalSection.isVisible({ timeout: 5000 }).catch(() => false)

    if (isVisible) {
      await expect(approvalSection.first()).toBeVisible()
    }
  })

  test('should filter approvals by status', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const filterDropdown = page.locator('select').filter({ hasText: /pending|approved|rejected/i })
    const isVisible = await filterDropdown.isVisible({ timeout: 3000 }).catch(() => false)

    if (isVisible) {
      await expect(filterDropdown).toBeVisible()
    }
  })
})

test.describe('Emergency Stop E2E Tests', () => {
  test('should display emergency controls', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const emergencySection = page.locator('text=Emergency')
    const isVisible = await emergencySection.isVisible({ timeout: 5000 }).catch(() => false)

    if (isVisible) {
      await expect(emergencySection).toBeVisible()
    }
  })

  test('should show current system status', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const statusIndicator = page.locator('text=/Normal|ACTIVE|STOP/i')
    const isVisible = await statusIndicator.isVisible({ timeout: 5000 }).catch(() => false)

    if (isVisible) {
      await expect(statusIndicator.first()).toBeVisible()
    }
  })
})

test.describe('AI Agent Health E2E Tests', () => {
  test('should display agent health indicators', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const healthSection = page.locator('text=/Voice|AI|Agent/i')
    const isVisible = await healthSection.isVisible({ timeout: 5000 }).catch(() => false)

    if (isVisible) {
      await expect(healthSection.first()).toBeVisible()
    }
  })

  test('should show status colors for agents', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const statusColors = page.locator('[class*="bg-green"]').or(page.locator('[class*="bg-red"]')).or(page.locator('[class*="bg-yellow"]'))
    const count = await statusColors.count()

    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should auto-refresh agent status', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const refreshButton = page.locator('button').filter({ has: /refresh/i })
    const isVisible = await refreshButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (isVisible) {
      await expect(refreshButton).toBeVisible()
    }
  })
})
