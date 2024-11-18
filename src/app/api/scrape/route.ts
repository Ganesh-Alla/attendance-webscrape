import { NextRequest } from 'next/server'
import puppeteer from "puppeteer-core";
import chrome from '@sparticuz/chromium'


async function scrapeStudentData(username: string, sendLog: (message: string) => Promise<void>) {
  let browser;
  const URL = process.env.URL as string;
  try {
    await sendLog("Launching browser...");
    const executablePath = await chrome.executablePath();

    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath, // Now resolved as a string
      headless: chrome.headless,
    });
    

    const page = await browser.newPage();
  

    await sendLog("Navigating to login page...");
    await page.goto(URL);

    await sendLog("Filling in username...");
    await page.waitForSelector("#txtUserName");
    await page.type("#txtUserName", username);

    await sendLog("Clicking next button...");
    await page.click("#btnNext");

    await sendLog("Checking for warnings...");
    try {
      await page.waitForSelector("#lblWarning");
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
      console.log(error)
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
  } catch (e: unknown) {
    if (e instanceof Error) {
    await sendLog(`Error during scraping: ${e.message}`);
    if (browser) {
      await browser.close();
    }
    throw new Error(`Scraping failed for ${username}: ${e.message}`);
  }}
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
    } catch (error: unknown) {
      if (error instanceof Error) {
      await sendLog(`Error: ${error.message}`)
      }
    } finally {
      await writer.close()
    }
  }

  processQuery()

  return new Response(stream.readable, { headers })
}