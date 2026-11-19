"use client";

import dynamic from "next/dynamic";

/**
 * Charts load the charting library (recharts, ~110 KB) only in the browser and after the page
 * itself has rendered, so Home and Reports show their numbers straight away.
 */
const placeholder = (height: string) =>
  function ChartPlaceholder() {
    return <div className={`${height} w-full animate-pulse rounded-xl bg-shelf`} aria-hidden="true" />;
  };

export const SalesChart = dynamic(() => import("./SalesChart").then((m) => m.SalesChart), {
  ssr: false,
  loading: placeholder("h-72"),
});

export const MixChart = dynamic(() => import("./MixChart").then((m) => m.MixChart), {
  ssr: false,
  loading: placeholder("h-80"),
});
