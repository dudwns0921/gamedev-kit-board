import type { NextConfig } from "next";

const config: NextConfig = {
  // The board pages the kit sends are whole documents; keep their bodies unbuffered and uncompressed by nothing extra.
  poweredByHeader: false,
};

export default config;
