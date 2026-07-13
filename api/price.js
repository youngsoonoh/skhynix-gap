export default async function handler(req, res) {
  try {
    const now = new Date();
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstMin = now.getUTCMinutes();
    const kstTime = kstHour * 100 + kstMin;

    // 09:00~15:30는 KRX, 나머지 08:00~20:00는 NXT
    const isKRX = kstTime >= 900 && kstTime <= 1530;
    const krUrl = isKRX
     ? 'https://api.stock.naver.com/stock/000660/basic'
      : 'https://api.stock.naver.com/stock/000660/nextrade';

    const [krRes, adrRes, fxRes] = await Promise.all([
      fetch(krUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/HXSCL'),
      fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd/krw.json')
    ]);

    const krData = await krRes.json();
    const adrData = await adrRes.json();
    const fxData = await fxRes.json();

    const krPrice = krData.closePrice;
    const adrPrice = adrData.chart.result[0].meta.regularMarketPrice;
    const usdKrw = fxData.krw;

    // ADR 10주 = 1주
    const adrKRW = adrPrice * 10 * usdKrw;
    const gap = ((adrKRW - krPrice) / krPrice) * 100;

    res.status(200).json({
      krPrice,
      market: isKRX? 'KRX' : 'NXT',
      adrPrice,
      usdKrw,
      adrKRW: Math.round(adrKRW),
      gap: gap.toFixed(2),
      adrRatio: '10:1',
      updatedAt: now.toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch data', detail: e.message });
  }
}