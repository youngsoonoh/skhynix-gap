import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const debug = { krPrice: null, adrPrice: null, usdKrw: null };
  
  try {
    const headers = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9'
    };

    // 1. 하이닉스 KRX
    const krHtml = await fetch('https://finance.naver.com/item/main.naver?code=000660', { headers }).then(r => r.text());
    const $kr = cheerio.load(krHtml);
    debug.krPrice = $kr('.no_today .blind').first().text();
    const krPrice = parseInt(debug.krPrice.replace(/,/g, ''));

    // 2. 하이닉스 ADR 
    const adrHtml = await fetch('https://stock.naver.com/worldstock/stock/SKHYV.O/price', { headers }).then(r => r.text());
    const $adr = cheerio.load(adrHtml);
    // 네이버 세계주식은 여러 셀렉터 시도
    debug.adrPrice = $adr('.GraphMain_price__XcK2W').text() || $adr('.now_price .num').text() || $adr('strong.GraphMain_price__XcK2W').text();
    const adrPrice = parseFloat(debug.adrPrice.replace(/,/g, ''));

    // 3. 환율
    const fxHtml = await fetch('https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW', { headers }).then(r => r.text());
    const $fx = cheerio.load(fxHtml);
    debug.usdKrw = $fx('.tbl_exchange .blind').first().text() || $fx('.value').first().text();
    const usdKrw = parseFloat(debug.usdKrw.replace(/,/g, ''));

    if (!krPrice || !adrPrice || !usdKrw) {
      throw new Error(`Parsing failed. Debug: ${JSON.stringify(debug)}`);
    }
    
    const adrRatio = 10;
    const adrKRW = adrPrice * usdKrw / adrRatio;
    const gap = ((adrKRW - krPrice) / krPrice * 100).toFixed(2);

    res.status(200).json({
      krPrice, market: 'KRX', adrPrice: adrPrice.toFixed(2),
      usdKrw: usdKrw.toFixed(2), adrKRW: Math.round(adrKRW),
      gap, adrRatio: '10:1', updatedAt: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch data', 
      detail: error.message,
      debug 
    });
  }
}