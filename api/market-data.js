const fetch = require('node-fetch');

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const TIINGO_API_KEY = process.env.TIINGO_API_KEY;

async function fetchAlphaVantageData(symbol) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data['Time Series (Daily)']) {
        const timeSeries = data['Time Series (Daily)'];
        const dates = Object.keys(timeSeries).sort().reverse().slice(0, 30);
        const prices = dates.map(date => parseFloat(timeSeries[date]['4. close']));

        return {
            dates: dates,
            prices: prices,
            latestPrice: prices[0],
            previousPrice: prices[1],
            source: 'Alpha Vantage'
        };
    } else {
        throw new Error('Alpha Vantage data not available');
    }
}

async function fetchTiingoData(symbol) {
    const url = `https://api.tiingo.com/tiingo/daily/${symbol}/prices`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${TIINGO_API_KEY}`
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
        const dates = data.slice(0, 30).map(item => item.date);
        const prices = data.slice(0, 30).map(item => item.close);
        return {
            dates: dates,
            prices: prices,
            latestPrice: prices[0],
            previousPrice: prices[1],
            source: 'Tiingo'
        };
    } else {
        throw new Error('Tiingo data not available');
    }
}

module.exports = async (req, res) => {
    const { symbol, source } = req.query;

    try {
        let data;
        if (source === 'alpha-vantage' || !source) {
            data = await fetchAlphaVantageData(symbol);
        } else if (source === 'tiingo') {
            data = await fetchTiingoData(symbol);
        } else {
            try {
                data = await fetchAlphaVantageData(symbol);
            } catch (error) {
                console.error(`Alpha Vantage failed for ${symbol}, trying Tiingo`);
                data = await fetchTiingoData(symbol);
            }
        }

        res.status(200).json(data);
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        res.status(500).json({ error: 'Error fetching market data' });
    }
};
