// import the Express framework to create the server
import express from "express"
const server = express()

// is a browser security mechanism that allows front-end to communicate with the back-end.
import cors from "cors"
server.use(
  cors({
    // allows communication only with that source
    origin: "http://localhost:5173",
    optionsSuccessStatus: 200,
  })
)

// to prevent the same User-Agent from being used repeatedly and bypass Amazon's blocking
import randomUseragent from "random-useragent"

// import axios to make HTTP requests
import axios from "axios"

// import JSDOM to simulate the DOM and allow HTML data extraction
import { JSDOM } from "jsdom"

// object to store results temporarily in memory
const cache = {}

// main route for scraping
server.get("/api/scrape", async (req, res) => {
  // taptures the keyword passed by the URL
  const keyword = req.query.keyword

  // if you don't have the keyword, the server's response will be Bad Request
  if (!keyword) return res.status(400).send("Keyword not provided")

  // check if the data for that keyword has been searched before
  if (cache[keyword]) {
    // if yes, return the data stored in the cache (avoids new scraping)
    return res.json(cache[keyword])
  }

  // timestamp is a dynamic URL parameter, which changes with each request. It helps to mimic a human.
  const timestamp = Math.floor(Date.now() / 1000)

  // xpid is another dynamic parameter responsible for tracking Amazon A/B testing and personalizing the experience
  const xpidList = [
    "pBw82H-MswgZ_",
    "xyz789ABC123",
    "qwe456RTY789",
    "aXy12Z-QweR4T",
    "kLm78N-JklP9M_",
    "zXc56V-BnmU3W",
    "rTy90P-HgfD2S_",
    "qWe34R-TyuI8K",
  ]
  const randomXpid = xpidList[Math.floor(Math.random() * xpidList.length)]

  // encodeURIComponentto ensure that spaces and special characters are safe in the URL
  const amazonURL = `https://www.amazon.com/s?k=${encodeURIComponent(
    keyword
  )}&qid=${timestamp}&xpid=${randomXpid}&ref=sr_pg_1`

  // function for fetchProducts
  async function fetchProduct(url) {
    try {
      // amazon uses headers to verify whether your users are real or bots. If the headers don't look human, Amazon may return a 403 error or display a captcha.
      const headers = {
        "User-Agent": randomUseragent.getRandom(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      }

      // before accessing the search page, make requests to other Amazon pages to mimic the behavior of a user browsing.
      // access the homepage
      await axios.get("https://www.amazon.com", { headers })

      // random delay, to mimic a human
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 2000 + 1000)
      )

      // makes a GET request to the Amazon search page
      const result = await axios.get(url, { headers })

      // pass the returned HTML to the JSDOM so you can use querySelector
      const dom = new JSDOM(result.data)
      const document = dom.window.document

      // selects all product blocks on the page
      const products = document.querySelectorAll(
        "div.s-main-slot div[data-component-type='s-search-result']"
      )

      // array to store organized data
      const allProductsOrganized = []

      // iterates through each product in the list and extracts the data
      products.forEach((product) => {
        const title = product
          .querySelector(".s-title-instructions-style > a > h2 span")
          ?.textContent?.trim()
        const rating = product.querySelector(".a-icon-alt")?.textContent?.trim()
        const reviewCount = product
          .querySelector(
            "div.a-row.a-size-small > span.rush-component > div > a span"
          )
          ?.textContent?.trim()
        const image = product.querySelector(".s-image")?.src

        // if the search finds at least the title and image of the product, which are the most important, then this data can be saved
        if (title && image) {
          // add the products in object format to the Array
          allProductsOrganized.push({
            title,
            rating,
            reviewCount,
            image,
          })
        }
      })

      // saves data in the cache for this keyword, avoiding repeated calls
      cache[keyword] = allProductsOrganized

      // returns data in JSON format
      res.json(allProductsOrganized)

      console.log("Amazon successfully accessed!")
    } catch (error) {
      // if an error occurs, send a JSON with the error message and log in to the terminal
      res
        .status(500)
        .json({ error: "Error accessing Amazon. Please try again later." })
      console.error("Error to fetch products: " + error)
    }
  }

  // start the function
  fetchProduct(amazonURL)
})

// start the server on port 3000
server.listen(3000, () => {
  console.log("Server on http://localhost:3000/")
})
