const axios = require('axios');

module.exports = async (req, res) => {
  const { source, symbol } = req.query;
  const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
  const tiingoKey = process.env.TIINGO_API_KEY;

  async function fetchAlphaVantageData() {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${alphaVantageKey}`;
    const response = await axios.get(url);
    const data = response.data;

    if (data['Time Series (Daily)']) {
      const timeSeries = data['Time Series (Daily)'];
      const dates = Object.keys(timeSeries).sort().reverse().slice(0, 30);
      const prices = dates.map(date => parseFloat(timeSeries[date]['4. close']));

      return {
        dates: dates,
        prices: prices,
        source: 'Alpha Vantage'
      };
    } else {
      throw new Error('Alpha Vantage data not available');
    }
  }

  async function fetchTiingoData() {
    const url = `https://api.tiingo.com/tiingo/daily/${symbol}/prices`;
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${tiingoKey}`
      }
    });

    const data = response.data;
    if (data && data.length > 0) {
      const dates = data.slice(0, 30).map(item => new Date(item.date).toLocaleDateString()).reverse();
      const prices = data.slice(0, 30).map(item => item.close).reverse();

      return {
        dates: dates,
        prices: prices,
        source: 'Tiingo'
      };
    } else {
      throw new Error('Tiingo data not available');
    }
  }

  try {
    let data;
    if (source === 'alphavantage') {
      data = await fetchAlphaVantageData();
    } else if (source === 'tiingo') {
      data = await fetchTiingoData();
    } else {
      try {
        data = await fetchAlphaVantageData();
      } catch (error) {
        console.error('Alpha Vantage failed, trying Tiingo');
        data = await fetchTiingoData();
      }
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
};
