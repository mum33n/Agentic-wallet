interface Config {
  heliusKey: string;
}

const config: Config = {
  heliusKey: process.env.HELIUS_API_KEY!,
};

export default config;
