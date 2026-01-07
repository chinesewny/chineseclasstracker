// *** เปลี่ยน URL นี้เป็นของคุณ ***
const API_URL = 'https://script.google.com/macros/s/AKfycbwQNjMSE06u5xO4dtyipa5P-YzoaicppubdwlUgMpaX4L4TUjk3-xY2PRnzhS42AxZe/exec'; 

export async function fetchData() {
    try {
        const res = await fetch(`${API_URL}?action=getData`);
        if (!res.ok) throw new Error("Network Error");
        return await res.json();
    } catch (e) {
        console.error("Fetch Error", e);
        return null; // Return null กรณี Offline
    }
}

export async function sendData(payload) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (e) {
        console.error("Send Error", e);
        throw e;
    }
}
