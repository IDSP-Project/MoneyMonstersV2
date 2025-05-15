const axios = require('axios');

function extractASIN(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/);
  return match ? match[1] : null;
}

async function fetchAmazonProductData(asin) {
  const apiKey = process.env.RAINFOREST_API_KEY;
  const url = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&amazon_domain=amazon.ca&asin=${asin}`;

  try {
    const response = await axios.get(url);
    const product = response.data.product;

    return {
      title: product.title,
      image: product.main_image,
      price: product.buybox_winner?.price?.value || 'Unavailable'
    };
  } catch (err) {
    console.error("Rainforest API error:", err.message);
    return {};
  }
}

module.exports = { extractASIN, fetchAmazonProductData };
