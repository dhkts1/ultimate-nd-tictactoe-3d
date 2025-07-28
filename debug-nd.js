const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
        console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Listen for errors
    page.on('pageerror', error => {
        console.error('Page error:', error.message);
    });
    
    // Navigate to the page
    const filePath = `file://${path.join(__dirname, 'tictactoe-nd.html')}`;
    console.log('Opening:', filePath);
    await page.goto(filePath);
    
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Click on a game mode
    await page.click('[data-mode="vs-computer"]');
    console.log('Selected vs Computer mode');
    
    // Start the game
    await page.click('#start-game');
    console.log('Clicked Start Game');
    
    // Wait to see what happens
    await page.waitForTimeout(3000);
    
    // Check if canvas exists
    const canvas = await page.$('canvas');
    if (canvas) {
        console.log('Canvas element found!');
        const box = await canvas.boundingBox();
        console.log('Canvas dimensions:', box);
    } else {
        console.log('No canvas element found!');
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'nd-game-screenshot.png' });
    console.log('Screenshot saved as nd-game-screenshot.png');
    
    // Keep browser open for inspection
    console.log('Browser will stay open for inspection...');
})();