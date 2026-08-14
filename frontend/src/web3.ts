import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { flareTestnet } from "viem/chains";

export const coston2 = flareTestnet;

export const wagmiConfig = createConfig({
  chains: [coston2],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [coston2.id]: http(coston2.rpcUrls.default.http[0]),
  },
});

export const coston2FaucetUrl = "https://faucet.flare.network/coston2";

