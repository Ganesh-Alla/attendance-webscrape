import { NextRequest } from 'next/server'
import puppeteer from "puppeteer";

async function scrapeStudentData(username: string, sendLog: (message: string) => Promise<void>) {
  let browser;

  try {
    await sendLog("Launching browser...");
    const options = { headless: true }; 
    browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    await sendLog("Navigating to login page...");
    await page.goto("http://43.250.40.63/Login.aspx");

    await sendLog("Filling in username...");
    await page.waitForSelector("#txtUserName");
    await page.type("#txtUserName", username);

    await sendLog("Clicking next button...");
    await page.click("#btnNext");

    await sendLog("Checking for warnings...");
    try {
      await page.waitForSelector("#lblWarning", { timeout: 2000 });
      const warningText = await page.$eval("#lblWarning", (el) => el.textContent?.trim());
      console.log("warning",warningText)
      if (warningText) {
        await sendLog(`Error: ${warningText}`);
        await browser.close();
        return {
          error: warningText
        };
      }
    } catch (error) {
      await sendLog("Username valid, continuing...");
    }

    await sendLog("Filling in password...");
    await page.waitForSelector("#txtPassword");
    await page.type("#txtPassword", username); 

    await sendLog("Submitting form...");
    await page.click("#btnSubmit");

    await sendLog("Waiting for main student page...");
    await page.waitForSelector("#ctl00_cpStud_lnkStudentMain");

    await sendLog("Clicking student main link...");
    await page.click("#ctl00_cpStud_lnkStudentMain");

    await sendLog("Waiting for student name...");
    await page.waitForSelector("#ctl00_cpHeader_ucStud_lblStudentName");
    const name = await page.$eval(
      "#ctl00_cpHeader_ucStud_lblStudentName",
      (el) => el.textContent
    );

    await sendLog("Waiting for total percentage...");
    await page.waitForSelector("#ctl00_cpStud_lblTotalPercentage");
    const data = await page.$eval(
      "#ctl00_cpStud_lblTotalPercentage",
      (el) => el.textContent
    );

    await sendLog(`Student Name: ${name}, Total Percentage: ${data}`);

    await sendLog("Closing browser...");
    await browser.close();

    return {
      name,
      total_percentage: data,
    };
  } catch (e: any) {
    await sendLog(`Error during scraping: ${e.message}`);
    if (browser) {
      await browser.close();
    }
    throw new Error(`Scraping failed for ${username}: ${e.message}`);
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('query') as string

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const encoder = new TextEncoder()

  // Create a TransformStream to send events
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Send log messages
  const sendLog = async (message: string) => {
    console.log(message)
    await writer.write(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`))
  }

  // Process the query and send logs
  const processQuery = async () => {
    try {
      await sendLog(`Started processing query for username: ${query}`)
      
      const result = await scrapeStudentData(query, sendLog)
      
      await writer.write(encoder.encode(`data: ${JSON.stringify({ result })}\n\n`))
    } catch (error: any) {
      await sendLog(`Error: ${error.message}`)
    } finally {
      await writer.close()
    }
  }

  processQuery()

  return new Response(stream.readable, { headers })
}