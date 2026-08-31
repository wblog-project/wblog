import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('homepage is readable, responsive and accessible', async ({ page }, testInfo) => {
  await page.goto('/wblog/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  if (testInfo.project.name === 'mobile') {
    const menu = page.locator('[data-menu-button]');
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#primary-navigation')).toHaveAttribute('data-open', 'true');
  }
});

test('content routes and gallery lightbox work', async ({ page }) => {
  await page.goto('/wblog/blog/');
  await expect(page.locator('.post-card').first()).toBeVisible();
  await page.goto('/wblog/life/');
  await expect(page.locator('.life-entry').first()).toBeVisible();
  await page.goto('/wblog/gallery/');
  await page.locator('.gallery-item a').first().click();
  const image = page.locator('[data-lightbox-trigger]').first();
  await expect(image).toBeVisible();
  await image.click();
  await expect(page.locator('[data-lightbox]')).toHaveJSProperty('open', true);
});
