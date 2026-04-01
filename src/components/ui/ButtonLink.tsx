import type { ReactNode } from "react";

import { ark } from "@ark-ui/react/factory";
import clsx from "clsx";
import styles from "./ButtonLink.module.css";

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ButtonLink({ href, children, className }: ButtonLinkProps) {
  return (
    <ark.a href={href} className={clsx(styles.button, className)}>
      {children}
    </ark.a>
  );
}
