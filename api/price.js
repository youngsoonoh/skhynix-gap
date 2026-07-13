export default async function handler(req, res) {
  try {
    // 1. 하이닉스 한국 주가
    const krRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/000660.KS?interval=1d&range=1d');
    const krText = await krRes.text();
    
    let krPrice = 0;
    try {
      const krData = JSON.parse(krText);
      krPrice = krData.chart.result[0].meta.regularMarketPrice;
    } catch (e) {
      throw new Error('KR stock fetch failed: ' + krText.slice(0, 100));
    }

    // 2. 하이닉스 ADR
    const adrRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/HXSCF?interval=1d&range=1d');
    const adrData = await adrRes.json();
    const adrPrice = adrData.chart.result[0].meta.regularMarketPrice;

    // 3. 환율 USD/KRW
    const fxRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d');
    const fxData = await fxRes.json();
    const usdKrw = fxData.chart.result[0].meta.regularMarketPrice;

    // 4. 계산
    const adrRatio = 10; // ADR 1주 = 원주 10주
    const adrKRW = adrPrice * usdKrw / adrRatio;
    const gap = ((adrKRW - krPrice) / krPrice * 100).toFixed(2);

    res.status(200).json({
      krPrice: Math.round(krPrice),
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