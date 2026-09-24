"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import POSDashboard from "../pos/page";

export default function KDSLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    // Seamlessly transition legacy /kds links to /pos
    router.replace("/pos");
  }, [router]);

  return <POSDashboard />;
}
