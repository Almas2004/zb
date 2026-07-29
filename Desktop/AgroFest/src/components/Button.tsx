import { clsx } from "clsx";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

const variants = {
  primary: "bg-[#F15A22] text-white hover:bg-[#d94712]",
  green: "bg-[#004F2F] text-white hover:bg-[#063f29]",
  ghost: "bg-white text-[#004F2F] ring-1 ring-[#004F2F]/20 hover:bg-[#fff4eb]",
  danger: "bg-red-700 text-white hover:bg-red-800"
};

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={clsx("focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-60", variants[variant], className)} {...props} />;
}

export function LinkButton({ className, variant = "primary", ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: keyof typeof variants }) {
  return <a className={clsx("focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-3 font-bold transition", variants[variant], className)} {...props} />;
}
