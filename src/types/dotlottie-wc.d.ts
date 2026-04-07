import type { DetailedHTMLProps, HTMLAttributes } from "react";

type DotLottieWCAttributes = DetailedHTMLProps<
  HTMLAttributes<HTMLElement> & {
    src?: string;
    autoplay?: boolean;
    loop?: boolean;
  },
  HTMLElement
>;

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- JSX intrinsic merge for custom elements
  namespace JSX {
    interface IntrinsicElements {
      "dotlottie-wc": DotLottieWCAttributes;
    }
  }
}
