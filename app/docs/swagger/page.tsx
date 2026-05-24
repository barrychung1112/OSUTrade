"use client";

import dynamic from "next/dynamic";
import { Theme } from "@radix-ui/themes";
import "swagger-ui-react/swagger-ui.css";
import { ComponentType } from "react";
import Header from "../../components/Header";

const SwaggerUI = dynamic(
  () => import("swagger-ui-react") as Promise<ComponentType<{ url: string }>>,
  {
    ssr: false,
  }
);

export default function SwaggerDocsPage() {
  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="app-page">
        <Header />
        <section className="app-container">
          <div className="app-hero">
            <p className="app-eyebrow">API</p>
            <h1 className="app-title">Product API Swagger Docs</h1>
            <p className="app-subtitle">
              Review the current product, signup, and login API contracts.
            </p>
          </div>
          <div className="app-card overflow-hidden p-4">
            <SwaggerUI url="/docs/products-api.swagger.json" />
            <SwaggerUI url="/docs/signup-api.json" />
            <SwaggerUI url="/docs/login-api.json" />
          </div>
        </section>
      </main>
    </Theme>
  );
}
