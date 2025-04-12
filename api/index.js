const express = require('express');
const axios = require('axios');
const https = require('https');
const { createServer } = require('@vercel/node');

const app = express();

const httpsAgent = new https.Agent({
    rejectUnauthorized: true
});

app.get('/api', async (req, res) => {
    const key = req.query.key;
    if (!key) {
        return res.status(400).json({ error: 'No API key provided' });
    }

    try {
        const status = await fetchUrl("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch1.txt");

        if (status.includes("ON")) {
            await checkSecondaryStatus(res, key);
        } else if (status.includes("OFF")) {
            res.status(503).json({ message: "MAINTENANCE" });
        } else {
            res.status(500).json({ message: "Something went wrong." });
        }
    } catch (error) {
        res.status(500).json({ error: "An error occurred", details: error.message });
    }
});

async function fetchUrl(url) {
    try {
        const response = await axios.get(url, { httpsAgent });
        return response.data;
    } catch (err) {
        throw new Error(`Failed to fetch URL: ${url} - ${err.message}`);
    }
}

async function checkSecondaryStatus(res, key) {
    const checkStatus = await fetchUrl("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch2.txt");

    if (checkStatus.includes("START")) {
        res.json({ message: "ACTIVE" });
    } else if (checkStatus.includes("CHK")) {
        await validateSubscription(res, key);
    } else {
        res.status(500).json({ message: "Something went wrong." });
    }
}

async function validateSubscription(res, key) {
    const blockList = await fetchUrl("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/bchk.txt");

    if (blockList.includes(key)) {
        return res.status(403).json({ message: "BLOCKED" });
    }

    const subscriptionData = await fetchUrl("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch3.txt");
    const entries = subscriptionData.split("\n");
    const userEntry = entries.find(entry => entry.startsWith(`${key}|`));

    if (userEntry) {
        const [userKey, deviceId, expiryDate, username] = userEntry.split("|");

        if (isValidDate(expiryDate)) {
            const expiry = parseDate(expiryDate);
            await processSubscription(res, userKey, deviceId, username, expiry);
        } else {
            res.status(400).json({ error: "Invalid date format in subscription data." });
        }
    } else {
        res.status(401).json({ message: "NONE" });
    }
}

function isValidDate(dateString) {
    const [day, month, year] = dateString.split("-");
    const date = new Date(`${year}-${month}-${day}`);
    return date instanceof Date && !isNaN(date);
}

function parseDate(dateString) {
    const [day, month, year] = dateString.split("-");
    return new Date(`${year}-${month}-${day}`);
}

async function processSubscription(res, userKey, deviceId, username, expiryDate) {
    const status = checkExpiration(expiryDate);
    if (status === "ALIVE") {
        res.json({
            message: "ACTIVE",
            user: username,
            device: deviceId,
            expires: expiryDate
        });
    } else {
        res.json({ message: "EXPIRED" });
    }
}

function checkExpiration(expiryDate) {
    const currentDate = new Date();
    return new Date(expiryDate) > currentDate ? "ALIVE" : "EXPIRED";
}

module.exports = app;
                                    
