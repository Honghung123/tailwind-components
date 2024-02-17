import puppeteer from 'puppeteer';
import { getScrapers } from './scrapers';
import { promises as fs } from 'fs';
import _ from 'lodash';
import yargs from 'yargs';
import { updateComponenentsJson, generateMarkdown } from './generate';
import { CompomentLink } from './types';
import { resolve } from 'path';

/**
 * RESOURCES:
 * https://sira.riccox.com/docs/components/overview
 * https://tailadmin.com/#components
 * https://rewind-ui.dev/
 * https://github.com/bayfrontmedia/skin
 * https://horizon-ui.com/components
 * https://statichunt.com/tailwind-templates
 * https://taildashboards.com/
 * https://layoutsfortailwind.lalokalabs.dev/
 * https://dripui.vercel.app/
 * https://web3templates.com/components/all
 */

if (require.main?.filename === __filename) {
  program(yargs.argv as ProgramOptions);
}

type ProgramOptions = {
  only?: string;
  slowmo?: number;
  format?: string;
};

async function program(options?: ProgramOptions) {
  const browser = await puppeteer.launch({
    headless: process.env.CI ? true : false,
    slowMo: options?.slowmo,
    defaultViewport: null,
    args: ['--start-maximized'],
  });
  const [page] = await browser.pages();
  const scrapers = await getScrapers({ name: options?.only });
  const items: CompomentLink[] = [];
  for await (const [index, scraper] of scrapers.entries()) {
    let tryCount = 3;
    while (tryCount--) {
      process.stdout.write(
        `\nProgress: ${scraper.name} ${index + 1}/${scrapers.length} ...`,
      );
      try {
        let scraperItems = await scraper({ page });
        process.stdout.write(` +${scraperItems.length}`);
        items.push(...scraperItems);
        break;
      } catch (error) {
        console.error(error);
        console.log(`Tries left: ${tryCount}`);
      }
    }
    process.stdout.write(` Total: ${items.length}`);
  }
  await browser.close();
  switch (options?.format) {
    case 'markdown':
      {
        await generateMarkdown({ items });
        const content = await generateMarkdown({ items });
        await fs.writeFile('README.md', content);
      }
      break;
    default:
      await updateComponenentsJson({
        items,
        componentsJsonPath: resolve(process.cwd() + '/components.json'),
      });
  }
}
