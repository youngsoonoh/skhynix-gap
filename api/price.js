export default async function handler(req, res) {
  try {
    const headers = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // 1. 하이닉스 KRX - 이건 기존 셀렉터 됨
    const krHtml = await fetch('https://finance.naver.com/item/main.naver?code=000660', { headers }).then(r => r.text());
    const krPrice = parseInt(krHtml.match(/<em class="no_today">.*?(\d{1,3}(,\d{3})*)<\/em>/)?.[1]?.replace(/,/g, ''));

    // 2. 하이닉스 ADR - JSON에서 추출
    const adrHtml = await fetch('https://stock.naver.com/worldstock/stock/SKHYV.O/price', { headers }).then(r => r.text());
    const adrMatch = adrHtml.match(/"closePrice":"([\d.]+)"/);
    const adrPrice = parseFloat(adrMatch?.[1]);

    // 3. 환율 - JSON API 직접 호출
    const fxRes = await fetch('https://m.stock.naver.com/api/marketindex/exchange/FX_USDKRW', { headers });
    const fxData = await fxRes.json();
    const usdKrw = parseFloat(fxData.exchangeInfo.dealPrice);

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