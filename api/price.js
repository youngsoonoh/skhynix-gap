export default async function handler(req, res) {
  try {
    const headers = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // 1. 하이닉스 KRX
    const krHtml = await fetch('https://finance.naver.com/item/main.naver?code=000660', { headers }).then(r => r.text());
    const krPrice = parseInt(krHtml.match(/<em class="no_today">.*?(\d{1,3}(,\d{3})*)<\/em>/)?.[1]?.replace(/,/g, ''));

    // 2. 하이닉스 ADR
    const adrHtml = await fetch('https://stock.naver.com/worldstock/stock/SKHYV.O/price', { headers }).then(r => r.text());
    const adrMatch = adrHtml.match(/"closePrice":"([\d.]+)"/);
    const adrPrice = parseFloat(adrMatch?.[1]);

    // 3. 환율 - 네이버 금융 메인에서 긁어오기
    const fxHtml = await fetch('https://finance.naver.com/marketindex/', { headers }).then(r => r.text());
    const fxMatch = fxHtml.match(/USD\/KRW<\/span>[\s\S]*?<span class="value">([\d,.]+)<\/span>/);
    const usdKrw = parseFloat(fxMatch?.[1]?.replace(/,/g, ''));

    if (!krPrice ||!adrPrice ||!usdKrw) {
      throw new Error(`Parsing failed. kr:${krPrice}, adr:${adrPrice}, fx:${usdKrw}`);
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
      detail: error.message 
    });
  }
}