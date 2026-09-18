"use client";

import React from "react";
import { ErrorFallback } from "@/components/feedback/ErrorFallback";

/** Isolates risky client widgets so one crash never takes down the page. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }

  render() {
    if (this.state.failed) return <ErrorFallback />;
    return this.props.children;
  }
}
