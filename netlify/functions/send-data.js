// Send data to Adafruit IO (temperature or target-temperature)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    const ADAFRUIT_USERNAME = process.env.ADAFRUIT_USERNAME || "kasrajb";
    const ADAFRUIT_KEY = process.env.ADAFRUIT_IO_KEY;
    
    if (!ADAFRUIT_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }
    
    try {
        const { feed, value } = JSON.parse(event.body);
        
        if (!feed || value === undefined) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing feed or value' })
            };
        }
        
        const response = await fetch(
            `https://io.adafruit.com/api/v2/${ADAFRUIT_USERNAME}/feeds/${feed}/data`,
            {
                method: 'POST',
                headers: {
                    'X-AIO-Key': ADAFRUIT_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value: value.toString() })
            }
        );
        
        if (!response.ok) {
            throw new Error(`Adafruit API error: ${response.status}`);
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        console.error('Error sending data:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
