// Get target temperature set by user
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const ADAFRUIT_USERNAME = process.env.ADAFRUIT_USERNAME || "kasrajb";
    const ADAFRUIT_KEY = process.env.ADAFRUIT_IO_KEY;
    
    if (!ADAFRUIT_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }
    
    try {
        const response = await fetch(
            `https://io.adafruit.com/api/v2/${ADAFRUIT_USERNAME}/feeds/target-temperature/data/last?X-AIO-Key=${ADAFRUIT_KEY}`
        );
        
        if (!response.ok) {
            // If feed doesn't exist (404), return default target temperature
            if (response.status === 404) {
                console.log('Target temperature feed not found, returning default: 180°C');
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        value: 180,
                        timestamp: new Date().toISOString(),
                        default: true
                    })
                };
            }
            throw new Error(`Adafruit API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                value: data.value,
                timestamp: data.created_at
            })
        };
    } catch (error) {
        console.error('Error fetching target:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
