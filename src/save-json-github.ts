import dotenv from "dotenv";
import { Pool } from "../type";
import { getSCoinPrice, normalizeSymbol } from "../utils";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
dotenv.config();

const scallopPriceApi = process.env.SCALLOP_PRICE_API;
const startTimestamp = process.env.START_TIMESTAMP;

const retrieveTimestampFromLocal = () => {
  try {
    const data = fs.readFileSync(
      path.join(__dirname, "../json/timestamp.json"),
      "utf8"
    );
    return JSON.parse(data).lastTimestamp;
  } catch (error) {
    fs.writeFileSync(
      path.join(__dirname, "../json/timestamp.json"),
      JSON.stringify({ lastTimestamp: startTimestamp })
    );
    return Number(startTimestamp);
  }
};

const retrieveJsonFromLocal = (symbol: string) => {
  try {
    const data = fs.readFileSync(
      path.join(__dirname, `../json/data/${symbol}.json`),
      "utf8"
    );
    return JSON.parse(data);
  } catch (error) {
    fs.writeFileSync(
      path.join(__dirname, `../json/data/${symbol}.json`),
      JSON.stringify([])
    );
    return [];
  }
};

const saveJsonToLocal = (symbol: string, data: any) => {
  fs.writeFileSync(
    path.join(__dirname, `../json/data/${symbol}.json`),
    JSON.stringify(data)
  );
};

const saveTimestampToLocal = (timestamp: number) => {
  fs.writeFileSync(
    path.join(__dirname, "../json/timestamp.json"),
    JSON.stringify({ lastTimestamp: timestamp })
  );
};

async function insertCoinPrice(timestamp: number) {
  const response = await fetch(`${scallopPriceApi}?timestampMs=${timestamp}`);
  const data: { pools: Pool[] } = await response.json();
  await Promise.all(
    data.pools
      ?.filter((coin) => coin.conversionRate)
      .map((coin) => {
        const jsonData = retrieveJsonFromLocal(normalizeSymbol(coin.symbol));
        const sCoinPrice = getSCoinPrice({
          price: coin.coinPrice,
          conversionRate: coin.conversionRate,
        });
        jsonData.push({
          timestamp,
          price: sCoinPrice,
        });
        saveJsonToLocal(normalizeSymbol(coin.symbol), jsonData);
      })
  );
}

async function main() {
  // insert coin price from start timestamp to now every day
  const lastTimestamp = retrieveTimestampFromLocal();

  const startDate = new Date(Number(lastTimestamp) ?? new Date().getTime());
  const endDate = new Date();
  while (startDate < endDate) {
    console.log(`inserted ${startDate.toISOString()}`);
    await insertCoinPrice(startDate.getTime());
    saveTimestampToLocal(startDate.getDate() + 1);
    startDate.setDate(startDate.getDate() + 1);
    break;
  }
  try {
    execSync("git add .");
    execSync("git commit -m 'Updated price data'");
    execSync("git push origin main");
    console.log("✅ JSON file updated and pushed to GitHub!");
  } catch (error) {
    console.error("❌ Error pushing to GitHub:", error.message);
  }
}

main();
