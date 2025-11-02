"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export function AdBanner() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // サーバーサイドレンダリングや初期表示では広告を表示しない
    return null;
  }

  return (
    <div className="my-8 flex justify-center">
      <div className="w-full max-w-4xl text-center">
        {/* ここに広告コードを挿入します */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxxxxxxxxxxxxxxx"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <ins className="adsbygoogle"
             style={{ display: "block" }}
             data-ad-client="ca-pub-xxxxxxxxxxxxxxxx"
             data-ad-slot="yyyyyyyyyy"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <Script id="adsbygoogle-init" strategy="afterInteractive">
          {`(adsbygoogle = window.adsbygoogle || []).push({});`}
        </Script>
        <div className="text-xs text-muted-foreground mt-2">スポンサーリンク</div>
      </div>
    </div>
  );
}