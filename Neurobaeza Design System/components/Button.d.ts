import * as React from "react";

export interface ButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Visual intent. @default "primary" */
  variant?: "primary" | "success" | "danger" | "warning" | "ghost";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

/** Neurobaeza primary action button — Linear-Indigo, light theme. */
export function Button(props: ButtonProps): JSX.Element;
