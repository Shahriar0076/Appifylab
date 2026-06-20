"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { realtimeAuthOptions, realtimeUrl } from "@/lib/api";

export function useNetworkRealtime(onChanged: () => void) {
  const callback = useRef(onChanged);

  useEffect(() => {
    callback.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    const socket = io(realtimeUrl, realtimeAuthOptions());
    socket.on("network:changed", () => callback.current());
    return () => { socket.disconnect(); };
  }, []);
}
