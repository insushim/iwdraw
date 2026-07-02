"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/* 학급 입장 QR — 전자칠판 대형 표시용. 코드 URL을 QR로 인코딩. */
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#2D2A26", light: "#FFFFFF" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [value, size]);

  if (!dataUrl) {
    return <div className="animate-pulse rounded-card bg-cream-deep" style={{ width: size, height: size }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="학급 입장 QR 코드" width={size} height={size} className="rounded-card" />;
}
