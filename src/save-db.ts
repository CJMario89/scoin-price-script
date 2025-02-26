import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { Pool } from "../type";
import { getSCoinPrice } from "../utils";

dotenv.config();

const prisma = new PrismaClient();

const scallopPriceApi = process.env.SCALLOP_PRICE_API;

async function insertCoinPrice(timestamp: number) {
  const response = await fetch(`${scallopPriceApi}?timestampMs=${timestamp}`);
  const data: { pools: Pool[] } = await response.json();
  await prisma.$transaction(
    data.pools
      ?.filter((coin) => coin.conversionRate)
      .map((coin) => {
        const sCoinPrice = getSCoinPrice({
          price: coin.coinPrice,
          conversionRate: coin.conversionRate,
        });
        return prisma.coinPrice.create({
          data: {
            price: sCoinPrice,
            symbol: coin.symbol,
            timestamp: new Date(timestamp),
          },
        });
      })
  );
}

async function main() {
  // insert coin price from start timestamp to now every day
  const startTimestamp = process.env.START_TIMESTAMP;

  const coinPrices = await prisma.coinPrice.findFirst({
    orderBy: {
      timestamp: "desc",
    },
  });

  const lastTimestamp = coinPrices?.timestamp ?? startTimestamp;

  const startDate = new Date(Number(lastTimestamp) ?? new Date().getTime());
  const endDate = new Date();
  while (startDate < endDate) {
    await insertCoinPrice(startDate.getTime());
    startDate.setDate(startDate.getDate() + 1);
  }
}

main();
