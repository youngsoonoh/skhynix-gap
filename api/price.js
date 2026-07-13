import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    // 1. 하이닉스 KRX
    const krHtml = await fetch('https://finance.naver.com/item/main.naver?code=000660', { headers }).then(r => r.text());
    const $kr = cheerio.load(krHtml);
    const krPrice = parseInt($kr('.no_today .blind').first().text().replace(/,/g, ''));

    // 2. 하이닉스 ADR - 네가 준 주소
    const adrHtml = await fetch('https://stock.naver.com/worldstock/stock/SKHYV.O/price', { headers }).then(r => r.text());
    const $adr = cheerio.load(adrHtml);
    const adrPrice = parseFloat($adr('.now_price .num').text().replace(/,/g, ''));

    // 3. 환율
    const fxHtml = await fetch('https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW', { headers }).then(r => r.text());
    const $fx = cheerio.load(fxHtml);
    const usdKrw = parseFloat($fx('.tbl_exchange .blind').first().text().replace(/,/g, ''));

    if (!krPrice || !adrPrice || !usdKrw) throw new Error('Parsing failed');
    
    // 4. 계산
    const adrRatio = 10;
    const adrKRW = adrPrice * usdKrw / adrRatio;
    const gap = ((adrKRW - krPrice) / krPrice * 100).toFixed(2);

    res.status(200).json({
      krPrice,
      market: 'KRX',
      adrPrice: adrPrice.toFixed(2),
      usdKrw: usdKrw.toFixed(2),
      adrKRW: Math.round(adrKRW),
      gap,
      adrRatio: '10:1',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch data', 
      detail: error.message 
    });
  }
}