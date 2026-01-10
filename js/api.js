const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQNjMSE06u5xO4dtyipa5P-YzoaicppubdwlUgMpaX4L4TUjk3-xY2PRnzhS42AxZe/exec";

// Fetch data from Google Script
export async function fetchData() {
    try {
        console.log('Fetching data from:', GOOGLE_SCRIPT_URL);
        
        // Add cache busting parameter
        const url = `${GOOGLE_SCRIPT_URL}?action=getData&t=${new Date().getTime()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            console.error('Network response not ok:', response.status, response.statusText);
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data fetched successfully');
        return data;
        
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

// Send data to Google Script
export async function sendData(payload) {
    try {
        console.log('Sending data:', payload.action);
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.error('Send response not ok:', response.status, response.statusText);
            throw new Error(`Send response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Send successful:', data);
        return data;
        
    } catch (error) {
        console.error('Send Error:', error);
        throw error;
    }
}
