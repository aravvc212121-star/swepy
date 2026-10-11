"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HelperJobRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/helper/orders");
  }, [router]);

  return null;
}
