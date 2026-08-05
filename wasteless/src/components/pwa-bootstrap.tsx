"use client";

import { useEffect } from "react";
import {
  registerLaunchQueueConsumer,
  requestPersistentStorage,
} from "@/lib/pwa-launch-handler";
import { checkForServiceWorkerUpdate } from "@/lib/app-version";

/** One-time PWA bootstrap (storage persistence + file launch consumer). */
export function PwaBootstrap() {
  useEffect(() => {
    registerLaunchQueueConsumer();
    void requestPersistentStorage();
    void checkForServiceWorkerUpdate();
  }, []);
  return null;
}
