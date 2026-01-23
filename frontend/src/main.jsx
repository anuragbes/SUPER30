import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./App.css";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/clerk-react";

const clerkAppearance = {
  baseTheme: undefined,
  variables: {
    colorPrimary: "#2563eb",
    colorBackground: "#ffffff",
    colorInputBackground: "#f8fafc",
    colorInputText: "#1e293b",
    colorText: "#1e293b",
    borderRadius: "0.5rem"
  },
  elements: {
    formButtonPrimary: {
      backgroundColor: "#2563eb",
      "&:hover": {
        backgroundColor: "#1d4ed8"
      },
      width: "100%",
      padding: "0.75rem 1rem",
      fontSize: "1rem",
      fontWeight: "600",
      borderRadius: "0.5rem"
    },
    card: {
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      borderRadius: "0.75rem",
      padding: "1.5rem",
      maxWidth: "100%",
      width: "100%",
      margin: "0 auto",
      "@media (max-width: 640px)": {
        padding: "1rem",
        borderRadius: "0.5rem",
        margin: "0 1rem"
      }
    },
    headerTitle: {
      fontSize: "1.5rem",
      fontWeight: "600",
      textAlign: "center",
      "@media (max-width: 640px)": {
        fontSize: "1.25rem"
      }
    },
    formFieldInput: {
      padding: "0.75rem",
      fontSize: "1rem",
      borderRadius: "0.375rem",
      width: "100%",
      "@media (max-width: 640px)": {
        padding: "0.625rem",
        fontSize: "0.875rem"
      }
    },
    formFieldLabel: {
      fontSize: "0.875rem",
      fontWeight: "500",
      marginBottom: "0.5rem",
      display: "block"
    },
    footerActionLink: {
      fontSize: "0.875rem",
      textAlign: "center",
      display: "block"
    },
    socialButtons: {
      width: "100%",
      marginBottom: "1rem"
    },
    socialButtonsBlockButton: {
      width: "100%",
      marginBottom: "0.5rem"
    },
    dividerLine: {
      margin: "1rem 0"
    },
    dividerText: {
      fontSize: "0.875rem",
      color: "#64748b"
    }
  },
  layout: {
    socialButtonsPlacement: "bottom",
    socialButtonsVariant: "blockButton",
    privacyPageUrl: undefined,
    termsPageUrl: undefined
  }
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider 
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
    >
      <App />
      <Toaster position="top-right" />
    </ClerkProvider>
  </React.StrictMode>
);