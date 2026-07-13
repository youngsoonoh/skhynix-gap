import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    // 1. 하이닉스 한국 주가 - 네이버 금융
    const krRes = await fetch('https://finance.naver.com/item/main.naver?code=000660', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const krHtml = await krRes.text();
    const $kr = cheerio.load(krHtml);
    const krPrice = parseInt($kr('.no_today .blind').first().text().replace(/,/g, ''));

    // 2. 하이닉스 ADR - 네가 준 주소
    const adrRes = await fetch('https://stock.naver.com/worldstock/stock/SKHYV.O/price', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const adrHtml = await adrRes.text();
    const $adr = cheerio.load(adrHtml);
    // 네이버 세계주식은 .now_price .num 이 현재가
    const adrPrice = parseFloat($adr('.now_price .num').text().replace(/,/g, ''));

    // 3. 환율 USD/KRW - 네이버 시장지표
    const fxRes = await fetch('https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const fxHtml = await fxRes.text();
    const $fx = cheerio.load(fxHtml);
    const usdKrw = parseFloat($fx('.tbl_exchange .blind').first().text().replace(/,/g, ''));

    // 4. 계산
    if (!krPrice || !adrPrice || !usdKrw) throw new Error('Parsing failed');
    
    const adrRatio = 10; // ADR 1주 = 원주 10주
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