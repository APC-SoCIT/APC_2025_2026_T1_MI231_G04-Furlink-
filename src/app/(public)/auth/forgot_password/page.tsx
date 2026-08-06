"use client";

import React from "react";
import Link from "next/link";
import { ROUTES } from "@/config/routes";
import "@/app/(public)/auth/auth.css";

export default function ForgotPasswordPage() {
  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1>Forgot Password</h1>
        <p style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          This page is under construction. Check back soon for password recovery options!
        </p>
        <div style={{ textAlign: "center" }}>
          <Link href="/auth/login" className="login-link">
            Back to Log In
          </Link>
        </div>
      </div>
    </div>
  );
}