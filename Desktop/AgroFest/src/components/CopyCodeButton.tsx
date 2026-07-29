"use client";

import { useState } from "react";
import { Button } from "./Button";

export function CopyCodeButton({ code, label, copiedLabel }: { code: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Button type="button" onClick={copy} className="w-full">
      {copied ? copiedLabel : label}
    </Button>
  );
}
