import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('homepage is readable, responsive and accessible', async ({ page }, testInfo) => {
  await page.goto('/wblog/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  const dailyLifeImages = page.locator('.daily-panel .mini-gallery a');
  await expect(dailyLifeImages.first()).toHaveAttribute('href', /\/life\//);
  await expect(dailyLifeImages.first().locator('img')).toHaveAttribute('src', /IMG_20260830/);
  await expect(page.locator('.bilibili-panel .activity-bilibili').first()).toBeVisible();
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
  await expect(page.locator('.post-card').first()).toBeVisible();
  await page.goto('/wblog/life/');
  await expect(page.locator('.life-entry').first()).toBeVisible();
  await page.goto('/wblog/gallery/');
  await page.locator('.gallery-item a').first().click();
  const image = page.locator('[data-lightbox-trigger]').first();
  await expect(image).toBeVisible();
  const detailRatio = await image.locator('img').evaluate((element) => {
    const galleryImage = element as HTMLImageElement;
    return {
      intrinsic: Number(galleryImage.getAttribute('width')) / Number(galleryImage.getAttribute('height')),
      rendered: galleryImage.getBoundingClientRect().width / galleryImage.getBoundingClientRect().height,
    };
  });
  expect(detailRatio.rendered).toBeCloseTo(detailRatio.intrinsic, 2);
  await image.click();
  await expect(page.locator('[data-lightbox]')).toHaveJSProperty('open', true);
  const lightboxRatio = await page.locator('[data-lightbox-slide]:not([hidden]) img').evaluate((element) => {
    const galleryImage = element as HTMLImageElement;
    return {
      intrinsic: Number(galleryImage.getAttribute('width')) / Number(galleryImage.getAttribute('height')),
      rendered: galleryImage.getBoundingClientRect().width / galleryImage.getBoundingClientRect().height,
    };
  });
  expect(lightboxRatio.rendered).toBeCloseTo(lightboxRatio.intrinsic, 2);
});

test('VRChat is a first-class navigation destination with a safe empty state', async ({ page }) => {
  await page.goto('/wblog/vrchat/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/VRChat/i);
  await expect(page.getByText('npm run wblog -- vrchat login')).toBeVisible();
  const vrchatLink = page.locator('#primary-navigation a[href="/wblog/vrchat"]');
  await expect(vrchatLink).toHaveAttribute('aria-current', 'page');
});
