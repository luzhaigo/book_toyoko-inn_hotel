const puppeteer = require('puppeteer');
const initCssPath = require('./initCssPath');
const initDomTestingUtils = require('./initDomTestingUtils');

const isDebugging = () => (process.env.NODE_ENV === 'debug' ? { devtools: true, slowMo: 250 } : { headless: false });

const URL =
  'https://www.toyoko-inn.com/china/search/result?lcl_id=zh_TW&chck_in=2020/02/20&inn_date=1&rsrv_num=2&sel_ldgngPpl=2&sel_area=43&sel_area_txt=%E5%BE%B7%E5%B3%B6&sel_htl=00192&rd_smk=&sel_room_clss_Id=&sel_prkng=&sel_cnfrnc=&sel_hrtfll_room=&sel_whlchr=&sel_bath=&sel_rstrnt=&srch_key_word=&lttd=&lngtd=&pgn=1&sel_dtl_cndtn=&prcssng_dvsn=dtl&';

async function start() {
  const browser = await puppeteer.launch({
    ...isDebugging(),
    defaultViewport: {
      width: 1440,
      height: 708
    },
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const page = await browser.newPage();
  page.on('console', msg => console[msg.type()] && console[msg.type()](msg.text()));
  await page.goto(URL);

  await initDomTestingUtils(page);
  await initCssPath(page);

  let cssPath = await page.evaluate(() => {
    const tbodys = document.querySelectorAll('tbody.clubCardCell');

    for (let i = 0; i < tbodys.length; i++) {
      let tbody = tbodys[i];
      if (domTestingUtils.queryByText(tbody, '東橫INN俱樂部會員卡會員雙床房') !== null) {
        const bookButtons = domTestingUtils.queryAllByText(tbody, '預約');
        return window.cssPath(bookButtons[1], tbody);
      }
    }
  });

  // click 禁菸 預約
  await page.click(cssPath);

  await page.waitFor(1000);

  await initDomTestingUtils(page);
  await initCssPath(page);

  cssPath = await page.evaluate(() => {
    const rows = document.querySelectorAll('.colLayout-three');

    for (const row of rows) {
      if (domTestingUtils.queryByText(row, '東橫INN俱樂部會員') !== null) {
        const bookButton = domTestingUtils.queryByText(row, '預約');
        return window.cssPath(bookButton, row);
      }
    }
  });

  await page.click(cssPath);
}

start();
