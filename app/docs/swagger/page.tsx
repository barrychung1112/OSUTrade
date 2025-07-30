"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { ComponentType } from "react";

// 明確註明元件的 props 型別
const SwaggerUI = dynamic(
  () => import("swagger-ui-react") as Promise<ComponentType<{ url: string }>>,
  {
    ssr: false,
  }
);

export default function SwaggerDocsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        📘 Product API Swagger Docs
      </h1>
      <div className="bg-white border rounded shadow-xl p-4">
        <SwaggerUI url="/docs/products-api.swagger.json" />
        <SwaggerUI url="/docs/signup-api.json" />
        <SwaggerUI url="/docs/login-api.json" />
      </div>
    </main>
  );
}
