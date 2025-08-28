// Temporarily disabled due to network restrictions in build environment
// import { Indie_Flower } from "next/font/google";

// export const indieFlower = Indie_Flower({
//   subsets: ["latin"],
//   weight: "400",
//   display: "swap",
// });

// Fallback for build environments without Google Fonts access
export const indieFlower = {
  className: "font-serif" // Fallback to serif font
};