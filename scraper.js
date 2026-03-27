import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

const wait = (ms)=> new Promise(r=>setTimeout(r,ms))

//configure stealth mode for puppeteer
const stealth = StealthPlugin();
puppeteer.use(stealth)


//base url for gas buddy search results
const BASE_GASBUDDY_URL = "https://www.gasbuddy.com/home"

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

export async function ScrapeGasBuddyAPI(zipcode,fuelGrade){
    console.time("Scraper")
    //launch headless browser
    const browser = await puppeteer.launch({
        headless: "shell",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]
    });

    try {
        //open page & configure user agent to appear like a normal browser
        const page = await browser.newPage()
        await page.setUserAgent({userAgent:USER_AGENT})
        await page.setExtraHTTPHeaders({
            'accept-language': 'en-US,en;q=0.9',
        });

        // block images, and other unnecessary media requests
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        //use args to construct request url 
        const gasbuddy_url = `${BASE_GASBUDDY_URL}?search=${zipcode}&fuel=${fuelGrade}&method=all&maxAge=0`
        await page.goto(gasbuddy_url,{
            waitUntil: "domcontentloaded",
            timeout: 30_000
        })

        //give page a second to hydrate
        await wait(1000)
        const data = await page.evaluate(()=>{   
            function getNodesWithClassLike(pattern,data=[],root=document.body){
                if(typeof root.className == "string"){
                    if(pattern instanceof RegExp){
                        if(pattern.test(root.className)){
                            data.push(root)
                        } 
                    } else if(typeof pattern == "string"){
                        if(root.className.includes(pattern)) {
                            data.push(root)
                        }
                    }
                }
                for(const childNode of root.children){  
                    getNodesWithClassLike(pattern,data,childNode)
                }
            }
            function getAveragePrice(){
                let nodes = []
                getNodesWithClassLike("StationDisplayPrice",nodes)
                //get only spans that start with $
                const prices = nodes
                    .filter( n => n.tagName == "SPAN" && n.textContent[0] == "$")
                    .map( span => Number(span.textContent.substring(1)))
                    .filter( num => !isNaN(num))
    
    
                const average = Number((
                    prices.reduce((prev,current)=>prev+current,0) / Math.max(1,prices.length)
                ).toFixed(2))
    
                const min = prices[0];
                const max = prices.at(-1); 
                return {min,max,average,prices}
            }
            return getAveragePrice()
        })

        console.log("Got Data")
        return data 
    } catch (error) {
        console.error("[Scraper Failed]", error)
        return { min : -1, max: -1, average: -1, prices: []}
    } finally { 
        if(browser){
            await browser.close()
        }
        console.log("scraper finished and closed!")
        console.timeEnd("Scraper")
    }
}


// async function main(){
//     await ScrapeGasBuddyAPI("85248")
// }

// main()