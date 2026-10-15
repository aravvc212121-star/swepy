const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  const data = await page.evaluate(() => {
    const hero = document.querySelector('.home-wash');
    const heroRect = hero ? hero.getBoundingClientRect() : null;
    const cards = hero ? hero.querySelector('.grid.grid-cols-2') : null;
    const cardsRect = cards ? cards.getBoundingClientRect() : null;
    const diyasDiv = document.querySelector('img[src*="diyas.png"]')?.closest('div[style*="position: absolute"]');
    const chipDiv = Array.from(document.querySelectorAll('div[style*="position: absolute"]')).find(d => d.textContent.includes('Happy Diwali'));
    const tagline = hero ? Array.from(hero.querySelectorAll('p')).find(p => p.textContent.includes('Book, they clean')) : null;
    const taglineRect = tagline ? tagline.getBoundingClientRect() : null;
    const heading = hero ? hero.querySelector('h3') : null;
    const headingRect = heading ? heading.getBoundingClientRect() : null;

    return {
      heroRect: heroRect ? { top: heroRect.top, height: heroRect.height } : null,
      cardsRect: cardsRect ? { top: cardsRect.top, relativeTop: cardsRect.top - (heroRect ? heroRect.top : 0) } : null,
      headingRect: headingRect ? { top: headingRect.top, relativeTop: headingRect.top - (heroRect ? heroRect.top : 0), height: headingRect.height } : null,
      taglineRect: taglineRect ? { top: taglineRect.top, relativeTop: taglineRect.top - (heroRect ? heroRect.top : 0), height: taglineRect.height } : null,
      diyasDivStyleTop: diyasDiv ? diyasDiv.style.top : null,
      diyasDivRect: diyasDiv ? { top: diyasDiv.getBoundingClientRect().top, relativeTop: diyasDiv.getBoundingClientRect().top - (heroRect ? heroRect.top : 0), bottom: diyasDiv.getBoundingClientRect().bottom } : null,
      chipDivStyleTop: chipDiv ? chipDiv.style.top : null,
      chipDivRect: chipDiv ? { top: chipDiv.getBoundingClientRect().top, relativeTop: chipDiv.getBoundingClientRect().top - (heroRect ? heroRect.top : 0), bottom: chipDiv.getBoundingClientRect().bottom } : null,
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
