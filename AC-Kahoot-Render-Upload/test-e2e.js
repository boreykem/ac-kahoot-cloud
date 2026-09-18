import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to http://localhost:3333...');
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });

    console.log('Opening auth modal...');
    // Click login button - look for "ចូលគណនី (Login)"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.textContent.includes('ចូលគណនី') || b.textContent.includes('Login'));
      if (loginBtn) loginBtn.click();
    });
    
    await page.waitForTimeout(1000);
    
    console.log('Typing credentials...');
    // Type email
    await page.type('input[type="email"]', 'baureykem@gmail.com');
    // Type password
    await page.type('input[type="password"]', 'admin123');
    
    console.log('Submitting login form...');
    // Submit login - the button with type="submit" in the active tab
    await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const loginForm = forms[0];
      if (loginForm) {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    });

    // Wait for login to complete (auth modal closes)
    await page.waitForTimeout(3000);

    console.log('Checking for Master Admin Panel button...');
    const hasAdminButton = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Master Admin Panel') || b.textContent.includes('👑'));
    });
    console.log('Has Admin Button?', hasAdminButton);

    if (hasAdminButton) {
      console.log('Refreshing page to test the bug fix (JWT preservation in localStorage)...');
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);

      const hasAdminButtonAfterRefresh = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Master Admin Panel') || b.textContent.includes('👑'));
        if (btn) {
          btn.click(); // Click it!
          return true;
        }
        return false;
      });
      console.log('Still logged in after refresh?', hasAdminButtonAfterRefresh);

      if (hasAdminButtonAfterRefresh) {
        console.log('Waiting for Master Admin Panel to load data...');
        await page.waitForTimeout(3000);
        
        // Extract data from the modal
        const stats = await page.evaluate(() => {
          // Look for cards with large numbers
          const pElements = Array.from(document.querySelectorAll('.fixed .glass-panel p.text-3xl'));
          const counts = pElements.map(p => p.textContent);
          
          // Look for rows in the teacher directory
          const tableRows = document.querySelectorAll('.fixed table tbody tr').length;
          
          return { counts, tableRows };
        });
        
        console.log('Stats from Master Admin Panel after refresh:');
        console.log('- Top Cards (Users, Quizzes, etc):', stats.counts);
        console.log('- Teacher Directory Rows:', stats.tableRows);
        
        if (stats.counts.length > 0 && stats.counts[0] !== '0') {
          console.log('✅ TEST PASSED: Data successfully loaded into UI after refresh!');
        } else {
          console.log('❌ TEST FAILED: Data is still 0!');
        }
      }
    }
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();
