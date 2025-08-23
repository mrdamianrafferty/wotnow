import { Indie_Flower, Oxanium } from "next/font/google";

export const indieFlower = Indie_Flower({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});