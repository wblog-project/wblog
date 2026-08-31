import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

async function expectImageToKeepItsRatio(image: Locator) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => {
    const renderedImage = element as HTMLImageElement;
    return renderedImage.complete && renderedImage.naturalHeight > 0;
  })).toBe(true);
  const ratio = await image.evaluate((element) => {
    const renderedImage = element as HTMLImageElement;
    return {
      intrinsic: renderedImage.naturalWidth / renderedImage.naturalHeight,
      rendered: renderedImage.getBoundingClientRect().width / renderedImage.getBoundingClientRect().height,
    };
  });
  expect(Math.abs(ratio.rendered / ratio.intrinsic - 1)).toBeLessThan(0.01);
}

test('homepage is readable, responsive and accessible', async ({ page }, testInfo) => {
  await page.goto('/wblog/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  const dailyLifeImages = page.locator('.daily-panel .mini-gallery a');
  await expect(dailyLifeImages.first()).toHaveAttribute('href', /\/life\//);
  await expect(dailyLifeImages.first().locator('img')).toHaveAttribute('src', /.+/);
  await expect(page.locator('.bilibili-panel')).toBeVisible();
  await expect(page.locator('.bilibili-panel .activity-bilibili, .bilibili-panel .empty-state').first()).toBeVisible();
  await expect(page.locator('.github-panel .github-project').first()).toBeVisible();
  await expect(page.locator('.github-panel .activity-card')).toHaveCount(0);
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
  await page.locator('.post-card h2 a').first().click();
  await expectImageToKeepItsRatio(page.locator('.article-cover img'));
  await page.goto('/wblog/life/');
  await page.locator('.life-entry h2 a').first().click();
  await expectImageToKeepItsRatio(page.locator('.story-images img').first());
  await page.goto('/wblog/gallery/');
  await page.locator('.gallery-item a').first().click();
  const image = page.locator('[data-lightbox-trigger]').first();
  await expect(image).toBeVisible();
  await expectImageToKeepItsRatio(image.locator('img'));
  await image.click();
  await expect(page.locator('[data-lightbox]')).toHaveJSProperty('open', true);
  await expectImageToKeepItsRatio(page.locator('[data-lightbox-slide]:not([hidden]) img'));
});

test('VRChat is a first-class navigation destination with synced and empty states', async ({ page }) => {
  await page.goto('/wblog/vrchat/');
  await expect(page.locator('.vrchat-profile, .vrchat-empty')).toBeVisible();
  const vrchatLink = page.locator('#primary-navigation a[href="/wblog/vrchat"]');
  await expect(vrchatLink).toHaveAttribute('aria-current', 'page');
});
