import http from "http"
import { ScrapeGasBuddyAPI } from "./scraper.js";
import { readFile } from "fs/promises";

const PORT = process.env.PORT || 8080
const BASEURL = process.env.VERCEL_URL || "http://localhost:8080"

const CACHE_LIVE_MS = 1_800_000 //expire cached data every 30 mins
const CACHE_CLEANUP_EVERY_N = 10
/**@type {Map<string,PriceCacheItem>} */ const scraper_cache = new Map()

let reqNum = 0

//define server request handler
const server = http.createServer(async (req,res)=>{
    console.log(req.url)
    const url = new URL(req.url,BASEURL);
    
    //only GET requests allowed
    if(req.method != "GET"){
        res.writeHead(400)
        return res.end(JSON.stringify({
            error: "Invalid request method. only GET supported"
        }))
    }

    //handle root
    if(url.pathname == "/"){
        const html = await readFile("./index.html",{
            encoding: "utf-8"
        })
        res.writeHead(200)
        return res.end(html)
        
    }


    //only route is "gas_price"
    if(url.pathname != "/gas_price"){
        res.writeHead(404)
        return res.end(JSON.stringify({
            error: `No route matches the path: "${url.pathname}"`
        }))
    }
    
    
    //must provide a zip code
    const zip = url.searchParams.get("zipcode")
    if(!zip) {
        res.writeHead(400)
        return res.end(JSON.stringify({
            error: "Expected query parameter 'zipcode' in request."
        }))
    } 

    //valid request, increment counter
    reqNum = (reqNum+1) % CACHE_CLEANUP_EVERY_N
    
    //params with defaults 
    const fuelGrade = url.searchParams.get("fuel") ?? "1"    
    
    //check the cache for recent price data
    const key = `${zip}:${fuelGrade}`
    const entry = scraper_cache.get(key)
    const now = Date.now()
    if(entry && entry.expires_ms > now){
        res.writeHead(200)
        return res.end(JSON.stringify(entry.price_data))
    }

    //use the scraper to get price data 
    const data = await ScrapeGasBuddyAPI(zip,fuelGrade);

    //clean up the cache every 'n' request
    if(reqNum == CACHE_CLEANUP_EVERY_N-1){
        for(const key of scraper_cache.keys() ){
            const value = scraper_cache.get(key)
            //remove expired entries
            if(value.expires_ms < now){
                scraper_cache.delete(key)
            }
        }
    }
    if(!data || data.prices.length == 0) {
        res.writeHead(400)
        return res.end(JSON.stringify({
            error: "Failed to fetch gas price data. Please try again later."
        }))
    }
    
    scraper_cache.set( key ,{ expires_ms: now + CACHE_LIVE_MS , price_data: data})
    res.writeHead(200)
    return res.end(JSON.stringify(data,null,4));
})

server.listen(PORT,()=>{
    console.log(`Gas API listening on :${PORT}`)
})

/**
 * @typedef {Object} PriceData
 * @property {number} min
 * @property {number} max
 * @property {number} average
 * @property {number[]} prices
 */

/**
* @typedef {Object} PriceCacheItem
* @property {PriceData} price_data
* @property {number} expires_ms 
*/




