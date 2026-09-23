"use client";

import React, { use } from "react";
import TableQRPage from "./[token]/page";

export default function TableDemoPage() {
  const dummyParams = Promise.resolve({ token: "tbl-04" });
  return <TableQRPage params={dummyParams} />;
}
