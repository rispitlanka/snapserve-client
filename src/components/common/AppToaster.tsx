"use client";

import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      containerStyle={{
        zIndex: 1000000,
      }}
      toastOptions={{
        duration: 3000,
      }}
    />
  );
}